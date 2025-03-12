from pathlib import Path
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename
from typing import Optional, List, Union, Dict, Any
import logging
import os
import trimesh
from backend.database.config import db
from backend.database.models import UploadedFile, User, UserRole
from backend.utils import ResponseBuilder

logger = logging.getLogger(__name__)

class FileService:
    """Service class for handling file operations with user permissions"""
    
    def __init__(self, upload_folder: Union[str, Path]):
        """
        Initialize FileService
        
        Args:
            upload_folder: Path to directory for file storage (str or Path)
        """
        self.upload_folder = Path(upload_folder)
        self.upload_folder.mkdir(parents=True, exist_ok=True)
        
    def validate_file(self, file) -> bool:
        """
        Validate uploaded file
        
        Args:
            file: File object to validate
            
        Returns:
            bool: True if file is valid
            
        Raises:
            ValueError: If file is invalid
        """
        if not file or file.filename == '':
            raise ValueError("No file provided")
            
        if not file.filename.lower().endswith('.stl'):
            raise ValueError("Invalid file type - only STL files allowed")
        
        return True
    
    def save_file(self, file, user: User) -> UploadedFile:
        """
        Save uploaded file and create database entry
        
        Args:
            file: Uploaded file object
            user: User who uploaded the file
            
        Returns:
            UploadedFile: Created file object
            
        Raises:
            ValueError: If file is invalid
            IOError: If file cannot be saved
        """
        try:
            self.validate_file(file)
            
            file_id = str(uuid.uuid4())
            filename = secure_filename(file.filename)
            file_path = self.upload_folder / f"{file_id}_{filename}"
            
            file.save(str(file_path))
            
            file_obj = UploadedFile(
                id=file_id,
                filename=filename,
                file_path=str(file_path),
                status="uploaded",
                created_at=datetime.utcnow(),
                user_id=user.id
            )
            
            db.session.add(file_obj)
            db.session.commit()
            
            logger.info(f"File {filename} uploaded by user {user.id}")
            return file_obj
        
        except Exception as e:
            db.session.rollback()
            if isinstance(e, ValueError):
                raise
            logger.error(f"File save error: {str(e)}")
            raise IOError(f"Failed to save file: {str(e)}")

    def get_user_files(self, user: User) -> List[UploadedFile]:
        """
        Get all files owned by user
        
        Args:
            user: User to get files for
            
        Returns:
            List[UploadedFile]: List of user's files
        """
        try:
            return UploadedFile.query.filter_by(user_id=user.id).order_by(UploadedFile.created_at.desc()).all()
        except Exception as e:
            logger.error(f"Error fetching user files: {str(e)}")
            raise

    def get_all_files(self) -> List[UploadedFile]:
        """
        Get all files (admin only)
        
        Returns:
            List[UploadedFile]: List of all files
        """
        try:
            return UploadedFile.query.order_by(UploadedFile.created_at.desc()).all()
        except Exception as e:
            logger.error(f"Error fetching all files: {str(e)}")
            raise

    def get_file(self, file_id: str, user: User) -> Optional[UploadedFile]:
        """
        Get file if user has permission
        
        Args:
            file_id: ID of file to retrieve
            user: User requesting the file
            
        Returns:
            Optional[UploadedFile]: File object if found and accessible, None otherwise
        """
        try:
            file_obj = UploadedFile.query.get(file_id)
            if file_obj and (file_obj.user_id == user.id or user.role == UserRole.ADMIN.value):
                return file_obj
            return None
        except Exception as e:
            logger.error(f"Error fetching file {file_id}: {str(e)}")
            raise

    def delete_file(self, file_id: str, user: User) -> bool:
        """
        Delete file if user has permission
        
        Args:
            file_id: ID of file to delete
            user: User requesting deletion
            
        Returns:
            bool: True if deletion successful
            
        Raises:
            ValueError: If file not found or permission denied
            IOError: If file cannot be deleted
        """
        try:
            file_obj = self.get_file(file_id, user)
            if not file_obj:
                raise ValueError("File not found or permission denied")

            file_path = Path(file_obj.file_path)
            if file_path.exists():
                file_path.unlink()
            
            # Delete associated print requests if any
            for pr in file_obj.print_requests:
                db.session.delete(pr)
            
            db.session.delete(file_obj)
            db.session.commit()
            
            logger.info(f"File {file_id} deleted by user {user.id}")
            return True

        except Exception as e:
            db.session.rollback()
            logger.error(f"Error deleting file {file_id}: {str(e)}")
            if isinstance(e, ValueError):
                raise
            raise IOError(f"Failed to delete file: {str(e)}")
        
    def analyze_file(self, file_id: str, user: User) -> Dict[str, Any]:
        """
        Analyze STL file to identify separate objects and calculate properties
        """
        file_obj = self.get_file(file_id, user)
        if not file_obj:
            raise ValueError("File not found or access denied")
            
        try:
            # Load and analyze STL file
            mesh = trimesh.load_mesh(str(file_obj.file_path))
            
            # Split into components
            from backend.slicer.scripts.slicer import split_disconnected_components
            components = split_disconnected_components(mesh)
            
            # Create temporary directory for object files - make sure this path is consistent
            app_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            temp_dir = os.path.join(app_root, 'output', 'temp_objects', file_id)
            
            # Ensure temp directory exists and is empty
            if os.path.exists(temp_dir):
                import shutil
                shutil.rmtree(temp_dir)
            os.makedirs(temp_dir, exist_ok=True)
            
            logger.info(f"Created temp directory at: {temp_dir}")
            
            # Process each component
            objects_info = []
            for i, obj in enumerate(components):
                # Generate a file for this object
                obj_file_path = os.path.join(temp_dir, f'object_{i+1}.stl')
                
                try:
                    obj.export(obj_file_path)
                    logger.info(f"Exported object {i+1} to {obj_file_path}")
                    
                    # Verify file was created
                    if not os.path.exists(obj_file_path):
                        logger.error(f"Failed to create object file at {obj_file_path}")
                    else:
                        logger.info(f"Object file created successfully: {obj_file_path}, size: {os.path.getsize(obj_file_path)} bytes")
                except Exception as e:
                    logger.error(f"Error exporting object {i+1}: {str(e)}")
                    raise
                
                # Create object info
                objects_info.append({
                    'id': i + 1,
                    'volume': float(obj.volume),
                    'face_count': len(obj.faces),
                    'material': 'PLA',
                    'color': 'White',
                    'preview_url': f'/api/files/{file_id}/objects/{i+1}'
                })
                
            return {
                'object_count': len(objects_info),
                'objects': objects_info
            }
                
        except Exception as e:
            logger.error(f"STL analysis error: {str(e)}")
            raise IOError(f"Failed to analyze STL file: {str(e)}")