"""
octoprint_connector.py

This module provides functions to connect and disconnect from an OctoPrint server,
as well as retrieve connection information.
"""

import requests
import json
from divider.logging_config import logger

def connect_octoprint(ip: str, api_key: str) -> None:
    """
    Connects to the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: None
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/connection"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "connect",
        "port": "/dev/ttyUSB0",
        "baudrate": 115200,
        "save": True,
        "autoconnect": True
    }
    if is_octoprint_server(ip=ip, api_key=api_key):
        response = requests.post(url=url, headers=headers, json=data)

        if response.status_code == 204:
            # Log success if the connection was started successfully
            logger.info(f"Connection started successfully on ip {ip}.")
        else:
            # Log an error if the connection failed
            logger.error(f"Failed to start connection: {response.status_code} - {response.text}")

def disconnect_octoprint(ip: str, api_key: str) -> None:
    """
    Disconnects from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: None
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/connection"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    data = {
        "command": "disconnect"
    }
    if is_octoprint_server(ip=ip, api_key=api_key):
        response = requests.post(url=url, headers=headers, json=data)

        if response.status_code == 204:
            # Log success if the disconnection was successful
            logger.info(f"Connection closed successfully on ip {ip}.")
        else:
            # Log an error if the disconnection failed
            logger.error(f"Failed to close connection: {response.status_code} - {response.text}")

def get_connection(ip: str, api_key: str) -> json:
    """
    Retrieves connection information from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: connection_info
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/connection"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }
    if is_octoprint_server(ip=ip, api_key=api_key):
        response = requests.get(url=url, headers=headers)

        if response.status_code == 200:
            connection_info = response.json()
            if connection_info['current']['state'] == 'Closed':
                # Log a warning if the connection is closed
                logger.warning(f"Connection is closed on ip {ip}.")
            else:
                # Log success if the connection info was retrieved successfully
                logger.info(f"Successfully retrieved connection info from ip {ip}.")
                logger.info(f"Response: {connection_info}")
            return connection_info
        else:
            # Log an error if the request failed
            logger.error(f"Failed to retrieve connection info: {response.status_code} - {response.text}")

def is_octoprint_server(ip: str, api_key: str) -> bool:
    """
    Checks if the given IP address is an OctoPrint server.

    :param ip: The IP address to check.
    :param api_key: The API key for authentication.
    :return: bool: True if the IP is an OctoPrint server, False otherwise.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/version"
    headers = {
        'X-Api-Key': api_key,
        'Content-Type': 'application/json'
    }

    try:
        response = requests.get(url=url, headers=headers)
        if response.status_code == 200:
            # Log success if the IP is an OctoPrint server
            logger.info(f"IP {ip} is an OctoPrint server.")
            return True
        elif response.status_code == 401:
            # Log an error if the API key is incorrect
            logger.error("Not correct key.")
            return False
        else:
            # Log a warning if the IP is not an OctoPrint server
            logger.warning(f"IP {ip} is not an OctoPrint server. Status code: {response.status_code}")
            return False
    except requests.ConnectionError as e:
        # Log an error if there was a connection error
        logger.error(f"Failed to connect to IP {ip}: {e}")
        return False

def is_octoprint_connected(ip: str, api_key: str) -> bool:
    """
    Checks if the OctoPrint server is connected.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: bool: True if the OctoPrint server is connected, False otherwise.
    """
    try:
        connection_info = get_connection(ip, api_key)
        return connection_info['current']['state'] == 'Operational'
    except Exception as e:
        # Log an error if there was an issue retrieving the connection info
        logger.error(f"Failed to get connection info: {e}")
        return False