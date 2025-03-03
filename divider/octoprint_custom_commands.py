
"""
octoprint_jobs.py

This module provides functions to have custom commands.
"""
import json
import requests
from logging_config import logger

def send_command(ip: str, api_key: str):
    """
    Starts the selected print job on the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: Response object from the POST request.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/printer/command"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "M107"
    }
    response = requests.post(url=url, headers=headers, json=data)
    return response


if __name__ == '__main__':
    send_command("192.168.1.8", "XXTbEpJhyc7DglBQcxzodvch3YbmeJl9Uv6R6PHhgfY")
