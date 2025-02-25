from ast import List
from flask_mail import Mail, Message
from backend.database.models import User, PrintRequest
import logging
from flask import render_template
from typing import Optional, Dict, Any
from datetime import datetime

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for sending email notifications to users"""
    
    def __init__(self, mail: Mail):
        """
        Initialize NotificationService
        
        Args:
            mail: Flask-Mail instance for sending emails
        """
        self.mail = mail
    
    def send_email(self, 
                  recipient: str, 
                  subject: str, 
                  template: str, 
                  data: Dict[str, Any]) -> bool:
        """
        Send email using template
        
        Args:
            recipient: Email address of recipient
            subject: Email subject
            template: Template name (without extension)
            data: Template variables
            
        Returns:
            bool: Success status
        """
        try:
            msg = Message(
                subject=subject,
                recipients=[recipient]
            )
            
            # Create both HTML and plaintext versions
            msg.html = render_template(f'emails/{template}.html', **data)
            msg.body = render_template(f'emails/{template}.txt', **data)
            
            self.mail.send(msg)
            logger.info(f"Email sent to {recipient}: {subject}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {str(e)}")
            return False
    
    #TODO 
    def send_print_completed_notification(self, print_request: PrintRequest) -> bool:
        """
        Send notification when print is completed
        
        Args:
            print_request: Completed print request
            
        Returns:
            bool: Success status
        """
        try:
            user = print_request.user
            original_file = print_request.original_file
            
            # Prepare data for email template
            data = {
                'user_name': user.name,
                'file_name': original_file.filename,
                'print_date': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'print_duration': self._calculate_duration(print_request),
                'print_settings': {
                    'filament': print_request.filament,
                    'dimension': print_request.dimension,
                    'filling': print_request.filling,
                    'layer': print_request.layer
                }
            }
            
            return self.send_email(
                recipient=user.email,
                subject="Your 3D Print Has Completed!",
                template="print_completed",
                data=data
            )
            
        except Exception as e:
            logger.error(f"Failed to send print completion notification: {str(e)}")
            return False
    
    #TODO
    def _calculate_duration(self, print_request: PrintRequest) -> str:
        """Calculate print duration readable format"""
        # Implement duration calculation based on your data model
        # This is a placeholder implementation
        start_time = print_request.created_at
        end_time = datetime.now()
        duration_seconds = (end_time - start_time).total_seconds()
        
        hours = int(duration_seconds // 3600)
        minutes = int((duration_seconds % 3600) // 60)
        
        if hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
        
        
        
    def send_print_project_completed(self, email: str, original_file: UploadedFile, 
                                print_requests: List[PrintRequest]) -> bool:
        """
    Send notification when an entire print project is completed
    
    Args:
        email: User's email address
        original_file: Original uploaded file
        print_requests: All completed print requests
        
    Returns:
        bool: Success status
        """
        try:
            user = original_file.user
        
            # Prepare data for email template with full details
            data = {
                'user_name': user.name,
                'file_name': original_file.filename,
                'completion_date': datetime.now().strftime('%Y-%m-%d %H:%M'),
                'total_parts': len(print_requests),
                'print_requests': print_requests,  
                'total_duration': self._calculate_total_duration(print_requests)
            }
        
            return self.send_email(
                recipient=email,
                subject="Your 3D Print Project Has Completed!",
                template="project_completed",
                data=data
            )
            
        except Exception as e:
            logger.error(f"Failed to send project completion notification: {str(e)}")
            return False