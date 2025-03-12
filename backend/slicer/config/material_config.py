from dataclasses import dataclass
from typing import Dict, List, Tuple
import sys
import os
import importlib.util
import logging
from backend.database.config import db
from backend.database.models import Material, Color, Filament, Printer

logger = logging.getLogger(__name__)

@dataclass
class MaterialConfig:
    name: str
    temperature: int
    bed_temperature: int
    first_layer_temperature: int
    first_layer_bed_temperature: int
    cost_per_gram: float
    density: float

@dataclass
class PrintObject:
    object_id: int
    volume: float
    material: str
    color: str
    bounding_box: Tuple[float, float, float]
    face_count: int
    weight: float = 0.0
    price: float = 0.0

    @property
    def id(self):
        """Alias for object_id for backwards compatibility"""
        return self.object_id

# Define default material properties (for known materials)
MATERIAL_PROPERTIES = {
    'PLA': {
        'temperature': 215,
        'bed_temperature': 60,
        'first_layer_temperature': 215,
        'first_layer_bed_temperature': 60,
        'cost_per_gram': 0.24,
        'density': 1.24
    },
    'PETG': {
        'temperature': 240,
        'bed_temperature': 85,
        'first_layer_temperature': 240,
        'first_layer_bed_temperature': 85,
        'cost_per_gram': 0.27,
        'density': 1.27
    },
    'ABS': {
        'temperature': 255,
        'bed_temperature': 110,
        'first_layer_temperature': 255,
        'first_layer_bed_temperature': 100,
        'cost_per_gram': 0.25,
        'density': 1.04
    },
    'TPU': {
        'temperature': 235,
        'bed_temperature': 60,
        'first_layer_temperature': 235,
        'first_layer_bed_temperature': 60,
        'cost_per_gram': 0.35,
        'density': 1.21
    }
}

# Default properties for new materials
DEFAULT_MATERIAL_PROPERTIES = {
    'temperature': 215,
    'bed_temperature': 60,
    'first_layer_temperature': 215,
    'first_layer_bed_temperature': 60,
    'cost_per_gram': 0.25,
    'density': 1.25
}

# Default color hex codes for known colors
COLOR_HEX_CODES = {
    'Black': '#000000',
    'White': '#FFFFFF',
    'Red': '#FF0000',
    'Blue': '#0000FF',
    'Green': '#00FF00',
    'Yellow': '#FFFF00',
    'Orange': '#FFA500',
    'Purple': '#800080',
    'Gray': '#808080',
    'Natural': '#FFF2EC'
}

# These will be populated by get_available_materials_and_colors()
AVAILABLE_MATERIALS = {}
AVAILABLE_COLORS = {}
MATERIAL_COLOR_COMBINATIONS = {}  # Maps materials to list of available colors

def _load_printer_service():
    """Dynamically load PrinterService from backend module"""
    try:
        # Get the absolute path to the project root
        current_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(os.path.dirname(os.path.dirname(current_dir)))
        
        # Add project root to path if not already there
        if project_root not in sys.path:
            sys.path.insert(0, project_root)
            
        # Try import after ensuring path is set
        from backend.services.printer import PrinterService
        return PrinterService
    except Exception as e:
        logger.error(f"Failed to import PrinterService: {e}")
        return None


# Updated material_config.py
import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)

from typing import Dict, List, Any
import logging
from backend.database.config import db

logger = logging.getLogger(__name__)

def get_available_materials(printer_id=None):
    """
    Get available materials based on filaments
    
    In local mode: Show all filaments regardless of printer status
    In server mode: Only show filaments from online and available printers
    """
    try:
        from backend.database.models import Material, Filament, Printer
        from backend.utils import is_local_mode
        
        # Check if we're in local development mode
        local_mode = is_local_mode() or os.environ.get('FLASK_ENV') == 'development'
        
        # Base query for materials
        query = db.session.query(Material).distinct()
        
        if printer_id:
            # If specific printer requested
            query = query.join(Filament).filter(Filament.printer_id == printer_id)
            
            # In server mode, check if printer is available
            if not local_mode:
                printer = Printer.query.get(printer_id)
                if not printer or not printer.is_available or printer.status != 'online':
                    return {}
        else:
            # Join with filaments table
            query = query.join(Filament)
            
            # In server mode, filter by available printers
            if not local_mode:
                query = query.join(
                    Printer, 
                    Filament.printer_id == Printer.id
                ).filter(
                    Printer.is_available == True,
                    Printer.status == 'online'
                )
        
        materials = query.all()
        
        # If no materials found (possibly due to filtering), use all materials in local mode
        if not materials and local_mode:
            materials = Material.query.all()
        
        return {
            material.name: {
                'id': material.id,
                'temperature': getattr(material, 'temperature', 220.0),
                'bed_temperature': getattr(material, 'bed_temperature', 60.0),
                'cost_per_gram': getattr(material, 'cost_per_gram', 0.25),
                'density': material.density
            } for material in materials
        }
    except Exception as e:
        logger.error(f"Error fetching materials from database: {str(e)}")
        # Return fallback values in case of error
        return {
            "PLA": {"id": "pla-default", "temperature": 210.0, "bed_temperature": 60.0, "cost_per_gram": 0.25, "density": 1.24},
            "ABS": {"id": "abs-default", "temperature": 240.0, "bed_temperature": 110.0, "cost_per_gram": 0.30, "density": 1.04},
            "PETG": {"id": "petg-default", "temperature": 230.0, "bed_temperature": 70.0, "cost_per_gram": 0.28, "density": 1.27}
        }
def get_available_colors(material_id=None, printer_id=None):
    """
    Get available colors for a specific material
    
    In local mode: Show all colors regardless of printer status
    In server mode: Only show colors from online and available printers
    """
    try:
        from backend.database.models import Color, Filament, Printer
        from backend.utils import is_local_mode
        
        # Check if we're in local development mode
        local_mode = is_local_mode() or os.environ.get('FLASK_ENV') == 'development'
        
        # Base query for colors
        query = db.session.query(Color).distinct()
        
        # Apply filters
        if material_id or printer_id:
            query = query.join(Filament)
            
            if material_id:
                query = query.filter(Filament.material_id == material_id)
                
            if printer_id:
                query = query.filter(Filament.printer_id == printer_id)
                
                # In server mode, check if printer is available
                if not local_mode:
                    printer = Printer.query.get(printer_id)
                    if not printer or not printer.is_available or printer.status != 'online':
                        return {}
            elif not local_mode:
                # Only show colors from available printers in server mode
                query = query.join(
                    Printer, 
                    Filament.printer_id == Printer.id
                ).filter(
                    Printer.is_available == True,
                    Printer.status == 'online'
                )
        
        colors = query.all()
        
        # If no colors found (possibly due to filtering), fallback in local mode
        if not colors and local_mode:
            # If material_id is provided, get colors available for that material from any printer
            if material_id:
                query = db.session.query(Color).distinct().join(
                    Filament
                ).filter(
                    Filament.material_id == material_id
                )
                colors = query.all()
            
            # If still no colors, return all colors
            if not colors:
                colors = Color.query.all()
        
        return {color.name: color.hex_code for color in colors}
    except Exception as e:
        logger.error(f"Error fetching colors from database: {str(e)}")
        # Return fallback values in case of error
        return {
            "Black": "#000000",
            "White": "#FFFFFF",
            "Red": "#FF0000",
            "Blue": "#0000FF",
            "Green": "#00FF00",
            "Clear": "#FFFFFF"
        }
@dataclass
class ObjectConfig:
    id: int
    volume: float
    material: str
    color: str
    bounding_box: Tuple[float, float, float]
    face_count: int

def get_material_names() -> List[str]:
    """Get list of available material names"""
    # Refresh data from database
    get_available_materials_and_colors()
    return list(AVAILABLE_MATERIALS.keys())
 
def get_color_names() -> List[str]:
    """Get list of available color names"""
    # Refresh data from database
    get_available_materials_and_colors()
    return list(AVAILABLE_COLORS.keys())
 
def get_colors_for_material(material: str) -> List[str]:
    """Get available colors for specific material"""
    # Refresh data from database
    get_available_materials_and_colors()
    return MATERIAL_COLOR_COMBINATIONS.get(material, [])

def create_object_config(object_id: int, volume: float,
                        bounding_box: Tuple[float, float, float],
                        face_count: int,
                        material: str = 'PLA',
                        color: str = 'Natural') -> ObjectConfig:
    """Create a configuration for an object with default values"""
    # Refresh data from database
    get_available_materials_and_colors()
    
    if material not in AVAILABLE_MATERIALS:
        raise ValueError(f"Invalid material: {material}")
    if color not in get_colors_for_material(material):
        raise ValueError(f"Invalid color: {color} for material {material}")

    return ObjectConfig(
        id=object_id,
        volume=volume,
        material=material,
        color=color,
        bounding_box=bounding_box,
        face_count=face_count
    )

def generate_material_config(material_name: str, color_name: str) -> Dict[str, str]:
    """Generate configuration dictionary for PrusaSlicer"""
    # Refresh data from database
    get_available_materials_and_colors()
    
    if material_name not in AVAILABLE_MATERIALS:
        raise ValueError(f"Invalid material: {material_name}")
    if color_name not in get_colors_for_material(material_name):
        raise ValueError(f"Invalid color: {color_name} for material {material_name}")
       
    material = AVAILABLE_MATERIALS[material_name]
   
    return {
        'filament_type': material.name,
        'filament_colour': AVAILABLE_COLORS[color_name],
        'temperature': str(material.temperature),
        'first_layer_temperature': str(material.first_layer_temperature),
        'bed_temperature': str(material.bed_temperature),
        'first_layer_bed_temperature': str(material.first_layer_bed_temperature),
        'filament_density': str(material.density)
    }

def print_available_options():
    """Print all available materials and colors"""
    # Refresh data from database
    get_available_materials_and_colors()
    
    print("\nAvailable Materials and Colors:")
    print("-" * 30)
    for material_name, colors in MATERIAL_COLOR_COMBINATIONS.items():
        material = AVAILABLE_MATERIALS.get(material_name)
        if material:
            print(f"{material_name}:")
            print(f"  Temperature: {material.temperature}°C")
            print(f"  Bed Temperature: {material.bed_temperature}°C")
            print(f"  Cost per gram: ${material.cost_per_gram:.2f}")
            print(f"  Available colors: {colors}")
            print()

def calculate_price(obj_volume, material_name, price_per_gram=0.02):
    """
    Calculate the price of an object based on its volume and material.
    
    Parameters:
    - obj_volume: Volume of the object in mm³
    - material_name: Material name (must be in AVAILABLE_MATERIALS)
    - price_per_gram: Price in euros per gram of material (default: 0.02)
    
    Returns:
    - float: Price in euros
    """
    # Refresh data from database
    get_available_materials_and_colors()
    
    # Get material density from the AVAILABLE_MATERIALS dictionary
    if material_name not in AVAILABLE_MATERIALS:
        # Handle unknown material - use default density
        logger.warning(f"Unknown material: {material_name}, using default density")
        density = DEFAULT_MATERIAL_PROPERTIES['density']
    else:
        density = AVAILABLE_MATERIALS[material_name].density
    
    # Calculate weight in grams (volume in mm³ * density in g/cm³ / 1000)
    # Volume is in mm³, but density is in g/cm³, so we need to convert
    # 1 cm³ = 1000 mm³, so divide by 1000 to get cm³
    weight_grams = obj_volume * density / 1000
    
    # Calculate price
    price_euros = weight_grams * price_per_gram
    
    return price_euros, weight_grams

def calculate_total_price(object_configs):
    """
    Calculate the total price for all objects in a print job.
    
    Parameters:
    - object_configs: List of PrintObject instances with price information
    
    Returns:
    - float: Total price in euros
    - float: Total weight in grams
    - dict: Price breakdown by material
    """
    total_price = 0.0
    total_weight = 0.0
    
    # Track price by material for detailed breakdown
    price_by_material = {}
    
    for obj in object_configs:
        # Add to totals
        total_price += obj.price
        total_weight += obj.weight
        
        # Add to material breakdown
        if obj.material not in price_by_material:
            price_by_material[obj.material] = {
                'price': 0.0,
                'weight': 0.0,
                'count': 0
            }
        
        price_by_material[obj.material]['price'] += obj.price
        price_by_material[obj.material]['weight'] += obj.weight
        price_by_material[obj.material]['count'] += 1
    
    return total_price, total_weight, price_by_material

def print_price_summary(object_configs):
    """
    Print a summary of the prices for all objects in a print job.
    
    Parameters:
    - object_configs: List of PrintObject instances with price information
    """
    if not object_configs:
        print("No objects to calculate price for.")
        return
    
    total_price, total_weight, price_by_material = calculate_total_price(object_configs)
    
    print("\nPrice Summary:")
    print("-" * 40)
    
    # Print individual objects
    print("Individual Objects:")
    for obj in object_configs:
        print(f"  Object {obj.object_id}: {obj.material} ({obj.color}) - "
              f"{obj.weight:.2f}g, €{obj.price:.2f}")
    
    # Print by material
    print("\nBreakdown by Material:")
    for material, data in price_by_material.items():
        print(f"  {material}: {data['count']} objects, "
              f"{data['weight']:.2f}g, €{data['price']:.2f}")
    
    # Print totals
    print("\nTotals:")
    print(f"  Total Weight: {total_weight:.2f}g")
    print(f"  Total Price: €{total_price:.2f}")


# Printer's Build Volume
BUILD_VOLUME = (250, 210, 210)  # (X, Y, Z)

class PrinterConfig:
    def __init__(self, printer_id, name, material, color, build_volume=BUILD_VOLUME):
        self.printer_id = printer_id
        self.name = name
        self.material = material
        self.color = color
        self.build_volume = build_volume


#from database en nie tprinterservice for now #todo
def get_available_printers():
    """Return list of printers from database with their loaded filaments"""
    try:
        from backend.database.models import Printer as DbPrinter, Filament, Material, Color
        
        class PrinterConfig:
            def __init__(self, printer_id, name, material, color, build_volume=BUILD_VOLUME):
                self.printer_id = printer_id
                self.name = name
                self.material = material
                self.color = color
                self.build_volume = build_volume
        
        # In local mode, get all printers regardless of status
        local_mode = os.environ.get('FLASK_ENV') == 'development'
        
        printer_objects = []
        
        # Get printers from database
        printers_db = DbPrinter.query.all()
        
        # Create printer objects for each material-color combination
        for printer_db in printers_db:
            filaments = Filament.query.filter_by(printer_id=printer_db.id).all()
            
            for filament in filaments:
                material = Material.query.get(filament.material_id)
                color = Color.query.get(filament.color_id)
                
                if material and color:
                    printer_obj = PrinterConfig(
                        printer_id=printer_db.id,
                        name=printer_db.name,
                        material=material.name,
                        color=color.name
                    )
                    printer_objects.append(printer_obj)
        
        if not printer_objects and local_mode:
            for material in Material.query.all():
                for color in Color.query.all():
                    printer_obj = PrinterConfig(
                        printer_id=f"default_{material.id}_{color.id}",
                        name=f"Default {material.name} {color.name}",
                        material=material.name,
                        color=color.name
                    )
                    printer_objects.append(printer_obj)
        
        if not printer_objects and local_mode:
            printer_objects = [
                PrinterConfig("printer1", "Default PLA Printer", "PLA", "White"),
                PrinterConfig("printer2", "Default ABS Printer", "ABS", "Blue"),
                PrinterConfig("printer3", "Default PETG Printer", "PETG", "Red")
            ]
            
        if not printer_objects:
            raise ValueError("No available printers found")
            
        return printer_objects
        
    except Exception as e:
        logger.error(f"Error getting printers: {e}")
        raise
    
def get_available_materials_and_colors():
    """
    Populate global variables with materials and colors from database.
    This function is used to refresh the data for other functions.
    """
    global AVAILABLE_MATERIALS
    global AVAILABLE_COLORS
    global MATERIAL_COLOR_COMBINATIONS
    
    try:
        from backend.database.models import Material, Color, Filament
        
        materials = Material.query.all()
        
        AVAILABLE_MATERIALS = {}
        for material in materials:
            AVAILABLE_MATERIALS[material.name] = MaterialConfig(
                name=material.name,
                temperature=getattr(material, 'temperature', DEFAULT_MATERIAL_PROPERTIES['temperature']),
                bed_temperature=getattr(material, 'bed_temperature', DEFAULT_MATERIAL_PROPERTIES['bed_temperature']),
                first_layer_temperature=getattr(material, 'temperature', DEFAULT_MATERIAL_PROPERTIES['first_layer_temperature']),
                first_layer_bed_temperature=getattr(material, 'bed_temperature', DEFAULT_MATERIAL_PROPERTIES['first_layer_bed_temperature']),
                cost_per_gram=getattr(material, 'cost_per_gram', DEFAULT_MATERIAL_PROPERTIES['cost_per_gram']),
                density=material.density
            )
        
        colors = Color.query.all()
        
        AVAILABLE_COLORS = {}
        for color in colors:
            AVAILABLE_COLORS[color.name] = color.hex_code
        
        MATERIAL_COLOR_COMBINATIONS = {}
        
        filaments = Filament.query.all()
        
        for filament in filaments:
            material = Material.query.get(filament.material_id)
            color = Color.query.get(filament.color_id)
            
            if material and color:
                if material.name not in MATERIAL_COLOR_COMBINATIONS:
                    MATERIAL_COLOR_COMBINATIONS[material.name] = []
                
                if color.name not in MATERIAL_COLOR_COMBINATIONS[material.name]:
                    MATERIAL_COLOR_COMBINATIONS[material.name].append(color.name)
        
        if not AVAILABLE_MATERIALS:
            for material_name, props in MATERIAL_PROPERTIES.items():
                AVAILABLE_MATERIALS[material_name] = MaterialConfig(
                    name=material_name,
                    temperature=props['temperature'],
                    bed_temperature=props['bed_temperature'],
                    first_layer_temperature=props['first_layer_temperature'],
                    first_layer_bed_temperature=props['first_layer_bed_temperature'],
                    cost_per_gram=props['cost_per_gram'],
                    density=props['density']
                )
        
        if not AVAILABLE_COLORS:
            AVAILABLE_COLORS = COLOR_HEX_CODES.copy()
        
        if not MATERIAL_COLOR_COMBINATIONS:
            for material_name in AVAILABLE_MATERIALS:
                MATERIAL_COLOR_COMBINATIONS[material_name] = list(AVAILABLE_COLORS.keys())
        
    except Exception as e:
        logger.error(f"Error loading materials and colors from database: {e}")
        
        # Fallback to defaults
        AVAILABLE_MATERIALS = {}
        for material_name, props in MATERIAL_PROPERTIES.items():
            AVAILABLE_MATERIALS[material_name] = MaterialConfig(
                name=material_name,
                temperature=props['temperature'],
                bed_temperature=props['bed_temperature'],
                first_layer_temperature=props['first_layer_temperature'],
                first_layer_bed_temperature=props['first_layer_bed_temperature'],
                cost_per_gram=props['cost_per_gram'],
                density=props['density']
            )
        
        AVAILABLE_COLORS = COLOR_HEX_CODES.copy()
        
        MATERIAL_COLOR_COMBINATIONS = {}
        for material_name in AVAILABLE_MATERIALS:
            MATERIAL_COLOR_COMBINATIONS[material_name] = list(AVAILABLE_COLORS.keys())