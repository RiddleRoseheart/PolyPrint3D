from .base_service import BasePrinterService
from typing import Dict, List
import uuid
import requests
from backend.database.models import Printer, PrintRequest
from backend.database.config import db
import logging

logger = logging.getLogger(__name__)

class PrinterJobService(BasePrinterService):
    """Service for managing print jobs"""

    def get_job_status(self, printer_id: str) -> Dict:
        """
        Get current print job status
        
        Args:
            printer_id: ID of printer
            
        Returns:
            Dict containing job status
            
        Raises:
            ValueError: If status retrieval fails
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, "/job")
        response = requests.get(url, headers=self._get_headers(printer.api_key))

        if response.status_code == 200:
            return response.json()
        else:
            raise ValueError("Failed to get job status")

    def cancel_print_job(self, printer_id: str) -> bool:
        """
        Cancel current print job
        
        Args:
            printer_id: ID of printer
            
        Returns:
            bool indicating success
            
        Raises:
            ValueError: If cancellation fails
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, "/job")
        data = {"command": "cancel"}
        
        response = requests.post(
            url, 
            headers=self._get_headers(printer.api_key),
            json=data
        )

        if response.status_code == 204:
            logger.info(f"Cancelled print job on printer {printer_id}")
            return True
        else:
            raise ValueError("Failed to cancel print job")

    def get_available_printers(self) -> List[Printer]:
        """
        Get list of available operational printers
        
        Returns:
            List of printers that are connected and ready
            
        Raises:
            Exception: If printer check fails
        """
        try:
            printers = Printer.query.filter_by(status='connected').all()
            available_printers = []
            
            for printer in printers:
                if self.is_printer_connected(printer.id):
                    job_status = self.get_job_status(printer.id)
                    if job_status.get('state') not in ['Printing', 'Paused']:
                        available_printers.append(printer)
                    
            return available_printers
        except Exception as e:
            logger.error(f"Error getting available printers: {str(e)}")
            raise

    def get_printer_count(self) -> int:
        """Get count of available printers"""
        return len(self.get_available_printers())

    def assign_print_jobs(self, original_file_id: str, sliced_files: List[str]) -> List[PrintRequest]:
        """
        Assign print jobs to available printers
        
        Args:
            original_file_id: ID of original uploaded file
            sliced_files: List of paths to sliced files
            
        Returns:
            List of created print requests
            
        Raises:
            ValueError: If no printers available
            Exception: If assignment fails
        """
        try:
            available_printers = self.get_available_printers()
            if not available_printers:
                raise ValueError("No printers available")

            print_requests = []
            
            for i, file_path in enumerate(sliced_files):
                printer = available_printers[i % len(available_printers)]
                
                print_request = PrintRequest(
                    id=str(uuid.uuid4()),
                    file_path=file_path,
                    original_file_id=original_file_id,
                    printer_id=printer.id,
                    state="queued",
                    created_at=datetime.utcnow()
                )
                
                db.session.add(print_request)
                print_requests.append(print_request)
                
            db.session.commit()
            logger.info(f"Assigned {len(sliced_files)} print jobs to {len(available_printers)} printers")
            return print_requests
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error assigning print jobs: {str(e)}")
            raise