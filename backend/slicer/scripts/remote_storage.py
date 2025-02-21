import paramiko
from pathlib import Path
from typing import Optional, Union
import os

class RemoteStorage:
    def __init__(self, config: dict):
        """
        Initialize remote storage connection.
        
        Args:
            config: Dictionary containing connection details
                   (hostname, username, password, remote_base_path)
        """
        self.config = config
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        self.sftp = None
    
    def connect(self):
        """Establish SFTP connection"""
        try:
            self.ssh.connect(
                self.config['hostname'],
                username=self.config['username'],
                password=self.config['password']
            )
            self.sftp = self.ssh.open_sftp()
            print("Connected to remote storage")
        except Exception as e:
            print(f"Failed to connect to remote storage: {e}")
            raise
    
    def disconnect(self):
        """Close SFTP connection"""
        if self.sftp:
            self.sftp.close()
        if self.ssh:
            self.ssh.close()
        print("Disconnected from remote storage")
    
    def ensure_remote_dir(self, remote_path: str):
        """Ensure remote directory exists, creating it if necessary"""
        try:
            self.sftp.stat(remote_path)
        except FileNotFoundError:
            current_path = ''
            for part in Path(remote_path).parts:
                current_path = os.path.join(current_path, part).replace('\\', '/')
                try:
                    self.sftp.stat(current_path)
                except FileNotFoundError:
                    self.sftp.mkdir(current_path)
            print(f"Created remote directory: {remote_path}")
    
    def upload_file(self, local_path: str, remote_path: str) -> bool:
        """Upload a local file to remote storage"""
        try:
            # Ensure parent directory exists
            parent_dir = str(Path(remote_path).parent)
            self.ensure_remote_dir(parent_dir)
            
            # Upload file
            self.sftp.put(local_path, remote_path)
            return True
        except Exception as e:
            print(f"Failed to upload file {local_path} to {remote_path}: {e}")
            return False
        
        
    def save_file(self, data: Union[bytes, str], remote_path: str) -> bool:
        """Save data to remote file"""
        try:
            # Ensure parent directory exists
            parent_dir = str(Path(remote_path).parent).replace('\\', '/')
            self.ensure_remote_dir(parent_dir)
            
            # Save file
            with self.sftp.open(remote_path, 'wb') as f:
                if isinstance(data, bytes):
                    f.write(data)
                else:
                    f.write(data.encode())
            print(f"Saved file to: {remote_path}")
            return True
        except Exception as e:
            print(f"Failed to save file {remote_path}: {e}")
            return False
    
    def get_file(self, remote_path: str) -> Optional[bytes]:
        """Read file from remote storage"""
        try:
            with self.sftp.open(remote_path, 'rb') as f:
                return f.read()
        except Exception as e:
            print(f"Failed to read file {remote_path}: {e}")
            return None

    def list_directory(self, remote_path: str) -> list:
        """List contents of remote directory"""
        try:
            return self.sftp.listdir(remote_path)
        except Exception as e:
            print(f"Failed to list directory {remote_path}: {e}")
            return []

    def __enter__(self):
        """Context manager entry"""
        self.connect()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        """Context manager exit"""
        self.disconnect()