from .config import db
from datetime import datetime
from flask_login import UserMixin
from enum import Enum

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
    created_at = db.Column(db.DateTime, nullable=False)
    status = db.Column(db.String(50), default='uploaded')
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    
    # Relationships
    print_requests = db.relationship('PrintRequest', back_populates='original_file')
    user = db.relationship('User', back_populates='uploaded_files')

class PrintRequest(db.Model):
    """Sliced STL files ready for printing"""
    __tablename__ = 'print_request'
    
    id = db.Column(db.String(36), primary_key=True)
    file_path = db.Column(db.String(255), nullable=False)
    original_file_id = db.Column(db.String(36), db.ForeignKey('uploaded_file.id'), nullable=False)
    filament_id = db.Column(db.String(36), db.ForeignKey('filament.id'), nullable=False)  # Link to Filament
    dimension = db.Column(db.String(255)) # Build volume dimensions
    filling = db.Column(db.Integer)       # Infill percentage
    layer_height = db.Column(db.Float)    # Layer height in mm
    state = db.Column(db.String(50))     
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    printer_id = db.Column(db.String(36), db.ForeignKey('printer.id'))
    
    # Relationships
    original_file = db.relationship('UploadedFile', back_populates='print_requests')
    gcode_file = db.relationship('GCodeFile', back_populates='print_request', uselist=False)
    filaments = db.relationship('Filament', back_populates='print_request')
    user = db.relationship('User', back_populates='print_requests')
    printer = db.relationship('Printer', back_populates='print_requests')
    
class GCodeFile(db.Model):
    """GCode files generated from sliced STL files"""
    __tablename__ = 'gcode_file'
    
    id = db.Column(db.String(36), primary_key=True)
    file_path = db.Column(db.String(255), nullable=False)
    print_request_id = db.Column(db.String(36), db.ForeignKey('print_request.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    print_request = db.relationship('PrintRequest', back_populates='gcode_file')

class Filament(db.Model):
    """Filament configuration for print requests"""
    __tablename__ = 'filament'
    
    id = db.Column(db.String(36), primary_key=True)
    print_request_id = db.Column(db.String(36), db.ForeignKey('print_request.id'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    
    # Relationships
    print_request = db.relationship('PrintRequest', back_populates='filaments')
    color = db.relationship('Color', back_populates='filament', uselist=False)
    material = db.relationship('Material', back_populates='filament', uselist=False)
    printer = db.relationship('Printer', back_populates='filaments')
     
class Color(db.Model):
    """Color options for filaments"""
    __tablename__ = 'color'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    #filament_id = db.Column(db.String(36), db.ForeignKey('filament.id'), nullable=False)
    
    # Relationships
    filament = db.relationship('Filament', back_populates='color')

class Material(db.Model):
    """Material types for filaments"""
    __tablename__ = 'material'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    #filament_id = db.Column(db.String(36), db.ForeignKey('filament.id'), nullable=False)
    
    # Relationships
    filament = db.relationship('Filament', back_populates='material')

class User(db.Model, UserMixin):
    """User model with authentication and role management"""
    __tablename__ = 'user'
    
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    auth_type = db.Column(db.String(50), default='local')
    role = db.Column(db.String(50), default=UserRole.USER.value)
    
    # Relationships
    uploaded_files = db.relationship('UploadedFile', back_populates='user', lazy=True)
    print_requests = db.relationship('PrintRequest', back_populates='user', lazy=True)
    
class Printer(db.Model):
    """3D printer configuration"""
    __tablename__ = 'printer'
    
    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    ip_address = db.Column(db.String(255), nullable=False, unique=True)
    api_key = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='disconnected')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_available = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_status_check = db.Column(db.DateTime)
    
    
    # Relationships
    print_requests = db.relationship('PrintRequest', back_populates='printer')
    filaments = db.relationship('Filament', back_populates='printer') 
