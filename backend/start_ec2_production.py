#!/usr/bin/env python3
"""
Production startup script for AWS EC2
Optimized for free tier with proper error handling and monitoring
"""

import os
import sys
import subprocess
import time
import signal
import psutil
from pathlib import Path

def check_system_resources():
    """Check available system resources"""
    try:
        # Check available memory
        memory = psutil.virtual_memory()
        available_mb = memory.available // (1024 * 1024)
        
        # Check CPU count
        cpu_count = psutil.cpu_count()
        
        print(f"🖥️  System Resources:")
        print(f"   Available Memory: {available_mb} MB")
        print(f"   CPU Cores: {cpu_count}")
        print(f"   Memory Usage: {memory.percent}%")
        
        if available_mb < 500:
            print("⚠️  Warning: Low memory available. Consider optimizing further.")
        
        return available_mb, cpu_count
    except Exception as e:
        print(f"❌ Error checking system resources: {e}")
        return 1000, 2  # Default values

def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import flask
        import pymongo
        import gunicorn
        print("✅ All required dependencies are installed")
        return True
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install requirements: pip install -r requirements.txt")
        return False

def optimize_system():
    """Apply system optimizations for better performance"""
    try:
        # Set environment variables for better performance
        os.environ['PYTHONUNBUFFERED'] = '1'
        os.environ['PYTHONDONTWRITEBYTECODE'] = '1'
        
        # Optimize Python garbage collection
        import gc
        gc.set_threshold(700, 10, 10)
        
        print("✅ System optimizations applied")
        return True
    except Exception as e:
        print(f"⚠️  Warning: Could not apply all optimizations: {e}")
        return False

def start_gunicorn():
    """Start Gunicorn with optimized configuration"""
    try:
        # Check if gunicorn config exists
        config_file = Path(__file__).parent / "gunicorn_ec2_optimized.py"
        if not config_file.exists():
            print("❌ Gunicorn config file not found. Please ensure gunicorn_ec2_optimized.py exists.")
            return False
        
        # Start Gunicorn
        cmd = [
            "gunicorn",
            "--config", "gunicorn_ec2_optimized.py",
            "application:application"
        ]
        
        print("🚀 Starting Gunicorn server...")
        print(f"   Command: {' '.join(cmd)}")
        
        # Start the process
        process = subprocess.Popen(cmd, cwd=Path(__file__).parent)
        
        # Monitor the process
        print("📊 Monitoring server process...")
        while True:
            try:
                # Check if process is still running
                if process.poll() is not None:
                    print(f"❌ Server process exited with code: {process.returncode}")
                    return False
                
                # Check memory usage
                try:
                    proc = psutil.Process(process.pid)
                    memory_mb = proc.memory_info().rss // (1024 * 1024)
                    cpu_percent = proc.cpu_percent()
                    
                    if memory_mb > 800:  # 800MB limit for free tier
                        print(f"⚠️  High memory usage: {memory_mb}MB")
                    
                    if cpu_percent > 90:
                        print(f"⚠️  High CPU usage: {cpu_percent}%")
                        
                except psutil.NoSuchProcess:
                    pass
                
                time.sleep(10)  # Check every 10 seconds
                
            except KeyboardInterrupt:
                print("\n🛑 Shutting down server...")
                process.terminate()
                process.wait()
                print("✅ Server stopped gracefully")
                return True
                
    except Exception as e:
        print(f"❌ Error starting Gunicorn: {e}")
        return False

def main():
    """Main startup function"""
    print("=" * 60)
    print("🚀 Study Edge Backend - AWS EC2 Production Startup")
    print("=" * 60)
    
    # Check system resources
    available_memory, cpu_count = check_system_resources()
    
    # Check dependencies
    if not check_dependencies():
        sys.exit(1)
    
    # Apply optimizations
    optimize_system()
    
    # Start Gunicorn
    if not start_gunicorn():
        sys.exit(1)

if __name__ == "__main__":
    main()
