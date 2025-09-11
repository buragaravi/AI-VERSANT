#!/usr/bin/env python3
"""
Render Production Startup Script
Optimized for Render deployment with proper configuration
"""

import os
import gc

# Optimize for production
gc.set_threshold(700, 10, 10)
os.environ['PYTHONUNBUFFERED'] = '1'
os.environ['PYTHONDONTWRITEBYTECODE'] = '1'

# Import and start the app
from main import app, socketio

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
    
    print("🚀 Starting VERSANT Enterprise Backend on Render")
    print(f"   Port: {port}")
    print(f"   Debug: {debug}")
    print("   Optimized for 200-500 concurrent users")
    
    socketio.run(
        app, 
        host="0.0.0.0", 
        port=port, 
        debug=debug,
        use_reloader=False,  # Disable reloader in production
        log_output=True
    )
