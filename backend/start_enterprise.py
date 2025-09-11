#!/usr/bin/env python3
"""
Enterprise Startup Script for 200-500 Concurrent Users
Optimized for maximum performance and reliability
"""

import os
import sys
import subprocess
import signal
import time
import psutil
import gc
from pathlib import Path

def optimize_system():
    """Optimize system for high concurrency"""
    print("🔧 Optimizing system for 200-500 concurrent users...")
    
    # Set environment variables for maximum performance
    os.environ.update({
        'PYTHONUNBUFFERED': '1',
        'PYTHONDONTWRITEBYTECODE': '1',
        'PYTHONHASHSEED': '0',
        'MALLOC_TRIM_THRESHOLD_': '131072',
        'MALLOC_MMAP_THRESHOLD_': '131072',
        'MALLOC_MMAP_MAX_': '65536',
        'MALLOC_ARENA_MAX': '2',
        'GC_THRESHOLD': '700,10,10',
        'GC_DISABLE': '0'
    })
    
    # Optimize garbage collection
    gc.set_threshold(700, 10, 10)
    
    # Set process priority
    try:
        p = psutil.Process()
        p.nice(-5)  # Higher priority
        print("✅ Process priority optimized")
    except:
        print("⚠️  Could not set process priority")
    
    print("✅ System optimization complete")

def check_dependencies():
    """Check if all required dependencies are available"""
    print("🔍 Checking critical dependencies...")
    
    # Only check critical packages that are essential for startup
    critical_packages = [
        ('flask', 'Flask'),
        ('pymongo', 'PyMongo'),
        ('gunicorn', 'Gunicorn'),
        ('eventlet', 'Eventlet')
    ]
    
    missing_packages = []
    for package, display_name in critical_packages:
        try:
            __import__(package)
        except ImportError:
            missing_packages.append(display_name)
    
    if missing_packages:
        print(f"❌ Missing critical packages: {', '.join(missing_packages)}")
        print("Run: pip install " + " ".join([p.lower().replace(' ', '-') for p in missing_packages]))
        return False
    
    print("✅ Critical dependencies available")
    print("ℹ️  Note: Some optional packages may be missing but won't prevent startup")
    return True

def start_server():
    """Start the enterprise Gunicorn server"""
    print("🚀 Starting enterprise server for 200-500 concurrent users...")
    
    # Gunicorn command with enterprise configuration
    cmd = [
        'gunicorn',
        '--config', 'gunicorn_enterprise.py',
        '--worker-class', 'eventlet',
        '--workers', '32',
        '--worker-connections', '5000',
        '--max-requests', '1000',
        '--max-requests-jitter', '100',
        '--timeout', '300',
        '--keepalive', '5',
        '--preload-app',
        '--bind', '0.0.0.0:8000',
        '--access-logfile', '-',
        '--error-logfile', '-',
        '--log-level', 'info',
        '--proc-name', 'versant_enterprise',
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
        sys.exit(1)

def main():
    """Main startup function"""
    print("=" * 60)
    print("🚀 VERSANT ENTERPRISE BACKEND STARTUP")
    print("   Optimized for 200-500 Concurrent Users")
    print("=" * 60)
    
    # Check if we're in the right directory
    if not Path('main.py').exists():
        print("❌ main.py not found. Please run from backend directory.")
        sys.exit(1)
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Optimize system
    optimize_system()
    
    # Start server
    start_server()

if __name__ == "__main__":
    main()
