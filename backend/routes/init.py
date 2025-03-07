from .file_routes import bp as file_routes
from .slicer_routes import bp as slicer_routes
from .auth_routes import bp as auth_routes 
from .printer_routes import bp as printer_routes
from .config_routes import bp as config_routes
__all__ = ['file_routes', 'slicer_routes', 'auth_routes', 'printer_routes', 'config_routes']