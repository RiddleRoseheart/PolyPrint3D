from .file_routes import bp as file_routes
from .slicer_routes import bp as slicer_routes
from .auth_routes import bp as auth_routes 

__all__ = ['file_routes', 'slicer_routes', 'auth_routes']