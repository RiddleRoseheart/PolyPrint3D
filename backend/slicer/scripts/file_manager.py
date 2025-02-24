import paramiko
from pathlib import Path
import os
from datetime import datetime
import re
import shutil
 
class FileManager:
#    def __init__(self, host, username, password, remote_path, local_output_path="backend/slicer/output"):
#         """
#         Initialize FileManager with SFTP connection and local output path.
       
#         Args:
#             host: Remote server hostname
#             username: SSH username
#             password: SSH password
#             remote_path: Base path on remote server
#             local_output_path: Base path for local output (default: backend/slicer/output)
#         """
#         self.host = host
#         self.username = username
#         self.remote_path = remote_path
#         self.local_output_path = Path(local_output_path)
       
#         # Initialize SSH client
#         self.ssh = paramiko.SSHClient()
#         self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
       
#         try:
#             print(f"Connecting to {username}@{host}...")
#             self.ssh.connect(host, username=username, password=password)
#             self.sftp = self.ssh.open_sftp()
#             print("Successfully connected via SFTP")
           
#             # Test remote path
#             try:
#                 self.sftp.chdir(remote_path)
#                 print(f"Accessed remote path: {remote_path}")
#             except IOError as e:
#                 print(f"Error accessing remote path: {e}")
#                 raise
               
#         except Exception as e:
#             print(f"Connection failed: {e}")
#             raise
       
#         # Ensure local output directory exists
#         self.local_output_path.mkdir(parents=True, exist_ok=True)
   
    def __init__(self, host, username, password, remote_path, local_output_path="backend/slicer/output"):
        # First check if we have valid server details
        if not all([host, username, password, remote_path]):
            print("Missing server configuration - operating in local mode only")
            self.local_output_path = Path(local_output_path)
            self.local_output_path.mkdir(parents=True, exist_ok=True)
            self.is_connected = False
            return

        # Try to set up SSH connection
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(host, username=username, password=password)
            self.sftp = self.ssh.open_sftp()
            self.is_connected = True
            print("Successfully connected via SFTP")
        except Exception as e:
            print(f"SFTP connection failed: {e}")
            self.is_connected = False
   
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
        """
        Create job folders structure on both remote server and locally.
       
        Args:
            job_name: Name of the job folder
           
        Returns:
            Dictionary containing paths for both remote and local folders
        """
        # Remote paths
        remote_job_path = f"{self.remote_path}/{job_name}"
        remote_stl_path = f"{remote_job_path}/stl"
        remote_gcode_path = f"{remote_job_path}/gcode"
       
        # Local paths
        local_job_path = self.local_output_path / job_name
        local_stl_path = local_job_path / "stl"
        local_gcode_path = local_job_path / "gcode"
       
        print(f"Creating job folders...")
        print(f"Remote: {remote_job_path}")
        print(f"Local: {local_job_path}")
       
        try:
            # Create remote directories
            self.mkdir_p(remote_job_path)
            self.mkdir_p(remote_stl_path)
            self.mkdir_p(remote_gcode_path)
           
            # Create local directories
            local_job_path.mkdir(parents=True, exist_ok=True)
            local_stl_path.mkdir(parents=True, exist_ok=True)
            local_gcode_path.mkdir(parents=True, exist_ok=True)
           
            return {
                'remote': {
                    'base': remote_job_path,
                    'stl': remote_stl_path,
                    'gcode': remote_gcode_path
                },
                'local': {
                    'base': local_job_path,
                    'stl': local_stl_path,
                    'gcode': local_gcode_path
                }
            }
        except Exception as e:
            print(f"Error creating folders: {e}")
            raise
   
    def get_job_file_path(self, job_name, file_type, group_number):
        """
        Generate remote file path for a job file.
       
        Args:
            job_name: Name of the job folder
            file_type: 'stl' or 'gcode'
            group_number: Number for the group file
           
        Returns:
            str: Remote file path
        """
        if file_type not in ['stl', 'gcode']:
            raise ValueError(f"Unsupported file type: {file_type}")
       
        extension = f".{file_type}"
        file_name = f"group_{group_number}{extension}"
       
        return f"{self.remote_path}/{job_name}/{file_type}/{file_name}"
 
    def get_job_file_paths(self, job_name, file_type, group_number):
        """
        Generate both remote and local file paths.
       
        Args:
            job_name: Name of the job folder
            file_type: 'stl' or 'gcode'
            group_number: Number for the group file
           
        Returns:
            Tuple of (remote_path, local_path)
        """
        remote_path = self.get_job_file_path(job_name, file_type, group_number)
        local_path = self.local_output_path / job_name / file_type / f"group_{group_number}.{file_type}"
       
        return remote_path, str(local_path)
   
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
   
    def save_file(self, data, remote_path, local_path=None):
        """
        Save data to both remote and local files.
       
        Args:
            data: File data as bytes or string
            remote_path: Path on remote server
            local_path: Optional local path (if None, won't save locally)
        """
        try:
            # Save remotely
            parent_dir = os.path.dirname(remote_path)
            self.mkdir_p(parent_dir)
           
            with self.sftp.open(remote_path, 'wb') as f:
                if isinstance(data, bytes):
                    f.write(data)
                else:
                    f.write(str(data).encode())
            print(f"Successfully saved file to: {remote_path}")
           
            # Save locally if path provided
            if local_path:
                local_path = Path(local_path)
                local_path.parent.mkdir(parents=True, exist_ok=True)
               
                mode = 'wb' if isinstance(data, bytes) else 'w'
                with open(local_path, mode) as f:
                    if isinstance(data, bytes):
                        f.write(data)
                    else:
                        f.write(str(data))
                print(f"Successfully saved file locally to: {local_path}")
               
        except Exception as e:
            print(f"Error saving file: {e}")
            raise
 
    def cleanup_local_temp(self, temp_dir):
        """
        Clean up temporary directory while preserving job output.
       
        Args:
            temp_dir: Path to temporary directory
        """
        try:
            if Path(temp_dir).exists():
                shutil.rmtree(temp_dir)
                print(f"Cleaned up temporary directory: {temp_dir}")
        except Exception as e:
            print(f"Warning: Could not clean up temporary directory: {e}")
   
    def list_directory(self, path=None):
        """
        List contents of a directory on the remote server.
       
        Args:
            path: Optional path to list (defaults to remote_path)
           
        Returns:
            List of filenames
        """
        try:
            dir_path = path if path else self.remote_path
            return self.sftp.listdir(dir_path)
        except IOError as e:
            print(f"Error listing directory {dir_path}: {e}")
            return []
   
    def check_file_exists(self, remote_path):
        """
        Check if a file exists on the remote server.
       
        Args:
            remote_path: Path to check
           
        Returns:
            bool: True if file exists, False otherwise
        """
        try:
            self.sftp.stat(remote_path)
            return True
        except IOError:
            return False