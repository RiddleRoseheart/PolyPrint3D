from pathlib import Path
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename
from typing import Optional, List
from flask import current_app
import logging
from backend.database.config import db
from backend.database.models import UploadedFile, User, UserRole

logger = logging.getLogger(__name__)

class FileService:
    """Service class for handling file operations with user permissions"""
    
    def __init__(self, upload_folder: str | Path):
        """
        Initialize FileService
        
        Args:
            upload_folder: Path to directory for file storage (str or Path)
        """
        self.upload_folder = Path(upload_folder)
        self.upload_folder.mkdir(parents=True, exist_ok=True)
        
    def validate_file(self, file) -> bool:
        """Validate uploaded file"""
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
        """Get all files owned by user"""
        try:
            return UploadedFile.query.filter_by(user_id=user.id).order_by(UploadedFile.created_at.desc()).all()
        except Exception as e:
            logger.error(f"Error fetching user files: {str(e)}")
            raise

    def get_all_files(self) -> List[UploadedFile]:
        """Get all files (admin only)"""
        try:
            return UploadedFile.query.order_by(UploadedFile.created_at.desc()).all()
        except Exception as e:
            logger.error(f"Error fetching all files: {str(e)}")
            raise

    def get_file(self, file_id: str, user: User) -> Optional[UploadedFile]:
        """Get file if user has permission"""
        try:
            logger.info(f"Fetching file {file_id} for user {user.id} (role: {user.role})")
            file_obj = UploadedFile.query.get(file_id)
            if file_obj and (file_obj.user_id == user.id or user.role == UserRole.ADMIN.value):
                return file_obj
            logger.error(f"Access denied for user {user.id} to file {file_id}")
            return None
        except Exception as e:
            logger.error(f"Error fetching file {file_id}: {str(e)}")
            raise

    def delete_file(self, file_id: str, user: User) -> bool:
        """Delete file if user has permission"""
        try:
            file_obj = self.get_file(file_id, user)
            if not file_obj:
                return False

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
            raise