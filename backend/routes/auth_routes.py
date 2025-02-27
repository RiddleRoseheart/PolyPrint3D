from flask import Blueprint, request, jsonify, session, redirect
from flask_login import login_user, logout_user, login_required, current_user
from backend.services.auth_service import AuthService, InvalidCredentialsError, UserExistsError
from backend.database.models import User, UserRole
from marshmallow import Schema, fields
import logging
import os

logger = logging.getLogger(__name__)
bp = Blueprint('auth', __name__)

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
    return {
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'created_at': user.created_at.isoformat()
    }

@bp.route('/api/auth/login', methods=['POST'])
def login():
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
        return jsonify(create_user_response(user))

    except InvalidCredentialsError as e:
        return jsonify({'error': str(e)}), 401
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        return jsonify({'error': 'Login failed'}), 500

@bp.route('/api/auth/logout', methods=['POST'])
@login_required
def logout():
    logout_user()
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@bp.route('/api/auth/user', methods=['GET'])
@login_required
def get_current_user():
    return jsonify(create_user_response(current_user))
