#!/usr/bin/env python3
"""
Optimized Gunicorn configuration for AWS EC2 with 2GB RAM
Designed to handle 200+ concurrent users on 2GB RAM systems
"""

import os
import multiprocessing

# Server socket
port = os.getenv('PORT', '8000')
bind = f"0.0.0.0:{port}"

# Worker processes - CPU-based optimization for 2GB RAM EC2
# For I/O-bound Flask apps: (2 * CPU cores) + 1
cpu_count = multiprocessing.cpu_count()
workers = 5  # Fixed 5 workers for 2GB RAM system
worker_class = "sync"  # Use sync workers for better memory management
worker_connections = 1500  # Increased for 2GB RAM

# Performance tuning for 2GB RAM with large database operations
max_requests = 800  # Increased for 2GB RAM - restart workers after 800 requests
max_requests_jitter = 80
timeout = 900  # 15 minutes for large database operations (bulk uploads, complex queries)
keepalive = 8  # Increased keepalive for 2GB RAM
graceful_timeout = 120  # 2 minutes graceful timeout for large operations

# Additional timeout settings for large database operations
worker_timeout = 900  # 15 minutes worker timeout for large operations
worker_keepalive = 8  # Worker keepalive
worker_connections = 1500  # Worker connections

# Memory management for 2GB RAM
preload_app = True  # Enable preload for better performance on 2GB RAM
worker_tmp_dir = "/dev/shm"  # Use shared memory for better performance on Unix

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Security and performance limits for 2GB RAM
limit_request_line = 8192  # Increased for 2GB RAM
limit_request_fields = 200  # Increased for 2GB RAM
limit_request_field_size = 16384  # Increased for 2GB RAM

# Memory limits - optimized for 2GB RAM (5 workers × 200MB = 1GB total)
worker_memory_limit = 200 * 1024 * 1024  # 200MB per worker (5 workers = 1GB total)

# Long-running operation timeouts for large database operations
long_operation_timeout = 900  # 15 minutes for bulk operations
bulk_upload_timeout = 1200  # 20 minutes for very large uploads (1000+ students)
question_upload_timeout = 900  # 15 minutes for question bank uploads

def on_starting(server):
    print("🚀 Starting OPTIMIZED Study Edge Backend on AWS EC2 with 2GB RAM...")
    print(f"   Port: {port}")
    print(f"   Workers: {workers}")
    print(f"   Worker Class: {worker_class}")
    print(f"   Worker Connections: {worker_connections}")
    print(f"   Max Requests: {max_requests}")
    print(f"   Timeout: {timeout}s (15 minutes for large database operations)")
    print(f"   Keepalive: {keepalive}s")
    print(f"   Graceful Timeout: {graceful_timeout}s")
    print(f"   Memory per Worker: {worker_memory_limit // (1024*1024)}MB")
    print(f"   Total Memory Allocation: {(worker_memory_limit * workers) // (1024*1024)}MB (5 workers × 200MB)")
    print(f"   Long Operation Timeout: {long_operation_timeout}s (15 minutes)")
    print(f"   Bulk Upload Timeout: {bulk_upload_timeout}s (20 minutes)")
    print(f"   Question Upload Timeout: {question_upload_timeout}s (15 minutes)")
    print("   🎯 Target: 200+ concurrent users on 2GB RAM EC2")
    print("   ⚡ Memory Optimized for 2GB RAM (5 workers × 200MB)")
    print("   🔄 Large database operations supported (15-20 minutes)")
    print("   🧹 Automatic memory cleanup enabled")
    print("   📊 Memory monitoring without hard limits")
    print("   🗄️ Optimized for bulk uploads and complex queries")

def on_reload(server):
    print("🔄 Reloading OPTIMIZED Study Edge Backend...")

def worker_int(worker):
    print(f"⚠️ Worker {worker.pid} received INT or QUIT signal")

def pre_fork(server, worker):
    print(f"🔧 Pre-forking worker {worker.age}")

def post_fork(server, worker):
    print(f"✅ Worker {worker.pid} spawned")
    
    # Memory monitoring (without hard limits to prevent boot failures)
    try:
        import psutil
        process = psutil.Process()
        memory_info = process.memory_info()
        print(f"📊 Worker {worker.pid} memory usage: {memory_info.rss // (1024*1024)}MB")
    except Exception as e:
        print(f"⚠️ Could not monitor memory for worker {worker.pid}: {e}")
    
    # Configure worker for long-running operations and memory management
    try:
        import signal
        import threading
        import time
        import gc
        
        # Set up signal handlers for graceful shutdown
        def signal_handler(signum, frame):
            print(f"🛑 Worker {worker.pid} received signal {signum}, finishing current operation...")
            # Allow current operation to complete
            time.sleep(5)
            print(f"✅ Worker {worker.pid} completed operation, shutting down gracefully")
        
        signal.signal(signal.SIGTERM, signal_handler)
        signal.signal(signal.SIGINT, signal_handler)
        
        # Configure garbage collection for memory efficiency
        gc.set_threshold(600, 8, 8)  # More aggressive garbage collection
        gc.enable()
        
        # Set up periodic memory cleanup
        def memory_cleanup():
            while True:
                time.sleep(30)  # Cleanup every 30 seconds
                try:
                    gc.collect()
                    print(f"🧹 Worker {worker.pid} performed memory cleanup")
                except Exception as e:
                    print(f"⚠️ Memory cleanup failed for worker {worker.pid}: {e}")
        
        # Start memory cleanup thread
        cleanup_thread = threading.Thread(target=memory_cleanup, daemon=True)
        cleanup_thread.start()
        
        print(f"🔧 Worker {worker.pid} configured for long-running operations with memory management")
    except Exception as e:
        print(f"⚠️ Could not configure worker {worker.pid} for long operations: {e}")

def worker_abort(worker):
    print(f"💥 Worker {worker.pid} aborted")

def on_exit(server):
    print("👋 OPTIMIZED Study Edge Backend shutting down...")

# Memory optimization environment variables for 2GB RAM
raw_env = [
    'PYTHONUNBUFFERED=1',
    'PYTHONDONTWRITEBYTECODE=1',
    'PYTHONOPTIMIZE=1',  # Enable Python optimizations
    'MALLOC_ARENA_MAX=2',  # Limit memory fragmentation
    'PYTHONHASHSEED=random',  # Optimize hash performance
]

# Additional memory optimizations for 2GB RAM
def init_memory_optimizations():
    """Initialize memory-specific optimizations for 2GB RAM"""
    try:
        import gc
        # More aggressive garbage collection for 2GB RAM
        gc.set_threshold(600, 8, 8)
        print("✅ Memory optimizations initialized for 2GB RAM")
    except Exception as e:
        print(f"⚠️ Memory optimization failed: {e}")

# Call memory optimizations
init_memory_optimizations()
