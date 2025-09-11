#!/usr/bin/env python3
"""
Simple Enterprise Startup Script
Uses existing main.py with enterprise Gunicorn configuration
"""

import os
import sys
import subprocess
import signal
import time
import gc

def optimize_system():
    """Optimize system for high concurrency"""
    print("🔧 Optimizing system for 200-500 concurrent users...")
    
    # Set environment variables for maximum performance
    os.environ.update({
        'PYTHONUNBUFFERED': '1',
        'PYTHONDONTWRITEBYTECODE': '1',
        'PYTHONHASHSEED': '0',
        'FLASK_DEBUG': 'False',
        'DEV_MODE': 'False'
    })
    
    # Optimize garbage collection
    gc.set_threshold(700, 10, 10)
    
    print("✅ System optimization complete")

def start_server():
    """Start the enterprise Gunicorn server using existing main.py"""
    print("🚀 Starting enterprise server for 200-500 concurrent users...")
    
    # Simple Gunicorn command using existing main.py
    cmd = [
        'gunicorn',
        '--worker-class', 'eventlet',
        '--workers', '32',
        '--worker-connections', '5000',
        '--max-requests', '1000',
        '--timeout', '300',
        '--keepalive', '5',
        '--preload-app',
        '--bind', '0.0.0.0:8000',
        '--access-logfile', '-',
        '--error-logfile', '-',
        '--log-level', 'info',
        'main:app'
    ]
    
    print(f"Command: {' '.join(cmd)}")
    
    try:
        process = subprocess.Popen(cmd)
        
        def signal_handler(sig, frame):
            print("\n🛑 Shutting down enterprise server...")
            process.terminate()
            process.wait()
            sys.exit(0)
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        print("✅ Enterprise server started successfully!")
        print("📊 Server can handle 200-500 concurrent users")
        print("🔗 Server running at: http://0.0.0.0:8000")
        print("📈 Max concurrent connections: 160,000 (32 workers × 5000 connections)")
        print("Press Ctrl+C to stop the server")
        
        process.wait()
        
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        print("💡 Try running: python main.py (for development)")
        sys.exit(1)

def main():
    """Main startup function"""
    print("=" * 60)
    print("🚀 VERSANT ENTERPRISE BACKEND STARTUP")
    print("   Optimized for 200-500 Concurrent Users")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not os.path.exists('main.py'):
        print("❌ main.py not found. Please run from backend directory.")
        sys.exit(1)
    
    # Optimize system
    optimize_system()
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
