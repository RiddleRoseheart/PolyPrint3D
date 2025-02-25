from .base_service import BasePrinterService
from typing import List, Optional, Dict
import uuid
from datetime import datetime
import requests
from backend.database.models import Printer
from backend.database.config import db
import logging

logger = logging.getLogger(__name__)

class PrinterManagementService(BasePrinterService):
    """Service for managing printer registration and basic operations"""

    def __init__(self, notification_service=None):
        """
        Initialize printer management service
        
        Args:
            notification_service: Optional notification service
        """
        super().__init__()  
        self.notification_service = notification_service
        
    def verify_printer(self, ip: str, api_key: str) -> bool:
        """
        Verify if given IP is an OctoPrint server
        
        Args:
            ip: Printer IP address
            api_key: OctoPrint API key
            
        Returns:
            bool indicating if server is valid
        """
        try:
            url = self._get_printer_url(ip, "/version")
            response = requests.get(url, headers=self._get_headers(api_key))
            
            if response.status_code == 200:
                logger.info(f"Verified OctoPrint server at {ip}")
                return True
            elif response.status_code == 401:
                logger.error("Invalid API key")
                return False
            else:
                logger.warning(f"Not an OctoPrint server at {ip}")
                return False
                
        except requests.ConnectionError as e:
            logger.error(f"Connection failed to {ip}: {str(e)}")
            return False

    def add_printer(self, name: str, ip_address: str, api_key: str) -> Printer:
        """
        Add new printer to system
        
        Args:
            name: Printer name
            ip_address: Printer IP address
            api_key: OctoPrint API key
            
        Returns:
            Created Printer object
            
        Raises:
            ValueError: If printer configuration is invalid
        """
        if not self.verify_printer(ip_address, api_key):
            raise ValueError("Invalid printer configuration")

        printer = Printer(
            id=str(uuid.uuid4()),
            name=name,
            ip_address=ip_address,
            api_key=api_key,
            status='disconnected',
            created_at=datetime.utcnow()
        )
        
        db.session.add(printer)
        db.session.commit()
        logger.info(f"Added printer: {name}")
        return printer

    def get_all_printers(self) -> List[Printer]:
        """Get all registered printers"""
        return Printer.query.all()

    def get_printer(self, printer_id: str) -> Optional[Printer]:
        """Get specific printer"""
        return Printer.query.get(printer_id)

    def delete_printer(self, printer_id: str) -> bool:
        """
        Delete printer from system
        
        Args:
            printer_id: ID of printer to delete
            
        Returns:
            bool indicating success
        """
        printer = self.get_printer(printer_id)
        if printer:
            db.session.delete(printer)
            db.session.commit()
            logger.info(f"Deleted printer {printer_id}")
            return True
        return False

    def get_printer_status(self, printer_id: str) -> Dict:
        """
        Get comprehensive printer status
        
        Args:
            printer_id: ID of printer
            
        Returns:
            Dict containing status information
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, "/printer")
        response = requests.get(url, headers=self._get_headers(printer.api_key))
        
        if response.status_code == 200:
            status_data = response.json()
            temperatures = status_data.get('temperature', {})
            
            return {
                'state': status_data.get('state', {}),
                'bed_temp': temperatures.get('bed', {}).get('actual'),
                'bed_target': temperatures.get('bed', {}).get('target'),
                'tool_temp': temperatures.get('tool0', {}).get('actual'),
                'tool_target': temperatures.get('tool0', {}).get('target'),
                'flags': status_data.get('state', {}).get('flags', {})
            }
        else:
            raise ValueError("Failed to get printer status")