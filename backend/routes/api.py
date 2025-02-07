from flask import Blueprint, jsonify

bp = Blueprint('api', __name__, url_prefix='/api')

@bp.route('/data')
def get_data():
    return jsonify({"message": "Hello from Flask!"})