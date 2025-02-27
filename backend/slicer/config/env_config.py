from pathlib import Path
from dotenv import load_dotenv
import os

def load_config():
    """
    Load configuration from .env file
    Returns dict with server and application settings
    """
    # Load .env file from the project root
    env_path = Path(__file__).parent.parent / '.env'
    load_dotenv(env_path)

    # Server configuration
    server_config = {
        'host': os.getenv('SFTP_HOST'),
        'username': os.getenv('SFTP_USERNAME'),
        'password': os.getenv('SFTP_PASSWORD'),
        'remote_path': os.getenv('SFTP_REMOTE_PATH', '/home/polyprint/3d_prints')
    }
    

    """# New code for local testing, remove when being able to connect with the server:
    server_config = {
        'host': 'dummy_host',  # Dummy values for local testing
        'username': 'dummy_user',
        'password': 'dummy_pass',
        'remote_path': '/dummy/path'
    }
    """
    # Application configuration
    app_config = {
        'printer_count': int(os.getenv('PRINTER_COUNT', '4')),
        'padding': int(os.getenv('PADDING', '10')),
        'build_volume': tuple(map(int, os.getenv('BUILD_VOLUME', '250,210,210').split(','))),
        'prusa_path': os.getenv('PRUSA_SLICER_PATH', 
            r"C:\Program Files\Prusa3D\PrusaSlicer\prusa-slicer-console.exe"),
        'local_output_path': os.getenv('LOCAL_OUTPUT_PATH', 'backend/slicer/output')
    }

    
    # Validate required configurations
    required_server_configs = ['host', 'username', 'password']
    missing_configs = [key for key in required_server_configs if not server_config[key]]
    
    if missing_configs:
        raise ValueError(f"Missing required configuration(s): {', '.join(missing_configs)}")
    
    return {
        'server': server_config,
        'app': app_config
    }