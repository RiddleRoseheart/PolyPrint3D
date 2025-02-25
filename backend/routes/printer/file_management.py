from flask import Blueprint, jsonify, request, current_app
from flask_login import login_required
from backend.services.printer import PrinterService
from typing import Dict, Tuple
import logging
import os

logger = logging.getLogger(__name__)
bp = Blueprint('printer_files', __name__)

printer_service = PrinterService()

@bp.route('/api/printers/<printer_id>/files', methods=['GET'])
@login_required
def get_printer_files(printer_id: str) -> Tuple[Dict, int]:
    """Get all files on printer"""
    try:
        files = printer_service.get_printer_files(printer_id)
        return jsonify(files)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting files: {str(e)}")
        return jsonify({'error': "Failed to get files"}), 500

@bp.route('/api/printers/<printer_id>/files', methods=['POST'])
@login_required
def upload_gcode(printer_id: str) -> Tuple[Dict, int]:
    """Upload G-code file to printer"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if not file.filename.endswith('.gcode'):
            return jsonify({'error': 'Invalid file type'}), 400

        auto_select = request.form.get('select', 'true').lower() == 'true'
        auto_print = request.form.get('print', 'false').lower() == 'true'

        temp_path = os.path.join(current_app.config['UPLOAD_FOLDER'], file.filename)
        file.save(temp_path)

        try:
            result = printer_service.upload_gcode(
                printer_id,
                temp_path,
                auto_select,
                auto_print
            )
            return jsonify(result), 201
        finally:
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Upload error: {str(e)}")
        return jsonify({'error': "Upload failed"}), 500

@bp.route('/api/printers/<printer_id>/files/<filename>', methods=['DELETE'])
@login_required
def delete_printer_file(printer_id: str, filename: str) -> Tuple[Dict, int]:
    """Delete file from printer"""
    try:
        printer_service.delete_printer_file(printer_id, filename)
        return '', 204
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Delete error: {str(e)}")
        return jsonify({'error': "Delete failed"}), 500