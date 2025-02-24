from flask import Blueprint, jsonify
from flask_login import login_required
from backend.services.printer_service import PrinterService
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)
bp = Blueprint('printer_jobs', __name__)

printer_service = PrinterService()

@bp.route('/api/printers/<printer_id>/job', methods=['GET'])
@login_required
def get_job_status(printer_id: str) -> Tuple[Dict, int]:
    """Get current print job status"""
    try:
        status = printer_service.get_job_status(printer_id)
        return jsonify(status)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Status error: {str(e)}")
        return jsonify({'error': "Failed to get status"}), 500

@bp.route('/api/printers/<printer_id>/job/cancel', methods=['POST'])
@login_required
def cancel_print_job(printer_id: str) -> Tuple[Dict, int]:
    """Cancel current print job"""
    try:
        printer_service.cancel_print_job(printer_id)
        return jsonify({'message': 'Print job cancelled'})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Cancel error: {str(e)}")
        return jsonify({'error': "Failed to cancel job"}), 500