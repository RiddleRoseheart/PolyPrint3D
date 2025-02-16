from flask import Blueprint, jsonify, request, make_response, send_file, Response
from backend.slicer.scripts.slicer import split_and_distribute_objects, slice_with_prusa_slicer
from pathlib import Path
import os

bp = Blueprint('slicer', __name__)

# Constants for file paths and configurations
UPLOAD_DIR = Path('backend/uploads')
OUTPUT_DIR = Path('backend/output')
SPLIT_DIR = OUTPUT_DIR / "split_objects"
GCODE_DIR = OUTPUT_DIR / "gcode"
CONFIG_PATH = Path('backend/slicer/config/config.ini')
MIN_STL_SIZE = 84  # Minimum size for a valid STL file

def ensure_directories():
    """Create necessary directories if they don't exist."""
    for dir_path in [OUTPUT_DIR, SPLIT_DIR, GCODE_DIR]:
        dir_path.mkdir(parents=True, exist_ok=True)

def validate_stl_file(file_path: Path) -> bool:
    """
    Validate STL file structure and size
    
    Args:
        file_path (Path): Path to the STL file
        
    Returns:
        bool: True if file is valid, False otherwise
        
    Raises:
        ValueError: If file is corrupted or invalid
    """
    file_size = file_path.stat().st_size
    if file_size < MIN_STL_SIZE:
        raise ValueError('Invalid STL file size')
        
    with open(file_path, 'rb') as f:
        header = f.read(80)
        num_triangles_bytes = f.read(4)
        num_triangles = int.from_bytes(num_triangles_bytes, byteorder='little')
        expected_size = MIN_STL_SIZE + (num_triangles * 50)
        
        if file_size != expected_size:
            raise ValueError('Corrupted STL file structure')
            
    return True

@bp.route('/api/slicer/slice', methods=['POST'])
def slice_file():
    """
    Endpoint to slice an STL file into multiple parts
    
    Expected JSON payload:
    {
        "fileId": "string",
        "settings": {
            // slicing settings object
        }
    }
    """
    try:
        data = request.get_json()
        file_id = data.get('fileId')
        settings = data.get('settings')
        
        if not file_id:
            return jsonify({'error': 'No file ID provided'}), 400

        file_path = UPLOAD_DIR / f"{file_id}.stl"
        if not file_path.exists():
            return jsonify({'error': 'File not found'}), 404

        ensure_directories()

        # Split STL into multiple parts
        split_files = split_and_distribute_objects(
            str(file_path),
            str(SPLIT_DIR),
            printer_count=4
        )

        # Process each split file
        sliced_files = []
        for stl_file in split_files:
            slice_id = Path(stl_file).stem
            file_path = Path(stl_file)
            
            # Validate file
            try:
                validate_stl_file(file_path)
            except ValueError as e:
                print(f"Validation error for slice {slice_id}: {str(e)}")
                continue
                
            size = file_path.stat().st_size
            print(f"Processing slice {slice_id}, size: {size} bytes")
            
            # Generate gcode
            gcode_path = GCODE_DIR / f"{slice_id}.gcode"
            slice_with_prusa_slicer(str(file_path), str(GCODE_DIR), str(CONFIG_PATH))
            
            sliced_files.append({
                'id': slice_id,
                'name': f"{slice_id}.stl",
                'path': f"/api/files/sliced/{slice_id}",
                'size': size,
                'gcode_path': str(gcode_path)
            })

        return jsonify({
            'status': 'success',
            'slices': sliced_files,
            'settings': settings
        })

    except Exception as e:
        print(f"Slicing error: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500

@bp.route('/api/files/sliced/<slice_id>', methods=['GET'])
def get_sliced_file(slice_id):
    """
    Serve a sliced STL file
    
    Args:
        slice_id (str): ID of the slice to retrieve
    """
    try:
        file_path = SPLIT_DIR / f"{slice_id}.stl"
        
        if not file_path.exists():
            print(f"File not found: {file_path}")
            return jsonify({'error': 'File not found'}), 404
            
        try:
            validate_stl_file(file_path)
        except ValueError as e:
            return jsonify({'error': str(e)}), 400
            
        # Read file in chunks for memory efficiency
        def generate():
            chunk_size = 8192
            with open(file_path, 'rb') as f:
                while True:
                    chunk = f.read(chunk_size)
                    if not chunk:
                        break
                    yield chunk

        response = Response(
            generate(),
            mimetype='application/octet-stream',
            headers={
                'Content-Disposition': f'attachment; filename={slice_id}.stl',
                'Content-Length': str(file_path.stat().st_size)
            }
        )
        return response
        
    except Exception as e:
        print(f"Error serving file: {str(e)}")
        return jsonify({'error': str(e)}), 500