"""

octoprint_files.py
This module provides functions to interact with the files of OctoPrint.
"""
import json
import os
import requests
import os, sys

from requests_toolbelt.multipart import encoder

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

from backend.divider.logging_config import create_logger

logger = create_logger(__name__)

from backend.divider.octoprint_errors import (
    FileIsNotInListOfPrinterFiles,
    FileNotFound,
    FileIsCurrentlyBeingPrinted
)

def post_select_file(ip: str, api_key: str, name: str):
    """
    Selects a file on the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :param name: The name of the file to be selected.
    :return: The response from the OctoPrint server.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/local/{name}"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "select"
    }
    try:
        files_json = get_all_files(ip=ip, api_key=api_key)
        if not files_json:
            raise FileNotFound
        else:
            list_json_files = files_json["files"]
            display_names = [file["display"] for file in list_json_files]
            if not name in display_names:
                raise FileIsNotInListOfPrinterFiles
            else:
                response = requests.post(url=url, headers=headers, json=data)
                logger.info(f"selected file ({name}) is ok")
                return response
    except FileNotFound:
        logger.warning(f"File {name} not found.")
    except FileIsNotInListOfPrinterFiles:
        logger.warning(f"File {name} is not in the list of printer files.")
    except requests.exceptions.HTTPError as http_err:
        logger.warning(f'HTTP error occurred: {http_err} in post_select_file')
    except requests.exceptions.ConnectionError as conn_err:
        logger.warning(f'Connection error occurred: {conn_err} in post_select_file')
    except requests.exceptions.Timeout as timeout_err:
        logger.warning(f'Timeout error occurred: {timeout_err} in post_select_file')
    except requests.exceptions.RequestException as req_err:
        logger.warning(f'Request error occurred: {req_err} in post_select_file')
    return None

def get_all_files(ip: str, api_key: str) -> json:
    """
    Retrieves all files from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: JSON response containing all files information.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/files"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    try:
        response = requests.get(url=url, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        logger.warning(f'HTTP error occurred: {http_err} in get_all_files')
    except requests.exceptions.ConnectionError as conn_err:
        logger.warning(f'Connection error occurred: {conn_err} in get_all_files')
    except requests.exceptions.Timeout as timeout_err:
        logger.warning(f'Timeout error occurred: {timeout_err} in get_all_files')
    except requests.exceptions.RequestException as req_err:
        logger.warning(f'Request error occurred: {req_err} in get_all_files')
    return None

def upload_gcode_file(ip: str, api_key: str, path: str):
    """
    Uploads a G-code file to the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :param path: The local path to the G-code file to be uploaded.
    :return: JSON response from the OctoPrint server.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/files/local"
    try:
        e = encoder.MultipartEncoder(
            fields={
                'file': (os.path.basename(path), open(path, 'rb'), 'application/octet-stream'),
                'select': 'true',
                'print': 'false'
            }
        )
        m = encoder.MultipartEncoderMonitor(e, log_end_upload)
        headers = {
            'X-Api-Key': api_key,
            'Content-Type': m.content_type
        }
        response = requests.post(url, headers=headers, data=m)
        response.raise_for_status()
        logger.info(f"File {os.path.basename(path)} uploaded successfully.")
        return response.json()
    except requests.exceptions.HTTPError as http_err:
        logger.warning(f'HTTP error occurred: {http_err} in upload_gcode_file')
    except requests.exceptions.ConnectionError as conn_err:
        logger.warning(f'Connection error occurred: {conn_err} in upload_gcode_file')
    except requests.exceptions.Timeout as timeout_err:
        logger.warning(f'Timeout error occurred: {timeout_err} in upload_gcode_file')
    except requests.exceptions.RequestException as req_err:
        logger.warning(f'Request error occurred: {req_err} in upload_gcode_file')
    except FileExistsError:
        logger.warning(f"this is not a file {os.path.basename(path)}")
    return None

def delete_file(ip: str, api_key: str, name: str):
    """
    Deletes a file from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :param name: The name of the file to be deleted.
    :return: The response from the OctoPrint server.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/files/local/{name}"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    try:
        response = requests.delete(url, headers=headers)
        response.raise_for_status()
        if response.status_code == 204:
            # Log success if the file was deleted successfully
            logger.info(f"File {name} deleted successfully.")
            return response
        elif response.status_code == 404:
            # Raise an error if the file was not found
            raise FileNotFound
        elif response.status_code == 409:
            # Raise an error if the file is currently being printed
            raise FileIsCurrentlyBeingPrinted
    except FileNotFound:
        logger.warning(f"File {name} not found.")
    except FileIsCurrentlyBeingPrinted:
        logger.warning(f"File {name} is currently being printed.")
    except requests.exceptions.HTTPError as http_err:
        logger.warning(f'HTTP error occurred: {http_err} in delete_file')
    except requests.exceptions.ConnectionError as conn_err:
        logger.warning(f'Connection error occurred: {conn_err} in delete_file')
    except requests.exceptions.Timeout as timeout_err:
        logger.warning(f'Timeout error occurred: {timeout_err} in delete_file')
    except requests.exceptions.RequestException as req_err:
        logger.warning(f'Request error occurred: {req_err} in delete_file')
    return None

def log_end_upload(monitor):
    """
    Logs the progress of the file upload.

    :param monitor: The MultipartEncoderMonitor object.
    """
    logger.info(f"Uploaded {monitor.bytes_read} of {monitor.len}")