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
    mode = is_local_mode()
    print(f"Mode check requested: Running in {'local' if mode else 'server'} mode")
    return jsonify({
        'isLocalMode': mode
    })