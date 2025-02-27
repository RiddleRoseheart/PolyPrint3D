from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_login import LoginManager
from flask import Flask
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

db = SQLAlchemy()
login_manager = LoginManager()

def init_db(app: Flask):
    """
    Initialize database configuration, migrations, and login management
    """
    try:
        # Set up database path
        base_dir = Path(__file__).resolve().parent.parent
        db_dir = base_dir / 'database'
        db_file = db_dir / 'polyprint.db'
        
        db_dir.mkdir(parents=True, exist_ok=True)
        
        # Configure SQLAlchemy
        app.config.update({
            'SQLALCHEMY_DATABASE_URI': f'sqlite:///{db_file}',
            'SQLALCHEMY_TRACK_MODIFICATIONS': False,
            'SQLALCHEMY_ENGINE_OPTIONS': {'pool_pre_ping': True},
            'SESSION_PERMANENT': True,
            'SESSION_TYPE': 'filesystem',  # Store sessions on the server
            'PERMANENT_SESSION_LIFETIME': 86400,  # 24-hour login session
        })
        
        db.init_app(app)
        Migrate(app, db)
        login_manager.init_app(app)

        logger.info(f"Database initialized at {db_file}")
    
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise e

@login_manager.user_loader
def load_user(user_id):
    from backend.database.models import User
    return User.query.get(user_id)
