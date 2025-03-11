from flask import Blueprint, request, send_file, current_app, jsonify
from flask_login import login_required, current_user
from backend.services.file_service import FileService
from backend.database.models import UserRole, PrintRequest
from backend.utils import ResponseBuilder
from typing import Tuple, Dict, Any
from backend.database.models import UserRole, Printer
from backend.database.config import db
from typing import Tuple, Dict
import logging
from pathlib import Path
import os

logger = logging.getLogger(__name__)
bp = Blueprint('files', __name__)

file_service = None

@bp.record_once
def on_register(state):
    """Initialize file_service when blueprint is registered with app"""
    global file_service
    upload_folder = state.app.config['UPLOAD_FOLDER']
    file_service = FileService(upload_folder)


@bp.route('/api/files/upload', methods=['POST'])
@login_required
def upload_file() -> Tuple[Dict[str, Any], int]:
    """Upload new STL file"""
    try:
        if 'file' not in request.files:
            return ResponseBuilder.error("No file provided", 400)

        file_obj = file_service.save_file(request.files['file'], current_user)
        
        return ResponseBuilder.success(
            ResponseBuilder.create_file_response(file_obj),  
            "File uploaded successfully",
            201
        )
            
    except ValueError as e:
        return ResponseBuilder.error(str(e), 400)
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return ResponseBuilder.error("Failed to upload file", 500)

@bp.route('/api/files', methods=['GET'])
@login_required
def get_files() -> Tuple[Dict[str, Any], int]:
    """Get user's files or all files for admin"""
    try:
        files = (file_service.get_all_files() 
                if current_user.role == UserRole.ADMIN.value 
                else file_service.get_user_files(current_user))
        
        return ResponseBuilder.success({
            'count': len(files),
            'files': [ResponseBuilder.create_file_response(f) for f in files]
        })
    except Exception as e:
        logger.error(f"Files fetch error: {str(e)}")
        return ResponseBuilder.error("Failed to get files", 500)
    
@bp.route('/api/files/<file_id>', methods=['GET'])
@login_required
def get_file(file_id: str) -> Tuple[Dict[str, Any], int]:
    """
    Get file metadata
    Requires authentication and proper permissions
    """
    try:
        file_obj = file_service.get_file(file_id, current_user)
        if not file_obj:
            return ResponseBuilder.error("File not found or access denied", 404)
        
        return ResponseBuilder.success(ResponseBuilder.create_file_response(file_obj))
    except Exception as e:
        logger.error(f"Error fetching file metadata: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

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
            return ResponseBuilder.error("File not found or access denied", 404)

        file_path = Path(file_obj.file_path)
        if not file_path.exists():
            return ResponseBuilder.error("File not found on disk", 404)
            
        return send_file(
            str(file_path),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=file_obj.filename
        )
            
    except Exception as e:
        logger.error(f"Error serving file content: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/files/<file_id>', methods=['DELETE'])
@login_required
def delete_file(file_id: str) -> Tuple[Dict[str, Any], int]:
    """
    Delete file
    Requires authentication and proper permissions
    """
    try:
        if file_service.delete_file(file_id, current_user):
            return ResponseBuilder.success(message="File deleted successfully", status_code=204)
        return ResponseBuilder.error("File not found or access denied", 404)
    except Exception as e:
        logger.error(f"Error deleting file: {str(e)}")
        return ResponseBuilder.error(str(e), 500)


@bp.route('/api/files/<file_id>/analyze', methods=['GET'])
@login_required
def analyze_file(file_id: str) -> Tuple[Dict[str, Any], int]:
    """Analyze STL file to count separate objects and generate previews"""
    try:
        file_obj = file_service.get_file(file_id, current_user)
        if not file_obj:
            return ResponseBuilder.error("File not found or access denied", 404)
            
        analysis_results = file_service.analyze_file(file_id, current_user)
        return ResponseBuilder.success(analysis_results)
            
    except ValueError as e:
        return ResponseBuilder.error(str(e), 400)
    except Exception as e:
        logger.error(f"STL analysis error: {str(e)}")
        return ResponseBuilder.error(str(e), 500)
    
    
@bp.route('/api/files/<file_id>/objects/<int:object_id>', methods=['GET'])
@login_required
def get_object_file(file_id: str, object_id: int):
    """Get a specific object's STL file from a multi-object STL"""
    try:
        # Check if user has access to the parent file
        file_obj = file_service.get_file(file_id, current_user)
        if not file_obj:
            return ResponseBuilder.error("File not found or access denied", 404)
            
        # Use configuration for temp directory path instead of hardcoding
        temp_dir = Path(current_app.config.get('TEMP_OBJECTS_DIR', 
                    os.path.join(current_app.root_path, 'output', 'temp_objects'))) / file_id
        obj_file_path = temp_dir / f'object_{object_id}.stl'
        
        if not obj_file_path.exists():
            return ResponseBuilder.error("Object file not found", 404)
            
        return send_file(
            str(obj_file_path),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=f'object_{object_id}.stl'
        )
            
    except Exception as e:
        logger.error(f"Error serving object file: {str(e)}")
        return ResponseBuilder.error(str(e), 500)
    
@bp.route('/api/slicer/preview/<request_id>', methods=['GET'])
@login_required
def preview_print_request(request_id: str):
    """
    Get STL file for preview from a print request
    Requires authentication and proper permissions
    """
    try:
        print_request = PrintRequest.query.get(request_id)
        if not print_request:
            return ResponseBuilder.error("Print request not found", 404)
            
        # Check if user has access
        if print_request.user_id != current_user.id and current_user.role != UserRole.ADMIN.value:
            return ResponseBuilder.error("Access denied", 403)
            
        # Check if file exists
        file_path = Path(print_request.file_path)
        if not file_path.exists():
            return ResponseBuilder.error("STL file not found on disk", 404)
            
        return send_file(
            str(file_path),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=f'preview_{request_id}.stl'
        )
            
    except Exception as e:
        logger.error(f"Error serving preview: {str(e)}")
        return ResponseBuilder.error(str(e), 500)
      
    

@bp.route('/api/printers', methods=['GET'])
def get_all_printers():
    """
    Get all printers in the database.
    Requires authentication.
    """
    printers = db.session.query(Printer).all()  
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

