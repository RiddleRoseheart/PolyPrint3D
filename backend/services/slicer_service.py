from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
import uuid
import logging
from backend.database.config import db
from backend.database.models import PrintRequest, GCodeFile, UploadedFile, User
from backend.slicer.scripts.slicer import split_and_distribute_objects, slice_with_prusa_slicer
from backend.slicer.scripts.file_manager import FileManager
from backend.slicer.config.material_config import AVAILABLE_MATERIALS, AVAILABLE_COLORS

logger = logging.getLogger(__name__)

class SlicerService:
    """Service for handling 3D model slicing operations with user permissions"""
    
    def __init__(self, output_dir: str | Path, config_path: str | Path, notification_service: NotificationService = None):
        """
        Initialize SlicerService
        
        Args:
            output_dir: Directory for output files
            config_path: Path to slicer configuration file
        """
        self.output_dir = Path(output_dir)
        self.config_path = Path(config_path)
        self.notification_service = notification_service
        # Initialize directories
        self._initialize_directories()
        
    def _initialize_directories(self) -> None:
        """Create necessary output directories"""
        self.split_dir = self.output_dir / "split_objects"
        self.gcode_dir = self.output_dir / "gcode"
        
        for directory in [self.output_dir, self.split_dir, self.gcode_dir]:
            directory.mkdir(parents=True, exist_ok=True)

    def start_slicing(self, file_id: str, user: User, settings: Dict) -> List[PrintRequest]:
        """
        Start slicing job for given file
        
        Args:
            file_id: ID of file to slice
            user: User requesting the slice
            settings: Slicing settings
            
        Returns:
            List of created PrintRequest objects
            
        Raises:
            ValueError: If file not found or user lacks permission
        """
        try:
            original_file = UploadedFile.query.get(file_id)
            if not original_file:
                raise ValueError("File not found")
            
            if original_file.user_id != user.id and user.role != 'admin':
                raise ValueError("Access denied")

            # Validate material and color
            material = settings.get('material', 'PLA')
            color = settings.get('color', 'Natural')
            if material not in AVAILABLE_MATERIALS:
                raise ValueError(f"Invalid material: {material}")
            if color not in AVAILABLE_COLORS:
                raise ValueError(f"Invalid color: {color}")

            # Generate unique job name
            job_name = f"job_{uuid.uuid4().hex[:8]}"

            # Split and distribute objects
            output_files = split_and_distribute_objects(
                str(original_file.file_path),
                self.file_manager,
                job_name,
                printer_count=4  # TODO
            )

            print_requests = []
            for i, stl_path in enumerate(output_files):
                print_request = PrintRequest(
                    id=str(uuid.uuid4()),
                    file_path=stl_path,
                    original_file_id=original_file.id,
                    user_id=user.id,
                    material=material,
                    color=color,
                    state="processing",
                    filling=settings.get('filling', 20),
                    layer_height=settings.get('layer_height', 0.2)
                )
                db.session.add(print_request)
                db.session.flush()

                # Slice the file
                success = slice_with_prusa_slicer(
                    stl_path, 
                    self.file_manager,
                    job_name,
                    i + 1,
                    str(self.config_path)
                )

                if success:
                    print_request.state = "completed"
                else:
                    print_request.state = "failed"

                print_requests.append(print_request)
            
            db.session.commit()
            return print_requests
    
        except Exception as e:
            db.session.rollback()
            logger.error(f"Slicing error: {str(e)}")
            raise

    def get_print_request(self, request_id: str, user: User) -> Optional[PrintRequest]:
        """
        Get print request if user has permission
        
        Args:
            request_id: ID of print request
            user: User requesting access
            
        Returns:
            PrintRequest if found and accessible, None otherwise
        """
        request = PrintRequest.query.get(request_id)
        if request and (request.user_id == user.id or user.role == 'admin'):
            return request
        return None

    def get_user_print_requests(self, user: User) -> List[PrintRequest]:
        """Get all print requests for a user"""
        if user.role == 'admin':
            return PrintRequest.query.all()
        return PrintRequest.query.filter_by(user_id=user.id).all()     
 
    def cleanup_print_request(self, request_id: str, user: User) -> bool:
        """
        Clean up files associated with a print request
        
        Args:
            request_id: ID of print request to clean up
            user: User requesting cleanup
            
        Returns:
            bool indicating success
        """
        try:
            request = self.get_print_request(request_id, user)
            if not request:
                return False

            # Delete files
            for path_str in [request.file_path, request.gcode_file.file_path if request.gcode_file else None]:
                if path_str:
                    path = Path(path_str)
                    if path.exists():
                        path.unlink()

            db.session.delete(request)
            db.session.commit()
            logger.info(f"Cleaned up print request {request_id}")
            return True
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Cleanup error: {str(e)}")
            return False
        
    def get_available_materials(self) -> Dict:
        """Get available materials and their properties"""
        return {
            name: {
                'temperature': config.temperature,
                'bed_temperature': config.bed_temperature,
                'cost_per_gram': config.cost_per_gram
            }
            for name, config in AVAILABLE_MATERIALS.items()
        }

    def get_available_colors(self) -> Dict:
        """Get available colors and their hex codes"""
        return AVAILABLE_COLORS   
    
    def update_print_request_status(self, request_id: str, status: str) -> PrintRequest:
        """
    Update print request status and check if project is complete
    
    Args:
        request_id: ID of print request
        status: New status value
        
    Returns:
        Updated PrintRequest
        """
        try:
            print_request = PrintRequest.query.get(request_id)
            if not print_request:
                raise ValueError("Print request not found")
            
            print_request.state = status
            db.session.commit()
        
            if status == "completed":
                self._check_project_completion(print_request)
                
            return print_request
        
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to update print request status: {str(e)}")
            raise

    def _check_project_completion(self, print_request: PrintRequest):
        """
    Check if all print requests for original file are complete
    
    Args:
        print_request: A completed print request
        """
    try:
        # Get the original file
        original_file = print_request.original_file
        
        # Get all print requests for this original file
        all_requests = PrintRequest.query.filter_by(
            original_file_id=original_file.id
        ).all()
        
        # Check if all print requests are completed
        all_completed = all(req.state == "completed" for req in all_requests)
        
        if all_completed:
            logger.info(f"All print requests completed for file {original_file.id}")
            
            # Get the user who uploaded the file
            user = original_file.user
            
            if self.notification_service:
                self.notification_service.send_print_project_completed(
                    user.email,
                    original_file,
                    all_requests
                )
                
    except Exception as e:
        logger.error(f"Error checking project completion: {str(e)}")