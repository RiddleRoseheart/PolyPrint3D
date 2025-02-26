import trimesh
import os
import subprocess
from pathlib import Path
import numpy as np
import sys

# Add slicer directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
slicer_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(slicer_dir)

from scripts.file_manager import FileManager
from config.material_config import MaterialConfig, PrintObject, get_material_names, get_color_names, Printer, get_available_printers, calculate_price
from config.env_config import load_config

# Printer's Build Volume
BUILD_VOLUME = (250, 210, 210)  # (X, Y, Z)

def split_disconnected_components(mesh):
    """
    Split mesh into naturally disconnected components without cutting through objects.
    Only separates objects that are physically disconnected from each other.
    
    Parameters:
    - mesh: trimesh object
    
    Returns:
    - list of trimesh objects
    """
    # Use trimesh's built-in split function with only_watertight=False to preserve non-watertight parts
    components = mesh.split(only_watertight=False)
    
    # Filter out invalid components (those with too few vertices)
    valid_components = [comp for comp in components if len(comp.vertices) >= 4]
    
    return valid_components

def check_object_fits(obj, build_volume):
    """
    Check if an object fits within the build volume.
    """
    x_max, y_max, z_max = build_volume
    width, depth, height = obj.bounding_box.extents
    return (width <= x_max and depth <= y_max and height <= z_max)

def arrange_objects_in_print_area(objects, build_volume=BUILD_VOLUME, padding=10):
    """
    Arranges objects in print area with proper spacing.
    """
    scene = trimesh.Scene()
    x_max, y_max, z_max = build_volume
    unplaced_objects = []
    
    # Filter and sort objects
    placeable_objects = []
    for obj in objects:
        if check_object_fits(obj, build_volume):
            # Move object to origin
            obj.apply_translation(-obj.bounds[0])
            placeable_objects.append(obj)
        else:
            unplaced_objects.append(obj)
    
    # Sort by base area for better packing
    placeable_objects.sort(
        key=lambda obj: obj.bounding_box.extents[0] * obj.bounding_box.extents[1],
        reverse=True
    )
    
    x_pos, y_pos = 0, 0
    max_height_in_row = 0
    
    for obj in placeable_objects:
        bbox = obj.bounding_box
        width, depth, height = bbox.extents
        
        # Check if we need to move to next row
        if x_pos + width + padding > x_max:
            x_pos = 0
            y_pos += max_height_in_row + padding
            max_height_in_row = 0
        
        # Check if object fits in Y direction
        if y_pos + depth + padding > y_max:
            unplaced_objects.append(obj)
            continue
        
        # Create a copy and place it
        obj_copy = obj.copy()
        translation = [
            x_pos + padding,
            y_pos + padding,
            0  # Place directly on the build plate
        ]
        obj_copy.apply_translation(translation)
        
        # Update position tracking
        x_pos += width + padding
        max_height_in_row = max(max_height_in_row, depth)
        
        scene.add_geometry(obj_copy)
    
    return scene, unplaced_objects

def setup_object_configurations(components):
    """
    Set up configurations for each object in the STL file.
    Allows interactive selection of material and color for each object 
    depending on the available filaments for each printer.
    """
    printers = get_available_printers()
    
    # Get unique available materials and colors
    available_materials = set(printer.material for printer in printers)
    available_colors = set(printer.color for printer in printers)
    
    print("\nAvailable Printer Configurations:")
    print("-" * 30)
    for printer in printers:
        print(f"Printer {printer.printer_id}: {printer.material} - {printer.color}")
    
    object_configs = []
    
    print("\nDetected Objects:")
    print("-" * 40)
    
    for i, comp in enumerate(components, 1):
        print(f"\nObject {i}:")
        print(f"  Volume: {comp.volume:.2f} mm³")
        print(f"  Size: {tuple(comp.bounding_box.extents)}")
        
        # Material selection
        while True:
            print(f"\nAvailable materials: {available_materials}")
            material = input(f"Choose material for Object {i}: ").strip().upper()
            if material in available_materials:
                break
            print("Invalid material! Please choose from available printer materials.")
        
        # Color selection - show only colors available for selected material
        available_material_colors = {
            printer.color for printer in printers 
            if printer.material == material
        }
        
        while True:
            print(f"\nAvailable colors for {material}: {available_material_colors}")
            color = input(f"Choose color for Object {i}: ").strip().title()
            if color in available_material_colors:
                break
            print("Invalid color! Please choose from available colors for this material.")
        
        # Calculate price based on volume and material
        price, weight = calculate_price(comp.volume, material)
        
        config = PrintObject(
            object_id=i,
            volume=comp.volume,
            material=material,
            color=color,
            bounding_box=tuple(comp.bounding_box.extents),
            face_count=len(comp.faces),
            weight=weight,
            price=price
        )
        
        print(f"\nConfiguration for Object {i}:")
        print(f"  Material: {config.material}")
        print(f"  Color: {config.color}")
        print(f"  Volume: {config.volume:.2f} mm³")
        print(f"  Weight: {config.weight:.2f} g")
        print(f"  Price: {config.price:.2f} €")
        
        object_configs.append(config)
        
        if i < len(components):
            continue_config = input("\nPress Enter to configure next object...").strip()
    
    return object_configs

def split_and_distribute_objects(input_path, file_manager, job_name, build_volume=BUILD_VOLUME,
                               volume_threshold=0.001, min_faces=4, padding=10):
    """Splits an STL into naturally separated objects and distributes them by material/color."""
    print("Loading STL file...")
    mesh = trimesh.load_mesh(input_path)
    
    print("Splitting into components...")
    objects = split_disconnected_components(mesh)
    
    if not objects:
        print("No valid objects found in the STL file.")
        return []

    filtered_objects = [
        obj for obj in objects 
        if obj.volume >= volume_threshold and len(obj.faces) >= min_faces
    ]
    
    if not filtered_objects:
        print("No objects remained after filtering.")
        return []
    
    print(f"Found {len(filtered_objects)} valid objects.")

    # Get object configurations
    object_configs = setup_object_configurations(filtered_objects)
    
    # Group objects by material and color
    material_color_groups = {}
    for obj, config in zip(filtered_objects, object_configs):
        key = (config.material, config.color)
        if key not in material_color_groups:
            material_color_groups[key] = []
        material_color_groups[key].append((obj, config))

    # Create job folders
    job_folders = file_manager.create_job_folders(job_name)
    output_files = []
    
    # Process each material/color group
    printers = get_available_printers()
    for (material, color), group in material_color_groups.items():
        # Find matching printer
        matching_printer = next(
            (p for p in printers if p.material == material and p.color == color),
            None
        )
        
        if not matching_printer:
            print(f"Warning: No printer found for {material} - {color}")
            continue
            
        print(f"\nProcessing group for {material} - {color} (Printer {matching_printer.printer_id})")
        objects_in_group = [obj for obj, _ in group]
        
        # Arrange objects for this group
        arranged_scene, unplaced = arrange_objects_in_print_area(
            objects_in_group, 
            build_volume=matching_printer.build_volume,
            padding=padding
        )
        
        if arranged_scene.geometry:
            # Generate unique identifier for this material/color combination
            group_id = f"{material.lower()}_{color.lower()}"
            
            # Get paths for files
            remote_path, local_path = file_manager.get_job_file_paths(job_name, 'stl', group_id)
            local_path = Path(local_path)
            
            # Export STL
            arranged_scene.export(str(local_path), file_type='stl')
            print(f"Exported to local file: {local_path}")
            
            # Save to server
            with open(local_path, 'rb') as f:
                file_manager.save_file(f.read(), remote_path)
            
            output_files.append({
                'path': str(local_path),
                'printer': matching_printer,
                'material': material,
                'color': color
            })
        
        if unplaced:
            print(f"Warning: {len(unplaced)} objects could not be placed for {material} - {color}")
    
    return output_files

def slice_with_prusa_slicer(stl_path, file_manager, job_name, printer, config_path):
    """Slices an STL to G-code using PrusaSlicer CLI with printer-specific settings."""
    prusa_path = "C:\\Program Files\\Prusa3D\\PrusaSlicer\\prusa-slicer-console.exe"
    
    # Generate group identifier
    group_id = f"{printer.material.lower()}_{printer.color.lower()}"
    
    # Get file paths
    remote_path, local_path = file_manager.get_job_file_paths(job_name, 'gcode', group_id)
    local_path = Path(local_path)
    
    # Ensure output directory exists
    local_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Updated command with correct profile names
    cmd = [
        prusa_path,
        str(stl_path),
        "--load", config_path,
        # Basic slicing command without profile specifications
        "-g",  # Short form of --export-gcode
        "--output", str(local_path)
    ]
    
    success = False
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"Successfully sliced {stl_path} for printer {printer.printer_id}")
        
        if local_path.exists() and local_path.stat().st_size > 0:
            with open(local_path, 'rb') as f:
                file_manager.save_file(f.read(), remote_path)
            print(f"G-code uploaded to server: {remote_path}")
            success = True
        else:
            print(f"Warning: G-code file not found or empty: {local_path}")
                
    except subprocess.CalledProcessError as e:
        print(f"Error slicing {stl_path}: {e}")
        if e.output:
            print("PrusaSlicer output:", e.output)
        if e.stderr:
            print("PrusaSlicer error:", e.stderr)
    except FileNotFoundError:
        print("PrusaSlicer executable not found at:", prusa_path)
    except Exception as e:
        print(f"Error during slicing: {e}")
    
    return success

if __name__ == "__main__":
    try:
        config = load_config()
        
        file_manager = FileManager(
            config['server']['host'],
            config['server']['username'],
            config['server']['password'],
            config['server']['remote_path'],
            config['app']['local_output_path']
        )
        
        job_name = file_manager.generate_unique_folder_name()
        
        input_stl = "backend/slicer/input/Pelletcamv2.1.stl"
        config_path = "backend/slicer/config/config.ini"
        
        print("Starting processing...")
        print(f"Input file: {input_stl}")
        print(f"Job name: {job_name}")

        # Process STL and get grouped files
        grouped_files = split_and_distribute_objects(
            input_path=input_stl,
            file_manager=file_manager,
            job_name=job_name,
            build_volume=config['app']['build_volume'],
            padding=config['app']['padding']
        )

        if grouped_files:
            print(f"\nGenerated {len(grouped_files)} STL files")
            
            # Slice files
            print("\nSlicing files...")
            slicing_success = True
            for file_info in grouped_files:
                if not slice_with_prusa_slicer(
                    file_info['path'],
                    file_manager,
                    job_name,
                    file_info['printer'],
                    config_path
                ):
                    slicing_success = False
                    print(f"Warning: Failed to slice {file_info['path']}")
            
            if slicing_success:
                print("\nProcessing complete! All files were successfully processed.")
            else:
                print("\nWarning: Processing completed but some files failed to slice.")
        else:
            print("\nNo output files were generated. Please check the input file.")

    except Exception as e:
        print(f"\nError during processing: {e}")
        raise