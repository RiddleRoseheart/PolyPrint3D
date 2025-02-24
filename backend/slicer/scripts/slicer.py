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
from config.material_config import MaterialConfig, PrintObject, get_material_names, get_color_names
 
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
    Allows interactive selection of material and color for each object.
    """
    print("\nAvailable Materials and Colors:")
    print("-" * 30)
    print("Materials:", get_material_names())
    print("Colors:", get_color_names())
   
    materials = get_material_names()
    colors = get_color_names()
    object_configs = []
   
    print("\nDetected Objects:")
    print("-" * 40)
   
    for i, comp in enumerate(components, 1):
        print(f"\nObject {i}:")
        print(f"  Volume: {comp.volume:.2f} mm³")
        print(f"  Size: {tuple(comp.bounding_box.extents)}")
       
        # Material selection
        while True:
            print(f"\nAvailable materials: {materials}")
            material = input(f"Choose material for Object {i} (default=PLA): ").strip().upper()
            if not material:
                material = 'PLA'
            if material in materials:
                break
            print("Invalid material! Please choose from the list.")
       
        # Color selection
        while True:
            print(f"\nAvailable colors: {colors}")
            color = input(f"Choose color for Object {i} (default=Natural): ").strip().title()
            if not color:
                color = 'Natural'
            if color in colors:
                break
            print("Invalid color! Please choose from the list.")
       
        # Create PrintObject instance instead of MaterialConfig
        config = PrintObject(
            object_id=i,
            volume=comp.volume,
            material=material,
            color=color,
            bounding_box=tuple(comp.bounding_box.extents),
            face_count=len(comp.faces)
        )
       
        # Print configuration summary
        print(f"\nConfiguration for Object {i}:")
        print(f"  Material: {config.material}")
        print(f"  Color: {config.color}")
        print(f"  Volume: {config.volume:.2f} mm³")
       
        object_configs.append(config)
       
        # Ask if user wants to configure next object
        if i < len(components):
            continue_config = input("\nPress Enter to configure next object...").strip()
   
    return object_configs
 
def split_and_distribute_objects(input_path, file_manager, job_name, printer_count, build_volume=BUILD_VOLUME,
                               volume_threshold=0.001, min_faces=4, padding=10):
    """Splits an STL into naturally separated objects and distributes them among printers."""
    print("Loading STL file...")
    mesh = trimesh.load_mesh(input_path)
   
    print("Splitting into components...")
    objects = split_disconnected_components(mesh)
   
    if not objects:
        print("No valid objects found in the STL file.")
        return []
 
    # Filter objects
    filtered_objects = []
    for obj in objects:
        if obj.volume >= volume_threshold and len(obj.faces) >= min_faces:
            filtered_objects.append(obj)
   
    if not filtered_objects:
        print("No objects remained after filtering.")
        return []
   
    print(f"Found {len(filtered_objects)} valid objects.")
 
    # Set up configurations for objects
    object_configs = setup_object_configurations(filtered_objects)
 
    # Print final configuration summary
    print("\nFinal Object Configurations:")
    print("-" * 30)
    for config in object_configs:
        print(f"\nObject {config.object_id}:")
        print(f"  Material: {config.material}")
        print(f"  Color: {config.color}")
 
    # Create job folders on server and locally
    job_folders = file_manager.create_job_folders(job_name)
    output_files = []
   
    # Distribute objects across printers
    object_groups = [[] for _ in range(printer_count)]
    filtered_objects.sort(key=lambda obj: obj.volume, reverse=True)
   
    for i, obj in enumerate(filtered_objects):
        group_index = i % printer_count
        object_groups[group_index].append(obj)
 
    # Process each group
    for i, group in enumerate(object_groups):
        if group:
            print(f"Arranging group {i+1}...")
            arranged_scene, unplaced = arrange_objects_in_print_area(
                group, build_volume, padding=padding
            )
           
            if arranged_scene.geometry:
                # Get paths for both remote and local files
                remote_path, local_path = file_manager.get_job_file_paths(job_name, 'stl', i+1)
                local_path = Path(local_path)
               
                # Export directly to local output directory
                arranged_scene.export(str(local_path), file_type='stl')
                print(f"Exported to local file: {local_path}")
               
                # Upload to server
                with open(local_path, 'rb') as f:
                    file_manager.save_file(f.read(), remote_path)
                print(f"Uploaded to server: {remote_path}")
               
                output_files.append(str(local_path))
               
            if unplaced:
                print(f"Warning: {len(unplaced)} objects in group {i+1} could not be placed.")
   
    return output_files
 
def slice_with_prusa_slicer(stl_path, file_manager, job_name, group_number, config_path, material_config=None):
    """Slices an STL to G-code using PrusaSlicer CLI."""
    prusa_path = "C:\\Program Files\\Prusa3D\\PrusaSlicer\\prusa-slicer-console.exe"
   
    # Get paths for both remote and local files
    remote_path, local_path = file_manager.get_job_file_paths(job_name, 'gcode', group_number)
    local_path = Path(local_path)
   
    # Ensure the parent directory exists
    local_path.parent.mkdir(parents=True, exist_ok=True)
   
    cmd = [
        prusa_path,
        str(stl_path),
        "--load", config_path,
        "--export-gcode",
        "--output", str(local_path)
    ]
   
    success = False
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"Successfully sliced {stl_path}")
       
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
    # Server configuration
    SERVER_CONFIG = {
        'host': '10.2.168.6',
        'username': 'polyprint',
        'password': 'abc123',
        'remote_path': '/home/polyprint/3d_prints'
    }
   
    # Initialize file manager with SFTP connection
    file_manager = FileManager(
        SERVER_CONFIG['host'],
        SERVER_CONFIG['username'],
        SERVER_CONFIG['password'],
        SERVER_CONFIG['remote_path']
    )
   
    # Get unique job name
    job_name = file_manager.generate_unique_folder_name()
   
    # Input and config paths
    input_stl = "backend/slicer/input/Pelletcamv2.1.stl"
    config = "backend/slicer/config/config.ini"
    printer_count = 4
    padding = 10
 
    print("Starting processing...")
    print(f"Input file: {input_stl}")
    print(f"Job name: {job_name}")
    print(f"Build volume: {BUILD_VOLUME}")
    print(f"Number of printers: {printer_count}")
 
    try:
        # Process STL
        grouped_stl_files = split_and_distribute_objects(
            input_stl,
            file_manager,
            job_name,
            printer_count,
            BUILD_VOLUME,
            padding=padding
        )
 
        if grouped_stl_files:
            print(f"\nGenerated {len(grouped_stl_files)} STL files")
           
            # Slice files
            print("\nSlicing files...")
            slicing_success = True
            for i, stl_file in enumerate(grouped_stl_files):
                if not slice_with_prusa_slicer(stl_file, file_manager, job_name, i+1, config):
                    slicing_success = False
                    print(f"Warning: Failed to slice {stl_file}")
           
            if slicing_success:
                print("\nProcessing complete! All files were successfully processed and uploaded.")
            else:
                print("\nWarning: Processing completed but some files failed to slice.")
        else:
            print("\nNo output files were generated. Please check the input file.")
 
    except Exception as e:
        print(f"\nError during processing: {e}")