from fastapi import FastAPI, HTTPException, Form, UploadFile, File
from fastapi.responses import JSONResponse
from logging_config import logger
from octoprint_connector import *
from octoprint_info_retriever import *
from octoprint_jobs import *
from ocotprint_files import *
app = FastAPI(
    debug=True,  # production this need to be false
    title="Poly_Print_Api_Gateway",
    summary="A API gateway for all the printers via OctoPrint",
    description="",
    version="0.0.1",
    default_response_class=JSONResponse,
    docs_url="/doc",
    redoc_url="/redoc",
    terms_of_service=None,
    contact={
        "name": "Support",
            "email": "antoine.goethuys@student.ehb.be",
    },
    license_info={
        "name": "Apache 2.0",
        "url": "https://www.apache.org/licenses/LICENSE-2.0.html",
    }
)

@app.get("/connect")
def connect(ip: str, api_key: str):
    """
    Connects to the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns a message indicating the connection status.

    Raises:
        HTTPException: If the IP is not an OctoPrint server or if the connection fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        connect_octoprint(ip, api_key)
        return {"message": "Connection started successfully."}
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to OctoPrint server.")

@app.get("/disconnect")
def disconnect(ip: str, api_key: str):
    """
    Disconnects from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns a message indicating the disconnection status.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the disconnection fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    if not is_octoprint_connected(ip, api_key):
        raise HTTPException(status_code=400, detail="OctoPrint server is not connected.")
    try:
        disconnect_octoprint(ip, api_key)
        return {"message": "Disconnected successfully."}
    except Exception as e:
        logger.error(f"Failed to disconnect: {e}")
        raise HTTPException(status_code=500, detail="Failed to disconnect from OctoPrint server.")

@app.get("/connection")
def get_connection_info(ip: str, api_key: str):
    """
    Retrieves connection information from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns the connection information.

    Raises:
        HTTPException: If the IP is not an OctoPrint server or if the connection information retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        connection_info = get_connection(ip, api_key)
        return connection_info
    except Exception as e:
        logger.error(f"Failed to get connection info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get connection info from OctoPrint server.")

@app.get("/flags")
def get_flags(ip: str, api_key: str):
    """
    Retrieves the current flags from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns the current flags of the printer.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the flags retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    if not is_octoprint_connected(ip, api_key):
        raise HTTPException(status_code=400, detail="OctoPrint server is not connected.")
    try:
        flags = get_current_flags(ip, api_key)
        return flags
    except Exception as e:
        logger.error(f"Failed to get flags: {e}")
        raise HTTPException(status_code=500, detail="Failed to get flags from OctoPrint server.")

@app.get("/temperature/bed")
def get_bed_temperature(ip: str, api_key: str):
    """
    Retrieves the current bed temperature from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns the current bed temperature.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the bed temperature retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    if not is_octoprint_connected(ip, api_key):
        raise HTTPException(status_code=400, detail="OctoPrint server is not connected.")
    try:
        bed_temp = get_current_temperature_bed(ip, api_key)
        return {"bed_temperature": bed_temp}
    except Exception as e:
        logger.error(f"Failed to get bed temperature: {e}")
        raise HTTPException(status_code=500, detail="Failed to get bed temperature from OctoPrint server.")

@app.get("/temperature/tool0")
def get_tool0_temperature(ip: str, api_key: str):
    """
    Retrieves the current tool0 temperature from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns the current tool0 temperature.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the tool0 temperature retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    if not is_octoprint_connected(ip, api_key):
        raise HTTPException(status_code=400, detail="OctoPrint server is not connected.")
    try:
        tool0_temp = get_current_temperature_tool0(ip, api_key)
        return {"tool0_temperature": tool0_temp}
    except Exception as e:
        logger.error(f"Failed to get tool0 temperature: {e}")
        raise HTTPException(status_code=500, detail="Failed to get tool0 temperature from OctoPrint server.")

@app.get("/temperature/bed/target")
def get_target_bed_temperature(ip: str, api_key: str):
    """
    Retrieves the target bed temperature from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns the target bed temperature.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the target bed temperature retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    if not is_octoprint_connected(ip, api_key):
        raise HTTPException(status_code=400, detail="OctoPrint server is not connected.")
    try:
        target_bed_temp = get_target_temperature_bed(ip, api_key)
        return {"target_bed_temperature": target_bed_temp}
    except Exception as e:
        logger.error(f"Failed to get target bed temperature: {e}")
        raise HTTPException(status_code=500, detail="Failed to get target bed temperature from OctoPrint server.")

@app.get("/temperature/tool0/target")
def get_target_tool0_temperature(ip: str, api_key: str):
    """
    Retrieves the target tool0 temperature from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns the target tool0 temperature.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the target tool0 temperature retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    if not is_octoprint_connected(ip, api_key):
        raise HTTPException(status_code=400, detail="OctoPrint server is not connected.")
    try:
        target_tool0_temp = get_target_temperature_tool0(ip, api_key)
        return {"target_tool0_temperature": target_tool0_temp}
    except Exception as e:
        logger.error(f"Failed to get target tool0 temperature: {e}")
        raise HTTPException(status_code=500, detail="Failed to get target tool0 temperature from OctoPrint server.")

@app.get("/job/status")
def job_status(ip: str, api_key: str):
    """
    Retrieves the status of the current job from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.

    Returns the status of the current job.

    Raises:
        HTTPException: If the IP is not an OctoPrint server or if the job status retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        job_status = get_status_job(ip, api_key)
        return job_status
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")

@app.get("/files")
def cancel_job(ip: str, api_key: str):

    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        all_files = get_all_files(ip, api_key)
        return all_files
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")


def is_valid_path(path: str) -> bool:
    return os.path.exists(path) and os.path.isfile(path)

@app.delete("/delete")
def delete_file_endpoint(ip: str, api_key: str, name: str):
    """
    Deletes a file from the OctoPrint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.
    - **name**: The name of the file to delete.

    Returns a message indicating the deletion status.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the deletion fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    if not is_octoprint_connected(ip, api_key):
        raise HTTPException(status_code=400, detail="OctoPrint server is not connected.")
    try:
        result = delete_file(ip, api_key, name)
        if result is not None:
            return {"message": f"File {name} deleted successfully."}
    except FileNotFoundError as e:
        logger.error(f"Failed to delete file {name}: {e}")
        raise HTTPException(status_code=404, detail=f"File {name} not found.")
    except RuntimeError as e:
        logger.error(f"Failed to delete file {name}: {e}")
        raise HTTPException(status_code=409, detail=f"File {name} is currently being printed.")
    except Exception as e:
        logger.error(f"Failed to delete file {name}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete file {name} from OctoPrint server.")
@app.post("/upload")
def upload_file(ip: str, api_key: str, path:str)-> str | None:
    """
    Upload the file on to octoprint server.

    - **ip**: The IP address of the OctoPrint server.
    - **api_key**: The API key for authentication.
    - **path**: The path of the local file for uploading.

    Returns message of success of the upload.

    Raises:
        HTTPException: If the IP is not an OctoPrint server, if the server is not connected, or if the target tool0 temperature retrieval fails.
    """
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        if is_valid_path(path=path):
            upload_gcode_file(ip=ip, api_key=api_key, path=path)
            logger.info(f"file: {path} is uploaded")
            return f"file: {path} is uploaded"
    except Exception as e:
        logger.error(f"failed to upload file ({path}) because: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload to upload to the OctoPrint server.")
import uvicorn

if __name__ == "__main__":
    # upload_gcode_file("10.2.168.3", "uyyIkhKZuP8bqfLWv8OS5zBMS8AjIbnjqWEmwH9NRzo", "C:\\Users\\antoine\\Documents\\projects\\school\\finalwork\\git\\PolyPrint3D\\divider\\demo.gcode")
    uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info")