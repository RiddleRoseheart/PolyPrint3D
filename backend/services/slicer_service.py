from pathlib import Path
from typing import Dict, List, Optional
from backend.slicer.scripts.slicer import split_and_distribute_objects, slice_with_prusa_slicer
from dataclasses import dataclass
from enum import Enum

class SlicingStatus(Enum):
    """Enumeration of possible slicing job statuses"""
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    NOT_FOUND = "not_found"

@dataclass
class SlicingJob:
    """Data class for slicing job information"""
    status: SlicingStatus
    error: Optional[str] = None
    sliced_files: List[Path] = None

class SlicerService:
    """
    Service for handling 3D model slicing operations
    """
    
    def __init__(self, output_dir: str, config_path: str):
        """
        Initialize SlicerService
        
        Args:
            output_dir: Directory for output files
            config_path: Path to slicer configuration file
        """
        self.output_dir = Path(output_dir)
        self.config_path = Path(config_path)
        self.jobs: Dict[str, SlicingJob] = {}
        
        # Initialize directory structure
        self._initialize_directories()
        
    def _initialize_directories(self) -> None:
        """Create necessary output directories"""
        self.split_dir = self.output_dir / "split_objects"
        self.gcode_dir = self.output_dir / "gcode"
        
        for directory in [self.output_dir, self.split_dir, self.gcode_dir]:
            directory.mkdir(parents=True, exist_ok=True)

    def start_slicing(self, file_obj: 'File', printer_count: int = 4) -> None:
        """
        Start a slicing job for given file
        
        Args:
            file_obj: File object containing STL file information
            printer_count: Number of printers to distribute objects across
            
        Raises:
            ValueError: If file_obj is invalid or file doesn't exist
        """
        if not file_obj or not file_obj.id:
            raise ValueError("Invalid file object")
            
        file_path = Path(file_obj.path)
        if not file_path.exists():
            raise ValueError(f"File not found: {file_path}")

        job_id = file_obj.id
        self.jobs[job_id] = SlicingJob(status=SlicingStatus.PROCESSING)

        try:
            # Split STL into multiple parts
            grouped_stl_files = split_and_distribute_objects(
                str(file_path),
                str(self.split_dir),
                printer_count
            )

            if not grouped_stl_files:
                raise ValueError("No valid parts generated from STL file")

            # Process each part
            processed_files = []
            for stl_file in grouped_stl_files:
                output_file = slice_with_prusa_slicer(
                    stl_file, 
                    str(self.gcode_dir), 
                    str(self.config_path)
                )
                processed_files.append(Path(output_file))

            # Update job status
            self.jobs[job_id] = SlicingJob(
                status=SlicingStatus.COMPLETED,
                sliced_files=processed_files
            )

        except Exception as e:
            print(f"Slicing error for job {job_id}: {str(e)}") 
            self.jobs[job_id] = SlicingJob(
                status=SlicingStatus.FAILED,
                error=str(e)
            )

    def get_status(self, job_id: str) -> Dict:
        """
        Get status of a slicing job
        
        Args:
            job_id: ID of the job to check
            
        Returns:
            Dictionary containing job status and any error messages
        """
        job = self.jobs.get(job_id)
        if not job:
            return {"status": SlicingStatus.NOT_FOUND.value}
            
        response = {"status": job.status.value}
        if job.error:
            response["error"] = job.error
        if job.sliced_files:
            response["files"] = [str(f) for f in job.sliced_files]
            
        return response

    def cleanup_job(self, job_id: str) -> bool:
        """
        Clean up files associated with a job
        
        Args:
            job_id: ID of the job to clean up
            
        Returns:
            bool: True if cleanup was successful
        """
        job = self.jobs.get(job_id)
        if not job or not job.sliced_files:
            return False

        try:
            for file_path in job.sliced_files:
                if file_path.exists():
                    file_path.unlink()
            
            del self.jobs[job_id]
            return True
            
        except Exception as e:
            print(f"Cleanup error for job {job_id}: {str(e)}")  
            return False