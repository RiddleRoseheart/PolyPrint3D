# backend/services/printer/base_service.py
from typing import Dict
import logging
import requests

logger = logging.getLogger(__name__)

class BasePrinterService:
    """Base service with common printer utilities"""

    def _get_headers(self, api_key: str) -> Dict:
        """
        Get standard headers for OctoPrint requests
        
        Args:
            api_key: OctoPrint API key
            
        Returns:
            Dict containing required headers
        """
        return {
            'X-Api-Key': api_key,
            'Content-Type': 'application/json'
        }

    def _get_printer_url(self, ip: str, endpoint: str = "") -> str:
        """
        Get formatted OctoPrint URL
        
        Args:
            ip: Printer IP address
            endpoint: API endpoint
            
        Returns:
            Complete OctoPrint API URL
        """
        return f"http://{ip}/api{endpoint}"

    def _get_printer(self, printer_id: str) -> 'Printer':
        """
        Get printer by ID with validation
        
        Args:
            printer_id: ID of printer
            
        Returns:
            Printer object
            
        Raises:
            ValueError: If printer not found
        """
        from backend.database.models import Printer
        printer = Printer.query.get(printer_id)
        if not printer:
            raise ValueError("Printer not found")
        return printer