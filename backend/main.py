from flask import Flask, send_from_directory
from flask_cors import CORS
from backend.routes import file_routes, slicer_routes
from pathlib import Path

def create_app():
    app = Flask(__name__)
    CORS(app, resources={
        r"/api/*": {
            "origins": ["http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })
    
    # Configure upload folder
    app.config['UPLOAD_FOLDER'] = Path('backend/uploads')
    app.config['OUTPUT_FOLDER'] = Path('backend/output')
    app.config['CONFIG_PATH'] = Path('backend/slicer/config/config.ini')

    # Ensure directories exist
    app.config['UPLOAD_FOLDER'].mkdir(parents=True, exist_ok=True)
    app.config['OUTPUT_FOLDER'].mkdir(parents=True, exist_ok=True)

    # Register blueprints
    # app.register_blueprint(api.bp)
    app.register_blueprint(file_routes.bp)
    app.register_blueprint(slicer_routes.bp)

    @app.route('/')
    def serve():
        return send_from_directory('../frontend/', 'index.html')
    return app

app = create_app()

if __name__ == '__main__':
    app.run(debug=True)