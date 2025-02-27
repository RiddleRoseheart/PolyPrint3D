class FileIsNotInListOfPrinterFiles(Exception):
    """
    Exception raised when the file is not in the list of printer files.
    """
    pass
class FileNotFound(Exception):
    """
    Exception raised when the file is not found.
    """
    pass
class FileIsCurrentlyBeingPrinted(Exception):
    """
    Exception raised when the file is currently being printed.
    """
    pass
class NotAnOctoPrintServer(Exception):
    """
    Exception raised when the IP address is not an OctoPrint server.
    """
    pass