"""
octoprint_routes.py

Flask routes for OctoPrint communication.
"""
from flask import Blueprint, request, jsonify
import os
import sys
import logging

# Add project root to Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, project_root)

# Import the OctoPrint connector modules
from backend.divider.octoprint_connector import (
    connect_octoprint, disconnect_octoprint, get_connection,
    is_octoprint_server, is_octoprint_connected
)
from backend.divider.octoprint_info_retriever import (
    get_current_flags, get_current_temperature_bed, get_current_temperature_tool0,
    get_target_temperature_bed, get_target_temperature_tool0
)
from backend.divider.octoprint_jobs import (
    get_status_job, print_selected_job, cancel_print,
    pause_print, resume_print
)
from backend.divider.octoprint_files import (
    post_select_file, get_all_files, upload_gcode_file, delete_file,
    FileNotFound, FileIsCurrentlyBeingPrinted
)

logger = logging.getLogger(__name__)
bp = Blueprint('octoprint', __name__, url_prefix='/api/octoprint')

@bp.route('/connect', methods=['GET'])
def connect():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        connect_octoprint(ip, api_key)
        return jsonify({"message": "Connection started successfully."})
    except Exception as e:
        logger.error(f"Failed to connect: {e}")
        return jsonify({"detail": "Failed to connect to OctoPrint server."}), 500

@bp.route('/disconnect', methods=['GET'])
def disconnect():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    if not is_octoprint_connected(ip, api_key):
        return jsonify({"detail": "OctoPrint server is not connected."}), 400
    
    try:
        disconnect_octoprint(ip, api_key)
        return jsonify({"message": "Disconnected successfully."})
    except Exception as e:
        logger.error(f"Failed to disconnect: {e}")
        return jsonify({"detail": "Failed to disconnect from OctoPrint server."}), 500

@bp.route('/connection', methods=['GET'])
def get_connection_info():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        connection_info = get_connection(ip, api_key)
        return jsonify(connection_info)
    except Exception as e:
        logger.error(f"Failed to get connection info: {e}")
        return jsonify({"detail": "Failed to get connection info from OctoPrint server."}), 500

@bp.route('/flags', methods=['GET'])
def get_flags():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    if not is_octoprint_connected(ip, api_key):
        return jsonify({"detail": "OctoPrint server is not connected."}), 400
    
    try:
        flags = get_current_flags(ip, api_key)
        return jsonify(flags)
    except Exception as e:
        logger.error(f"Failed to get flags: {e}")
        return jsonify({"detail": "Failed to get flags from OctoPrint server."}), 500

@bp.route('/temperature/bed', methods=['GET'])
def get_bed_temperature():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    if not is_octoprint_connected(ip, api_key):
        return jsonify({"detail": "OctoPrint server is not connected."}), 400
    
    try:
        bed_temp = get_current_temperature_bed(ip, api_key)
        return jsonify({"bed_temperature": bed_temp})
    except Exception as e:
        logger.error(f"Failed to get bed temperature: {e}")
        return jsonify({"detail": "Failed to get bed temperature from OctoPrint server."}), 500

@bp.route('/temperature/tool0', methods=['GET'])
def get_tool0_temperature():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    if not is_octoprint_connected(ip, api_key):
        return jsonify({"detail": "OctoPrint server is not connected."}), 400
    
    try:
        tool0_temp = get_current_temperature_tool0(ip, api_key)
        return jsonify({"tool0_temperature": tool0_temp})
    except Exception as e:
        logger.error(f"Failed to get tool0 temperature: {e}")
        return jsonify({"detail": "Failed to get tool0 temperature from OctoPrint server."}), 500

@bp.route('/temperature/bed/target', methods=['GET'])
def get_target_bed_temperature():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    if not is_octoprint_connected(ip, api_key):
        return jsonify({"detail": "OctoPrint server is not connected."}), 400
    
    try:
        target_bed_temp = get_target_temperature_bed(ip, api_key)
        return jsonify({"target_bed_temperature": target_bed_temp})
    except Exception as e:
        logger.error(f"Failed to get target bed temperature: {e}")
        return jsonify({"detail": "Failed to get target bed temperature from OctoPrint server."}), 500

@bp.route('/temperature/tool0/target', methods=['GET'])
def get_target_tool0_temperature():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    if not is_octoprint_connected(ip, api_key):
        return jsonify({"detail": "OctoPrint server is not connected."}), 400
    
    try:
        target_tool0_temp = get_target_temperature_tool0(ip, api_key)
        return jsonify({"target_tool0_temperature": target_tool0_temp})
    except Exception as e:
        logger.error(f"Failed to get target tool0 temperature: {e}")
        return jsonify({"detail": "Failed to get target tool0 temperature from OctoPrint server."}), 500

@bp.route('/job/status', methods=['GET'])
def job_status():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        job_status = get_status_job(ip, api_key)
        return jsonify(job_status)
    except Exception as e:
        logger.error(f"Failed to get job status: {e}")
        return jsonify({"detail": "Failed to get job status from OctoPrint server."}), 500

@bp.route('/files', methods=['GET'])
def all_files():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        all_files_json = get_all_files(ip, api_key)
        return jsonify(all_files_json)
    except Exception as e:
        logger.error(f"Failed to get files: {e}")
        return jsonify({"detail": "Failed to get files from OctoPrint server."}), 500

@bp.route('/delete', methods=['DELETE'])
def delete_file_endpoint():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    name = request.args.get('name')
    
    if not ip or not api_key or not name:
        return jsonify({"detail": "IP, API key, and file name are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    if not is_octoprint_connected(ip, api_key):
        return jsonify({"detail": "OctoPrint server is not connected."}), 400
    
    try:
        result = delete_file(ip, api_key, name)
        if result is not None:
            return jsonify({"message": f"File {name} deleted successfully."})
        else:
            return jsonify({"detail": f"Failed to delete file {name}."}), 500
    except FileNotFound:
        return jsonify({"detail": f"File {name} not found."}), 404
    except FileIsCurrentlyBeingPrinted:
        return jsonify({"detail": f"File {name} is currently being printed."}), 409
    except Exception as e:
        logger.error(f"Failed to delete file {name}: {e}")
        return jsonify({"detail": f"Failed to delete file {name} from OctoPrint server."}), 500

@bp.route('/upload', methods=['POST'])
def upload_file():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    path = request.args.get('path')
    
    if not ip or not api_key or not path:
        return jsonify({"detail": "IP, API key, and file path are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        if os.path.exists(path) and os.path.isfile(path):
            upload_gcode_file(ip, api_key, path)
            logger.info(f"file: {path} is uploaded")
            return jsonify({"message": f"file: {path} is uploaded"})
        else:
            return jsonify({"detail": f"File {path} does not exist or is not a file."}), 400
    except Exception as e:
        logger.error(f"failed to upload file ({path}) because: {e}")
        return jsonify({"detail": "Failed to upload to the OctoPrint server."}), 500

@bp.route('/select_file', methods=['POST'])
def select_file():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    name = request.args.get('name')
    
    if not ip or not api_key or not name:
        return jsonify({"detail": "IP, API key, and file name are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        post_select_file(ip, api_key, name)
        return jsonify({"message": "File selected successfully."})
    except Exception as e:
        logger.error(f"Failed to select file: {e}")
        return jsonify({"detail": "Failed to select file on OctoPrint server."}), 500

@bp.route('/job', methods=['POST'])
def start_print_job():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        response = print_selected_job(ip, api_key)
        if response.status_code == 204:
            return jsonify({"message": "Print job started successfully."})
        else:
            return jsonify({"detail": "Failed to start print job on OctoPrint server."}), 500
    except Exception as e:
        logger.error(f"Failed to start print job: {e}")
        return jsonify({"detail": "Failed to start print job on OctoPrint server."}), 500

@bp.route('/job/cancel', methods=['POST'])
def cancel_print_job():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        response = cancel_print(ip, api_key)
        if response.status_code == 204:
            return jsonify({"message": "Print job cancelled successfully."})
        else:
            return jsonify({"detail": "Failed to cancel print job on OctoPrint server."}), 500
    except Exception as e:
        logger.error(f"Failed to cancel print job: {e}")
        return jsonify({"detail": "Failed to cancel print job on OctoPrint server."}), 500

@bp.route('/job/pause', methods=['POST'])
def pause_print_job():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        response = pause_print(ip, api_key)
        if response.status_code == 204:
            return jsonify({"message": "Print job paused successfully."})
        else:
            return jsonify({"detail": "Failed to pause print job on OctoPrint server."}), 500
    except Exception as e:
        logger.error(f"Failed to pause print job: {e}")
        return jsonify({"detail": "Failed to pause print job on OctoPrint server."}), 500

@bp.route('/job/resume', methods=['POST'])
def resume_print_job():
    ip = request.args.get('ip')
    api_key = request.args.get('api_key')
    
    if not ip or not api_key:
        return jsonify({"detail": "IP and API key are required"}), 400
    
    if not is_octoprint_server(ip, api_key):
        return jsonify({"detail": "IP is not an OctoPrint server or incorrect API key."}), 400
    
    try:
        response = resume_print(ip, api_key)
        if response.status_code == 204:
            return jsonify({"message": "Print job resumed successfully."})
        else:
            return jsonify({"detail": "Failed to resume print job on OctoPrint server."}), 500
    except Exception as e:
        logger.error(f"Failed to resume print job: {e}")
        return jsonify({"detail": "Failed to resume print job on OctoPrint server."}), 500