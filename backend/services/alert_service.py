import uuid
from datetime import datetime
from typing import List, Optional
import logging

from backend.database.config import db
from backend.database.models import Alert, AlertType, User, Printer, PrintRequest

logger = logging.getLogger(__name__)

class AlertService:
    """Service for managing system alerts and notifications"""
    
    def __init__(self):
        """Initialize Alert Service"""
        self.logger = logging.getLogger(__name__)
    
    def create_alert(self, 
                   title: str, 
                   message: str, 
                   alert_type: AlertType = AlertType.INFO,
                   user_id: Optional[str] = None,
                   source: Optional[str] = None,
                   source_id: Optional[str] = None) -> Alert:
        """Create a new alert"""
        try:
            alert = Alert(
                id=str(uuid.uuid4()),
                timestamp=datetime.utcnow(),
                type=alert_type.value,
                title=title,
                message=message,
                source=source,
                source_id=source_id,
                user_id=user_id
            )
            
            db.session.add(alert)
            db.session.commit()
            
            self.logger.info(f"Created alert: {alert.title}")
            return alert
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error creating alert: {str(e)}")
            raise
    
    def get_alerts(self, 
                 user_id: Optional[str] = None, 
                 unread_only: bool = False, 
                 limit: int = 50) -> List[Alert]:
        """Get alerts, optionally filtered"""
        try:
            query = Alert.query
            
            # Apply filters
            if user_id:
                query = query.filter((Alert.user_id == user_id) | (Alert.user_id == None))
            if unread_only:
                query = query.filter_by(is_read=False)
                
            # Order by timestamp (newest first) and limit
            alerts = query.order_by(Alert.timestamp.desc()).limit(limit).all()
            
            return alerts
            
        except Exception as e:
            self.logger.error(f"Error getting alerts: {str(e)}")
            return []
    
    def mark_as_read(self, alert_id: str) -> bool:
        """Mark an alert as read"""
        try:
            alert = Alert.query.get(alert_id)
            if not alert:
                return False
                
            alert.is_read = True
            db.session.commit()
            
            return True
            
        except Exception as e:
            db.session.rollback()
            self.logger.error(f"Error marking alert as read: {str(e)}")
            return False
    
    def create_print_completed_alert(self, print_request: PrintRequest) -> Alert:
        """Create an alert for a completed print job"""
        try:
            # Get user and printer info
            user_id = print_request.user_id
            printer = print_request.printer
            
            # Extract meaningful filename
            file_path = print_request.file_path or "Unknown file"
            file_name = file_path.split('/')[-1] if '/' in file_path else file_path.split('\\')[-1] if '\\' in file_path else file_path
            
            # Create alert
            title = f"Print Completed: {file_name}"
            message = f"Your print job has completed successfully on printer {printer.name if printer else 'Unknown'}."
            
            return self.create_alert(
                title=title,
                message=message,
                alert_type=AlertType.SUCCESS,
                user_id=user_id,
                source="Printer",
                source_id=printer.id if printer else None
            )
            
        except Exception as e:
            self.logger.error(f"Error creating print completed alert: {str(e)}")
            return None