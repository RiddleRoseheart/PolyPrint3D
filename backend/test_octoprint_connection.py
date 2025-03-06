# backend/test_octoprint_connection.py
from routes.octoprint_routes import test_connection, get_printer_status

def manual_test_octoprint():
    # Replace with your actual printer details
    TEST_PRINTER_IP = '192.168.1.100'  # Your printer's IP
    TEST_API_KEY = 'your_octoprint_api_key'

    # Test connection
    try:
        connection_result = test_connection(TEST_PRINTER_IP, TEST_API_KEY)
        print("Connection Test Result:", connection_result)
    except Exception as e:
        print("Connection Test Failed:", str(e))

    # Test printer status
    try:
        status_result = get_printer_status(TEST_PRINTER_IP, TEST_API_KEY)
        print("Printer Status:", status_result)
    except Exception as e:
        print("Status Retrieval Failed:", str(e))

if __name__ == '__main__':
    manual_test_octoprint()