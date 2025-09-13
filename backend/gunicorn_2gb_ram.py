#!/usr/bin/env python3
"""
Gunicorn configuration optimized for 2GB RAM Unix instances
Conservative settings to prevent memory exhaustion
"""

import os
import multiprocessing

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 1024  # Reduced for memory conservation

# Worker processes - optimized for 2GB RAM
# Conservative calculation: min((CPU * 1.5) + 1, 6)
cpu_count = multiprocessing.cpu_count()
workers = min(int((cpu_count * 1.5) + 1), 6)  # Max 6 workers for 2GB RAM
worker_class = "sync"  # Lower memory usage than eventlet/gevent
worker_connections = 500  # Reduced connection limit
max_requests = 300  # Lower to prevent memory leaks
max_requests_jitter = 30

# Timeout settings - optimized for bulk operations
timeout = 300  # 5 minutes for large uploads
keepalive = 2  # Reduced keepalive
graceful_timeout = 20

# Memory management for 2GB RAM
preload_app = False  # Disable preload to save memory
worker_tmp_dir = "/tmp"  # Use /tmp instead of /dev/shm
worker_memory_limit = 150 * 1024 * 1024  # 150MB per worker limit

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "versant-backend-2gb"

# Server mechanics
daemon = False
pidfile = None
user = None
group = None

# Memory-optimized server hooks
def on_starting(server):
    print("🚀 Starting VERSANT Backend on 2GB RAM Unix Instance...")
    print(f"   Port: {os.getenv('PORT', '8000')}")
    print(f"   Workers: {workers}")
    print(f"   Worker Class: {worker_class}")
    print(f"   Worker Connections: {worker_connections}")
    print(f"   Max Requests: {max_requests}")
    print(f"   Timeout: {timeout}s")
    print(f"   Memory Limit per Worker: {worker_memory_limit // (1024*1024)}MB")
    print("   🎯 Target: 2GB RAM optimization")
    print("   ⚡ Memory Conservative Settings")

def on_reload(server):
    print("🔄 Reloading VERSANT Backend on 2GB RAM...")

def worker_int(worker):
    print(f"⚠️ Worker {worker.pid} received INT or QUIT signal")

def pre_fork(server, worker):
    print(f"🔧 Pre-forking worker {worker.age}")

def post_fork(server, worker):
    print(f"✅ Worker {worker.pid} spawned")
    
    # Set memory limit for worker
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (worker_memory_limit, worker_memory_limit))
        print(f"🔒 Memory limit set for worker {worker.pid}: {worker_memory_limit // (1024*1024)}MB")
    except Exception as e:
        print(f"⚠️ Could not set memory limit for worker {worker.pid}: {e}")

def worker_abort(worker):
    print(f"💥 Worker {worker.pid} aborted")

def on_exit(server):
    print("👋 VERSANT Backend shutting down on 2GB RAM...")

# Memory optimization environment variables
raw_env = [
    'PYTHONUNBUFFERED=1',
    'PYTHONDONTWRITEBYTECODE=1',
    'MALLOC_ARENA_MAX=2',  # Limit memory fragmentation
    'PYTHONHASHSEED=random',  # Optimize hash performance
]

# Additional memory optimizations
def init_memory_optimizations():
    """Initialize memory-specific optimizations"""
    try:
        import gc
        # More aggressive garbage collection
        gc.set_threshold(500, 5, 5)
        print("✅ Memory optimizations initialized")
    except Exception as e:
        print(f"⚠️ Memory optimization failed: {e}")

# Call memory optimizations
init_memory_optimizations()
