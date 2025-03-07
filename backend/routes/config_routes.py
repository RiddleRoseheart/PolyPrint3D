from flask import Blueprint, jsonify
from backend.utils import is_local_mode

bp = Blueprint('config', __name__)

@bp.route('/api/config/mode', methods=['GET'])
def get_config_mode():
    """
    Get the current application mode (local or server)
    
    Returns:
        JSON with isLocalMode flag
    """
    return jsonify({
        'isLocalMode': is_local_mode()
    })