from flask import Blueprint, jsonify, request, Response, current_app, send_file
from flask_login import login_required, current_user
from backend.services.slicer_service import SlicerService
from backend.services.notification_service import NotificationService
from backend.utils import ResponseBuilder
import logging
from typing import Dict, Tuple
import os
from backend.database.models import PrintRequest, UploadedFile
import uuid
from backend.database import db
from backend.slicer.config.material_config import MaterialConfig
from backend.database.models import Printer

logger = logging.getLogger(__name__)
bp = Blueprint('slicer', __name__)

# Initialize service with app config
slicer_service = None

@bp.record_once
def configure_blueprint(state):
    """Initialize slicer_service when blueprint is registered"""
    global slicer_service
    notification_service = NotificationService(state.app.extensions.get('mail'))
    
    # Create file manager with configuration
    from backend.slicer.scripts.file_manager import FileManager
    file_manager = FileManager(
        host=state.app.config.get('SFTP_HOST', ''),
        username=state.app.config.get('SFTP_USERNAME', ''),
        password=state.app.config.get('SFTP_PASSWORD', ''),
        remote_path=state.app.config.get('SFTP_REMOTE_PATH', ''),
        local_output_path=state.app.config.get('LOCAL_OUTPUT_PATH', '/slicer/output')
    )
    
    # Create slicer service with file manager
    slicer_service = SlicerService(
        state.app.config['OUTPUT_FOLDER'],
        state.app.config['CONFIG_PATH'],
        notification_service,
        file_manager
    )

@bp.route('/api/slicer/slice', methods=['POST'])
@login_required
def slice_file():
    """
    Slice an STL file with the provided configuration
    
    Request body:
    {
        "fileId": "uuid-of-uploaded-file",
        "globalSettings": {
            "infill": 20,
            "layer_height": 0.2,
            ...
        },
        "objects": [
            {
                "material": "PLA",
                "color": "White",
                ...
            },
            ...
        ]
    }
    
    Returns:
        JSON with created print requests and total price
    """
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        global_settings = data.get('globalSettings', {})
        objects_config = data.get('objects', [])
        
        logger.info(f"Received slicing request for file {file_id} with {len(objects_config)} object configurations")
        
        if not file_id:
            return ResponseBuilder.error("No file ID provided", 400)

        # Call service for slicing operation
        print_requests = slicer_service.slice_file(
            file_id,
            current_user,
            global_settings,
            objects_config
        )
        
        # Calculate total price
        total_price = sum(pr.price for pr in print_requests if pr.price)

        return ResponseBuilder.success({
            'total_price': total_price,
            'print_requests': [ResponseBuilder.create_print_request_response(pr) for pr in print_requests]
        })
            
    except ValueError as e:
        return ResponseBuilder.error(str(e), 400)
    except Exception as e:
        logger.error(f"Slicing error: {str(e)}")
        return ResponseBuilder.error(f"Slicing failed: {str(e)}", 500)

@bp.route('/api/slicer/requests', methods=['GET'])
@login_required
def get_print_requests():
    """
    Get all print requests for current user
    
    Returns:
        JSON with print requests list
    """
    try:
        requests = slicer_service.get_user_print_requests(current_user)
        return ResponseBuilder.success({
            'print_requests': [ResponseBuilder.create_print_request_response(pr) for pr in requests]
        })
    except Exception as e:
        logger.error(f"Error getting print requests: {str(e)}")
        return ResponseBuilder.error('Failed to get print requests', 500)

@bp.route('/api/slicer/requests/<request_id>', methods=['GET'])
@login_required
def get_print_request(request_id: str):
    """
    Get specific print request
    
    Args:
        request_id: ID of print request to retrieve
        
    Returns:
        JSON with print request details
    """
    try:
        request = slicer_service.get_print_request(request_id, current_user)
        if not request:
            return ResponseBuilder.error('Print request not found or access denied', 404)
            
        return ResponseBuilder.success(ResponseBuilder.create_print_request_response(request))
    except Exception as e:
        logger.error(f"Error getting print request: {str(e)}")
        return ResponseBuilder.error('Failed to get print request', 500)

@bp.route('/api/slicer/requests/<request_id>', methods=['DELETE'])
@login_required
def cleanup_print_request(request_id: str):
    """
    Clean up print request and associated files
    
    Args:
        request_id: ID of print request to clean up
        
    Returns:
        204 No Content on success, error message on failure
    """
    try:
        if slicer_service.cleanup_print_request(request_id, current_user):
            return '', 204
        return ResponseBuilder.error('Print request not found or access denied', 404)
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        return ResponseBuilder.error('Cleanup failed', 500)
    

@bp.route('/api/slicer/materials', methods=['GET'])
@login_required
def get_materials():
    """
    Get available materials and their properties
    
    Query parameters:
        printer_id: Optional printer ID to filter by
    
    Returns:
        JSON with materials data
    """
    try:
        printer_id = request.args.get('printer_id')
        materials = slicer_service.get_available_materials(printer_id)
        return ResponseBuilder.success(materials)
    except Exception as e:
        logger.error(f"Error getting materials: {str(e)}")
        return ResponseBuilder.error("Failed to get materials", 500)

@bp.route('/api/slicer/colors', methods=['GET'])
@login_required
def get_colors():
    """
    Get available colors
    
    Query parameters:
        material_id: Optional material ID to filter by
        printer_id: Optional printer ID to filter by
    
    Returns:
        JSON with colors data
    """
    try:
        material_id = request.args.get('material_id')
        printer_id = request.args.get('printer_id')
        colors = slicer_service.get_available_colors(material_id, printer_id)
        return ResponseBuilder.success(colors)
    except Exception as e:
        logger.error(f"Error getting colors: {str(e)}")
        return ResponseBuilder.error("Failed to get colors", 500)

@bp.route('/api/slicer/download/<request_id>', methods=['GET'])
@login_required
def download_gcode(request_id: str):
    """
    Download G-code file for a print request
    
    Args:
        request_id: ID of print request
        
    Returns:
        G-code file for download
    """
    try:
        print_request = slicer_service.get_print_request(request_id, current_user)
        
        if not print_request:
            return ResponseBuilder.error('Print request not found or access denied', 404)
        
        gcode_path = slicer_service.get_gcode_file_path(request_id)
        
        if not gcode_path or not os.path.exists(gcode_path):
            return ResponseBuilder.error('G-code file not found', 404)
        
        group_name = os.path.splitext(os.path.basename(print_request.file_path))[0]
        download_name = f"print_{group_name}.gcode"
        
        # Send the file
        return send_file(
            str(gcode_path),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=download_name
        )
            
    except Exception as e:
        logger.error(f"Error downloading G-code: {str(e)}")
        return ResponseBuilder.error(str(e), 500)
    
#TODO sevice
@bp.route('/api/slicer/requests/<request_id>/print', methods=['POST'])
@login_required
def send_to_printer(request_id: str):
    """
    Send a print request to a printer
    
    Args:
        request_id: ID of print request to send
        
    Returns:
        JSON response indicating success or failure
    """
    try:
        # Get print request to check if it exists
        print_request = slicer_service.get_print_request(request_id, current_user)
        if not print_request:
            return ResponseBuilder.error("Print request not found or access denied", 404)
        
        # Check if printer is assigned
        if not print_request.printer_id:
            return ResponseBuilder.error(f"No printer assigned to print request {request_id}", 400)
        
        # Check printer status before sending
        printer = Printer.query.get(print_request.printer_id)
        if not printer:
            return ResponseBuilder.error(f"Printer {print_request.printer_id} not found", 404)
        
        logger.info(f"Sending print request {request_id} to printer {printer.name} at {printer.ip_address}")
        
        # Send to printer
        success = slicer_service.send_to_printer(request_id, current_user)
        
        if success:
            return ResponseBuilder.success(message="Print job sent to printer successfully")
        else:
            return ResponseBuilder.error("Failed to send print job to printer. Check server logs for details.", 400)
            
    except Exception as e:
        logger.error(f"Error sending print job to printer: {str(e)}")
        return ResponseBuilder.error("Server error while sending print job to printer", 500)