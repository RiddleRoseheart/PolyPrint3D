from flask import Blueprint, jsonify, request, send_file, current_app
from flask_login import login_required, current_user
from backend.services.file_service import FileService
from backend.database.models import UserRole, Printer
from backend.database.config import db
from typing import Tuple, Dict
import logging
from pathlib import Path

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
    """Upload new STL file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file_obj = file_service.save_file(request.files['file'], current_user)
        return jsonify(create_file_response(file_obj)), 201
            
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': 'Failed to upload file'}), 500


@bp.route('/api/files', methods=['GET'])
@login_required
def get_files() -> Tuple[Dict, int]:
    """Get user's files or all files for admin"""
    try:
        files = (file_service.get_all_files() 
                if current_user.role == UserRole.ADMIN.value 
                else file_service.get_user_files(current_user))
        
        return jsonify({
            'count': len(files),
            'files': [create_file_response(f) for f in files]
        })
    except Exception as e:
        logger.error(f"Files fetch error: {str(e)}")
        return jsonify({'error': 'Failed to get files'}), 500
    
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
    

@bp.route('/api/printers', methods=['GET'])
def get_all_printers():
    """
    Get all printers in the database.
    Requires authentication.
    """
    printers = db.session.query(Printer).all()  # Explicitly query the database
    if not printers:
        return jsonify({'error': 'No printers found'}), 404
        print(printers)

    return jsonify({
        'printers': [
            {
                'id': printer.id,
                'name': printer.name,
                'ip_address': printer.ip_address,
                'api_key': printer.api_key,
                'status': printer.status,
                'created_at': printer.created_at.isoformat() if printer.created_at else None,
                'is_available': printer.is_available,
                'last_status_check': printer.last_status_check.isoformat() if printer.last_status_check else None,
                'material': printer.material,  
                'color': printer.color,
                'build_volume': printer.build_volume
            }

            for printer in printers
        ]
    }), 200