from flask import Flask, send_from_directory
from flask_cors import CORS
from backend.routes import api

def create_app():
    app = Flask(__name__)
    CORS(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "DELETE"],
            "allow_headers": ["Content-Type"]
        }
    })
    app.register_blueprint(api.bp)

    @app.route('/')
    def serve():
        return send_from_directory('../frontend/', 'index.html')
    return app

app = create_app()