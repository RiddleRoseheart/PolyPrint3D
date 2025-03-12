from typing import List, Optional, Dict, Any
import logging
from datetime import datetime
import os

from backend.database.config import db
from backend.database.models import PrintRequest, Printer
from backend.services.alert_service import AlertService, AlertType
from backend.services.octoprint_service import OctoPrintService

logger = logging.getLogger(__name__)

class PrinterQueueService:
    """Service for managing printer queues and job transitions"""
    
    def __init__(self):
        """Initialize PrinterQueueService"""
        self.logger = logging.getLogger(__name__)
        self.octoprint_service = OctoPrintService()
        self.alert_service = AlertService()
        
    def get_printer_queue(self, printer_id: str) -> List[PrintRequest]:
        """
        Get all print requests queued for a specific printer, ordered by creation time
        
        Args:
            printer_id: ID of the printer
            
        Returns:
            List of PrintRequest objects in queue order
        """
        return PrintRequest.query.filter(
            PrintRequest.printer_id == printer_id,
            PrintRequest.state.in_(["pending", "queued"])
        ).order_by(PrintRequest.created_at.asc()).all()
    
    def add_to_queue(self, print_request: PrintRequest) -> bool:
        """
        Add a print request to the printer's queue
        
        Args:
            print_request: PrintRequest object to add to queue
            
        Returns:
            bool indicating success
        """
        try:
            if not print_request.printer_id:
                self.logger.error(f"Cannot queue print request {print_request.id} without a printer")
                return False
                
            # Check if printer exists
            printer = Printer.query.get(print_request.printer_id)
            if not printer:
                self.logger.error(f"Printer {print_request.printer_id} not found")
                return False
            
            # Get current queue for this printer
            queue = self.get_printer_queue(printer.id)
            
            # Check if printer is currently printing
            active_request = PrintRequest.query.filter_by(
                printer_id=printer.id,
                state="printing"
            ).first()
                
            if active_request or queue:
                # There's an active print or items in queue, so add this to queue
                print_request.state = "queued"
                self.logger.info(f"Added print request {print_request.id} to queue for printer {printer.id}")
                
                # Create alert for queued print
                self.alert_service.create_alert(
                    title="Print Job Queued",
                    message=f"Your print has been added to the queue for printer {printer.name}",
                    alert_type=AlertType.INFO,
                    user_id=print_request.user_id,
                    source="Printer",
                    source_id=printer.id
                )
            else:
                # Nothing active, so this can be sent to print immediately
                print_request.state = "pending"
                self.logger.info(f"Print request {print_request.id} ready for immediate printing")
                
            db.session.commit()
            
            # If this is the only item in queue and no active print, start it
            if not active_request and not queue:
                return self.start_next_print(printer.id)
                
            return True
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error adding print request to queue: {str(e)}")
            return False
    
    def start_next_print(self, printer_id: str) -> bool:
        """
        Start the next print job in the queue for a specific printer
        
        Args:
            printer_id: ID of the printer
            
        Returns:
            bool indicating success
        """
        try:
            # Get printer object
            printer = Printer.query.get(printer_id)
            if not printer:
                self.logger.error(f"Printer {printer_id} not found")
                return False
                
            # Check if printer is already printing
            active_request = PrintRequest.query.filter_by(
                printer_id=printer_id,
                state="printing"
            ).first()
            
            if active_request:
                self.logger.warning(f"Printer {printer_id} already has an active print job")
                return False
                
            # Get next request from queue
            next_request = PrintRequest.query.filter(
                PrintRequest.printer_id == printer_id,
                PrintRequest.state.in_(["pending", "queued"])
            ).order_by(PrintRequest.created_at.asc()).first()
            
            if not next_request:
                self.logger.info(f"No pending print jobs for printer {printer_id}")
                return False
                
            self.logger.info(f"Starting next print job {next_request.id} on printer {printer_id}")
            
            # Get G-code file path
            from backend.services.slicer_service import SlicerService
            slicer_service = SlicerService(
                output_dir=os.environ.get('OUTPUT_FOLDER', 'backend/output'),
                config_path=os.environ.get('CONFIG_PATH', 'backend/slicer/config/config.ini')
            )
            
            gcode_path = slicer_service.get_gcode_file_path(next_request.id)
            
            if not gcode_path or not os.path.exists(gcode_path):
                self.logger.error(f"G-code file not found for print request {next_request.id}")
                self.alert_service.create_alert(
                    title="Print Error",
                    message=f"G-code file not found for your print job",
                    alert_type=AlertType.ERROR,
                    user_id=next_request.user_id,
                    source="System"
                )
                return False
                
            # Upload G-code file to printer
            upload_success = self.octoprint_service.upload_gcode_file(printer, gcode_path, next_request)
            
            if not upload_success:
                self.logger.error(f"Failed to upload G-code file to printer {printer_id}")
                self.alert_service.create_alert(
                    title="Print Upload Failed",
                    message=f"Failed to upload G-code to printer {printer.name}",
                    alert_type=AlertType.ERROR,
                    user_id=next_request.user_id,
                    source="Printer",
                    source_id=printer.id
                )
                return False
                
            # Start print job
            start_success = self.octoprint_service.start_print_job(printer, os.path.basename(gcode_path))
            
            if start_success:
                # Update print request status
                next_request.state = "printing"
                next_request.print_started_at = datetime.utcnow()
                db.session.commit()
                
                # Create success alert
                self.alert_service.create_alert(
                    title="Print Started",
                    message=f"Your print job has started on printer {printer.name}",
                    alert_type=AlertType.SUCCESS,
                    user_id=next_request.user_id,
                    source="Printer",
                    source_id=printer.id
                )
                
                return True
            else:
                self.logger.error(f"Failed to start print job on printer {printer_id}")
                self.alert_service.create_alert(
                    title="Print Start Failed",
                    message=f"Failed to start print job on printer {printer.name}",
                    alert_type=AlertType.ERROR,
                    user_id=next_request.user_id,
                    source="Printer",
                    source_id=printer.id
                )
                return False
                
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error starting print job: {str(e)}")
            return False
    
    def handle_print_completion(self, print_request: PrintRequest) -> bool:
        """
        Handle logic when a print job completes
        
        Args:
            print_request: Completed PrintRequest object
            
        Returns:
            bool indicating success
        """
        try:
            if print_request.state != "completed":
                self.logger.warning(f"Print request {print_request.id} is not completed")
                return False
                
            printer_id = print_request.printer_id
            if not printer_id:
                return False
                
            # Create completion alert
            self.alert_service.create_alert(
                title="Print Completed",
                message=f"Your print job has completed successfully",
                alert_type=AlertType.SUCCESS,
                user_id=print_request.user_id,
                source="Printer",
                source_id=printer_id
            )
            
            # Start next job in queue if available
            return self.start_next_print(printer_id)
                
        except Exception as e:
            self.logger.error(f"Error handling print completion: {str(e)}")
            return False
            
    def process_completed_prints(self) -> int:
        """
        Process all completed print jobs and start next jobs in queue
        
        Returns:
            Number of queue items started
        """
        try:
            # Find all recently completed print jobs
            completed_requests = PrintRequest.query.filter_by(state="completed").all()
            
            started_count = 0
            processed_printers = set()
            
            for request in completed_requests:
                # Only process each printer once to avoid trying to start multiple jobs
                if request.printer_id and request.printer_id not in processed_printers:
                    if self.start_next_print(request.printer_id):
                        started_count += 1
                    processed_printers.add(request.printer_id)
            
            return started_count
            
        except Exception as e:
            self.logger.error(f"Error processing completed prints: {str(e)}")
            return 0