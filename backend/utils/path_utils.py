from pathlib import Path
import os
import glob
import logging
from typing import Optional, Tuple, Dict, Any

logger = logging.getLogger(__name__)

class PathUtil:
    """Utility class for handling file path operations consistently across the application."""
    
    @staticmethod
    def find_gcode_file(job_part: str, group_name: str, root_dir: str = None) -> Optional[Path]:
        """
        Find a gcode file based on job name and group name.
        
        Args:
            job_part: Job identifier (e.g., 'job_703a37f5')
            group_name: Group/object identifier (e.g., 'pla_white')
            root_dir: Root directory to start search from (default: current working directory)
            
        Returns:
            Path to gcode file if found, None otherwise
        """
        if not root_dir:
            root_dir = os.path.abspath(os.getcwd())
            
        logger.info(f"Searching for gcode with job: {job_part}, group: {group_name}")
        
        # Try exact match first
        gcode_pattern = f"**/{job_part}/**/gcode/{group_name}.gcode"
        logger.info(f"Searching with pattern: {gcode_pattern}")
        
        matching_files = glob.glob(os.path.join(root_dir, gcode_pattern), recursive=True)
        
        if matching_files:
            return Path(matching_files[0])
            
        # Try broader search
        broader_pattern = f"**/{job_part}/**/gcode/*.gcode"
        broader_matches = glob.glob(os.path.join(root_dir, broader_pattern), recursive=True)
        
        if broader_matches:
            return Path(broader_matches[0])
            
        # Last resort - search for any gcode file with matching job name
        last_resort_pattern = f"**/*{job_part}*/**/*.gcode"
        last_resort_matches = glob.glob(os.path.join(root_dir, last_resort_pattern), recursive=True)
        
        if last_resort_matches:
            return Path(last_resort_matches[0])
            
        return None
    
    @staticmethod
    def extract_job_info(file_path: str) -> Tuple[Optional[str], Optional[str]]:
        """
        Extract job name and group name from a file path.
        
        Args:
            file_path: Path to extract information from
            
        Returns:
            Tuple of (job_name, group_name) if found, (None, None) otherwise
        """
        path = Path(file_path)
        
        # Extract job_name from path (e.g. job_703a37f5)
        job_part = None
        for part in path.parts:
            if part.startswith('job_'):
                job_part = part
                break
        
        # Extract group name from filename (e.g. group_pla_white)
        filename = path.name
        group_name = os.path.splitext(filename)[0]
        
        return job_part, group_name
    
