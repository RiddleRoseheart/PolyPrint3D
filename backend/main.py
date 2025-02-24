from flask import Flask, send_from_directory
from flask_cors import CORS
from backend.routes import file_routes, slicer_routes, auth_routes
from backend.routes.printer import bp as printer_bp
from pathlib import Path
import os
from backend.database import init_db, db
from flask_login import LoginManager 

login_manager = LoginManager() 

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
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })
    
    #initialize extensions
    #init_oauth(app)
    init_login_manager(app)
    init_db(app)
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    
    # Configure upload folder
    app.config['UPLOAD_FOLDER'] = Path('backend/uploads')
    app.config['OUTPUT_FOLDER'] = Path('backend/output')
    app.config['CONFIG_PATH'] = Path('backend/slicer/config/config.ini')

    # Ensure directories exist
    app.config['UPLOAD_FOLDER'].mkdir(parents=True, exist_ok=True)
    app.config['OUTPUT_FOLDER'].mkdir(parents=True, exist_ok=True)

#todo 
    # Configure app
    app.config['SECRET_KEY'] = 'your-secret-key'  # TODO
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///polyprint.db'
   

    # Register blueprints
    # app.register_blueprint(api.bp)
    app.register_blueprint(file_routes.bp)
    app.register_blueprint(slicer_routes.bp)
    app.register_blueprint(auth_routes.bp)
    app.register_blueprint(printer_bp)

    @app.route('/')
    def serve():
        return send_from_directory('../frontend/', 'index.html')
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)
   
   
