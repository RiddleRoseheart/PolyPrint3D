from dataclasses import dataclass
from typing import Dict, List, Tuple
import sys
import os
import importlib.util
import logging

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

def get_available_materials_and_colors():
    """
    Get available materials and colors from printers in database
    
    Populates the AVAILABLE_MATERIALS, AVAILABLE_COLORS, and MATERIAL_COLOR_COMBINATIONS globals
    
    Returns:
        Dict[str, List[str]]: Material to colors mapping
    """
    global AVAILABLE_MATERIALS, AVAILABLE_COLORS, MATERIAL_COLOR_COMBINATIONS
    
    # Reset the globals
    AVAILABLE_MATERIALS = {}
    AVAILABLE_COLORS = {}
    MATERIAL_COLOR_COMBINATIONS = {}
    
    # Try to get PrinterService
    PrinterService = _load_printer_service()
    if PrinterService is None:
        logger.error("Failed to import PrinterService. Cannot retrieve printer materials and colors.")
        raise ImportError("Cannot access printer service to get available materials and colors")
        
    try:
        # Get printers from database
        printers = PrinterService.get_available_printers()
        if not printers:
            logger.error("No available printers found in the database")
            raise ValueError("No available printers found")
            
        logger.info(f"Found {len(printers)} available printers")
        
        # Extract available materials and colors
        for printer in printers:
            if not hasattr(printer, 'material') or not hasattr(printer, 'color'):
                continue
                
            material = printer.material
            color = printer.color
            
            # Skip if material or color is None or empty
            if not material or not color:
                continue
                
            # Add to material-color mapping
            if material not in MATERIAL_COLOR_COMBINATIONS:
                MATERIAL_COLOR_COMBINATIONS[material] = []
                
            if color not in MATERIAL_COLOR_COMBINATIONS[material]:
                MATERIAL_COLOR_COMBINATIONS[material].append(color)
                
            # Create MaterialConfig object for this material if it doesn't exist
            if material not in AVAILABLE_MATERIALS:
                # Use properties from MATERIAL_PROPERTIES if available, or defaults
                props = MATERIAL_PROPERTIES.get(material, DEFAULT_MATERIAL_PROPERTIES)
                
                AVAILABLE_MATERIALS[material] = MaterialConfig(
                    name=material,
                    temperature=props['temperature'],
                    bed_temperature=props['bed_temperature'],
                    first_layer_temperature=props['first_layer_temperature'],
                    first_layer_bed_temperature=props['first_layer_bed_temperature'],
                    cost_per_gram=props['cost_per_gram'],
                    density=props['density']
                )
                
            # Add color to available colors
            if color not in AVAILABLE_COLORS:
                # Use hex code from COLOR_HEX_CODES if available, or default to black
                hex_code = COLOR_HEX_CODES.get(color, '#000000')
                AVAILABLE_COLORS[color] = hex_code
                
        logger.info(f"Available materials: {list(AVAILABLE_MATERIALS.keys())}")
        logger.info(f"Material-color combinations: {MATERIAL_COLOR_COMBINATIONS}")
        
        return MATERIAL_COLOR_COMBINATIONS
        
    except Exception as e:
        logger.error(f"Error getting printer data: {e}")
        return {}


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

class Printer:
    def __init__(self, printer_id, name, material, color, build_volume=BUILD_VOLUME):
        self.printer_id = printer_id
        self.name = name
        self.material = material
        self.color = color
        self.build_volume = build_volume

# Add function to get available printer configurations
def get_available_printers():
    """Return list of printers from database"""
    PrinterService = _load_printer_service()
    if PrinterService is None:
        logger.error("Failed to import PrinterService. Cannot retrieve printers.")
        raise ImportError("Cannot access printer service to get available printers")
        
    try:
        # Get printers from PrinterService
        printers = PrinterService.get_available_printers()
        if not printers:
            logger.error("No available printers found in the database")
            raise ValueError("No available printers found")
        return printers
    except Exception as e:
        logger.error(f"Error getting printers: {e}")
        raise

def get_available_printers(self):
    """
    Get list of available printers with their material and color info
    
    Returns:
        List of printer objects with material and color attributes
    """
    printers = self.management.get_all_printers()
    # Filter for available printers (not in use or defective)
    available_printers = [p for p in printers if p.status == 'connected' and not p.is_defective]
    return available_printers