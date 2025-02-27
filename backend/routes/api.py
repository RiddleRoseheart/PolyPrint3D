from flask import Blueprint, jsonify, request, send_file
from flask_login import login_required, current_user
from pathlib import Path
from werkzeug.utils import secure_filename
import uuid

bp = Blueprint('api', __name__)

@bp.route('/api/data', methods=['GET'])
def get_data():
    return jsonify({"message": "Hello from Flask!"})

@bp.route('/api/files/upload', methods=['POST'])
@login_required  # Ensures user must be logged in
def upload_file():
    print("Request received")
    print("Files:", request.files)
    
    if 'file' not in request.files:
        print("No file in request.files")
        return jsonify({'error': 'No file provided'}), 400
        
    file = request.files['file']
    print("File received:", file.filename)
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
        
    if not file.filename.endswith('.stl'):
        return jsonify({'error': 'Only STL files are allowed'}), 400
    
    try:
        filename = secure_filename(file.filename)
        file_id = str(uuid.uuid4())
        
        input_dir = Path(__file__).parent.parent / "input"
        input_dir.mkdir(exist_ok=True, parents=True)
        
        file_path = input_dir / filename
        file.save(str(file_path))
        
        return jsonify({
            'fileId': file_id,
            'filename': filename,
            'status': 'uploaded'
        })
    except Exception as e:
        print("Upload error:", str(e))
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500

@bp.route('/slicer/slice', methods=['POST'])
@login_required  # Ensures user must be logged in
def slice_file():
    data = request.json
    file_id = data.get('fileId')
    settings = data.get('settings', {})
    
    if not file_id:
        return jsonify({'error': 'No fileId provided'}), 400
    
    # Generate job ID for tracking
    job_id = str(uuid.uuid4())
    
    try:
        input_stl = str(Path(__file__).parent.parent / "input" / f"{file_id}.stl")
        split_dir = str(Path(__file__).parent.parent / "output" / "split_objects")
        gcode_dir = str(Path(__file__).parent.parent / "output" / "gcode")
        config = str(Path(__file__).parent.parent / "config" / "config.ini")
        
        # Split STL into objects
        num_objects = split_stl_into_objects(input_stl, split_dir)
        
        # Slice each split object
        for stl_file in Path(split_dir).glob("*.stl"):
            slice_with_prusa_slicer(stl_file, gcode_dir, config)
            
        slicing_jobs[job_id] = {
            'status': 'completed',
            'objects': num_objects
        }
        
        return jsonify({
            'jobId': job_id,
            'status': 'processing'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/slicer/status/<slicing_id>')
def get_slicing_status(slicing_id):
    job = slicing_jobs.get(slicing_id)
    if not job:
        return jsonify({'error': 'Job not found'}), 404
    return jsonify(job)

@bp.route('/printer/send', methods=['POST'])
@login_required  # Ensures user must be logged in
def start_print():
    data = request.json
    job_id = str(uuid.uuid4())
    
    print_jobs[job_id] = {
        'status': 'printing',
        'progress': 0
    }
    
    return jsonify({
        'printJobId': job_id,
        'status': 'started'
    })

@bp.route('/printer/status/<print_job_id>')
def get_print_status(print_job_id):
    job = print_jobs.get(print_job_id)
    if not job:
        return jsonify({'error': 'Print job not found'}), 404
    return jsonify(job)

@bp.route('/api/files/<file_id>', methods=['GET'])
@login_required  # Ensures user must be logged in
def get_file(file_id):
    try:
        # Debug logging
        print(f"Attempting to load file with ID: {file_id}")
        
        input_dir = Path(__file__).parent.parent / "input"
        print(f"Looking in directory: {input_dir}")
        
        # Find the file
        file_path = None
        for file in input_dir.glob('*.stl'):
            print(f"Found file: {file.name}")
            if file.stem == file_id:
                file_path = file
                break
        
        if not file_path:
            print("File not found")
            return jsonify({'error': 'File not found'}), 404
            
        print(f"Serving file: {file_path}")
        return send_file(
            file_path,
            mimetype='application/octet-stream',
            as_attachment=True,
            download_name=file_path.name  # Sets file name when downloading
        )
    except Exception as e:
        print(f"Error serving file: {str(e)}")
        return jsonify({'error': str(e)}), 500
