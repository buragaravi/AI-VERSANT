#!/usr/bin/env python3
"""
Startup script for VERSANT Backend
Handles both development and production environments
"""

import os
import sys
from dotenv import load_dotenv

load_dotenv()

def start_development():
    """Start the app in development mode with Flask-SocketIO"""
    from main import create_app
    from socketio_instance import socketio
    
    app = create_app()
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Starting VERSANT API in DEVELOPMENT mode on port {port}")
    print(f"🔧 Debug mode: {debug}")
    
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True)

def start_production():
    """Start the app in production mode with Gunicorn"""
    import subprocess
    
    port = os.getenv('PORT', '5000')
    workers = os.getenv('GUNICORN_WORKERS', '4')
    
    print(f"🚀 Starting VERSANT API in PRODUCTION mode on port {port}")
    print(f"👥 Workers: {workers}")
    
    # Start Gunicorn with eventlet worker
    cmd = [
        'gunicorn',
        '--bind', f'0.0.0.0:{port}',
        '--worker-class', 'eventlet',
        '--workers', workers,
        '--worker-connections', '1000',
        '--timeout', '30',
        '--keep-alive', '2',
        '--access-logfile', '-',
        '--error-logfile', '-',
        '--log-level', 'info',
        'wsgi:app'
    ]
    
    subprocess.run(cmd)

if __name__ == '__main__':
    # Check if we're in production mode
    is_production = os.getenv('FLASK_ENV') == 'production' or os.getenv('ENVIRONMENT') == 'production'
    
    if is_production:
        start_production()
    else:
        start_development() 