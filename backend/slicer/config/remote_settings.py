"""
Configuration settings for remote storage and printer parameters.
"""

# Remote storage configuration
SFTP_CONFIG = {
    'hostname': '10.2.160.3',  # Your actual hostname
    'username': 'polyprint',   # Your actual username
    'password': 'abc123',      # Your actual password
    'remote_base_path': '/home/polyprint/3d_prints'  # Your actual remote path
}
