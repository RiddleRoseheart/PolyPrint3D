"""
octoprint_jobs.py

This module provides functions to manage and retrieve information about OctoPrint jobs.
"""
import json
import requests
import os
import sys

# Add the project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

from backend.divider.logging_config import create_logger

logger = create_logger(__name__)

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

def print_selected_job(ip: str, api_key: str):
    """
    Starts the selected print job on the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: Response object from the POST request.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/job"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "start"
    }
    response = requests.post(url=url, headers=headers, json=data)
    return response

def cancel_print(ip: str, api_key: str):
    """
    Cancels the current print job on the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: Response object from the POST request.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/job"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "cancel"
    }
    response = requests.post(url=url, headers=headers, json=data)
    return response

def pause_print(ip: str, api_key: str):
    """
    Pauses the current print job on the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: Response object from the POST request.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/job"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "pause",
        "action": "pause"
    }
    response = requests.post(url=url, headers=headers, json=data)
    return response

def resume_print(ip: str, api_key: str):
    """
    Resumes the paused print job on the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: Response object from the POST request.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/job"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "pause",
        "action": "resume"
    }
    response = requests.post(url=url, headers=headers, json=data)
    return response

if __name__ == '__main__':
    pass
    # print_selected_job(ip="10.0.0.254", api_key="hFswwTnAYX5NloewqL4MHfW_LyTqF7_GZ3qPB4WenFI")