import os
import sys
import logging
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),  # Console output
        logging.FileHandler("app.log")  # File logging
    ]
)
logger = logging.getLogger(__name__)

# Add project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Load environment variables
load_dotenv()

# Import necessary modules
from backend.database.models import Printer
from backend.database.config import db
from backend.services.printer import PrinterService

# Import the Flask app
from backend.main import app  # Import the pre-created app instance

class PrinterIntegrationTest:
    def __init__(self):
        # Initialize printer service
        self.printer_service = PrinterService()
        
        # Shared credentials
        self.username = os.getenv('PRINTER_USERNAME')
        self.password = os.getenv('PRINTER_PASSWORD')
        
        # Store the Flask app reference
        self.app = app
        
        # Printer configurations
        self.printer_configs = [
            {
                'name': 'Printer 1',
                'ip': os.getenv('PRINTER1_IP'),
                'api_key': os.getenv('PRINTER1_API_KEY'),
                'username': self.username,
                'password': self.password
            },
            {
                'name': 'Printer 2',
                'ip': os.getenv('PRINTER2_IP'),
                'api_key': os.getenv('PRINTER2_API_KEY'),
                'username': self.username,
                'password': self.password
            },
            {
                'name': 'Printer 3',
                'ip': os.getenv('PRINTER3_IP'),
                'api_key': os.getenv('PRINTER3_API_KEY'),
                'username': self.username,
                'password': self.password
            },
            {
                'name': 'Printer 4',
                'ip': os.getenv('PRINTER4_IP'),
                'api_key': os.getenv('PRINTER4_API_KEY'),
                'username': self.username,
                'password': self.password
            }
        ]

    def test_printer_connections(self):
        """
        Comprehensive test of printer connections
        """
        # Use Flask app context for database operations
        with self.app.app_context():
            for printer_config in self.printer_configs:
                logger.info(f"Testing connection for {printer_config['name']}")
                
                try:
                    # Verify OctoPrint server
                    is_octoprint = self.verify_octoprint_server(
                        printer_config['ip'], 
                        printer_config['api_key']
                    )
                    
                    if not is_octoprint:
                        logger.error(f"{printer_config['name']} is not a valid OctoPrint server")
                        continue
                    
                    # Add or update printer in database
                    printer = self.add_or_update_printer(printer_config)
                    
                    # Test connection and get status
                    connection_status = self.test_printer_connection(printer)
                    
                    # Retrieve and log additional printer information
                    self.log_printer_details(printer)
                    
                except Exception as e:
                    logger.error(f"Error testing {printer_config['name']}: {str(e)}")