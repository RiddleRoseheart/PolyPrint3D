from .path_utils import PathUtil
from .response_utils import ResponseBuilder
from .dev_data import create_test_data

__all__ = ['PathUtil', 'ResponseBuilder', 'create_test_data']

def is_local_mode():
    """Check if the application is running in local mode"""
    import os
    import requests
    from urllib.parse import urlparse
    
    if os.environ.get('SERVER_MODE', '').lower() == 'true':
        return False
    if os.environ.get('LOCAL_MODE', '').lower() == 'true':
        return True
    
    # Try to check connectivity to configured printers
    for i in range(1, 5):  # 4 (.env #TODO))
        printer_ip = os.environ.get(f'PRINTER{i}_IP')
        printer_api_key = os.environ.get(f'PRINTER{i}_API_KEY')
        
        if not printer_ip or not printer_api_key:
            continue
            
        # Try OctoPrint API connection
        try:
            url = f"http://{printer_ip}/api/version"
            headers = {"X-Api-Key": printer_api_key}
            response = requests.get(url, headers=headers, timeout=2)
            
            if response.status_code == 200:
                print(f"Connected to printer at {printer_ip}")
                return False  
        except Exception as e:
            print(f"Failed to connect to printer at {printer_ip}: {e}")

    print("Could not connect to any printers, using local mode")
    return True

def _check_printer_connectivity():
    """Check if we can connect to at least one printer"""
    import os
    import socket
    import time
    
    # Try to check connectivity to configured printers
    for i in range(1, 5):  # 4 printers (env)
        printer_ip = os.environ.get(f'PRINTER{i}_IP')
        if not printer_ip:
            continue
            
        # Try a quick socket connection to check if printer is accessible
        try:
            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(1)  # 1 second timeout
            result = sock.connect_ex((printer_ip, 80))  # Most printers use port 80
            sock.close()
            if result == 0:
                # Found at least one accessible printer
                return True
        except:
            pass
    
    return False