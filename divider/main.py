from fastapi import FastAPI, HTTPException, Form, UploadFile, File
from fastapi.responses import JSONResponse
from logging_config import logger
from octoprint_connector import *
from octoprint_info_retriever import *
from octoprint_jobs import *
from ocotprint_files import *

# Initialize FastAPI app with metadata
app = FastAPI(
    debug=True,  # In production, this should be set to False
    title="Poly_Print_Api_Gateway",
    summary="An API gateway for all the printers via OctoPrint",
    description="",
    version="0.0.9",
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

@app.get("/connect", responses={
    200: {
        "description": "Successful connection",
        "content": {
            "application/json": {
                "example": {"message": "Connection started successfully."}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to connect to OctoPrint server."}
            }
        }
    }
})
def connect(ip: str, api_key: str):
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        connect_octoprint(ip, api_key)
        return {"message": "Connection started successfully."}
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        raise HTTPException(status_code=500, detail="Failed to connect to OctoPrint server.")

@app.get("/disconnect", responses={
    200: {
        "description": "Successful disconnection",
        "content": {
            "application/json": {
                "example": {"message": "Disconnected successfully."}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to disconnect from OctoPrint server."}
            }
        }
    }
})
def disconnect(ip: str, api_key: str):
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

@app.get("/connection", responses={
    200: {
        "description": "Connection information retrieved successfully",
        "content": {
            "application/json": {
                "example": {"connection_info": "example_connection_info"}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get connection info from OctoPrint server."}
            }
        }
    }
})
def get_connection_info(ip: str, api_key: str):
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        connection_info = get_connection(ip, api_key)
        return connection_info
    except Exception as e:
        logger.error(f"Failed to get connection info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get connection info from OctoPrint server.")

@app.get("/flags", responses={
    200: {
        "description": "Flags retrieved successfully",
        "content": {
            "application/json": {
                "example": {"flags": "example_flags"}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get flags from OctoPrint server."}
            }
        }
    }
})
def get_flags(ip: str, api_key: str):
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

@app.get("/temperature/bed", responses={
    200: {
        "description": "Bed temperature retrieved successfully",
        "content": {
            "application/json": {
                "example": {"bed_temperature": 60.0}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get bed temperature from OctoPrint server."}
            }
        }
    }
})
def get_bed_temperature(ip: str, api_key: str):
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

@app.get("/temperature/tool0", responses={
    200: {
        "description": "Tool0 temperature retrieved successfully",
        "content": {
            "application/json": {
                "example": {"tool0_temperature": 200.0}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get tool0 temperature from OctoPrint server."}
            }
        }
    }
})
def get_tool0_temperature(ip: str, api_key: str):
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

@app.get("/temperature/bed/target", responses={
    200: {
        "description": "Target bed temperature retrieved successfully",
        "content": {
            "application/json": {
                "example": {"target_bed_temperature": 60.0}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get target bed temperature from OctoPrint server."}
            }
        }
    }
})
def get_target_bed_temperature(ip: str, api_key: str):
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

@app.get("/temperature/tool0/target", responses={
    200: {
        "description": "Target tool0 temperature retrieved successfully",
        "content": {
            "application/json": {
                "example": {"target_tool0_temperature": 200.0}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get target tool0 temperature from OctoPrint server."}
            }
        }
    }
})
def get_target_tool0_temperature(ip: str, api_key: str):
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

@app.get("/job/status", responses={
    200: {
        "description": "Job status retrieved successfully",
        "content": {
            "application/json": {
                "example": {"job_status": "example_job_status"}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get job status from OctoPrint server."}
            }
        }
    }
})
def job_status(ip: str, api_key: str):
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        job_status = get_status_job(ip, api_key)
        return job_status
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")

@app.get("/files", responses={
    200: {
        "description": "Files retrieved successfully",
        "content": {
            "application/json": {
                "example": {"files": "example_files"}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to get files from OctoPrint server."}
            }
        }
    }
})
def cancel_job(ip: str, api_key: str):
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        all_files = get_all_files(ip, api_key)
        return all_files
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")

@app.delete("/delete", responses={
    200: {
        "description": "File deleted successfully",
        "content": {
            "application/json": {
                "example": {"message": "File demo.gcode deleted successfully."}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    404: {
        "description": "File not found",
        "content": {
            "application/json": {
                "example": {"detail": "File demo.gcode not found."}
            }
        }
    },
    409: {
        "description": "Conflict",
        "content": {
            "application/json": {
                "example": {"detail": "File demo.gcode is currently being printed."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to delete file demo.gcode from OctoPrint server."}
            }
        }
    }
})
def delete_file_endpoint(ip: str, api_key: str, name: str):
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

@app.post("/upload", responses={
    200: {
        "description": "File uploaded successfully",
        "content": {
            "application/json": {
                "example": {"message": "file: C:\\Users\\antoine\\Documents\\projects\\school\\finalwork\\git\\PolyPrint3D\\divider\\demo.gcode is uploaded"}
            }
        }
    },
    400: {
        "description": "Bad request",
        "content": {
            "application/json": {
                "example": {"detail": "IP is not an OctoPrint server or incorrect API key."}
            }
        }
    },
    500: {
        "description": "Internal server error",
        "content": {
            "application/json": {
                "example": {"detail": "Failed to upload to the OctoPrint server."}
            }
        }
    }
})
def upload_file(ip: str, api_key: str, path:str)-> str | None:
    if not is_octoprint_server(ip, api_key):
        raise HTTPException(status_code=400, detail="IP is not an OctoPrint server or incorrect API key.")
    try:
        if is_valid_path(path=path):
            upload_gcode_file(ip=ip, api_key=api_key, path=path)
            logger.info(f"file: {path} is uploaded")
            return f"file: {path} is uploaded"
    except Exception as e:
        logger.error(f"failed to upload file ({path}) because: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload to the OctoPrint server.")

def is_valid_path(path: str) -> bool:
    return os.path.exists(path) and os.path.isfile(path)

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, log_level="info")