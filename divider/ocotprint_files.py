"""
octoprint_files.py

This module provides functions to interact with the files of OctoPrint.
"""
import json
import os

import requests
from requests_toolbelt.multipart import encoder
from logging_config import logger

def get_all_files(ip: str, api_key: str) -> json:
    """
    Retrieves all file of the printer.

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

    response = requests.get(url=url, headers=headers)

    if response.status_code == 200:
        # Return the JSON response if the request was successful
        return response.json()
    else:
        # Log an error if the request failed
        logger.error(f"Failed to retrieve connection info: {response.status_code} - {response.text}")

def upload_gcode_file(ip: str, api_key: str, path: str):
    """
    Uploads a G-code file to the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :param path: The local path to the G-code file to be uploaded.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/files/local"
    try:
        # Prepare the file for upload using MultipartEncoder
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

        # Raise an exception if the request failed
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as err:
        # Log a warning if there was an error during the upload
        logger.warning(f"error upload: {err}")
        return err
    except FileExistsError:
        # Log a warning if the provided path is not a file
        logger.warning(f"this is not a file {os.path.basename(path)}")

def delete_file(ip: str, api_key: str, name: str):
    """
    Deletes a file from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :param name: The name of the file to be deleted.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/files/local/{name}"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    try:
        response = requests.delete(url, headers=headers)
        if response.status_code == 204:
            # Log success if the file was deleted successfully
            logger.info(f"File {name} deleted successfully.")
            return response.json()
        elif response.status_code == 404:
            # Raise an error if the file was not found
            raise FileNotFoundError(f"File {name} not found.")
        elif response.status_code == 409:
            # Raise an error if the file is currently being printed
            raise RuntimeError(f"File {name} is currently being printed.")
    except requests.exceptions.RequestException as err:
        # Log an error if there was an issue with the request
        logger.error(f"Failed to delete file {name}: {err}")
        return None

def log_end_upload(monitor):
    """
    Logs the progress of the file upload.

    :param monitor: The MultipartEncoderMonitor object.
    """
    logger.info(f"Uploaded {monitor.bytes_read} of {monitor.len}")