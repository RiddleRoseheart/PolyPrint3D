from flask import Blueprint, jsonify, request, Response, current_app
from flask_login import login_required, current_user
from backend.slicer.scripts.file_manager import FileManager
from backend.services.slicer_service import SlicerService
from pathlib import Path
import logging
from typing import Dict, Tuple
from backend.services.notification_service import NotificationService
import os
from backend.database.models import PrintRequest, UploadedFile
import uuid

logger = logging.getLogger(__name__)
bp = Blueprint('slicer', __name__)

# Initialize service with app config
slicer_service = None

@bp.record_once
def configure_blueprint(state):
    """Initialize slicer_service when blueprint is registered"""
    global slicer_service
    notification_service = NotificationService(state.app.extensions.get('mail'))
    
    sftp_host = state.app.config.get('SFTP_HOST')
    sftp_username = state.app.config.get('SFTP_USERNAME')
    sftp_password = state.app.config.get('SFTP_PASSWORD')
    sftp_remote_path = state.app.config.get('SFTP_REMOTE_PATH')
    local_output_path = state.app.config.get('LOCAL_OUTPUT_PATH', 'backend/slicer/output')
    
    # Create file manager
    file_manager = FileManager(
        host=sftp_host,
        username=sftp_username,
        password=sftp_password,
        remote_path=sftp_remote_path,
        local_output_path=local_output_path
    )
    
    # Create slicer service with file manager
    slicer_service = SlicerService(
        state.app.config['OUTPUT_FOLDER'],
        state.app.config['CONFIG_PATH'],
        notification_service,
        file_manager
    )

def create_print_request_response(request) -> Dict:
    """Create standardized print request response"""
    return {
        'id': request.id,
        'file_path': request.file_path,
        'state': request.state,
        'filament': request.filament,
        'dimension': request.dimension,
        'filling': request.filling,
        'layer': request.layer,
        'created_at': request.created_at.isoformat(),
        'gcode_file': {
            'id': request.gcode_file.id,
            'file_path': request.gcode_file.file_path
        } if request.gcode_file else None
    }

@bp.route('/api/slicer/slice', methods=['POST'])
@login_required
def slice_file() -> Tuple[Dict, int]:
    """
    Start slicing job for a file
    Requires authentication
    """
    try:
        from backend.database.models import UploadedFile, PrintRequest
        from backend.slicer.scripts.slicer import split_and_distribute_objects, slice_with_prusa_slicer
        import uuid
        
        data = request.get_json()
        file_id = data.get('fileId')
        global_settings = data.get('globalSettings', {})
        object_configs = data.get('objects', [])
        
        if not file_id:
            return jsonify({'error': 'No file ID provided'}), 400

        # Get the file
        original_file = UploadedFile.query.get(file_id)
        if not original_file:
            return jsonify({'error': 'File not found'}), 404
            
        # Generate unique job name
        job_name = f"job_{uuid.uuid4().hex[:8]}"

        # Call your existing function to process the file
        output_files = split_and_distribute_objects(
            input_path=str(original_file.file_path),
            file_manager=slicer_service.file_manager,
            job_name=job_name
        )
        
        if not output_files:
            return jsonify({'error': 'No valid objects found or slicing failed'}), 400
        
        logger.info(f"Generated {len(output_files)} output files")
        
        
        print_requests = []
        # Process each output file
        for file_info in output_files:
            print_request = PrintRequest(
                id=str(uuid.uuid4()),
                file_path=file_info['path'],
                original_file_id=original_file.id,
                user_id=current_user.id,
                material=file_info['material'],
                color=file_info['color'],
                state="processing",
                filling=global_settings.get('infill', 20),
                layer_height=0.2
            )
            
            db.session.add(print_request)
            db.session.flush()
            
            # Slice the file
            success = slice_with_prusa_slicer(
                file_info['path'],
                slicer_service.file_manager,
                job_name,
                file_info['printer'],
                str(slicer_service.config_path)
            )
            
            if success:
                print_request.state = "completed"
            else:
                print_request.state = "failed"
                
            print_requests.append(print_request)
        
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'print_requests': [create_print_request_response(pr) for pr in print_requests]
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Slicing error: {str(e)}")
        return jsonify({'error': f'Slicing failed: {str(e)}'}), 500
        
        
            
@bp.route('/api/slicer/requests', methods=['GET'])
@login_required
def get_print_requests() -> Tuple[Dict, int]:
    """
    Get all print requests for current user
    Requires authentication
    """
    try:
        requests = slicer_service.get_user_print_requests(current_user)
        return jsonify({
            'print_requests': [create_print_request_response(pr) for pr in requests]
        })
    except Exception as e:
        logger.error(f"Error getting print requests: {str(e)}")
        return jsonify({'error': 'Failed to get print requests'}), 500

@bp.route('/api/slicer/requests/<request_id>', methods=['GET'])
@login_required
def get_print_request(request_id: str) -> Tuple[Dict, int]:
    """
    Get specific print request
    Requires authentication and proper permissions
    """
    try:
        request = slicer_service.get_print_request(request_id, current_user)
        if not request:
            return jsonify({'error': 'Print request not found or access denied'}), 404
            
        return jsonify(create_print_request_response(request))
    except Exception as e:
        logger.error(f"Error getting print request: {str(e)}")
        return jsonify({'error': 'Failed to get print request'}), 500

@bp.route('/api/slicer/requests/<request_id>', methods=['DELETE'])
@login_required
def cleanup_print_request(request_id: str) -> Tuple[Dict, int]:
    """
    Clean up print request and associated files
    Requires authentication and proper permissions
    """
    try:
        if slicer_service.cleanup_print_request(request_id, current_user):
            return '', 204
        return jsonify({'error': 'Print request not found or access denied'}), 404
    except Exception as e:
        logger.error(f"Cleanup error: {str(e)}")
        return jsonify({'error': 'Cleanup failed'}), 500
    
@bp.route('/api/slicer/materials', methods=['GET'])
@login_required
def get_materials() -> Tuple[Dict, int]:
    """Get available materials and their properties"""
    try:
        materials = slicer_service.get_available_materials()
        return jsonify(materials)
    except Exception as e:
        logger.error(f"Error getting materials: {str(e)}")
        return jsonify({'error': "Failed to get materials"}), 500

@bp.route('/api/slicer/colors', methods=['GET'])
@login_required
def get_colors() -> Tuple[Dict, int]:
    """Get available colors"""
    try:
        colors = slicer_service.get_available_colors()
        return jsonify(colors)
    except Exception as e:
        logger.error(f"Error getting colors: {str(e)}")
        return jsonify({'error': "Failed to get colors"}), 500