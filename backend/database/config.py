# backend/database/config.py

from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

db = SQLAlchemy()

def init_db(app):
    """
    Initialize database configuration and migrations
    
    Args:
        app: Flask application instance
    """
    try:
        # Set up database path
        base_dir = Path(__file__).resolve().parent.parent
        db_dir = base_dir / 'database'
        db_file = db_dir / 'polyprint.db'
        
        # Create database directory if it doesn't exist
        db_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure SQLAlchemy
        app.config.update({
            'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_file}',
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
            'SQLALCHEMY_ENGINE_OPTIONS': {
                'pool_pre_ping': True  # Enable automatic reconnection
            }
        })
        
        # Initialize SQLAlchemy
        db.init_app(app)
        
        # Initialize Migrations
        Migrate(app, db)
        
        logger.info(f"Database initialized at {db_file}")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise e