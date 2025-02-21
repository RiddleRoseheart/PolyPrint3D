import trimesh
import os
import subprocess
from pathlib import Path
import numpy as np
 
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
 
def split_and_distribute_objects(input_path, output_dir, printer_count, build_volume=BUILD_VOLUME,
                               volume_threshold=0.001, min_faces=4, padding=10):
    """
    Splits an STL into naturally separated objects and distributes them among printers.
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
 
    # Process each group
    Path(output_dir).mkdir(exist_ok=True)
    output_files = []
    for i, group in enumerate(object_groups):
        if group:
            print(f"Arranging group {i+1}...")
            arranged_scene, unplaced = arrange_objects_in_print_area(
                group, build_volume, padding=padding
            )
            if arranged_scene.geometry:
                file_name = os.path.join(output_dir, f"group_{i+1}.stl")
                arranged_scene.export(file_name)
                output_files.append(file_name)
                print(f"Exported {file_name}")
            if unplaced:
                print(f"Warning: {len(unplaced)} objects in group {i+1} could not be placed.")
    return output_files
 
def slice_with_prusa_slicer(stl_path, output_dir, config_path):
    """
    Slices an STL to G-code using PrusaSlicer CLI.
    """
    prusa_path = "C:\\Program Files\\Prusa3D\\PrusaSlicer\\prusa-slicer-console.exe"
    cmd = [
        prusa_path,
        str(stl_path),
        "--load", config_path,
        "--export-gcode",
        "--output", os.path.join(output_dir, Path(stl_path).stem + ".gcode")
    ]
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print(f"Successfully sliced {stl_path}")
        if result.stderr:
            print("Slicer messages:", result.stderr)
    except subprocess.CalledProcessError as e:
        print(f"Error slicing {stl_path}: {e}")
    except FileNotFoundError:
        print("PrusaSlicer executable not found at:", prusa_path)
 
 
if __name__ == "__main__":
    input_stl = "backend/slicer/input/BlindNav.stl"
    split_dir = "backend/slicer/output/split_objects"
    gcode_dir = "backend/slicer/output/gcode"
    config = "backend/slicer/config/config.ini"    # PrusaSlicer settings
    printer_count = 4
    padding = 10  # Increased padding for better separation
 
    # Create output directories
    Path(split_dir).mkdir(parents=True, exist_ok=True)
    Path(gcode_dir).mkdir(parents=True, exist_ok=True)
 
    print("Starting processing...")
    print(f"Input file: {input_stl}")
    print(f"Build volume: {BUILD_VOLUME}")
    print(f"Number of printers: {printer_count}")
 
    # Process STL
    grouped_stl_files = split_and_distribute_objects(
        input_stl,
        split_dir,
        printer_count,
        BUILD_VOLUME,
        padding=padding
    )
 
    if grouped_stl_files:
        print(f"\nGenerated {len(grouped_stl_files)} STL files")
        # Slice files
        print("\nSlicing files...")
        for stl_file in grouped_stl_files:
            slice_with_prusa_slicer(stl_file, gcode_dir, config)
        print("\nProcessing complete!")
    else:
        print("\nNo output files were generated. Please check the input file.")