from pathlib import Path
from typing import Dict, List, Optional, Union, Tuple
from datetime import datetime
import uuid
import logging
import os
from flask import current_app
from backend.utils import PathUtil
from backend.slicer.scripts.file_manager import FileManager
from backend.database.config import db
from backend.database.models import PrintRequest, GCodeFile, UploadedFile, User, Filament, Material, Color
from backend.slicer.scripts.slicer import split_and_distribute_objects, slice_with_prusa_slicer
from backend.slicer.config.material_config import AVAILABLE_MATERIALS, AVAILABLE_COLORS
from backend.services.notification_service import NotificationService

logger = logging.getLogger(__name__)

class SlicerService:
    """Service for handling 3D model slicing operations with user permissions"""
    
    def __init__(self, 
                output_dir: Union[str, Path], 
                config_path: Union[str, Path], 
                notification_service: Optional[NotificationService] = None, 
                file_manager: Optional[FileManager] = None):
        """
        Initialize SlicerService
    
        Args:
            output_dir: Directory for output files
            config_path: Path to slicer configuration file
            notification_service: Service for sending notifications
            file_manager: Optional file manager for handling file operations
        """
        self.output_dir = Path(output_dir)
        self.config_path = Path(config_path)
        self.notification_service = notification_service
        
        # Initialize file manager
        if file_manager:
            self.file_manager = file_manager
        else:
            # Initialize file manager in local mode
            self.file_manager = FileManager(
                local_output_path=str(self.output_dir)
            )
        
        # Initialize directories
        self._initialize_directories()
        
    def _initialize_directories(self) -> None:
        """Create necessary output directories"""
        self.split_dir = self.output_dir / "split_objects"
        self.gcode_dir = self.output_dir / "gcode"
        
        for directory in [self.output_dir, self.split_dir, self.gcode_dir]:
            directory.mkdir(parents=True, exist_ok=True)

    def slice_file(self, 
                file_id: str, 
                user: User, 
                global_settings: Dict, 
                objects_config: List[Dict]) -> List[PrintRequest]:
        """
        Process a slicing request for an STL file
        
        Args:
            file_id: ID of uploaded file to slice
            user: User requesting the slice
            global_settings: Global slicing settings
            objects_config: Per-object configuration settings
            
        Returns:
            List of created PrintRequest objects
            
        Raises:
            ValueError: If file not found or user lacks permission
        """
        # Validate file access
        original_file = UploadedFile.query.get(file_id)
        if not original_file:
            raise ValueError("File not found")
            
        if original_file.user_id != user.id and user.role != 'admin':
            raise ValueError("Access denied")
            
        # Generate unique job name
        job_name = f"job_{uuid.uuid4().hex[:8]}"
        
        logger.info(f"Starting slicing job {job_name} for file {original_file.filename}")
        
        # Run the slicing operation
        output_files = split_and_distribute_objects(
            input_path=str(original_file.file_path),
            file_manager=self.file_manager,
            job_name=job_name,
            object_params=objects_config
        )
        
        if not output_files:
            raise ValueError("No valid objects found or slicing failed")
        
        logger.info(f"Generated {len(output_files)} output files")
        
        # Process each output file
        print_requests = []
        for file_info in output_files:
            print_request = self._create_print_request(
                original_file=original_file,
                user=user,
                file_info=file_info,
                global_settings=global_settings
            )
            
            material = Material.query.filter_by(name=file_info['material']).first()
            color = Color.query.filter_by(name=file_info['color']).first()
            
            # Create Filament record
            filament = Filament(
                id=str(uuid.uuid4()), 
                name=f"{file_info['material']} {file_info['color']}",
                price_per_gram=material.cost_per_gram if material else 25.0,
                print_request_id=print_request.id,
                material_id=material.id if material else None,
                color_id=color.id if color else None
            )
            print_request.filaments.append(filament)
            
            db.session.add(print_request)
            db.session.flush()
            
            # Slice the STL file to generate G-code
            success = slice_with_prusa_slicer(
                file_info['path'],
                self.file_manager,
                job_name,
                file_info['printer'],
                str(self.config_path)
            )
            
            if success:
                print_request.state = "completed"
                self._process_gcode_file(print_request, file_info['path'], job_name)
            else:
                print_request.state = "failed"
                
            print_requests.append(print_request)
            
        db.session.commit()
        return print_requests
        
    def _create_print_request(self, original_file: UploadedFile, user: User, file_info: Dict, global_settings: Dict) -> PrintRequest:
        """
        Create a PrintRequest record
        
        Args:
            original_file: Original uploaded file
            user: User making the request
            file_info: Information about the file
            global_settings: Global slicing settings
            
        Returns:
            Created PrintRequest object
        """
        return PrintRequest(
            id=str(uuid.uuid4()),
            file_path=file_info['path'],
            original_file_id=original_file.id,
            user_id=user.id,
            state="processing",
            filling=global_settings.get('infill', 20),
            layer_height=global_settings.get('layer_height', 0.2),
            printer_id=file_info['printer'].printer_id if hasattr(file_info['printer'], 'printer_id') else None,
            price=file_info.get('price', 0.0),
            weight=file_info.get('weight', 0.0)
        )
    
    def _process_gcode_file(self, print_request: PrintRequest, stl_path: str, job_name: str) -> None:
        """
        Process and link G-code file to print request
        
        Args:
            print_request: PrintRequest to link to
            stl_path: Path to STL file that was sliced
            job_name: Name of the job
        """
        try:
            # Extract material and color from the STL path
            # Assuming the path follows the pattern: ...\group_material_color.stl
            path_parts = os.path.splitext(os.path.basename(stl_path))[0].split('_')
            
            # The group name should be just the material and color, without the 'group_' prefix
            if len(path_parts) >= 3 and path_parts[0] == 'group':
                group_name = '_'.join(path_parts[1:])
            else:
                group_name = '_'.join(path_parts)
            
            logger.info(f"Extracted Group Name: {group_name}")
            
            # Find the gcode file
            gcode_remote_path, gcode_local_path = self.file_manager.get_job_file_paths(job_name, 'gcode', group_name)
            
            logger.info(f"Remote G-code Path: {gcode_remote_path}")
            logger.info(f"Local G-code Path: {gcode_local_path}")
            
            if gcode_local_path and os.path.exists(gcode_local_path):
                logger.info(f"Found G-code file at: {gcode_local_path}")
                logger.info(f"G-code file size: {os.path.getsize(gcode_local_path)} bytes")
                
                # Create GCodeFile record
                gcode_file = GCodeFile(
                    id=str(uuid.uuid4()),
                    file_path=str(gcode_local_path),
                    print_request_id=print_request.id
                )
                db.session.add(gcode_file)
                logger.info(f"Created GCodeFile record for print request {print_request.id}")
            else:
                logger.warning(f"G-code file not found or empty: {gcode_local_path}")
        
        except Exception as e:
            logger.error(f"Error processing G-code file: {e}", exc_info=True)
    
    def get_gcode_file_path(self, request_id: str) -> Optional[Path]:
        """
        Find the G-code file for a print request
        
        Args:
            request_id: ID of the print request
            
        Returns:
            Path to G-code file if found, None otherwise
        """
        print_request = PrintRequest.query.get(request_id)
        if not print_request:
            return None
            
        # If we have a G-code file record with a valid path, use that
        if print_request.gcode_file and os.path.exists(print_request.gcode_file.file_path):
            return Path(print_request.gcode_file.file_path)
            
        # Otherwise try to find it
        stl_path = print_request.file_path
        job_part, group_name = PathUtil.extract_job_info(stl_path)
        
        if not job_part:
            return None
            
        return PathUtil.find_gcode_file(job_part, group_name)
    
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
        """
        Get all print requests for a user
        
        Args:
            user: User to get print requests for
            
        Returns:
            List of PrintRequest objects
        """
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
        
    def get_available_materials(self, printer_id=None) -> Dict:
        """
        Get available materials and their properties
        
        Args:
            printer_id: Optional printer ID to filter by
        
        Returns:
            Dictionary of material names and their properties
        """
        from backend.slicer.config.material_config import get_available_materials
        return get_available_materials(printer_id)

    def get_available_colors(self, material_id=None, printer_id=None) -> Dict:
        """
        Get available colors and their hex codes
        
        Args:
            material_id: Optional material ID to filter by
            printer_id: Optional printer ID to filter by
        
        Returns:
            Dictionary of color names and hex codes
        """
        from backend.slicer.config.material_config import get_available_colors
        return get_available_colors(material_id, printer_id)
        
        
    def update_print_request_status(self, request_id: str, status: str) -> Optional[PrintRequest]:
        """
        Update print request status and check if project is complete
        
        Args:
            request_id: ID of print request
            status: New status value
            
        Returns:
            Updated PrintRequest or None if not found
        """
        try:
            print_request = PrintRequest.query.get(request_id)
            if not print_request:
                return None
            
            print_request.state = status
            db.session.commit()
        
            if status == "completed":
                self._check_project_completion(print_request)
                
            return print_request
        
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to update print request status: {str(e)}")
            return None

    def _check_project_completion(self, completed_request: PrintRequest) -> None:
        """
        Check if all print requests for original file are complete
    
        Args:
            completed_request: A completed print request
        """
        try:
            original_file = completed_request.original_file
        
            # Get all print requests for this original file
            all_requests = PrintRequest.query.filter_by(
                original_file_id=original_file.id
            ).all()
        
            all_completed = all(req.state == "completed" for req in all_requests)
        
            if all_completed:
                logger.info(f"All print requests completed for file {original_file.id}")
            
                user = original_file.user
            
                if self.notification_service:
                    self.notification_service.send_print_project_completed(
                        user.email,
                        original_file,
                        all_requests
                    )
                
        except Exception as e:
            logger.error(f"Error checking project completion: {str(e)}")