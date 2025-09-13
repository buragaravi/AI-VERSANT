#!/usr/bin/env python3
"""
AWS EC2 Optimized Gunicorn Configuration
Specifically tuned for free-tier EC2 instances with maximum concurrency
"""

import os
import multiprocessing
import threading

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '5000')}"
backlog = 4096  # Increased for better concurrency

# Worker processes - CPU-based optimization for AWS EC2
# For I/O-bound Flask apps with SocketIO: (2 * CPU cores) + 1
cpu_count = multiprocessing.cpu_count()
workers = min((cpu_count * 2) + 1, 12)  # More balanced approach, cap at 12 workers
worker_class = "eventlet"  # Best for I/O intensive Flask apps
worker_connections = 2000  # High connection limit
max_requests = 1000  # Higher to reduce worker recycling
max_requests_jitter = 100

# Timeout settings - optimized for bulk operations (1000+ students)
timeout = 300  # 5 minutes for large uploads
keepalive = 10  # Keep connections alive longer
graceful_timeout = 60

# Memory and performance optimizations
preload_app = True  # Load app before forking
sendfile = True  # Enable sendfile for static content
reuse_port = True  # Enable port reuse for better performance

# Worker lifecycle management
max_worker_connections = 2000
worker_tmp_dir = "/dev/shm"  # Use RAM for worker temp files (Linux)

# Logging - detailed for monitoring
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s %(p)s'

# Process naming
proc_name = "versant-backend-aws"

# Server mechanics
daemon = False
pidfile = None
user = None
group = None

# Memory management
worker_memory_limit = 200 * 1024 * 1024  # 200MB per worker

# Eventlet specific optimizations
def when_ready(server):
    """Called just after the server is started."""
    print("🚀 VERSANT Backend ready on AWS EC2!")
    print(f"   Workers: {workers}")
    print(f"   Worker Class: {worker_class}")
    print(f"   Worker Connections: {worker_connections}")
    print(f"   Max Requests: {max_requests}")
    print(f"   Timeout: {timeout}s")
    print(f"   Bind: {bind}")

def on_starting(server):
    """Called just before the master process is initialized."""
    print("🌱 Starting VERSANT Backend on AWS EC2...")
    print("   Optimized for maximum concurrency on free tier")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    print("🔄 Reloading VERSANT Backend...")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    print(f"⚠️ Worker {worker.pid} received INT or QUIT signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    print(f"🔄 Forking worker {worker.pid}")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    print(f"✅ Worker {worker.pid} spawned")
    
    # Initialize async system in each worker
    try:
        from utils.async_processor import init_async_system
        init_async_system()
    except Exception as e:
        print(f"⚠️ Failed to initialize async system in worker {worker.pid}: {e}")

def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    print(f"🔧 Worker {worker.pid} initialized")
    
    # Set worker memory limit
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_AS, (worker_memory_limit, worker_memory_limit))
    except Exception as e:
        print(f"⚠️ Could not set memory limit for worker {worker.pid}: {e}")

def worker_abort(worker):
    """Called when a worker is being killed."""
    print(f"❌ Worker {worker.pid} aborted")

def on_exit(server):
    """Called just before exiting."""
    print("🛑 VERSANT Backend shutting down on AWS EC2...")

# Environment variables for optimization
raw_env = [
    'PYTHONUNBUFFERED=1',
    'PYTHONDONTWRITEBYTECODE=1',
    'PYTHONOPTIMIZE=1',  # Enable Python optimizations
    'MALLOC_ARENA_MAX=2',  # Limit memory fragmentation
]

# Eventlet specific settings
def post_worker_init_eventlet(worker):
    """Eventlet-specific worker initialization"""
    try:
        import eventlet
        # Configure eventlet for better performance
        eventlet.monkey_patch()
        
        # Set eventlet pool size
        eventlet.pools.Pool.size = worker_connections
        
        print(f"🎯 Eventlet configured for worker {worker.pid}")
    except Exception as e:
        print(f"⚠️ Eventlet configuration failed for worker {worker.pid}: {e}")

# Override post_worker_init for eventlet
post_worker_init = post_worker_init_eventlet

# SSL configuration (if needed)
# keyfile = None
# certfile = None

# Additional optimizations for AWS EC2
def init_worker_optimizations():
    """Initialize worker-specific optimizations"""
    try:
        # Set thread pool size
        import threading
        threading.active_count()
        
        # Configure garbage collection
        import gc
        gc.set_threshold(700, 10, 10)  # More aggressive GC
        
        print("✅ Worker optimizations initialized")
    except Exception as e:
        print(f"⚠️ Worker optimization failed: {e}")

# Call optimizations
init_worker_optimizations()
