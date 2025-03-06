"""
logging_config.py

This module configures the logging for the application using the Rich library.
"""

import logging
from rich.logging import RichHandler

def create_logger(name=__name__):
    # Create a file handler to log messages to a file
    file_handler = logging.FileHandler("app.log")
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))

    # Create a logger
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)

    # Clear existing handlers to prevent duplicate logging
    logger.handlers.clear()

    # Add RichHandler
    rich_handler = RichHandler()
    logger.addHandler(rich_handler)
    
    # Add file handler
    logger.addHandler(file_handler)

    return logger