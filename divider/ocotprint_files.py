"""
octoprint_jobs.py

This module provides functions to retrieve interact with the files of Octoprint.
"""
import json

import requests
from logging_config import logger

def get_all_files(ip: str, api_key: str) -> json:
    """
    Retrieves the information of the state of the printer

    :param ip:
    :param api_key:
    :return:
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/files"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }

    response = requests.get(url=url, headers=headers)

    if response.status_code == 200:
        # logger.info(f"Response: {response.text}")
        return response.json()
    else:
        logger.error(f"Failed to retrieve connection info: {response.status_code} - {response.text}")

def create_map():
    pass

def upload_gcode_file(ip: str, api_key: str):
    pass