from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from backend.routes import file_routes, slicer_routes, auth_routes, printer_routes, alert_routes, config_routes
from pathlib import Path
import os
import sys
from backend.database import init_db, db
from flask_login import LoginManager 
from flask_mail import Mail
from flask_apscheduler import APScheduler
from backend.utils.dev_data import create_test_data
from backend.database.models import User
from dotenv import load_dotenv
from backend.services.octoprint_service import OctoPrintService

# Add the project root to the Python path
project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, project_root)

# Initialize extensions
login_manager = LoginManager() 
mail = Mail() 
scheduler = APScheduler()

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

def create_app():
    app = Flask(__name__)
    
    # Configure CORS from environment variables
    origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000').split(',')
    CORS(app, resources={
        r"/api/*": {
            "origins": origins,
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
        }
    }, supports_credentials=True)
    
    # Initialize scheduler
    scheduler.init_app(app)
    scheduler.start()
    
    # Add the job to check for completed prints
    scheduler.add_job(
        id='check_completed_prints', 
        func=OctoPrintService().check_completed_prints, 
        trigger='interval', 
        minutes=int(os.environ.get('PRINT_CHECK_INTERVAL', '5'))
    )

    # Initialize extensions
    init_login_manager(app)
    init_db(app)
    
    # Configure app 
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-secret-key-for-development')
    
    # Configure Flask-Mail 
    app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER')
    app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', '587'))
    app.config['MAIL_USE_TLS'] = os.environ.get('MAIL_USE_TLS', 'True').lower() == 'true'
    app.config['MAIL_USERNAME'] = os.environ.get('EMAIL_USER')
    app.config['MAIL_PASSWORD'] = os.environ.get('EMAIL_PASSWORD')
    mail.init_app(app)
    
    # Create database tables
    with app.app_context():
        db.create_all()
        if os.environ.get('FLASK_ENV') == 'development':
            create_test_data()
    
    # Configure file paths 
    app.config['UPLOAD_FOLDER'] = Path(os.path.abspath(os.environ.get('UPLOAD_FOLDER', os.path.join(project_root, 'uploads'))))
    app.config['OUTPUT_FOLDER'] = Path(os.environ.get('OUTPUT_FOLDER', 'backend/output'))
    app.config['CONFIG_PATH'] = Path(os.environ.get('CONFIG_PATH', 'backend/slicer/config/config.ini'))

    # Ensure directories exist
    app.config['UPLOAD_FOLDER'].mkdir(parents=True, exist_ok=True)
    app.config['OUTPUT_FOLDER'].mkdir(parents=True, exist_ok=True)

    # OctoPrint configuration
    app.config['OCTOPRINT_TIMEOUT'] = int(os.environ.get('OCTOPRINT_TIMEOUT', '10'))
   
    # File manager configuration
    app.config['FILE_MANAGER_USERNAME'] = os.environ.get('FILE_MANAGER_USERNAME')
    app.config['FILE_MANAGER_PASSWORD'] = os.environ.get('FILE_MANAGER_PASSWORD')
    app.config['FILE_MANAGER_REMOTE_PATH'] = os.environ.get('FILE_MANAGER_REMOTE_PATH', '/remote')

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
    app.register_blueprint(printer_routes.bp)
    app.register_blueprint(alert_routes.bp)
    app.register_blueprint(config_routes.bp)
    
    @app.route('/')
    def serve():
        return send_from_directory('../frontend/', 'index.html')
    
    return app

app = create_app()

if __name__ == '__main__':
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode)