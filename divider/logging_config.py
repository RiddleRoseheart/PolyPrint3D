"""
logging_config.py

This module configures the logging for the application using the Rich library.

Attributes:
- logger (logging.Logger): The configured logger instance.
"""

import logging
from rich.logging import RichHandler

# Create a file handler to log messages to a file
file_handler = logging.FileHandler("app.log")
file_handler.setLevel(logging.INFO)  # Set the logging level for the file handler
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))  # Set the format for the log messages

# Configure the basic logging settings
logging.basicConfig(
    level=logging.INFO,  # Set the logging level for the root logger
    format="%(message)s",  # Set the format for the log messages
    datefmt="[%X]",  # Set the date format for the log messages
    handlers=[RichHandler(), file_handler]  # Add the RichHandler and file handler to the root logger
)

# Create a logger instance with the name "rich"
logger = logging.getLogger("rich")