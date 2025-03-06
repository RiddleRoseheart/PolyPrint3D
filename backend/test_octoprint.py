import requests
import os

def test_octoprint_connection():
    # Get OctoPrint details from environment variables or configuration
    BASE_URL = os.environ.get('FLASK_API_URL', 'http://localhost:5000/api/octoprint')
    PRINTER_IP = os.environ.get('OCTOPRINT_IP', '192.168.1.100')
    API_KEY = os.environ.get('OCTOPRINT_API_KEY', 'your_octoprint_api_key')

    # Test connection endpoint
    try:
        # Verify the parameters
        print(f"Connecting to: {BASE_URL}")
        print(f"Printer IP: {PRINTER_IP}")
        print(f"API Key: {API_KEY}")

        response = requests.get(f'{BASE_URL}/connect', params={
            'ip': PRINTER_IP,
            'api_key': API_KEY
        })
        
        # Print full response for debugging
        print("Full Response:", response.text)
        print("Status Code:", response.status_code)
        
        # Try to parse JSON
        try:
            print("Connection Response:", response.json())
        except ValueError:
            print("Response is not JSON")
        
        # Test getting printer status
        status_response = requests.get(f'{BASE_URL}/connection', params={
            'ip': PRINTER_IP,
            'api_key': API_KEY
        })
        print("Connection Info:", status_response.json())
        
        # Test temperature
        bed_temp_response = requests.get(f'{BASE_URL}/temperature/bed', params={
            'ip': PRINTER_IP,
            'api_key': API_KEY
        })
        print("Bed Temperature:", bed_temp_response.json())
    
    except requests.exceptions.ConnectionError as e:
        print(f"Connection Error: {e}")
        print("Possible reasons:")
        print("1. Flask server not running")
        print("2. Incorrect base URL")
        print("3. Network/firewall issues")
    
    except Exception as e:
        print(f"Unexpected error testing OctoPrint connection: {e}")

if __name__ == '__main__':
    test_octoprint_connection()