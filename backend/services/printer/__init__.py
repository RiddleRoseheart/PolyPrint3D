# backend/services/printer/__init__.py
from .management_service import PrinterManagementService
from .connection_service import PrinterConnectionService
from .file_service import PrinterFileService
from .job_service import PrinterJobService
from backend.services.notification_service import NotificationService 
import os

class PrinterService:
    """Main printer service that combines all sub-services"""

    def __init__(self, notification_service=None):
        # Initialize all printer sub-services
        self.management = PrinterManagementService(notification_service=notification_service)
        self.connection = PrinterConnectionService()
        self.files = PrinterFileService()
        self.jobs = PrinterJobService(notification_service=notification_service)
        self.notification = notification_service

    def __getattr__(self, name):
        """
        Delegate missing attributes to appropriate sub-service
        Allows backwards compatibility with old service calls
        """
        for service in [self.management, self.connection, self.files, self.jobs]:
            if hasattr(service, name):
                return getattr(service, name)
        raise AttributeError(f"'{self.__class__.__name__}' has no attribute '{name}'")