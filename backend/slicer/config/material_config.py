from dataclasses import dataclass
from typing import Dict, List, Tuple

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


# Available materials with their printing parameters
AVAILABLE_MATERIALS = {
    'PLA': MaterialConfig(
        name='PLA',
        temperature=215,
        bed_temperature=60,
        first_layer_temperature=215,
        first_layer_bed_temperature=60,
        cost_per_gram=0.24,
        density=1.24
    ),
    'PETG': MaterialConfig(
        name='PETG',
        temperature=240,
        bed_temperature=85,
        first_layer_temperature=240,
        first_layer_bed_temperature=85,
        cost_per_gram=0.27,
        density=1.27
    ),
    'ABS': MaterialConfig(
        name='ABS',
        temperature=255,
        bed_temperature=110,
        first_layer_temperature=255,
        first_layer_bed_temperature=100,
        cost_per_gram=0.25,
        density=1.04
    ),
    'TPU': MaterialConfig(
        name='TPU',
        temperature=235,
        bed_temperature=60,
        first_layer_temperature=235,
        first_layer_bed_temperature=60,
        cost_per_gram=0.35,
        density=1.21
    )
}

def __init__(self, object_id, volume, material, color, bounding_box, face_count):
    self.id = object_id
    self.volume = volume
    self.material = material
    self.color = color
    self.bounding_box = bounding_box
    self.face_count = face_count

# Available colors with their hex codes and names
AVAILABLE_COLORS = {
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
    return list(AVAILABLE_MATERIALS.keys())
 
def get_color_names() -> List[str]:
    """Get list of available color names"""
    return list(AVAILABLE_COLORS.keys())
 
def create_object_config(object_id: int, volume: float,

                        bounding_box: Tuple[float, float, float],
                        face_count: int,
                        material: str = 'PLA',
                        color: str = 'Natural') -> ObjectConfig:
    """Create a configuration for an object with default values"""
    if material not in AVAILABLE_MATERIALS:
        raise ValueError(f"Invalid material: {material}")
    if color not in AVAILABLE_COLORS:
        raise ValueError(f"Invalid color: {color}")

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
    if material_name not in AVAILABLE_MATERIALS:
        raise ValueError(f"Invalid material: {material_name}")
    if color_name not in AVAILABLE_COLORS:
        raise ValueError(f"Invalid color: {color_name}")

       
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
    print("\nAvailable Materials:")
    print("-" * 20)
    for material, config in AVAILABLE_MATERIALS.items():
        print(f"{material}:")
        print(f"  Temperature: {config.temperature}°C")
        print(f"  Bed Temperature: {config.bed_temperature}°C")
        print(f"  Cost per gram: ${config.cost_per_gram:.2f}")
        print()

    print("\nAvailable Colors:")
    print("-" * 20)
    for color_name, hex_code in AVAILABLE_COLORS.items():
        print(f"{color_name}: {hex_code}")

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
    # Get material density from the AVAILABLE_MATERIALS dictionary
    if material_name not in AVAILABLE_MATERIALS:
        raise ValueError(f"Invalid material: {material_name}")
    
    material_density = AVAILABLE_MATERIALS[material_name].density
    
    # Calculate weight in grams (volume in mm³ * density in g/cm³ / 1000)
    # Volume is in mm³, but density is in g/cm³, so we need to convert
    # 1 cm³ = 1000 mm³, so divide by 1000 to get cm³
    weight_grams = obj_volume * material_density / 1000
    
    # Calculate price
    price_euros = weight_grams * price_per_gram
    
    return price_euros, weight_grams

####################################################################################################
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
    """Return list of configured printers with their materials and colors"""
    return [
        Printer(1, "Printer 1", "PLA", "Black"),
        Printer(2, "Printer 2", "PLA", "White"),
        Printer(3, "Printer 3", "PETG", "Natural"),
        Printer(4, "Printer 4", "TPU", "Black")
    ]
