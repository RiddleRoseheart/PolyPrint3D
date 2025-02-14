"""
octoprint_jobs.py

This module provides functions to retrieve interact with the files of Octoprint.
"""
import json
import os

import requests
from requests_toolbelt.multipart import encoder
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

def upload_gcode_file(ip: str, api_key: str, path: str):
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
        return response.json()
    except requests.exceptions.RequestException as err:
        logger.warning(f"error upload: {err}")
        return err
    except FileExistsError:
        logger.warning(f"this is not a file {os.path.basename(path)}")

def log_end_upload(monitor):
    logger.info(f"Uploaded {monitor.bytes_read} of {monitor.len}")