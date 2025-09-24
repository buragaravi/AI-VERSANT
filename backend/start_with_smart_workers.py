#!/usr/bin/env python3
"""
Start VERSANT Backend with Smart Worker Management
Optimized Gunicorn configuration with task-aware worker recycling
"""

import os
import sys
import subprocess
import signal
import time
import threading
from pathlib import Path

def check_dependencies():
    """Check if all required dependencies are available"""
    try:
        import gunicorn
        print("✅ Gunicorn available")
    except ImportError:
        print("❌ Gunicorn not installed. Install with: pip install gunicorn")
        return False
    
    try:
        from utils.smart_worker_manager import smart_worker_manager
        print("✅ Smart Worker Manager available")
    except ImportError as e:
        print(f"❌ Smart Worker Manager not available: {e}")
        return False
    
    return True

def start_gunicorn_server():
    """Start Gunicorn server with optimized configuration"""
    
    # Get current directory
    backend_dir = Path(__file__).parent.absolute()
    os.chdir(backend_dir)
    
    # Environment variables
    env = os.environ.copy()
    env.update({
        'FLASK_ENV': 'production',
        'PYTHONPATH': str(backend_dir),
        'PORT': env.get('PORT', '8000')
    })
    
    # Gunicorn command
    cmd = [
        'gunicorn',
        '--config', 'gunicorn_config.py',
        '--bind', f"0.0.0.0:{env['PORT']}",
        '--workers', '2',  # Reduced workers
        '--worker-class', 'sync',
        '--worker-connections', '2000',  # Increased connections
        '--max-requests', '2000',  # Increased requests before recycling
        '--max-requests-jitter', '200',
        '--timeout', '600',  # 10 minutes timeout
        '--keep-alive', '5',
        '--preload',
        '--access-logfile', '-',
        '--error-logfile', '-',
        '--log-level', 'info',
        'main:app'
    ]
    
    print("🚀 Starting VERSANT Backend with Smart Worker Management...")
    print("=" * 60)
    print("📊 Configuration:")
    print(f"   - Workers: 2 (reduced from 4)")
    print(f"   - Memory per worker: ~400MB (increased from ~200MB)")
    print(f"   - Max requests per worker: 2000 (increased from 1000)")
    print(f"   - Worker timeout: 600s (increased from 300s)")
    print(f"   - Worker connections: 2000 (increased from 1000)")
    print(f"   - Smart recycling: Enabled")
    print(f"   - Task-aware shutdown: Enabled")
    print("=" * 60)
    
    try:
        # Start the server
        process = subprocess.Popen(cmd, env=env)
        
        # Wait for process
        process.wait()
        
    except KeyboardInterrupt:
        print("\n🛑 Shutting down gracefully...")
        if 'process' in locals():
            process.terminate()
            process.wait()
    except Exception as e:
        print(f"❌ Error starting server: {e}")
        sys.exit(1)

def start_development_server():
    """Start development server with smart worker management"""
    print("🔧 Starting development server with Smart Worker Management...")
    
    try:
        from main import app, socketio
        
        # Initialize smart worker manager
        from utils.smart_worker_manager import smart_worker_manager
        print("✅ Smart Worker Manager initialized")
        
        port = int(os.environ.get("PORT", 8000))
        debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
        
        print(f"🌐 Starting server on port {port}")
        print(f"🔧 Debug mode: {debug}")
        print("=" * 60)
        
        socketio.run(
            app, 
            host="0.0.0.0", 
            port=port, 
            debug=debug,
            use_reloader=debug,
            log_output=True
        )
        
    except Exception as e:
        print(f"❌ Error starting development server: {e}")
        sys.exit(1)

def main():
    """Main entry point"""
    print("🎯 VERSANT Backend - Smart Worker Management")
    print("=" * 60)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Check if we should use production or development mode
    if os.environ.get('FLASK_ENV') == 'production' or os.environ.get('USE_GUNICORN', '').lower() == 'true':
        start_gunicorn_server()
    else:
        start_development_server()

if __name__ == "__main__":
    main()
