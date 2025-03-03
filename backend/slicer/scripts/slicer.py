import trimesh
import os
import subprocess
from pathlib import Path
import numpy as np
import sys
import os
 
# Add slicer directory to path
current_dir = os.path.dirname(os.path.abspath(__file__))
slicer_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(slicer_dir)
 
from scripts.file_manager import FileManager
from config.material_config import MaterialConfig, PrintObject, get_material_names, get_color_names, Printer, get_available_printers, calculate_price, calculate_total_price, print_price_summary
from config.env_config import load_config

# Add the project root to path
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.append(project_root)

# Insert paths at beginning of sys.path instead of appending
sys.path.insert(0, project_root)  # Most important - add project root first
sys.path.insert(0, slicer_dir)    # Add slicer dir second

# Printer's Build Volume
BUILD_VOLUME = (250, 210, 210)  # (X, Y, Z)

def get_app_context():
    """Get Flask app context only when needed"""
    from backend.main import app
    return app.app_context()

def get_available_printers_from_service():
    """Get available printers from the database"""
    try:
        # Import inside function instead
        from backend.services.printer import PrinterService
        printer_service = PrinterService()
        
        printers = printer_service.get_available_printers()
        if not printers or len(printers) == 0:
            # Add debug info to help diagnose the issue
            print("Debug: No printers found, checking database directly...")
            
            # Try to query the database directly
            from backend.database.models import Printer
            db_printers = Printer.query.filter_by(is_available=True).all()
            
            if db_printers:
                print(f"Debug: Found {len(db_printers)} printers directly in database")
                # Convert DB printers to the format your code expects
                return db_printers
            else:
                print("Debug: No printers found in direct database query either")
                raise ValueError("No available printers found in the database")
        
        print(f"Debug: Found {len(printers)} printers via PrinterService")
        return printers
        
    except Exception as e:
        print(f"Error in get_available_printers_from_service: {str(e)}")
        # Try direct DB access as fallback
        try:
            from backend.database.models import Printer
            db_printers = Printer.query.filter_by(is_available=True).all()
            if db_printers:
                print(f"Debug: Found {len(db_printers)} printers via fallback")
                return db_printers
        except Exception as inner_e:
            print(f"Fallback also failed: {str(inner_e)}")
        
        raise ValueError("No available printers found in the database")

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
    printers = get_available_printers_from_service()
    
    # Get unique available materials and colors
    available_materials = set(printer.material for printer in printers)
    available_colors = set(printer.color for printer in printers)
    
    print("\nAvailable Printer Configurations:")
    print("-" * 30)
    
    for printer in printers:
        print(f"Printer {printer.id}: {printer.material} - {printer.color}")
    
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
        
        # Print configuration summary
        print(f"\nConfiguration for Object {i}:")
        print(f"  Material: {config.material}")
        print(f"  Color: {config.color}")
        print(f"  Volume: {config.volume:.2f} mm³")
        print(f"  Weight: {config.weight:.2f} g")
        print(f"  Price: {config.price:.2f} €")
        
        object_configs.append(config)

        print_price_summary(object_configs)
        
        if i < len(components):
            continue_config = input("\nPress Enter to configure next object...").strip()
    
    return object_configs

def split_into_multiple_print_jobs(objects, configs, printer, build_volume, padding=10, max_attempts=5):
    """
    Splits objects that have the same material and color into multiple print jobs
    when they can't all fit in a single print area.
    
    This function should only be used when:
    1. All objects have the same material and color
    2. There's only one printer with that material/color
    3. Objects can't all fit in a single print
    
    Parameters:
    - objects: list of trimesh objects
    - configs: list of PrintObject configurations for each object
    - printer: printer object with build_volume and other attributes
    - build_volume: tuple of (x, y, z) dimensions
    - padding: spacing between objects in mm
    - max_attempts: maximum number of print jobs to try
    
    Returns:
    - list of scenes, each containing a subset of objects that fit in the print area
    """
    # Validate that we have the special case:
    if not objects or not configs:
        print("No objects or configurations provided")
        return []
        
    # Check if all objects have the same material and color
    first_material = configs[0].material
    first_color = configs[0].color
    
    if not all(config.material == first_material and config.color == first_color for config in configs):
        print("This function should only be used when all objects have the same material and color")
        return []
    
    # Sort objects by their base area for better packing
    # Use zip to keep objects and configs synchronized
    paired_data = list(zip(objects, configs))
    paired_data.sort(
        key=lambda pair: pair[0].bounding_box.extents[0] * pair[0].bounding_box.extents[1],
        reverse=True
    )
    
    # Unpack the sorted pairs
    sorted_objects, sorted_configs = zip(*paired_data) if paired_data else ([], [])
    
    # Create scenes for each print job
    scenes = []
    remaining_objects = list(sorted_objects)  # Make a copy so we can remove items
    remaining_configs = list(sorted_configs)  # Keep configs in sync
    
    attempt = 0
    while remaining_objects and attempt < max_attempts:
        attempt += 1
        print(f"\nAttempting to create print job {attempt} of {max_attempts}")
        
        scene = trimesh.Scene()
        x_pos, y_pos = 0, 0
        max_height_in_row = 0
        placed_indices = []
        
        # Try to place objects in this scene
        for i, (obj, config) in enumerate(zip(remaining_objects, remaining_configs)):
            # Skip objects that don't fit in the build volume at all
            if not check_object_fits(obj, build_volume):
                print(f"Object {config.object_id} too large for build volume, skipping")
                continue
                
            # Make sure object is at origin
            obj_copy = obj.copy()
            obj_copy.apply_translation(-obj_copy.bounds[0])
            
            # Get dimensions
            width, depth, height = obj_copy.bounding_box.extents
            
            # Check if we need to move to next row
            if x_pos + width + padding > build_volume[0]:
                x_pos = 0
                y_pos += max_height_in_row + padding
                max_height_in_row = 0
                
            # Check if object fits in Y direction
            if y_pos + depth + padding > build_volume[1]:
                # This object doesn't fit in current layout, try next object
                continue
                
            # Place the object in the scene
            translation = [
                x_pos + padding,
                y_pos + padding,
                0  # Place directly on the build plate
            ]
            obj_copy.apply_translation(translation)
            
            # Add to scene and update position tracking
            scene.add_geometry(obj_copy, node_name=f"obj_{config.object_id}")
            placed_indices.append(i)
            
            # Update position tracking
            x_pos += width + padding
            max_height_in_row = max(max_height_in_row, depth)
            
        # If we placed any objects, save this scene
        if placed_indices:
            scenes.append(scene)
            print(f"Created print job {attempt} with {len(placed_indices)} objects")
            
            # Remove placed objects from remaining lists
            # Remove in reverse order to avoid index shifting
            for idx in sorted(placed_indices, reverse=True):
                del remaining_objects[idx]
                del remaining_configs[idx]
        else:
            # If we couldn't place any objects in this iteration, we're stuck
            print(f"Warning: Could not place any more objects after {attempt} attempts")
            break
    
    # Report any remaining objects that couldn't be placed
    if remaining_objects:
        print(f"Warning: {len(remaining_objects)} objects could not be placed in any print job")
    
    return scenes

def process_material_color_group(material, color, group, printers, file_manager, job_name, padding=10):
    """
    Process a group of objects with the same material and color.
    Special handling for cases where objects can't all fit in one print area.
    
    Parameters:
    - material: material type (string)
    - color: color name (string)
    - group: list of (object, config) tuples
    - printers: list of available printers
    - file_manager: FileManager instance
    - job_name: name of the job
    - padding: spacing between objects in mm
    
    Returns:
    - list of file info dictionaries
    """
    # Find matching printer(s)
    matching_printers = [
        p for p in printers 
        if p.material == material and p.color == color
    ]
    
    if not matching_printers:
        print(f"Warning: No printer found for {material} - {color}")
        return []
    
    print(f"\nProcessing group for {material} - {color}")
    objects_in_group = [obj for obj, _ in group]
    configs_in_group = [config for _, config in group]
    
    output_files = []
    
    # Special case handling:
    # 1. Check if all objects have the same material and color (already satisfied by grouping)
    # 2. Check if there's only one printer with that material/color
    # 3. Check if objects can't all fit in a single print
    
    printer = matching_printers[0]
    build_volume_tuple = tuple(map(int, printer.build_volume.split(',')))
    
    # First try to arrange all objects
    arranged_scene, unplaced = arrange_objects_in_print_area(
        objects_in_group,
        build_volume=build_volume_tuple,
        padding=padding
    )
    
    # If all objects fit, process normally
    if not unplaced:
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
                'printer': printer,
                'material': material,
                'color': color
            })
        
        return output_files
    
    # Special case: objects don't all fit AND only one printer with the material/color
    if len(matching_printers) == 1 and unplaced:
        print(f"Special case detected: Objects with {material}-{color} can't fit in one print job")
        print(f"Splitting into multiple print jobs...")
        
        # Split into multiple print jobs
        scenes = split_into_multiple_print_jobs(
            objects_in_group,
            configs_in_group,
            printer,
            build_volume_tuple,
            padding=padding
        )
        
        # Process each print job
        for i, scene in enumerate(scenes, 1):
            if scene.geometry:
                # Generate unique identifier for this batch
                group_id = f"{material.lower()}_{color.lower()}_batch{i}"
                
                # Get paths for files
                remote_path, local_path = file_manager.get_job_file_paths(job_name, 'stl', group_id)
                local_path = Path(local_path)
                
                # Export STL
                scene.export(str(local_path), file_type='stl')
                print(f"Exported batch {i} to local file: {local_path}")
                
                # Save to server
                with open(local_path, 'rb') as f:
                    file_manager.save_file(f.read(), remote_path)
                
                output_files.append({
                    'path': str(local_path),
                    'printer': printer,
                    'material': material,
                    'color': color,
                    'batch': i
                })
    else:
        # Standard case with unplaced objects but multiple printers available
        # Just process what fits and warn about the rest
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
                'printer': printer,
                'material': material,
                'color': color
            })
            
        if unplaced:
            print(f"Warning: {len(unplaced)} objects could not be placed for {material} - {color}")
    
    return output_files

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

    # Filter objects
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
    
    # Get printers
    printers = get_available_printers_from_service()
    
    # Process each material/color group
    for (material, color), group in material_color_groups.items():
        # Process this material/color group, potentially splitting into multiple files
        group_files = process_material_color_group(
            material, 
            color, 
            group, 
            printers, 
            file_manager, 
            job_name, 
            padding=padding
        )
        
        # Add all output files to our master list
        output_files.extend(group_files)
    
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
        print(f"Successfully sliced {stl_path} for printer {printer.id}")

        # Upload to server if file exists and is not empty
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
        
        input_stl = "backend/slicer/input/group_pla_red.3mf"
        config_path = "backend/slicer/config/config.ini"
        
        print("Starting processing...")
        print(f"Input file: {input_stl}")
        print(f"Job name: {job_name}")

        with get_app_context():
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

