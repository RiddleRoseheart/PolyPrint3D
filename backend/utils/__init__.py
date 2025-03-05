from .path_utils import PathUtil
from .response_utils import ResponseBuilder
from .dev_data import create_test_data

__all__ = ['PathUtil', 'ResponseBuilder', 'create_test_data']

def is_local_mode():
    """Check if the application is running in local mode"""
    import os
    
    env_indicators = [
        os.environ.get('FLASK_ENV') == 'development', #TODO
        os.environ.get('LOCAL_MODE') == 'true',
        not os.environ.get('SERVER_MODE'),
    ]
    
    # If any indicator is True, we're in local mode
    return any(env_indicators)