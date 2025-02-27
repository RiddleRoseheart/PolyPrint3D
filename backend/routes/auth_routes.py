from flask import Blueprint, request, jsonify, session, redirect
from flask_login import login_user, logout_user, login_required, current_user
from backend.services.auth_service import AuthService, InvalidCredentialsError, UserExistsError
from backend.database.models import User, UserRole
from marshmallow import Schema, fields
import logging
import os

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

def create_user_response(user: User):
    """Create standardized user response dictionary"""
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'created_at': user.created_at.isoformat()
    }

@bp.route('/api/auth/register', methods=['POST'])
def register():
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
def login():
    """
    Log in a user
    
    Expects JSON body with:
    - email: string
    - password: string
    """
    try:
        errors = login_schema.validate(request.get_json())
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        data = request.get_json()
        user = AuthService.authenticate_user(
            email=data['email'],
            password=data['password']
        )

        # Set session and remember user
        login_user(user, remember=True)
        session.permanent = True  # Enables long-term session storage
        
        logger.info(f"User logged in: {user.email}")
        print(f"Session after login: {session}")  # Check session
        print(f"Is user authenticated: {current_user.is_authenticated}")
        return jsonify(create_user_response(user))

    except InvalidCredentialsError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """Log out the current user"""
    logout_user()
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@bp.route('/api/auth/user', methods=['GET'])
@login_required
def get_current_user():
    """Get current user's information"""
    return jsonify(create_user_response(current_user))

