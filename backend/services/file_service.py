from pathlib import Path
from datetime import datetime
import uuid
from werkzeug.utils import secure_filename
from typing import Optional, List
from flask import current_app
import logging
from backend.database.config import db
from backend.database.models import UploadedFile, User

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
            file_id = str(uuid.uuid4())
            filename = secure_filename(file.filename)
            file_name = f"{file_id}_{filename}"
            file_path = self.upload_folder / file_name
            
            # Save file
            file.save(str(file_path))
            
            # Create database entry
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
            
            logger.info(f"File saved: {filename} by user {user.id}")
            return file_obj
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error saving file: {str(e)}")
            raise

    def get_user_files(self, user: User) -> List[UploadedFile]:
        """Get all files for a specific user"""
        return UploadedFile.query.filter_by(user_id=user.id).all()
    
    def get_all_files(self) -> List[UploadedFile]:
        """Get all files (admin only)"""
        return UploadedFile.query.all()

    def get_file(self, file_id: str, user: User) -> Optional[UploadedFile]:
        """
        Get file if user has permission
        
        Args:
            file_id: ID of file to retrieve
            user: User requesting the file
            
        Returns:
            UploadedFile if found and user has permission, None otherwise
        """
        file_obj = UploadedFile.query.get(file_id)
        if file_obj and (file_obj.user_id == user.id or user.role == 'admin'):
            return file_obj
        return None

    def delete_file(self, file_id: str, user: User) -> bool:
        """
        Delete file if user has permission
        
        Args:
            file_id: ID of file to delete
            user: User requesting deletion
            
        Returns:
            bool: True if deleted, False if not found or no permission
            
        Raises:
            IOError: If file exists but cannot be deleted
        """
        file_obj = UploadedFile.query.get(file_id)
        if file_obj and (file_obj.user_id == user.id or user.role == 'admin'):
            try:
                file_path = Path(file_obj.file_path)
                if file_path.exists():
                    file_path.unlink()
                
                db.session.delete(file_obj)
                db.session.commit()
                logger.info(f"File deleted: {file_id} by user {user.id}")
                return True
            except Exception as e:
                db.session.rollback()
                logger.error(f"Error deleting file: {str(e)}")
                raise
        return False