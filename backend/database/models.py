from .config import db
from datetime import datetime
from flask_login import UserMixin
from enum import Enum
import enum
from datetime import datetime

class UserRole(Enum):
    """Available user roles"""
    USER = 'user'
    ADMIN = 'admin'
    #todo add guest?

class UploadedFile(db.Model):
    """Original STL files uploaded by users"""
    __tablename__ = 'uploaded_file'
    
    id = db.Column(db.String(36), primary_key=True)
    file_path = db.Column(db.String(255), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, index=True)
    status = db.Column(db.String(50), default='uploaded', index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False, index=True)
    
    # Relationships
    print_requests = db.relationship('PrintRequest', back_populates='original_file', cascade="all, delete-orphan")
    user = db.relationship('User', back_populates='uploaded_files')
    
    __table_args__ = (
        db.Index('idx_uploaded_file_user_created', 'user_id', 'created_at'),
    )
    
class PrintRequest(db.Model):
    """Sliced STL files ready for printing"""
    __tablename__ = 'print_request'
    
    id = db.Column(db.String(36), primary_key=True)
    file_path = db.Column(db.String(255), nullable=False)
    original_file_id = db.Column(db.String(36), db.ForeignKey('uploaded_file.id'), nullable=False)
    #filament_id = db.Column(db.String(36), db.ForeignKey('filament.id'), nullable=False)  
    dimension = db.Column(db.String(255)) 
    filling = db.Column(db.Integer)      
    layer_height = db.Column(db.Float)   
    state = db.Column(db.String(50), index=True)    
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False, index=True)
    printer_id = db.Column(db.String(36), db.ForeignKey('printer.id'), index=True)
    weight= db.Column(db.Float)
    price = db.Column(db.Float)
    
    # Relationships
    original_file = db.relationship('UploadedFile', back_populates='print_requests')
    gcode_file = db.relationship('GCodeFile', back_populates='print_request', uselist=False, cascade="all, delete-orphan")
    filaments = db.relationship('Filament', back_populates='print_request', foreign_keys='Filament.print_request_id', cascade="all, delete-orphan")
    user = db.relationship('User', back_populates='print_requests')
    printer = db.relationship('Printer', back_populates='print_requests')
    
    __table_args__ = (
        db.Index('idx_print_request_user_state', 'user_id', 'state'),
        db.Index('idx_print_request_printer_state', 'printer_id', 'state'),
        db.Index('idx_print_request_original_file', 'original_file_id'),
    )
    
class GCodeFile(db.Model):
    """GCode files generated from sliced STL files"""
    __tablename__ = 'gcode_file'
    
    id = db.Column(db.String(36), primary_key=True)
    file_path = db.Column(db.String(255), nullable=False)
    print_request_id = db.Column(db.String(36), db.ForeignKey('print_request.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relationships
    print_request = db.relationship('PrintRequest', back_populates='gcode_file')
    
class Filament(db.Model):
    """Filament configuration for print requests"""
    __tablename__ = 'filament'
    
    id = db.Column(db.String(36), primary_key=True)
    print_request_id = db.Column(db.String(36), db.ForeignKey('print_request.id'), nullable=False, index=True)
    name = db.Column(db.String(255), nullable=False)
    price_per_gram = db.Column(db.Float, nullable=False)
    color_id = db.Column(db.String(36), db.ForeignKey('color.id'), nullable=True, index=True)
    material_id = db.Column(db.String(36), db.ForeignKey('material.id'), nullable=True, index=True)
    printer_id = db.Column(db.String(36), db.ForeignKey('printer.id'), nullable=True, index=True)
      
    # Relationships
    print_request = db.relationship('PrintRequest', back_populates='filaments',  foreign_keys='Filament.print_request_id')
    color = db.relationship('Color', back_populates='filaments', uselist=False)
    material = db.relationship('Material', back_populates='filaments', uselist=False)
    printer = db.relationship('Printer', back_populates='filaments')
     
    __table_args__ = (
        db.Index('idx_filament_material_color', 'material_id', 'color_id'),
    )
    
class Color(db.Model):
    """Color options for filaments"""
    __tablename__ = 'color'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    hex_code = db.Column(db.String(7), nullable=False) #availbale colors
    #filament_id = db.Column(db.String(36), db.ForeignKey('filament.id'), nullable=False)
    
    # Relationships
    filaments = db.relationship('Filament', back_populates='color')

class Material(db.Model):
    """Material types for filaments"""
    __tablename__ = 'material'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    density = db.Column(db.Float, nullable=False)
    #filament_id = db.Column(db.String(36), db.ForeignKey('filament.id'), nullable=False)
    temperature = db.Column(db.Float, nullable=False, default=220.0)
    bed_temperature = db.Column(db.Float, nullable=False, default=60.0)
    cost_per_gram = db.Column(db.Float, nullable=False, default=0.25)
    
    # Relationships
    filaments = db.relationship('Filament', back_populates='material')

class User(db.Model, UserMixin):
    """User model with authentication and role management"""
    __tablename__ = 'user'
    
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    auth_type = db.Column(db.String(50), default='local')
    role = db.Column(db.String(50), default=UserRole.USER.value, index=True)
    
    # Relationships
    uploaded_files = db.relationship('UploadedFile', back_populates='user', lazy='dynamic')
    print_requests = db.relationship('PrintRequest', back_populates='user', lazy='dynamic')
    alerts = db.relationship('Alert', back_populates='user', lazy='dynamic')
    
    __table_args__ = (
        db.Index('idx_user_email_role', 'email', 'role'),
    )
class Printer(db.Model):
    """3D printer configuration"""
    __tablename__ = 'printer'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(255), nullable=False, unique=True)
    api_key = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='disconnected', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_available = db.Column(db.Boolean, default=True, index=True)
    last_status_check = db.Column(db.DateTime)
    material = db.Column(db.String(50), nullable=True, index=True)
    color = db.Column(db.String(50), nullable=True, index=True) 
    build_volume = db.Column(db.String(50), default='250,210,210')  
    
    # Relationships
    print_requests = db.relationship('PrintRequest', back_populates='printer')
    filaments = db.relationship('Filament', back_populates='printer') 
    
    __table_args__ = (
        db.Index('idx_printer_status_available', 'status', 'is_available'),
        db.Index('idx_printer_material_color', 'material', 'color'),
    )


class AlertType(enum.Enum):
    INFO = "info"
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"

class Alert(db.Model):
    """Model for storing system alerts and notifications"""
    
    id = db.Column(db.String(36), primary_key=True)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow, index=True)
    type = db.Column(db.String(20), nullable=False, default=AlertType.INFO.value, index=True)
    title = db.Column(db.String(100), nullable=False)
    message = db.Column(db.String(500), nullable=False)
    source = db.Column(db.String(100), index=True)  # e.g., "Printer", "System", etc.
    source_id = db.Column(db.String(36), index=True)  # e.g., printer_id
    is_read = db.Column(db.Boolean, default=False, index=True)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=True, index=True)
    
    # Relationships
    user = db.relationship('User', back_populates='alerts')
    
    __table_args__ = (
        db.Index('idx_alert_user_read', 'user_id', 'is_read'),
        db.Index('idx_alert_timestamp_type', 'timestamp', 'type'),
    )
    
    
    