from flask import Blueprint, jsonify, request, Response, current_app
from flask_login import login_required, current_user
from backend.services.slicer_service import SlicerService
from pathlib import Path
import logging
from typing import Dict, Tuple

logger = logging.getLogger(__name__)
bp = Blueprint('slicer', __name__)

# Initialize service with app config
slicer_service = None

@bp.record_once
def on_register(state):
    """Initialize slicer_service when blueprint is registered"""
    global slicer_service
    slicer_service = SlicerService(
        state.app.config['OUTPUT_FOLDER'],
        state.app.config['CONFIG_PATH']
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
        data = request.get_json()
        file_id = data.get('fileId')
        settings = data.get('settings', {})
        
        if not file_id:
            return jsonify({'error': 'No file ID provided'}), 400

        print_requests = slicer_service.start_slicing(
            file_id, 
            current_user,
            settings
        )
        
        return jsonify({
            'status': 'success',
            'print_requests': [create_print_request_response(pr) for pr in print_requests]
        })

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Slicing error: {str(e)}")
        return jsonify({'error': 'Slicing failed'}), 500

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