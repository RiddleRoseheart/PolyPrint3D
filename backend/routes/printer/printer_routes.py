from flask import Blueprint, request, jsonify, current_app
from flask_login import login_required, current_user
from backend.database.models import UserRole, Printer, Material, Color, PrintRequest
from backend.database.config import db
from backend.utils import ResponseBuilder
import logging
import uuid
import requests
from datetime import datetime

logger = logging.getLogger(__name__)
bp = Blueprint('printer', __name__)

@bp.route('/api/admin/printers', methods=['GET'])
@login_required
def get_all_printers_admin():
    """Get all printers with detailed status and print request information"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        printers = Printer.query.all()
        
        # Get updated status for all printers
        printer_data = []
        for printer in printers:
            try:
                # Try to fetch current status from OctoPrint
                status_info = check_printer_connection(printer)
                
                # Get active print request for this printer
                active_request = PrintRequest.query.filter_by(
                    printer_id=printer.id, 
                    state="printing"
                ).first()
                
                printer_data.append({
                    'id': printer.id,
                    'name': printer.name,
                    'ip_address': printer.ip_address,
                    'status': status_info.get('status', 'unknown'),
                    'is_available': printer.is_available,
                    'material': printer.material,
                    'color': printer.color,
                    'build_volume': printer.build_volume,
                    'last_status_check': printer.last_status_check.isoformat() if printer.last_status_check else None,
                    'active_print_request': {
                        'id': active_request.id,
                        'user_id': active_request.user_id,
                        'user_name': active_request.user.name if active_request.user else 'Unknown',
                        'file_path': active_request.file_path,
                        'created_at': active_request.created_at.isoformat() if active_request.created_at else None
                    } if active_request else None,
                    'connection_details': status_info.get('connection_info', {})
                })
            except Exception as e:
                logger.error(f"Error checking printer {printer.id}: {str(e)}")
                printer_data.append({
                    'id': printer.id,
                    'name': printer.name,
                    'ip_address': printer.ip_address,
                    'status': 'error',
                    'is_available': printer.is_available,
                    'error': str(e)
                })
                
        return ResponseBuilder.success({'printers': printer_data})
    except Exception as e:
        logger.error(f"Error getting printers: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/printers', methods=['POST'])
@login_required
def add_printer():
    """Add a new printer"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'ip_address', 'api_key', 'material', 'color', 'build_volume']
        for field in required_fields:
            if field not in data:
                return ResponseBuilder.error(f"Missing required field: {field}", 400)
        
        # Check if IP address is already in use
        existing_printer = Printer.query.filter_by(ip_address=data['ip_address']).first()
        if existing_printer:
            return ResponseBuilder.error(f"Printer with IP {data['ip_address']} already exists", 400)
            
        # Validate connection to OctoPrint
        connection_test = test_printer_connection(data['ip_address'], data['api_key'])
        if not connection_test['success']:
            return ResponseBuilder.error(f"Cannot connect to OctoPrint: {connection_test['message']}", 400)
        
        # Create new printer
        new_printer = Printer(
            id=str(uuid.uuid4()),
            name=data['name'],
            ip_address=data['ip_address'],
            api_key=data['api_key'],
            status=connection_test.get('status', 'unknown'),
            is_available=data.get('is_available', True),
            created_at=datetime.utcnow(),
            material=data['material'],
            color=data['color'],
            build_volume=data['build_volume']
        )
        
        db.session.add(new_printer)
        db.session.commit()
        
        return ResponseBuilder.success(
            {
                'id': new_printer.id,
                'name': new_printer.name,
                'status': new_printer.status
            },
            "Printer added successfully",
            201
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding printer: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/printers/<printer_id>', methods=['PUT'])
@login_required
def update_printer(printer_id):
    """Update printer information"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        printer = Printer.query.get(printer_id)
        if not printer:
            return ResponseBuilder.error("Printer not found", 404)
            
        data = request.get_json()
        
        # Update fields that are provided
        if 'name' in data:
            printer.name = data['name']
            
        if 'api_key' in data:
            printer.api_key = data['api_key']
            
        if 'is_available' in data:
            printer.is_available = data['is_available']
            
        if 'material' in data:
            printer.material = data['material']
            
        if 'color' in data:
            printer.color = data['color']
            
        if 'build_volume' in data:
            printer.build_volume = data['build_volume']
            
        # If IP address is changed, validate connection
        if 'ip_address' in data and data['ip_address'] != printer.ip_address:
            connection_test = test_printer_connection(data['ip_address'], data.get('api_key', printer.api_key))
            if not connection_test['success']:
                return ResponseBuilder.error(f"Cannot connect to OctoPrint: {connection_test['message']}", 400)
            printer.ip_address = data['ip_address']
        
        db.session.commit()
        
        # Get updated status after changes
        status_info = check_printer_connection(printer)
        
        return ResponseBuilder.success({
            'id': printer.id,
            'name': printer.name,
            'status': status_info.get('status', 'unknown'),
            'is_available': printer.is_available
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error updating printer: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/printers/<printer_id>', methods=['DELETE'])
@login_required
def delete_printer(printer_id):
    """Delete a printer"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        printer = Printer.query.get(printer_id)
        if not printer:
            return ResponseBuilder.error("Printer not found", 404)
            
        # Check if printer has active print requests
        active_requests = PrintRequest.query.filter_by(
            printer_id=printer.id, 
            state="printing"
        ).count()
        
        if active_requests > 0:
            return ResponseBuilder.error("Cannot delete printer with active print requests", 400)
            
        db.session.delete(printer)
        db.session.commit()
        
        return ResponseBuilder.success(message="Printer deleted successfully", status_code=204)
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error deleting printer: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/printers/<printer_id>/status', methods=['GET'])
@login_required
def get_printer_status(printer_id):
    """Get detailed status of a specific printer"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        printer = Printer.query.get(printer_id)
        if not printer:
            return ResponseBuilder.error("Printer not found", 404)
            
        status_info = check_printer_connection(printer)
        
        # Get both current and queued print requests
        active_request = PrintRequest.query.filter_by(
            printer_id=printer.id, 
            state="printing"
        ).first()
        
        queued_requests = PrintRequest.query.filter_by(
            printer_id=printer.id, 
            state="pending"
        ).all()
        
        # Get printer job info if available
        job_info = get_printer_job_info(printer)
        
        response_data = {
            'id': printer.id,
            'name': printer.name,
            'ip_address': printer.ip_address,
            'status': status_info.get('status', 'unknown'),
            'connection_info': status_info.get('connection_info', {}),
            'job_info': job_info,
            'active_print_request': {
                'id': active_request.id,
                'user_id': active_request.user_id,
                'user_name': active_request.user.name if active_request.user else 'Unknown',
                'file_path': active_request.file_path,
                'created_at': active_request.created_at.isoformat() if active_request.created_at else None
            } if active_request else None,
            'queued_requests': [
                {
                    'id': req.id,
                    'user_id': req.user_id,
                    'user_name': req.user.name if req.user else 'Unknown',
                    'file_path': req.file_path,
                    'created_at': req.created_at.isoformat() if req.created_at else None
                } for req in queued_requests
            ],
            'is_available': printer.is_available,
            'material': printer.material,
            'color': printer.color,
            'build_volume': printer.build_volume,
            'last_status_check': printer.last_status_check.isoformat() if printer.last_status_check else None
        }
        
        return ResponseBuilder.success(response_data)
    except Exception as e:
        logger.error(f"Error getting printer status: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/materials', methods=['GET'])
@login_required
def get_materials_admin():
    """Get all materials with usage statistics"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        materials = Material.query.all()
        
        material_data = []
        for material in materials:
            # Count printers using this material
            printer_count = Printer.query.filter_by(material=material.name).count()
            
            # Count completed print requests with this material
            filaments = material.filaments.all() if hasattr(material, 'filaments') else []
            completed_prints = sum(1 for f in filaments if f.print_request and f.print_request.state == "completed")
            
            # Calculate total weight used
            total_weight = sum(pr.weight for f in filaments if f.print_request and (pr := f.print_request))
            
            material_data.append({
                'id': material.id,
                'name': material.name,
                'density': material.density,
                'temperature': material.temperature,
                'bed_temperature': material.bed_temperature,
                'cost_per_gram': material.cost_per_gram,
                'printer_count': printer_count,
                'completed_prints': completed_prints,
                'total_weight_used': total_weight
            })
            
        return ResponseBuilder.success({'materials': material_data})
    except Exception as e:
        logger.error(f"Error getting materials: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/materials', methods=['POST'])
@login_required
def add_material():
    """Add a new material"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['name', 'density', 'temperature', 'bed_temperature', 'cost_per_gram']
        for field in required_fields:
            if field not in data:
                return ResponseBuilder.error(f"Missing required field: {field}", 400)
        
        # Check if material already exists
        existing_material = Material.query.filter_by(name=data['name']).first()
        if existing_material:
            return ResponseBuilder.error(f"Material {data['name']} already exists", 400)
        
        # Create new material
        new_material = Material(
            id=str(uuid.uuid4()),
            name=data['name'],
            density=data['density'],
            temperature=data['temperature'],
            bed_temperature=data['bed_temperature'],
            cost_per_gram=data['cost_per_gram']
        )
        
        db.session.add(new_material)
        db.session.commit()
        
        return ResponseBuilder.success(
            {
                'id': new_material.id,
                'name': new_material.name
            },
            "Material added successfully",
            201
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding material: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/colors', methods=['GET'])
@login_required
def get_colors_admin():
    """Get all colors with usage statistics"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        colors = Color.query.all()
        
        color_data = []
        for color in colors:
            # Count printers using this color
            printer_count = Printer.query.filter_by(color=color.name).count()
            
            # Count filaments using this color
            filament_count = color.filaments.count() if hasattr(color, 'filaments') else 0
            
            color_data.append({
                'id': color.id,
                'name': color.name,
                'hex_code': color.hex_code,
                'printer_count': printer_count,
                'filament_count': filament_count
            })
            
        return ResponseBuilder.success({'colors': color_data})
    except Exception as e:
        logger.error(f"Error getting colors: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

@bp.route('/api/admin/colors', methods=['POST'])
@login_required
def add_color():
    """Add a new color"""
    if current_user.role != UserRole.ADMIN.value:
        return ResponseBuilder.error("Admin access required", 403)
        
    try:
        data = request.get_json()
        
        # Validate required fields
        if 'name' not in data or 'hex_code' not in data:
            return ResponseBuilder.error("Name and hex_code are required", 400)
        
        # Validate hex code format
        hex_code = data['hex_code']
        if not (hex_code.startswith('#') and len(hex_code) == 7):
            return ResponseBuilder.error("Invalid hex code format, must be #RRGGBB", 400)
        
        # Check if color already exists
        existing_color = Color.query.filter_by(name=data['name']).first()
        if existing_color:
            return ResponseBuilder.error(f"Color {data['name']} already exists", 400)
        
        # Create new color
        new_color = Color(
            id=str(uuid.uuid4()),
            name=data['name'],
            hex_code=data['hex_code']
        )
        
        db.session.add(new_color)
        db.session.commit()
        
        return ResponseBuilder.success(
            {
                'id': new_color.id,
                'name': new_color.name,
                'hex_code': new_color.hex_code
            },
            "Color added successfully",
            201
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"Error adding color: {str(e)}")
        return ResponseBuilder.error(str(e), 500)

# Helper functions
def test_printer_connection(ip_address, api_key):
    """Test connection to an OctoPrint server"""
    try:
        url = f"http://{ip_address}/api/version"
        headers = {
            'X-Api-Key': api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return {
                'success': True,
                'status': 'online',
                'message': 'Connection successful',
                'version': response.json().get('text', 'Unknown')
            }
        else:
            return {
                'success': False, 
                'status': 'error',
                'message': f"Invalid response: {response.status_code}"
            }
    except requests.exceptions.RequestException as e:
        return {
            'success': False,
            'status': 'offline',
            'message': str(e)
        }

def check_printer_connection(printer):
    """Check connection status of a printer"""
    try:
        url = f"http://{printer.ip_address}/api/connection"
        headers = {
            'X-Api-Key': printer.api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            connection_info = response.json()
            status = connection_info['current']['state']
            
            # Update printer status in database
            printer.status = status
            printer.last_status_check = datetime.utcnow()
            db.session.commit()
            
            return {
                'status': status,
                'connection_info': connection_info
            }
        else:
            printer.status = 'error'
            printer.last_status_check = datetime.utcnow()
            db.session.commit()
            
            return {
                'status': 'error',
                'message': f"Invalid response: {response.status_code}"
            }
    except requests.exceptions.RequestException as e:
        printer.status = 'offline'
        printer.last_status_check = datetime.utcnow()
        db.session.commit()
        
        return {
            'status': 'offline',
            'message': str(e)
        }

def get_printer_job_info(printer):
    """Get job information from a printer"""
    try:
        url = f"http://{printer.ip_address}/api/job"
        headers = {
            'X-Api-Key': printer.api_key,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(url, headers=headers, timeout=5)
        
        if response.status_code == 200:
            return response.json()
        else:
            return None
    except:
        return None