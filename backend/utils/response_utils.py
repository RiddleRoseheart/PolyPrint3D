from typing import Dict, Tuple, Any
from flask import jsonify


class ResponseBuilder:
    """Utility class for building consistent API responses."""
    
    @staticmethod
    def success(data: Any = None, message: str = None, status_code: int = 200) -> Tuple[Dict, int]:
        """
        Build a success response.
        
        Args:
            data: Response data
            message: Optional success message
            status_code: HTTP status code
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        response = {"status": "success"}
        
        if data is not None:
            response["data"] = data
            
        if message:
            response["message"] = message
            
        from flask import jsonify
        return jsonify(response), status_code
    
    @staticmethod
    def error(message: str, status_code: int = 400, error_code: str = None) -> Tuple[Dict, int]:
        """
        Build an error response.
        
        Args:
            message: Error message
            status_code: HTTP status code
            error_code: Optional application-specific error code
            
        Returns:
            Tuple of (response_dict, status_code)
        """
        response = {
            "status": "error",
            "error": message
        }
        
        if error_code:
            response["error_code"] = error_code
            
        from flask import jsonify
        return jsonify(response), status_code
        
    @staticmethod
    def create_print_request_response(request) -> Dict:
        """
        Create standardized print request response dictionary.
        
        Args:
            request: PrintRequest object
            
        Returns:
            Dictionary with standardized print request data
        """
        # Helper function to parse filament name into material and color
        #TODO update database to include separate fields, dan mag dit weg 
        def parse_filament_name(name):
            if not name:
                return "Unknown", "Unknown"
            
            parts = name.split()
            if len(parts) >= 2:
                # Assume first part is material, rest is color
                return parts[0], " ".join(parts[1:])
            return name, "Unknown"  # If only one word, assume it's material
        
        filaments_data = []
        if request.filaments:
            for filament in request.filaments:
                material, color = parse_filament_name(filament.name)
                filaments_data.append({
                    'id': filament.id,
                    'name': filament.name,
                    'price_per_gram': filament.price_per_gram,
                    'print_request_id': filament.print_request_id,
                    'material': material,
                    'color': color
                })
        
            
        return {
            'id': request.id,
            'file_path': request.file_path,
            'state': request.state,
            'weight': request.weight,
            'price': request.price,
            'filaments':  filaments_data,
            'dimension': request.dimension,
            'filling': request.filling,
            'layer': request.layer_height,
            'created_at': request.created_at.isoformat(),
            'gcode_file': {
                'id': request.gcode_file.id,
                'file_path': request.gcode_file.file_path
            } if request.gcode_file else None
        }
    
   
    @staticmethod
    def create_file_response(file_obj) -> Dict:
        """
        Create standardized file response dictionary.
        
        Args:
            file_obj: UploadedFile object
            
        Returns:
            Dictionary with standardized file data
        """
        return {
            'id': file_obj.id,
            'filename': file_obj.filename,
            'status': file_obj.status,
            'created_at': file_obj.created_at.isoformat(),
            'user_id': file_obj.user_id
        }