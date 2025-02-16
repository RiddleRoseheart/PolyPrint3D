from flask import Blueprint, jsonify, request, send_file
from backend.services.file_service import FileService
from backend.services.slicer_service import SlicerService
from pathlib import Path
from werkzeug.utils import secure_filename
import uuid
from typing import Tuple, Dict, Any
from datetime import datetime

bp = Blueprint('files', __name__)

# Initialize services
UPLOAD_DIR = Path('backend/uploads')
OUTPUT_DIR = Path('backend/output')
CONFIG_PATH = Path('config/config.ini')

file_service = FileService(str(UPLOAD_DIR))
slicer_service = SlicerService(str(OUTPUT_DIR), str(CONFIG_PATH))

def create_response(data: Dict[str, Any], status_code: int = 200) -> Tuple[Dict, int]:
    """Helper function to create consistent API responses"""
    return jsonify(data), status_code

def create_error_response(message: str, status_code: int = 400) -> Tuple[Dict, int]:
    """Helper function to create consistent error responses"""
    return jsonify({'error': message}), status_code

@bp.route('/api/data', methods=['GET'])
def get_service_status() -> Tuple[Dict, int]:
    """
    Get service status
    
    Returns:
        JSON response with service status
    """
    return create_response({
        "message": "3D Printing Service Ready",
        "status": "online"
    })

@bp.route('/api/files/upload', methods=['POST'])
def upload_file() -> Tuple[Dict, int]:
    """
    Handle file upload
    
    Returns:
        JSON response with upload status and file metadata
    """
    try:
        # Validate request
        if 'file' not in request.files:
            return create_error_response('No file part')
            
        file = request.files['file']
        if file.filename == '':
            return create_error_response('No selected file')
            
        if not file.filename.lower().endswith('.stl'):
            return create_error_response('Invalid file type - only STL files are allowed')

        # Process file upload
        file_id = str(uuid.uuid4())
        filename = secure_filename(file.filename)
        
        # Ensure directory exists
        UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        
        # Save file with unique name
        file_path = UPLOAD_DIR / f"{file_id}.stl"
        file.save(str(file_path))
        
        # Create response
        return create_response({
            'id': file_id,
            'filename': filename,
            'status': 'uploaded',
            'uploaded_at': datetime.now().isoformat()
        }, 201)
            
    except Exception as e:
        print(f"Upload error: {str(e)}") 
        return create_error_response(str(e), 500)

@bp.route('/api/files/<file_id>', methods=['GET'])
def get_file(file_id: str) -> Tuple[Dict, int]:
    """
    Get file metadata
    
    Args:
        file_id: Unique identifier of the file
        
    Returns:
        JSON response with file metadata
    """
    file_obj = file_service.get_file(file_id)
    if not file_obj:
        return create_error_response('File not found', 404)
    
    return create_response({
        'id': file_obj.id,
        'filename': file_obj.filename,
        'status': file_obj.status,
        'created_at': file_obj.created_at.isoformat(),
        'updated_at': file_obj.updated_at.isoformat()
    })

@bp.route('/api/files/<file_id>', methods=['DELETE'])
def delete_file(file_id: str) -> Tuple[Dict, int]:
    """
    Delete file
    
    Args:
        file_id: Unique identifier of the file to delete
        
    Returns:
        Empty response on success, error response if file not found
    """
    if file_service.delete_file(file_id):
        return '', 204
    return create_error_response('File not found', 404)

@bp.route('/api/files/<file_id>/content', methods=['GET'])
def get_file_content(file_id: str):
    """
    Get file content
    
    Args:
        file_id: Unique identifier of the file
        
    Returns:
        File content as attachment or error response
    """
    try:
        # Construct absolute file path
        file_path = UPLOAD_DIR / f"{file_id}.stl"
        
        print(f"Looking for file at: {file_path}") 
        
        if not file_path.exists():
            print(f"File not found: {file_path}")
            return jsonify({'error': 'File not found'}), 404
            
        # Use absolute path for send_file
        return send_file(
            str(file_path.absolute()),
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=f"{file_id}.stl"
        )
        
    except Exception as e:
        print(f"Error serving file: {str(e)}") 
        return jsonify({'error': str(e)}), 500