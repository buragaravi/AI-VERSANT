#!/usr/bin/env python3
"""
AWS EC2 Production Startup Script
Optimized for maximum concurrency on free-tier instances
"""

import os
import sys
import subprocess
import signal
import time
import logging
from pathlib import Path

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def check_dependencies():
    """Check if all required dependencies are installed"""
    try:
        import flask
        import gunicorn
        import eventlet
        import pymongo
        logger.info("✅ All dependencies are available")
        return True
    except ImportError as e:
        logger.error(f"❌ Missing dependency: {e}")
        return False

def optimize_system():
    """Optimize system settings for better performance"""
    try:
        # Set environment variables for optimization
        os.environ['PYTHONUNBUFFERED'] = '1'
        os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
        os.environ['PYTHONOPTIMIZE'] = '1'
        os.environ['MALLOC_ARENA_MAX'] = '2'
        
        # Set Flask environment
        os.environ['FLASK_ENV'] = 'production'
        os.environ['FLASK_DEBUG'] = 'False'
        
        logger.info("✅ System optimized for production")
        return True
    except Exception as e:
        logger.error(f"❌ System optimization failed: {e}")
        return False

def start_gunicorn():
    """Start Gunicorn with optimized configuration"""
    try:
        # Get configuration
        port = os.getenv('PORT', '5000')
        workers = min(os.cpu_count() * 8, 32)
        
        logger.info(f"🚀 Starting Gunicorn on port {port}")
        logger.info(f"   Workers: {workers}")
        logger.info(f"   Worker Class: eventlet")
        
        # Gunicorn command
        cmd = [
            'gunicorn',
            '--config', 'gunicorn_aws_optimized.py',
            '--bind', f'0.0.0.0:{port}',
            '--workers', str(workers),
            '--worker-class', 'eventlet',
            '--worker-connections', '2000',
            '--max-requests', '1000',
            '--timeout', '180',
            '--keepalive', '10',
            '--preload-app',
            '--access-logfile', '-',
            '--error-logfile', '-',
            '--log-level', 'info',
            'main:app'
        ]
        
        logger.info(f"Command: {' '.join(cmd)}")
        
        # Start Gunicorn
        process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        
        # Monitor output
        for line in iter(process.stdout.readline, b''):
            logger.info(line.decode().strip())
        
        return process
        
    except Exception as e:
        logger.error(f"❌ Failed to start Gunicorn: {e}")
        return None

def start_with_socketio():
    """Start with SocketIO support"""
    try:
        from main import create_app, socketio
        
        # Create app
        app, socketio_instance = create_app()
        
        # Initialize async system
        from utils.async_processor import init_async_system
        init_async_system()
        
        # Start with SocketIO
        port = int(os.getenv('PORT', 5000))
        socketio_instance.run(
            app,
            host='0.0.0.0',
            port=port,
            debug=False,
            use_reloader=False,
            log_output=True
        )
        
    except Exception as e:
        logger.error(f"❌ Failed to start with SocketIO: {e}")
        return False

def signal_handler(signum, frame):
    """Handle shutdown signals gracefully"""
    logger.info(f"🛑 Received signal {signum}, shutting down gracefully...")
    sys.exit(0)

def main():
    """Main startup function"""
    logger.info("🌱 Starting VERSANT Backend on AWS EC2...")
    
    # Set up signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    # Check dependencies
    if not check_dependencies():
        logger.error("❌ Dependency check failed")
        sys.exit(1)
    
    # Optimize system
    if not optimize_system():
        logger.error("❌ System optimization failed")
        sys.exit(1)
    
    # Choose startup method
    use_gunicorn = os.getenv('USE_GUNICORN', 'true').lower() == 'true'
    
    if use_gunicorn:
        logger.info("🚀 Starting with Gunicorn (recommended for production)")
        process = start_gunicorn()
        if process:
            try:
                process.wait()
            except KeyboardInterrupt:
                logger.info("🛑 Shutting down...")
                process.terminate()
                process.wait()
        else:
            logger.error("❌ Failed to start Gunicorn")
            sys.exit(1)
    else:
        logger.info("🚀 Starting with SocketIO (development mode)")
        if not start_with_socketio():
            logger.error("❌ Failed to start with SocketIO")
            sys.exit(1)

if __name__ == "__main__":
    main()
