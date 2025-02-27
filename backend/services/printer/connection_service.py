from .base_service import BasePrinterService
from typing import Dict
import requests
from backend.database.config import db
import logging

logger = logging.getLogger(__name__)

class PrinterConnectionService(BasePrinterService):
    """Service for handling printer connections"""

    def connect_printer(self, printer_id: str) -> None:
        """
        Connect to printer
        
        Args:
            printer_id: ID of printer to connect
            
        Raises:
            ValueError: If connection fails
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, "/connection")
        data = {
            "command": "connect",
            "port": "/dev/ttyUSB0",
            "baudrate": 115200,
            "save": True,
            "autoconnect": True
        }

        response = requests.post(
            url, 
            headers=self._get_headers(printer.api_key),
            json=data
        )

        if response.status_code == 204:
            printer.status = 'connected'
            db.session.commit()
            logger.info(f"Connected printer {printer_id}")
        else:
            raise ValueError("Failed to connect printer")

    def disconnect_printer(self, printer_id: str) -> None:
        """
        Disconnect from printer
        
        Args:
            printer_id: ID of printer to disconnect
            
        Raises:
            ValueError: If disconnection fails
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, "/connection")
        data = {"command": "disconnect"}

        response = requests.post(
            url,
            headers=self._get_headers(printer.api_key),
            json=data
        )

        if response.status_code == 204:
            printer.status = 'disconnected'
            db.session.commit()
            logger.info(f"Disconnected printer {printer_id}")
        else:
            raise ValueError("Failed to disconnect printer")

    def get_connection_info(self, printer_id: str) -> Dict:
        """
        Get printer connection information
        
        Args:
            printer_id: ID of printer
            
        Returns:
            Dict containing connection information
            
        Raises:
            ValueError: If info retrieval fails
        """
        printer = self._get_printer(printer_id)
        url = self._get_printer_url(printer.ip_address, "/connection")
        response = requests.get(url, headers=self._get_headers(printer.api_key))
        
        if response.status_code == 200:
            return response.json()
        else:
            raise ValueError("Failed to get connection info")

    def is_printer_connected(self, printer_id: str) -> bool:
        """
        Check if printer is currently connected
        
        Args:
            printer_id: ID of printer
            
        Returns:
            bool indicating connection status
        """
        try:
            info = self.get_connection_info(printer_id)
            return info['current']['state'] == 'Operational'
        except Exception as e:
            logger.error(f"Connection check failed: {str(e)}")
            return False