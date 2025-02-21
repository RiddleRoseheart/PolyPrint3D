from flask import Blueprint, jsonify, request, send_file, current_app
from flask_login import login_required, current_user
from backend.services.file_service import FileService
from backend.database.models import UserRole
from typing import Tuple, Dict
import logging

logger = logging.getLogger(__name__)
bp = Blueprint('files', __name__)

file_service = None

@bp.record_once
def on_register(state):
    """Initialize file_service when blueprint is registered with app"""
    global file_service
    upload_folder = state.app.config['UPLOAD_FOLDER']
    file_service = FileService(upload_folder)


def create_file_response(file_obj) -> Dict:
    """Create standardized file response dictionary"""
    return {
        'id': file_obj.id,
        'filename': file_obj.filename,
        'status': file_obj.status,
        'created_at': file_obj.created_at.isoformat(),
        'user_id': file_obj.user_id
    }

@bp.route('/api/files/upload', methods=['POST'])
@login_required
def upload_file() -> Tuple[Dict, int]:
    """
    Upload new file
    Requires authentication
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No selected file'}), 400
            
        if not file.filename.lower().endswith('.stl'):
            return jsonify({'error': 'Invalid file type - only STL files are allowed'}), 400

        file_obj = file_service.save_file(file, current_user)
        return jsonify(create_file_response(file_obj)), 201
            
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/files', methods=['GET'])
@login_required
def get_files() -> Tuple[Dict, int]:
    """
    Get files - returns all files for admins, user's files for normal users
    Requires authentication
    """
    try:
        if current_user.role == UserRole.ADMIN.value:
            files = file_service.get_all_files()
        else:
            files = file_service.get_user_files(current_user)
        
        return jsonify({
            'files': [create_file_response(f) for f in files]
        })
    except Exception as e:
        logger.error(f"Error getting files: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/files/<file_id>', methods=['GET'])
@login_required
def get_file(file_id: str) -> Tuple[Dict, int]:
    """
    Get file metadata
    Requires authentication and proper permissions
    """
    file_obj = file_service.get_file(file_id, current_user)
    if not file_obj:
        return jsonify({'error': 'File not found or access denied'}), 404
    
    return jsonify(create_file_response(file_obj))

@bp.route('/api/files/<file_id>/content', methods=['GET'])
@login_required
def get_file_content(file_id: str):
    """
    Download file content
    Requires authentication and proper permissions
    """
    try:
        file_obj = file_service.get_file(file_id, current_user)
        if not file_obj:
            return jsonify({'error': 'File not found or access denied'}), 404

        file_path = Path(file_obj.file_path)
        if not file_path.exists():
            return jsonify({'error': 'File not found on disk'}), 404
            
        return send_file(
            str(file_path),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=file_obj.filename
        )
            
    except Exception as e:
        logger.error(f"Error serving file content: {str(e)}")
        return jsonify({'error': str(e)}), 500

@bp.route('/api/files/<file_id>', methods=['DELETE'])
@login_required
def delete_file(file_id: str) -> Tuple[Dict, int]:
    """
    Delete file
    Requires authentication and proper permissions
    """
    try:
        if file_service.delete_file(file_id, current_user):
            return '', 204
        return jsonify({'error': 'File not found or access denied'}), 404
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        return jsonify({'error': str(e)}), 500