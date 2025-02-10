"""
octoprint_info_retriever.py

This module provides functions to retrieve information about the OctoPrint server.
"""
import json

import requests
from logging_config import logger

def _get_current_status(ip: str, api_key: str) -> json:
    """
     Retrieves connection information from the OctoPrint server.

     :param ip: The IP address of the OctoPrint server.
     :param api_key:  The API key for authentication.
     :return: None
     """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/printer"
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
def _get_current_state(ip: str, api_key: str) -> json:
    """
    Retrieves the current state from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: json: The current state of the printer.
    """
    printer_status: json = _get_current_status(ip=ip, api_key=api_key)
    states: json = printer_status['state']
    return states
def _get_current_temperature(ip: str, api_key: str) -> json:
    """
    Retrieves the current temperature from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: json: The current temperature of the printer.
    """
    states: json = _get_current_status(ip=ip, api_key=api_key)
    temperature: json = states['temperature']
    return temperature

def get_current_flags(ip: str, api_key: str) -> json:
    """
    Retrieves the current flags from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: json: The current flags of the printer.
    """
    states: json = _get_current_state(ip=ip, api_key=api_key)
    flags: json = states['flags']
    return flags
def get_current_temperature_bed(ip: str, api_key: str) -> float:
    """
    Retrieves the current bed temperature from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: float: The current bed temperature.
    """
    temperature: json = _get_current_temperature(ip=ip, api_key=api_key)
    bed_temperature = temperature['bed']
    return bed_temperature['actual']
def get_current_temperature_tool0(ip: str, api_key: str) -> float:
    """
    Retrieves the current tool0 temperature from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: float: The current tool0 temperature.
    """
    temperature: json = _get_current_temperature(ip=ip, api_key=api_key)
    tool0_temperature = temperature['tool0']
    return tool0_temperature['actual']
def get_target_temperature_bed(ip: str, api_key: str) -> float:
    """
    Retrieves the target bed temperature from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: float: The target bed temperature.
    """
    temperature: json = _get_current_temperature(ip=ip, api_key=api_key)
    bed_temperature = temperature['bed']
    return bed_temperature['target']
def get_target_temperature_tool0(ip: str, api_key: str) -> float:
    """
    Retrieves the target tool0 temperature from the OctoPrint server.

    :param ip: The IP address of the OctoPrint server.
    :param api_key: The API key for authentication.
    :return: float: The target tool0 temperature.
    """
    temperature: json = _get_current_temperature(ip=ip, api_key=api_key)
    tool0_temperature = temperature['tool0']
    return tool0_temperature['target']
def get_version(ip: str, api_key: str) -> json:
    """
    Retrieves connection information from the OctoPrint server version + state.

    :param ip: The IP address of the OctoPrint server.
    :param api_key:  The API key for authentication.
    :return: json: The current version + state of octoprint.
    """
    octoprint_url: str = f"http://{ip}/api"
    url = f"{octoprint_url}/server"
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