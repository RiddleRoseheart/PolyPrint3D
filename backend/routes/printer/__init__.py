from flask import Blueprint
from .printer_management import bp as printer_mgmt_bp
from .file_management import bp as file_mgmt_bp
from .job_management import bp as job_mgmt_bp

bp = Blueprint('printer', __name__)
bp.register_blueprint(printer_mgmt_bp)
bp.register_blueprint(file_mgmt_bp)
bp.register_blueprint(job_mgmt_bp)