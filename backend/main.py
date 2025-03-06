from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from backend.routes import file_routes, slicer_routes, auth_routes
from backend.routes.printer import bp as printer_bp
from pathlib import Path

import os
import sys
from backend.database import init_db, db
from flask_login import LoginManager 
from flask_mail import Mail
from backend.utils.dev_data import create_test_data
from backend.database.models import User
from backend.routes.octoprint_routes import bp as octoprint_bp
from dotenv import load_dotenv

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Initialize extensions
login_manager = LoginManager() 
mail = Mail() 

# Load environment variables
load_dotenv()

def init_login_manager(app):
    login_manager.init_app(app)
    
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(user_id)

    @login_manager.unauthorized_handler
    def unauthorized():
        return jsonify({'error': 'Unauthorized'}), 401

def check_printer_data(app):
    """Debug function to check printer data in database"""
    with app.app_context():
        from backend.database.models import Printer
        printers = Printer.query.all()
        print("\nPrinters in database:")
        for p in printers:
            print(f"ID: {p.id}")
            print(f"Name: {p.name}")
            print(f"Status: {p.status}")
            print(f"Available: {p.is_available}")
            print(f"Material: {p.material}")
            print(f"Color: {p.color}")
            print("---")

def create_app():
    app = Flask(__name__)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    }, supports_credentials=True)
    
    #initialize extensions
    #init_oauth(app)
    init_login_manager(app)
    init_db(app)
    
    # Configure app
    app.config['SECRET_KEY'] = 'your-secret-key'  # TODO
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///polyprint.db'
    
    # Configure Flask-Mail
    app.config['MAIL_SERVER'] = 'sandbox.smtp.mailtrap.io'
    app.config['MAIL_PORT'] = 2525
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.environ.get('EMAIL_USER', 'f20c04086a57e8')
    app.config['MAIL_PASSWORD'] = os.environ.get('EMAIL_PASSWORD', 'c3d5822dd84d40')
    mail.init_app(app)
    
    # Create database tables
    with app.app_context():
        db.create_all()
        create_test_data() #TODO
    
    # Configure upload folder
    app.config['UPLOAD_FOLDER'] = Path(os.path.abspath('uploads'))
    app.config['OUTPUT_FOLDER'] = Path('backend/output')
    app.config['CONFIG_PATH'] = Path('backend/slicer/config/config.ini')

    # Ensure directories exist
    app.config['UPLOAD_FOLDER'].mkdir(parents=True, exist_ok=True)
    app.config['OUTPUT_FOLDER'].mkdir(parents=True, exist_ok=True)

#TODO 
    # Configure app
    app.config['SECRET_KEY'] = 'your-secret-key'  # TODO
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///polyprint.db'
    
    app.config['OCTOPRINT_TIMEOUT'] = 10
   
# Configure Flask-Mail TODO .ENV!! & in production
    app.config['MAIL_SERVER'] = 'sandbox.smtp.mailtrap.io'
    app.config['MAIL_PORT'] = 2525
    app.config['MAIL_USE_TLS'] = True
    app.config['MAIL_USERNAME'] = os.environ.get('EMAIL_USER', 'f20c04086a57e8')
    app.config['MAIL_PASSWORD'] = os.environ.get('EMAIL_PASSWORD', 'c3d5822dd84d40')
    mail.init_app(app)

    app.config['FILE_MANAGER_USERNAME'] = 'local_user'  # Or get from environment
    app.config['FILE_MANAGER_PASSWORD'] = 'password'    # Or get from environment
    app.config['FILE_MANAGER_REMOTE_PATH'] = '/remote'

    # Handle database reset
    if "--reset-db" in sys.argv:
        print("Resetting database...")
        with app.app_context():
            db.drop_all()
            db.create_all()
            create_test_data()
            check_printer_data(app)
            print("Database reset complete")
    
    # Register blueprints
    app.register_blueprint(file_routes.bp)
    app.register_blueprint(slicer_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(printer_bp)
    #app.register_blueprint(octoprint_routes.bp)

    @app.route('/')
    def serve():
        return send_from_directory('../frontend/', 'index.html')
    
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
   
   
