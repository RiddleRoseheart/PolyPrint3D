import os
from datetime import datetime
import uuid
from pathlib import Path
from werkzeug.utils import secure_filename
from backend.models.file import File
from typing import Optional, Dict

class FileService:
    """
    Service class for handling file operations including storage and retrieval
    """
    
    def __init__(self, upload_folder: str):
        """
        Initialize FileService with specified upload directory
        
        Args:
            upload_folder (str): Path to directory for file storage
        """
        self.upload_folder = Path(upload_folder)
        self.upload_folder.mkdir(parents=True, exist_ok=True)
        self.files: Dict[str, File] = {}  # Temporary in-memory storage
        
    def save_file(self, file) -> File:
        """
        Save uploaded file and create associated File object
        
        Args:
            file: Uploaded file object from request
            
        Returns:
            File: Created File object with metadata
            
        Raises:
            IOError: If file cannot be saved
        """
        try:
            # Generate unique ID and secure filename
            file_id = str(uuid.uuid4())
            filename = secure_filename(file.filename)
            file_path = self.upload_folder / filename
            
            # Ensure file doesn't already exist
            while file_path.exists():
                file_id = str(uuid.uuid4())
                filename = f"{file_id}_{secure_filename(file.filename)}"
                file_path = self.upload_folder / filename
            
            # Save file
            file.save(str(file_path))
            
            # Create and store File object
            current_time = datetime.now()
            file_obj = File(
                id=file_id,
                filename=filename,
                path=str(file_path),
                status="uploaded",
                created_at=current_time,
                updated_at=current_time
            )
            self.files[file_id] = file_obj
            
            return file_obj
            
        except Exception as e:
            # Clean up any partially saved file
            if file_path.exists():
                file_path.unlink()
            raise IOError(f"Failed to save file: {str(e)}")

    def get_file(self, file_id: str) -> Optional[File]:
        """
        Retrieve File object by ID
        
        Args:
            file_id (str): ID of file to retrieve
            
        Returns:
            Optional[File]: File object if found, None otherwise
        """
        return self.files.get(file_id)

    def delete_file(self, file_id: str) -> bool:
        """
        Delete file and its associated metadata
        
        Args:
            file_id (str): ID of file to delete
            
        Returns:
            bool: True if file was deleted, False if not found
            
        Raises:
            IOError: If file exists but cannot be deleted
        """
        try:
            if file_id in self.files:
                file_obj = self.files[file_id]
                file_path = Path(file_obj.path)
                
                if file_path.exists():
                    file_path.unlink()
                
                del self.files[file_id]
                return True
                
            return False
            
        except Exception as e:
            raise IOError(f"Failed to delete file: {str(e)}")

    def update_file_status(self, file_id: str, status: str) -> Optional[File]:
        """
        Update status of a file
        
        Args:
            file_id (str): ID of file to update
            status (str): New status value
            
        Returns:
            Optional[File]: Updated File object if found, None otherwise
        """
        file_obj = self.files.get(file_id)
        if file_obj:
            file_obj.status = status
            file_obj.updated_at = datetime.now()
            return file_obj
        return None

    def validate_file_exists(self, file_id: str) -> bool:
        """
        Check if file exists both in memory and on disk
        
        Args:
            file_id (str): ID of file to check
            
        Returns:
            bool: True if file exists both in memory and on disk
        """
        file_obj = self.files.get(file_id)
        if file_obj:
            return Path(file_obj.path).exists()
        return False