from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from marshmallow import Schema, fields
from backend.services.auth_service import (
    AuthService, 
    AuthError, 
    InvalidCredentialsError, 
    UserExistsError
)
from backend.database.models import User, UserRole
from typing import Dict, Tuple
import logging

logger = logging.getLogger(__name__)
bp = Blueprint('auth', __name__)

# Request validation schemas
class RegisterSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)
    name = fields.Str(required=True)

class LoginSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)

register_schema = RegisterSchema()
login_schema = LoginSchema()

def create_user_response(user: User) -> Dict:
    """Create standardized user response dictionary"""
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'created_at': user.created_at.isoformat()
    }

@bp.route('/api/auth/register', methods=['POST'])
def register() -> Tuple[Dict, int]:
    """
    Register a new user
    
    Expects JSON body with:
    - email: string
    - password: string 
    - name: string
    """
    try:
        # Validate request data
        errors = register_schema.validate(request.get_json())
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        data = request.get_json()
        
        # Create user
        user = AuthService.create_user(
            email=data['email'],
            password=data['password'],
            name=data['name'],
            role=UserRole.USER.value
        )
        
        logger.info(f"Registered new user: {user.email}")
        return jsonify(create_user_response(user)), 201

    except UserExistsError as e:
        return jsonify({'error': str(e)}), 409
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Registration failed: {str(e)}")
        return jsonify({'error': 'Registration failed'}), 500

@bp.route('/api/auth/login', methods=['POST'])
def login() -> Tuple[Dict, int]:
    """
    Log in a user
    
    Expects JSON body with:
    - email: string
    - password: string
    """
    try:
        # Validate request data
        errors = login_schema.validate(request.get_json())
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        data = request.get_json()
        
        # Authenticate user
        user = AuthService.authenticate_user(
            email=data['email'],
            password=data['password']
        )
        
        # Set up session
        login_user(user)
        session.permanent = True
        
        logger.info(f"User logged in: {user.email}")
        return jsonify(create_user_response(user))

    except InvalidCredentialsError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout() -> Tuple[Dict, int]:
    """Log out the current user"""
    logger.info(f"User logged out: {current_user.email}")
    logout_user()
    return jsonify({'message': 'Logged out successfully'})

@bp.route('/api/auth/user', methods=['GET'])
@login_required
def get_current_user() -> Tuple[Dict, int]:
    """Get current user's information"""
    return jsonify(create_user_response(current_user))

@bp.route('/api/auth/admin/users', methods=['GET'])
@login_required
def get_all_users() -> Tuple[Dict, int]:
    """
    Get all users (admin only)
    Requires admin role
    """
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
        
    users = AuthService.get_all_users()
    return jsonify({
        'users': [create_user_response(user) for user in users]
    })

@bp.route('/api/auth/user', methods=['PUT'])
@login_required
def update_user() -> Tuple[Dict, int]:
    """
    Update current user's information
    
    Accepts JSON body with optional fields:
    - email: string
    - password: string
    - name: string
    """
    try:
        data = request.get_json()
        user = AuthService.update_user(current_user, **data)
        return jsonify(create_user_response(user))
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update failed: {str(e)}")
        return jsonify({'error': 'Update failed'}), 500