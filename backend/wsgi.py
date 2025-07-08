#!/usr/bin/env python3
"""
WSGI entry point for production deployment
"""

import os
from dotenv import load_dotenv
from main import create_app
from socketio_instance import socketio

load_dotenv()

# Create the Flask app
app = create_app()

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    print(f"🚀 Starting VERSANT API on port {port}")
    print(f"🔧 Debug mode: {debug}")
    
    socketio.run(app, host='0.0.0.0', port=port, debug=debug, allow_unsafe_werkzeug=True) 