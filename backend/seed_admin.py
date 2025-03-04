import os
import sys

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from database.models import User, UserRole
from services.auth_service import AuthService
from app import create_app  # Import your Flask app factory

def create_admin_user():
    """Create an admin user for initial setup"""
    app = create_app()  # Initialize Flask app
    with app.app_context():  # Push the app context
        try:
            admin_email = "admin@polyprint.test"
            admin_password = "Admin123!"
            admin_name = "Administrator"

            # Create the admin user
            user = AuthService.create_user(
                email=admin_email,
                password=admin_password,
                name=admin_name,
                role=UserRole.ADMIN.value
            )

            print(f"✅ Admin user created successfully: {admin_email}")
        except Exception as e:
            print(f"❌ Error creating admin user: {str(e)}")

if __name__ == "__main__":
    create_admin_user()
