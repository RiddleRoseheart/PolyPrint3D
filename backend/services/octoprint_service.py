import requests
import logging
import os
from typing import Dict, Optional
from pathlib import Path
from backend.database.models import Printer, PrintRequest

logger = logging.getLogger(__name__)

class OctoPrintService:
    """Service for interacting with OctoPrint printers"""
    
    def __init__(self):
        """Initialize OctoPrint service"""
        self.logger = logging.getLogger(__name__)
        
    def _get_headers(self, api_key: str) -> Dict:
        """Create HTTP headers for OctoPrint API requests"""
        return {
            'X-Api-Key': api_key,
            'Content-Type': 'application/json'
        }
    
    def check_printer_status(self, ip_address: str, api_key: str) -> Dict:
        """
        Check the status of a printer
        
        Args:
            ip_address: Printer IP address
            api_key: OctoPrint API key
            
        Returns:
            Dict with printer status information
        """
        try:
            url = f"http://{ip_address}/api/printer"
            headers = self._get_headers(api_key)
            
            response = requests.get(url, headers=headers, timeout=5)
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(f"Failed to check printer status: {response.status_code} - {response.text}")
                return {"status": "error", "message": "Failed to connect to printer"}
                
        except Exception as e:
            self.logger.error(f"Error checking printer status: {str(e)}")
            return {"status": "error", "message": str(e)}
    
    def upload_gcode_file(self, printer: Printer, gcode_path: Path, print_request: PrintRequest) -> bool:
        """
        Upload G-code file to OctoPrint server
        
        Args:
            printer: Printer model object
            gcode_path: Path to G-code file
            print_request: Associated print request
            
        Returns:
            bool indicating success
        """
        try:
            if not gcode_path.exists():
                self.logger.error(f"G-code file not found: {gcode_path}")
                return False
                
            url = f"http://{printer.ip_address}/api/files/local"
            
            # Create multipart form data
            files = {
                'file': (gcode_path.name, open(gcode_path, 'rb'), 'application/octet-stream')
            }
            
            data = {
                'select': 'true',
                'print': 'false'  
            }
            
            headers = {
                'X-Api-Key': printer.api_key
            }
            
            response = requests.post(url, files=files, data=data, headers=headers)
            
            if response.status_code == 201:
                self.logger.info(f"Successfully uploaded {gcode_path.name} to printer {printer.name}")
                return True
            else:
                self.logger.error(f"Failed to upload G-code: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error uploading G-code: {str(e)}")
            return False
            
    def start_print_job(self, printer: Printer, filename: str) -> bool:
        """
        Start a print job on the specified printer
        
        Args:
            printer: Printer model object
            filename: Name of G-code file to print
            
        Returns:
            bool indicating success
        """
        try:
            # First, select the file
            select_url = f"http://{printer.ip_address}/api/files/local/{filename}"
            headers = self._get_headers(printer.api_key)
            
            select_data = {
                "command": "select"
            }
            
            select_response = requests.post(select_url, headers=headers, json=select_data)
            
            if select_response.status_code not in (200, 204):
                self.logger.error(f"Failed to select file: {select_response.status_code} - {select_response.text}")
                return False
                
            # Then, start the print job
            job_url = f"http://{printer.ip_address}/api/job"
            
            print_data = {
                "command": "start"
            }
            
            print_response = requests.post(job_url, headers=headers, json=print_data)
            
            if print_response.status_code in (200, 204):
                self.logger.info(f"Successfully started print job {filename} on printer {printer.name}")
                return True
            else:
                self.logger.error(f"Failed to start print job: {print_response.status_code} - {print_response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error starting print job: {str(e)}")
            return False
            
    def cancel_print_job(self, printer: Printer) -> bool:
        """
        Cancel the current print job
        
        Args:
            printer: Printer model object
            
        Returns:
            bool indicating success
        """
        try:
            url = f"http://{printer.ip_address}/api/job"
            headers = self._get_headers(printer.api_key)
            
            data = {
                "command": "cancel"
            }
            
            response = requests.post(url, headers=headers, json=data)
            
            if response.status_code in (200, 204):
                self.logger.info(f"Successfully cancelled print job on printer {printer.name}")
                return True
            else:
                self.logger.error(f"Failed to cancel print job: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            self.logger.error(f"Error cancelling print job: {str(e)}")
            return False
    
    def get_job_status(self, printer: Printer) -> Dict:
        """
        Get the status of the current print job
        
        Args:
            printer: Printer model object
            
        Returns:
            Dict with job status information
        """
        try:
            url = f"http://{printer.ip_address}/api/job"
            headers = self._get_headers(printer.api_key)
            
            response = requests.get(url, headers=headers)
            
            if response.status_code == 200:
                return response.json()
            else:
                self.logger.error(f"Failed to get job status: {response.status_code} - {response.text}")
                return {"status": "error", "message": "Failed to get job status"}
                
        except Exception as e:
            self.logger.error(f"Error getting job status: {str(e)}")
            return {"status": "error", "message": str(e)}