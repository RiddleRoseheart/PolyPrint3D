from .base_service import BasePrinterService
from typing import Dict
import os
from requests_toolbelt.multipart import encoder
import requests
import logging

logger = logging.getLogger(__name__)

class PrinterFileService(BasePrinterService):
    """Service for managing printer files"""

    def get_printer_files(self, printer_id: str) -> Dict:
        """
        Get all files on printer
        
        Args:
            printer_id: ID of printer
            
        Returns:
            Dict containing file information
            
        Raises:
            ValueError: If retrieval fails
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, "/files")
        response = requests.get(url, headers=self._get_headers(printer.api_key))

        if response.status_code == 200:
            return response.json()
        else:
            raise ValueError("Failed to get printer files")

    def upload_gcode(self, printer_id: str, file_path: str, auto_select: bool = True, auto_print: bool = False) -> Dict:
        """
        Upload G-code file to printer
        
        Args:
            printer_id: ID of printer
            file_path: Path to G-code file
            auto_select: Whether to select file after upload
            auto_print: Whether to start printing after upload
            
        Returns:
            Dict containing upload response
            
        Raises:
            ValueError: If upload fails
        """
        printer = self._get_printer(printer_id)
        if not os.path.exists(file_path):
            raise ValueError("File not found")

        url = self._get_printer_url(printer.ip_address, "/files/local")
        
        e = encoder.MultipartEncoder(
            fields={
                'file': (os.path.basename(file_path), open(file_path, 'rb'), 'application/octet-stream'),
                'select': str(auto_select).lower(),
                'print': str(auto_print).lower()
            }
        )

        headers = {
            'X-Api-Key': printer.api_key,
            'Content-Type': e.content_type
        }

        response = requests.post(url, headers=headers, data=e)
        
        if response.status_code == 201:
            logger.info(f"Uploaded file {file_path} to printer {printer_id}")
            return response.json()
        else:
            raise ValueError("Failed to upload file")

    def delete_printer_file(self, printer_id: str, filename: str) -> bool:
        """
        Delete file from printer
        
        Args:
            printer_id: ID of printer
            filename: Name of file to delete
            
        Returns:
            bool indicating success
            
        Raises:
            ValueError: If deletion fails
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, f"/files/local/{filename}")
        response = requests.delete(url, headers=self._get_headers(printer.api_key))

        if response.status_code == 204:
            logger.info(f"Deleted file {filename} from printer {printer_id}")
            return True
        elif response.status_code == 404:
            raise ValueError("File not found")
        elif response.status_code == 409:
            raise ValueError("File is currently being printed")
        else:
            raise ValueError("Failed to delete file")