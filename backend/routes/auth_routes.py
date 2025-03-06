from flask import Blueprint, request, jsonify, session, redirect
from flask_login import login_user, logout_user, login_required, current_user
from marshmallow import Schema, fields
from flask import Blueprint, request, jsonify, session
from flask_login import login_user, logout_user, login_required, current_user
from backend.database.models import PrintRequest  # Add this import
from backend.database.config import db  # Add this import
from backend.services.auth_service import (
    AuthService, 
    AuthError, 
    InvalidCredentialsError, 
    UserExistsError,
    UserNotFoundError
)
from backend.database.models import User, UserRole
from typing import Dict, Tuple
import logging
import os
from datetime import timedelta

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

class CreateUserSchema(Schema):
    email = fields.Email(required=True)
    password = fields.Str(required=True)
    name = fields.Str(required=True)
    isAdmin = fields.Bool(required=False, default=False)

class UpdateRoleSchema(Schema):
    role = fields.Str(required=True)

register_schema = RegisterSchema()
login_schema = LoginSchema()
create_user_schema = CreateUserSchema()
update_role_schema = UpdateRoleSchema()

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
        
        # Log in the user after registration
        login_user(user)
        session.permanent = True  # Make the session permanent
        logger.info(f"Registered and logged in new user: {user.email}")
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
        session.permanent = True  # Make the session permanent
        logger.info(f"User logged in: {user.email}")
        return jsonify(create_user_response(user))

    except InvalidCredentialsError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500
@bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    """Log out the current user and cancel any in-progress print requests"""
    try:
        # Cancel any processing print requests for this user
        processing_requests = PrintRequest.query.filter_by(
            user_id=current_user.id, 
            state='processing'
        ).all()
        
        for request in processing_requests:
            request.state = 'cancelled'
        
        db.session.commit()
        
        #logger.info(f"Cancelled {len(processing_requests)} processing print requests for user {current_user.email}")
        
        # Standard logout procedure
        logout_user()
        session.clear()
        
        return jsonify({'message': 'Logged out successfully'})
    
    except Exception as e:
        logger.error(f"Logout error: {str(e)}")
        db.session.rollback()
        return jsonify({'error': 'Logout failed'}), 500

@bp.route('/api/auth/user', methods=['GET'])
@login_required
def get_current_user() -> Tuple[Dict, int]:
    """Get current user's information"""
    logger.info(f"Fetching current user: {current_user.email}")
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

@bp.route('/api/auth/admin/users', methods=['POST'])
@login_required
def admin_create_user() -> Tuple[Dict, int]:
    """
    Create a new user (admin only)
    
    Expects JSON body with:
    - email: string
    - password: string
    - name: string
    - isAdmin: boolean (optional)
    """
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        # Validate request data
        errors = create_user_schema.validate(request.get_json())
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        data = request.get_json()
        
        # Create user with specified role
        user = AuthService.create_admin_user(
            email=data['email'],
            password=data['password'],
            name=data['name'],
            is_admin=data.get('isAdmin', False)
        )
        
        logger.info(f"Admin created new user: {user.email} with role: {user.role}")
        return jsonify(create_user_response(user)), 201

    except UserExistsError as e:
        return jsonify({'error': str(e)}), 409
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Admin user creation failed: {str(e)}")
        return jsonify({'error': 'User creation failed'}), 500

@bp.route('/api/auth/admin/users/<user_id>', methods=['PUT'])
@login_required
def update_user_role(user_id: str) -> Tuple[Dict, int]:
    """
    Update a user's role (admin only)
    
    Expects JSON body with:
    - role: string (must be either 'user' or 'admin')
    """
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        # Validate request data
        errors = update_role_schema.validate(request.get_json())
        if errors:
            return jsonify({'error': 'Validation failed', 'details': errors}), 400

        data = request.get_json()
        role = data['role']
        
        # Validate role value
        if role not in [UserRole.USER.value, UserRole.ADMIN.value]:
            return jsonify({'error': 'Invalid role value'}), 400
        
        # Update user role
        user = AuthService.update_user_role(user_id, role)
        
        logger.info(f"Admin updated user {user.email} role to: {role}")
        return jsonify(create_user_response(user))

    except UserNotFoundError as e:
        return jsonify({'error': str(e)}), 404
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        logger.error(f"Update role failed: {str(e)}")
        return jsonify({'error': 'Update failed'}), 500

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
    
# Development-only login endpoint
@bp.route('/dev-login/<user_type>', methods=['GET'])
def dev_login(user_type):
    """
    Development-only login endpoint
    Only works when FLASK_ENV is development
    """
    if os.environ.get('FLASK_ENV') != 'development':
        return jsonify({'error': 'Not available in production'}), 403
    
    email = None
    if user_type == 'admin':
        email = 'admin@polyprint.test'
    elif user_type == 'user1':
        email = 'user1@polyprint.test'
    elif user_type == 'user2':
        email = 'user2@polyprint.test'
    else:
        return jsonify({'error': 'Invalid user type'}), 400
    
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    login_user(user)
    session.permanent = True  # Make the session permanent
    return redirect('/')



@bp.route('/api/auth/admin/create', methods=['POST'])
@login_required
def create_admin():
    """
    Create an admin user manually (only for existing admins)
    
    Expects JSON body with:
    - email: string
    - password: string
    - name: string
    """
   
    
    try:
        data = request.get_json()

        # Validate request
        if not data.get('email') or not data.get('password') or not data.get('name'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Create admin user
        admin_user = AuthService.create_user(
            email=data['email'],
            password=data['password'],
            name=data['name'],
            role=UserRole.ADMIN.value
        )

        logger.info(f"New admin created: {admin_user.email}")
        return jsonify(create_user_response(admin_user)), 201

    except UserExistsError:
        return jsonify({'error': 'User already exists'}), 409
    except Exception as e:
        logger.error(f"Admin creation failed: {str(e)}")
        return jsonify({'error': 'Admin creation failed'}), 500
    
@bp.route('/api/auth/admin/users/<user_id>', methods=['DELETE'])
@login_required
def delete_user(user_id: str) -> Tuple[Dict, int]:
    """
    Delete a user (admin only)
    """
    if current_user.role != UserRole.ADMIN.value:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        # Get user by ID
        user = AuthService.get_user_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        # Don't allow deleting yourself
        if user.id == current_user.id:
            return jsonify({'error': 'Cannot delete your own account'}), 400
        
        # Delete the user
        AuthService.delete_user(user)
        
        logger.info(f"Admin deleted user: {user.email}")
        return jsonify({'message': 'User deleted successfully'})

    except Exception as e:
        logger.error(f"Delete user failed: {str(e)}")
        return jsonify({'error': 'Delete failed'}), 500
    

@bp.route('/api/auth/user/delete', methods=['DELETE'])
@login_required
def delete_own_account() -> Tuple[Dict, int]:
    """
    Delete the current user's own account
    """
    try:
        user_id = current_user.id
        user_email = current_user.email
        
        # Execute the deletion
        AuthService.delete_user(current_user)
        
        # Log out the user
        logout_user()
        session.clear()
        
        logger.info(f"User deleted their own account: {user_email}")
        return jsonify({'message': 'Account deleted successfully'})

    except Exception as e:
        logger.error(f"Self account deletion failed: {str(e)}")
        return jsonify({'error': 'Delete failed'}), 500