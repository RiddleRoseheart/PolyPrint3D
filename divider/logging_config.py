"""
logging_config.py

This module configures the logging for the application using the Rich library.

Attributes:
- logger (logging.Logger): The configured logger instance.
"""

import logging
from rich.logging import RichHandler

# Configure logging
file_handler = logging.FileHandler("app.log")
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter("%(asctime)s - %(levelname)s - %(message)s"))

logging.basicConfig(
    level=logging.INFO,
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(), file_handler]
)

logger = logging.getLogger("rich")