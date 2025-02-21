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

from scripts.remote_storage import RemoteStorage
from scripts.file_manager import FileManager

try:
    from config.remote_settings import SFTP_CONFIG
except ImportError:
    print("Please create remote_settings.py from remote_config.py")
    raise

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

def split_and_distribute_objects(input_path, file_manager, job_name, printer_count, build_volume=BUILD_VOLUME,
                               volume_threshold=0.001, min_faces=4, padding=10):
    """
    Splits an STL into naturally separated objects and distributes them among printers.
    Uses FileManager to handle file paths and storage.
    """
    # Load the STL model
    print("Loading STL file...")
    mesh = trimesh.load_mesh(input_path)
    # Split into natural components
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
 
    # Distribute objects across printers
    object_groups = [[] for _ in range(printer_count)]
    filtered_objects.sort(key=lambda obj: obj.volume, reverse=True)
    for i, obj in enumerate(filtered_objects):
        group_index = i % printer_count
        object_groups[group_index].append(obj)

    # Get job folders
    job_folders = file_manager.create_job_folders(job_name)
    output_files = []

    # Connect to remote storage
    remote_storage = RemoteStorage(SFTP_CONFIG)
    remote_storage.connect()
    
    try:
        for i, group in enumerate(object_groups):
            if group:
                print(f"Arranging group {i+1}...")
                arranged_scene, unplaced = arrange_objects_in_print_area(
                    group, build_volume, padding=padding
                )
                
                if arranged_scene.geometry:
                    # Get paths for this group
                    paths = file_manager.get_job_file_path(job_name, 'stl', i+1)
                    
                    # Save locally
                    arranged_scene.export(paths['local'])
                    print(f"Exported {paths['local']}")

                    # Upload to remote
                    if remote_storage.upload_file(paths['local'], paths['remote']):
                        output_files.append(paths['local'])
                        print(f"Uploaded to {paths['remote']}")
                
                if unplaced:
                    print(f"Warning: {len(unplaced)} objects in group {i+1} could not be placed.")

    finally:
        remote_storage.disconnect()
    
    return output_files


def slice_with_prusa_slicer(stl_path, file_manager, job_name, group_number, config_path):
    """
    Slices an STL to G-code using PrusaSlicer CLI.
    Uses FileManager to handle file paths and storage.
    """
    prusa_path = "C:\\Program Files\\Prusa3D\\PrusaSlicer\\prusa-slicer-console.exe"
    
    # Get paths for this group's gcode
    paths = file_manager.get_job_file_path(job_name, 'gcode', group_number)
    
    cmd = [
        prusa_path,
        str(stl_path),
        "--load", config_path,
        "--export-gcode",
        "--output", paths['local']
    ]
    
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"Successfully sliced {stl_path}")
        
        # After successful slice, upload the G-code
        if os.path.exists(paths['local']):
            remote_storage = RemoteStorage(SFTP_CONFIG)
            remote_storage.connect()
            try:
                if remote_storage.upload_file(paths['local'], paths['remote']):
                    print(f"Uploaded G-code to {paths['remote']}")
            finally:
                remote_storage.disconnect()

    except subprocess.CalledProcessError as e:
        print(f"Error slicing {stl_path}: {e}")
    except FileNotFoundError:
        print("PrusaSlicer executable not found at:", prusa_path)

if __name__ == "__main__":
    # Base paths configuration
    base_local_path = Path("backend/slicer/output")
    base_remote_path = SFTP_CONFIG['remote_base_path']
    
    # Initialize file manager
    file_manager = FileManager(base_local_path, base_remote_path)
    
    # Generate unique job name
    job_name = file_manager.generate_unique_folder_name()
    
    input_stl = "backend/slicer/input/BlindNav.stl"
    config = "backend/slicer/config/config.ini"    # PrusaSlicer settings
    printer_count = 4
    padding = 10

    print("Starting processing...")
    print(f"Input file: {input_stl}")
    print(f"Job name: {job_name}")
    print(f"Build volume: {BUILD_VOLUME}")
    print(f"Number of printers: {printer_count}")
 
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
        for i, stl_file in enumerate(grouped_stl_files):
            slice_with_prusa_slicer(stl_file, file_manager, job_name, i+1, config)

        print("\nProcessing complete!")
    else:
        print("\nNo output files were generated. Please check the input file.")
