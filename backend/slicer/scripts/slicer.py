import trimesh
import os
import subprocess
from pathlib import Path
from slugify import slugify
from sklearn.cluster import DBSCAN
from sklearn.cluster import AgglomerativeClustering
import numpy as np

def split_stl_into_objects(input_path, output_dir, 
                           volume_threshold=0.001, min_faces=20, 
                           min_bbox_size=0.05, clustering_distance=30.0):
    """Split an STL into separate objects while keeping all valid clusters."""
    
    # Load the 3D model from the STL file
    mesh = trimesh.load_mesh(input_path)
    objects = mesh.split(only_watertight=False)

    # Filter out degenerate objects (fewer than 4 vertices)
    valid_objects = [obj for obj in objects if len(obj.vertices) >= 4]

    if len(valid_objects) == 0:
        return 0  # No valid objects found

    # Compute volume, bounding box size, and face count for all objects
    volumes = np.array([obj.volume for obj in valid_objects])
    bounding_boxes = np.array([obj.bounding_box.extents for obj in valid_objects])
    min_sizes = np.min(bounding_boxes, axis=1)  # Smallest dimension in bounding box
    num_faces = np.array([len(obj.faces) for obj in valid_objects])

    # Apply filtering rules
    valid_volume = volumes >= volume_threshold
    valid_bbox = min_sizes >= min_bbox_size
    valid_faces = num_faces >= min_faces

    # Keep only objects passing all filters
    filtered_objects = np.array(valid_objects)[valid_volume & valid_bbox & valid_faces]

    # Apply **Hierarchical Clustering** to remove floating objects
    if len(filtered_objects) > 0:
        centroids = np.array([obj.centroid for obj in filtered_objects])

        # **Use AgglomerativeClustering instead of DBSCAN**
        clustering = AgglomerativeClustering(n_clusters=None, 
                                             distance_threshold=clustering_distance).fit(centroids)
        labels = clustering.labels_

        # Keep all **non-outlier clusters**
        clustered_objects = filtered_objects
    else:
        clustered_objects = []

    # Create output directory if it doesn't exist
    Path(output_dir).mkdir(exist_ok=True)

    # Export each valid object
    for i, obj in enumerate(clustered_objects):
        obj_name = slugify(f"object_{i}")  # Clean filename
        obj.export(os.path.join(output_dir, f"{obj_name}.stl"))

    return len(clustered_objects)


def slice_with_prusa_slicer(stl_path, output_dir, config_path):
    """Slice an STL to G-code using PrusaSlicer CLI."""
    prusa_path = "C:\\Program Files\\Prusa3D\\PrusaSlicer\\prusa-slicer-console.exe" 
    
    cmd = [
        prusa_path,
        str(stl_path),              # Input STL file
        "--load", config_path,      # Load printer settings
        "--export-gcode",           # Convert to G-code
        "--output", os.path.join(output_dir, Path(stl_path).stem + ".gcode")
    ]

    # Try to run PrusaSlicer
    try:
        result = subprocess.run(cmd, check=True, capture_output=True, text=True)
        print("PrusaSlicer output:", result.stdout)
        if result.stderr:
            print("PrusaSlicer errors:", result.stderr)
    except subprocess.CalledProcessError as e:
        # Handle PrusaSlicer errors
        print(f"Error running PrusaSlicer: {e}")
        if e.stdout:
            print("Output:", e.stdout)
        if e.stderr:
            print("Error output:", e.stderr)
    except FileNotFoundError:
        # Handle case where PrusaSlicer isn't found
        print("PrusaSlicer console executable not found. Please check the path.")


if __name__ == "__main__":
    input_stl = "backend/slicer/input/BlindNav.stl"
    split_dir = "backend/slicer/output/split_objects"
    gcode_dir = "backend/slicer/output/gcode"
    config = "backend/slicer/config/config.ini"    # PrusaSlicer settings

    # Split STL into objects
    num_objects = split_stl_into_objects(input_stl, split_dir)
    print(f"Split into {num_objects} objects.")
    
    # Slice each split object
    for stl_file in Path(split_dir).glob("*.stl"):
        slice_with_prusa_slicer(stl_file, gcode_dir, config)