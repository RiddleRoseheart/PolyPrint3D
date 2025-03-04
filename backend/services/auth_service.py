from backend.database.models import User, UserRole
from backend.database.config import db
from werkzeug.security import generate_password_hash, check_password_hash
from typing import Optional, List, Dict, Any
import uuid
import re
import logging
from datetime import datetime
from flask import current_app

logger = logging.getLogger(__name__)

class AuthError(Exception):
    """Base authentication error"""
    pass

class InvalidCredentialsError(AuthError):
    """Invalid email or password"""
    pass

class UserExistsError(AuthError):
    """User already exists"""
    pass

class UserNotFoundError(AuthError):
    """User not found"""
    def __str__(self):
        return "User not found"

class AuthService:
    """Service layer for authentication and user management"""
    
    @staticmethod
    def validate_password(password: str) -> bool:
        """
        Validate password meets security requirements
        
        Requirements:
        - At least 8 characters
        - Contains uppercase letter
        - Contains lowercase letter
        - Contains number
        """
        if len(password) < 8:
            return False
        if not re.search(r"[A-Z]", password):
            return False
        if not re.search(r"[a-z]", password):
            return False
        if not re.search(r"[0-9]", password):
            return False
        return True

    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        return bool(re.match(r"[^@]+@[^@]+\.[^@]+", email))

    @staticmethod
    def create_user(
        email: str, 
        password: str, 
        name: str,
        role: str = UserRole.USER.value,
        auth_type: str = 'local'
    ) -> User:
        """
        Create a new user with validation
        
        Args:
            email: User's email address
            password: User's password
            name: User's display name
            role: User's role (default: user)
            auth_type: Authentication type (default: local)
            
        Returns:
            Created User object
            
        Raises:
            ValueError: If validation fails
            UserExistsError: If email already exists
        """
        try:
            # Validate input
            if not AuthService.validate_email(email):
                raise ValueError("Invalid email format")
            
            if not AuthService.validate_password(password):
                raise ValueError("Password must be at least 8 characters and contain uppercase, lowercase, and numbers")
                
            if AuthService.get_user_by_email(email):
                raise UserExistsError("Email already registered")

            # Create user
            user = User(
                id=str(uuid.uuid4()),
                email=email.lower(),
                password_hash=generate_password_hash(password),
                name=name,
                role=role,
                auth_type=auth_type,
                created_at=datetime.utcnow()
            )
            
            db.session.add(user)
            db.session.commit()
            
            logger.info(f"Created new user: {email}")
            return user
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to create user: {str(e)}")
            raise

    @staticmethod
    def authenticate_user(email: str, password: str) -> User:
        """
        Authenticate user credentials
        
        Args:
            email: User's email
            password: User's password
            
        Returns:
            Authenticated User object
            
        Raises:
            InvalidCredentialsError: If authentication fails
        """
        user = AuthService.get_user_by_email(email)
        if not user or not AuthService.verify_password(user, password):
            raise InvalidCredentialsError("Invalid email or password")
        return user

    @staticmethod
    def get_user_by_email(email: str) -> Optional[User]:
        """Get user by email"""
        return User.query.filter_by(email=email.lower()).first()

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[User]:
        """Get user by ID"""
        return User.query.get(user_id)

    @staticmethod
    def verify_password(user: User, password: str) -> bool:
        """Verify password for user"""
        return check_password_hash(user.password_hash, password)

    @staticmethod
    def update_user(user: User, **kwargs) -> User:
        """
        Update user attributes with validation
        
        Args:
            user: User object to update
            **kwargs: Attributes to update
            
        Returns:
            Updated User object
        """
        try:
            allowed_fields = {'name', 'email', 'password', 'role'}
            
            for key, value in kwargs.items():
                if key not in allowed_fields:
                    continue
                    
                if key == 'email' and value:
                    if not AuthService.validate_email(value):
                        raise ValueError("Invalid email format")
                    value = value.lower()
                    
                if key == 'password' and value:
                    if not AuthService.validate_password(value):
                        raise ValueError("Invalid password format")
                    value = generate_password_hash(value)
                    key = 'password_hash'
                    
                setattr(user, key, value)
                        
            db.session.commit()
            logger.info(f"Updated user: {user.id}")
            return user
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to update user: {str(e)}")
            raise

    @staticmethod
    def delete_user(user: User) -> bool:
        """Delete a user"""
        try:
            db.session.delete(user)
            db.session.commit()
            logger.info(f"Deleted user: {user.id}")
            return True
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to delete user: {str(e)}")
            raise

    @staticmethod
    def get_all_users() -> List[User]:
        """Get all users (admin function)"""
        return User.query.all()
        
    @staticmethod
    def update_user_role(user_id: str, role: str) -> User:
        """
        Update a user's role (admin function)
        
        Args:
            user_id: ID of the user to update
            role: New role for the user
            
        Returns:
            Updated User object
            
        Raises:
            UserNotFoundError: If user is not found
            ValueError: If role is invalid
        """
        try:
            user = User.query.get(user_id)
            if not user:
                raise UserNotFoundError()
                
            # Validate role
            if role not in [r.value for r in UserRole]:
                raise ValueError(f"Invalid role: {role}")
                
            user.role = role
            db.session.commit()
            logger.info(f"Updated role for user {user.id} to {role}")
            return user
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Failed to update user role: {str(e)}")
            raise
    
    @staticmethod
    def create_admin_user(
        email: str, 
        password: str, 
        name: str,
        is_admin: bool = False
    ) -> User:
        """
        Create a new user with optional admin role (admin function)
        
        Args:
            email: User's email address
            password: User's password
            name: User's display name
            is_admin: Whether the user should have admin role
            
        Returns:
            Created User object
            
        Raises:
            ValueError: If validation fails
            UserExistsError: If email already exists
        """
        role = UserRole.ADMIN.value if is_admin else UserRole.USER.value
        return AuthService.create_user(
            email=email,
            password=password,
            name=name,
            role=role
        )