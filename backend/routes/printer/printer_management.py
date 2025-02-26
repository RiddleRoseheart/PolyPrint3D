from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from backend.database.models import UserRole
from typing import Dict, Tuple
import logging
from backend.services import PrinterService

logger = logging.getLogger(__name__)
bp = Blueprint('printer_management', __name__)

printer_service = PrinterService()

def create_printer_response(printer) -> Dict:
    """Create standardized printer response"""
    return {
        'id': printer.id,
        'name': printer.name,
        'status': printer.status,
        'ip_address': printer.ip_address
    }

@bp.route('/api/printers', methods=['GET'])
@login_required
def get_printers() -> Tuple[Dict, int]:
    """Get all printers (admin only)"""
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        printers = printer_service.get_all_printers()
        return jsonify({
            'count': len(printers),
            'printers': [create_printer_response(p) for p in printers]
        })
    except Exception as e:
        logger.error(f"Error getting printers: {str(e)}")
        return jsonify({'error': 'Failed to get printers'}), 500

@bp.route('/api/printers/available', methods=['GET'])
@login_required
def get_available_printers() -> Tuple[Dict, int]:
    """Get available printers"""
    try:
        printers = printer_service.get_available_printers()
        return jsonify({
            'count': len(printers),
            'printers': [create_printer_response(p) for p in printers]
        })
    except Exception as e:
        logger.error(f"Error getting available printers: {str(e)}")
        return jsonify({'error': 'Failed to get available printers'}), 500

@bp.route('/api/printers', methods=['POST'])
@login_required
def add_printer() -> Tuple[Dict, int]:
    """Add new printer (admin only)"""
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        data = request.get_json()
        printer = printer_service.add_printer(
            data['name'],
            data['ip_address'],
            data['api_key']
        )
        return jsonify(create_printer_response(printer)), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error adding printer: {str(e)}")
        return jsonify({'error': 'Failed to add printer'}), 500

@bp.route('/api/printers/<printer_id>/connect', methods=['POST'])
@login_required
def connect_printer(printer_id: str) -> Tuple[Dict, int]:
    """Connect to printer (admin only)"""
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        printer_service.connect_printer(printer_id)
        return jsonify({'message': 'Printer connected successfully'})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error connecting printer: {str(e)}")
        return jsonify({'error': 'Failed to connect printer'}), 500

@bp.route('/api/printers/<printer_id>/disconnect', methods=['POST'])
@login_required
def disconnect_printer(printer_id: str) -> Tuple[Dict, int]:
    """Disconnect from printer (admin only)"""
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
        
    try:
        printer_service.disconnect_printer(printer_id)
        return jsonify({'message': 'Printer disconnected successfully'})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Error disconnecting printer: {str(e)}")
        return jsonify({'error': 'Failed to disconnect printer'}), 500

@bp.route('/api/printers/<printer_id>/status', methods=['GET'])
@login_required
def get_printer_status(printer_id: str) -> Tuple[Dict, int]:
    """Get printer status"""
    try:
        status = printer_service.get_printer_status(printer_id)
        return jsonify(status)
    except ValueError as e:
        return jsonify({'error': str(e)}), 404
    except Exception as e:
        logger.error(f"Error getting printer status: {str(e)}")
        return jsonify({'error': 'Failed to get printer status'}), 500