"""
octoprint_jobs.py

This module provides functions to retrieve information about the OctoPrint jobs.
"""
import json
import requests
from logging_config import logger

def get_status_job(ip: str, api_key: str) -> json:
    """
    Retrieves the information of the state jobs of the printer.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: JSON response containing the job status information.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/job"
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

def cancel_print_job(ip: str, api_key: str) -> bool:
    """
    Cancels the current print job on the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: True if the job was successfully canceled, False otherwise.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/job"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = json.dumps({"command": "cancel"})

    response = requests.post(url=url, headers=headers, data=data)

    if response.status_code == 204:
        # Return True if the job was successfully canceled
        return True
    else:
        # Log an error if the request failed
        logger.error(f"Failed to cancel print job: {response.status_code} - {response.text}")
        return False