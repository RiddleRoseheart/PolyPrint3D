import paramiko
from pathlib import Path
import os
from datetime import datetime
import re

class FileManager:
    def __init__(self, host, username, password, remote_path):
        """Initialize FileManager with SFTP connection."""
        self.host = host
        self.username = username
        self.remote_path = remote_path
        
        # Initialize SSH client
        self.ssh = paramiko.SSHClient()
        self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        try:
            print(f"Connecting to {username}@{host}...")
            self.ssh.connect(host, username=username, password=password)
            self.sftp = self.ssh.open_sftp()
            print("Successfully connected via SFTP")
            
            # Test remote path
            try:
                self.sftp.chdir(remote_path)
                print(f"Accessed remote path: {remote_path}")
                print("\nCurrent directory contents:")
                for item in self.sftp.listdir():
                    print(f"  {item}")
            except IOError as e:
                print(f"Error accessing remote path: {e}")
                raise
                
        except Exception as e:
            print(f"Connection failed: {e}")
            raise
    
    def __del__(self):
        """Clean up SFTP and SSH connections."""
        if hasattr(self, 'sftp'):
            self.sftp.close()
        if hasattr(self, 'ssh'):
            self.ssh.close()
    
    def generate_unique_folder_name(self, prefix="job"):
        """Generate a unique folder name using timestamp."""
        timestamp = datetime.now().strftime("%Y%m%d")
        pattern = f"{prefix}_{timestamp}_\\d+"
        
        try:
            existing_folders = [
                f for f in self.sftp.listdir(self.remote_path)
                if re.match(pattern, f)
            ]
        except IOError:
            existing_folders = []
        
        if not existing_folders:
            increment = 1
        else:
            increments = [
                int(re.search(f"{prefix}_{timestamp}_(\\d+)", folder).group(1))
                for folder in existing_folders
            ]
            increment = max(increments) + 1
            
        return f"{prefix}_{timestamp}_{str(increment).zfill(3)}"
    
    def create_job_folders(self, job_name):
        """Create job folders structure on remote server."""
        job_path = f"{self.remote_path}/{job_name}"
        stl_path = f"{job_path}/stl"
        gcode_path = f"{job_path}/gcode"
        
        print(f"Creating job folders at: {job_path}")
        
        try:
            # Create directories
            self.mkdir_p(job_path)
            self.mkdir_p(stl_path)
            self.mkdir_p(gcode_path)
            
            print(f"Created STL folder: {stl_path}")
            print(f"Created G-code folder: {gcode_path}")
            
            return {
                'stl': stl_path,
                'gcode': gcode_path
            }
        except IOError as e:
            print(f"Error creating folders: {e}")
            raise
    
    def get_job_file_path(self, job_name, file_type, group_number):
        """Generate remote file path."""
        if file_type == 'stl':
            extension = '.stl'
        elif file_type == 'gcode':
            extension = '.gcode'
        else:
            raise ValueError(f"Unsupported file type: {file_type}")
        
        file_name = f"group_{group_number}{extension}"
        return f"{self.remote_path}/{job_name}/{file_type}/{file_name}"
    
    def mkdir_p(self, remote_directory):
        """Create remote directory and parents if they don't exist."""
        if remote_directory == '/':
            return
        
        try:
            self.sftp.stat(remote_directory)
        except IOError:
            parent = os.path.dirname(remote_directory)
            self.mkdir_p(parent)
            self.sftp.mkdir(remote_directory)
    
    def save_file(self, data, remote_path):
        """Save data to remote file."""
        try:
            with self.sftp.open(remote_path, 'wb') as f:
                if isinstance(data, bytes):
                    f.write(data)
                else:
                    f.write(str(data).encode())
        except IOError as e:
            print(f"Error saving file: {e}")