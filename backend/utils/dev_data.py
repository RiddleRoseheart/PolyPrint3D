import uuid
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
from backend.database.config import db
from backend.database.models import User, UserRole, UploadedFile, PrintRequest, Printer, Material, Color, Filament, GCodeFile
import logging
import os

logger = logging.getLogger(__name__)

def create_test_data():
    """
    Create test data for development environment.
    Only runs if FLASK_ENV is development.
    """
    if os.environ.get('FLASK_ENV') != 'development':
        logger.info("Not in development environment, skipping test data creation")
        return
    
    logger.info("Initializing development test data...")
    
    # Check if we already have users to avoid duplicate creation
    if User.query.count() > 0:
        logger.info("Test data already exists, skipping initialization")
        return
    
    try:
        # Create test admin user
        admin = User(
            id=str(uuid.uuid4()),
            email='admin@polyprint.test',
            password_hash=generate_password_hash('Admin123!'),
            name='Admin User',
            created_at=datetime.utcnow(),
            auth_type='local',
            role=UserRole.ADMIN.value
        )
        
        # Create test regular users
        user1 = User(
            id=str(uuid.uuid4()),
            email='user1@polyprint.test',
            password_hash=generate_password_hash('User123!'),
            name='Test User 1',
            created_at=datetime.utcnow(),
            auth_type='local',
            role=UserRole.USER.value
        )
        
        user2 = User(
            id=str(uuid.uuid4()),
            email='user2@polyprint.test',
            password_hash=generate_password_hash('User123!'),
            name='Test User 2',
            created_at=datetime.utcnow(),
            auth_type='local',
            role=UserRole.USER.value
        )
        
        db.session.add_all([admin, user1, user2])
        db.session.commit()
        
        
        # TODO fakee
        
        # Create test printers (for admin)
        test_printer1 = Printer(
            id=str(uuid.uuid4()),
            name='Test Printer 1',
            ip_address='192.168.1.101',
            api_key='ABCDEF123456',
            status='offline',
            is_available=True,
            created_at=datetime.utcnow()
        )
        
        test_printer2 = Printer(
            id=str(uuid.uuid4()),
            name='Test Printer 2',
            ip_address='192.168.1.102',
            api_key='ABCDEF654321',
            status='online',
            is_available=True,
            created_at=datetime.utcnow()
        )
        
        db.session.add_all([test_printer1, test_printer2])
        db.session.commit()
        
        # Create Materials
        pla = Material(
            id=str(uuid.uuid4()),
            name="PLA",
            density=1.24,
            temperature=210.0,
            bed_temperature=60.0,
            cost_per_gram=0.25
        )
        
        abs_material = Material(
            id=str(uuid.uuid4()),
            name="ABS",
            density=1.04,
            temperature=240.0,
            bed_temperature=110.0,
            cost_per_gram=0.30
        )
        
        petg = Material(
            id=str(uuid.uuid4()),
            name="PETG",
            density=1.27,
            temperature=230.0,
            bed_temperature=70.0,
            cost_per_gram=0.28
        )
        
        
        db.session.add_all([pla, abs_material, petg])
        db.session.commit()
        
        # Create Colors
        red = Color(
            id=str(uuid.uuid4()),
            name="Red",
            hex_code="#FF0000"
        )
        
        blue = Color(
            id=str(uuid.uuid4()),
            name="Blue",
            hex_code="#0000FF"
        )
        
        black = Color(
            id=str(uuid.uuid4()),
            name="Black",
            hex_code="#000000"
        )
        
        white = Color(
            id=str(uuid.uuid4()),
            name="White",
            hex_code="#FFFFFF"
        )
        
        green = Color(
            id=str(uuid.uuid4()),
            name="Green",
            hex_code="#00FF00"
        )
        
        db.session.add_all([red, blue, black, white, green])
        db.session.commit()
        
        # For user1
        file1 = UploadedFile(
            id=str(uuid.uuid4()),
            file_path="/dummy/path/file1.stl",
            filename="cube.stl",
            created_at=datetime.utcnow() - timedelta(days=2),
            status="uploaded",
            user_id=user1.id
        )
        
        db.session.add(file1)
        db.session.commit()
        
        # Create a print request for user1
        print_request1 = PrintRequest(
            id=str(uuid.uuid4()),
            file_path="/dummy/path/sliced_file1.stl",
            original_file_id=file1.id,
            dimension="100x100x100",
            filling=20,
            layer_height=0.2,
            state="completed",
            created_at=datetime.utcnow() - timedelta(days=1),
            user_id=user1.id,
            printer_id=test_printer1.id,
            weight=50.0,
            price=1.50
        )
        
        db.session.add(print_request1)
        db.session.commit()
        
        # Printer 1 has PLA in Red, White, Black and PETG in Blue
        filaments = [
            # Printer 1 filaments
            Filament(
                id=str(uuid.uuid4()),
                name="Red PLA",
                price_per_gram=0.25,
                color_id=red.id,
                material_id=pla.id,
                printer_id=test_printer1.id,
                print_request_id=print_request1.id
            ),
            Filament(
                id=str(uuid.uuid4()),
                name="White PLA",
                price_per_gram=0.25,
                color_id=white.id,
                material_id=pla.id,
                printer_id=test_printer1.id,
                print_request_id=print_request1.id
            ),
            Filament(
                id=str(uuid.uuid4()),
                name="Black PLA",
                price_per_gram=0.25,
                color_id=black.id,
                material_id=pla.id,
                printer_id=test_printer1.id,
                print_request_id=print_request1.id
            ),
            Filament(
                id=str(uuid.uuid4()),
                name="Blue PETG",
                price_per_gram=0.28,
                color_id=blue.id,
                material_id=petg.id,
                printer_id=test_printer1.id,
                print_request_id=print_request1.id
            ),
            
            # Printer 2 filaments - has ABS in Blue, Green and PETG in Red
            Filament(
                id=str(uuid.uuid4()),
                name="Blue ABS",
                price_per_gram=0.30,
                color_id=blue.id,
                material_id=abs_material.id,
                printer_id=test_printer2.id,
                print_request_id=print_request1.id
            ),
            Filament(
                id=str(uuid.uuid4()),
                name="Green ABS",
                price_per_gram=0.30,
                color_id=green.id,
                material_id=abs_material.id,
                printer_id=test_printer2.id,
                print_request_id=print_request1.id
            ),
            Filament(
                id=str(uuid.uuid4()),
                name="Red PETG",
                price_per_gram=0.28,
                color_id=red.id,
                material_id=petg.id,
                printer_id=test_printer2.id,
                print_request_id=print_request1.id
            )
        ]
            
        db.session.add_all(filaments)
        db.session.commit()
        
        
        # Create GCode file
        gcode_file1 = GCodeFile(
            id=str(uuid.uuid4()),
            file_path="/dummy/path/file1.gcode",
            print_request_id=print_request1.id,
            created_at=datetime.utcnow() - timedelta(hours=23)
        )
        
        db.session.add(gcode_file1)
        db.session.commit()
        
        # For user2
        file2 = UploadedFile(
            id=str(uuid.uuid4()),
            file_path="/dummy/path/file2.stl",
            filename="sphere.stl",
            created_at=datetime.utcnow() - timedelta(days=1),
            status="uploaded",
            user_id=user2.id
        )
        
        db.session.add(file2)
        db.session.commit()
        
        logger.info("Successfully created development test data:")
        logger.info("Admin user: admin@polyprint.test / Admin123!")
        logger.info("Regular user 1: user1@polyprint.test / User123!")
        logger.info("Regular user 2: user2@polyprint.test / User123!")
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Failed to create test data: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())