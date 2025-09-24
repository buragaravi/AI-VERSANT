#!/usr/bin/env python3
"""
Gunicorn Configuration for VERSANT Backend
Optimized for smart worker management with task-aware recycling
"""

import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes
workers = 2  # Reduced from 4 to 2 (50% reduction)
worker_class = "sync"
worker_connections = 2000  # Increased from 1000 to 2000
timeout = 600  # Increased from 300 to 600 (10 minutes)
keepalive = 5  # Increased from 2 to 5

# Worker recycling (Smart recycling with task awareness)
max_requests = 2000  # Increased from 1000 to 2000
max_requests_jitter = 200  # Increased from 100 to 200
preload_app = True

# Memory management
worker_tmp_dir = "/dev/shm"  # Use shared memory for better performance

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "versant_backend"

# Server mechanics
daemon = False
pidfile = "/tmp/versant_backend.pid"
user = None
group = None
tmp_upload_dir = None

# SSL (if needed)
# keyfile = None
# certfile = None

# Worker lifecycle hooks
def on_starting(server):
    """Called just before the master process is initialized."""
    server.log.info("🚀 Starting VERSANT Backend with Smart Worker Management")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    server.log.info("🔄 Reloading VERSANT Backend workers")

def when_ready(server):
    """Called just after the server is started."""
    server.log.info("✅ VERSANT Backend ready to accept connections")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    worker.log.info(f"⚠️ Worker {worker.pid} interrupted")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    server.log.info(f"🔧 Pre-forking worker {worker.age}")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    server.log.info(f"🚀 Worker {worker.pid} forked successfully")

def pre_exec(server):
    """Called just before a new master process is forked."""
    server.log.info("🔄 Pre-executing new master process")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    worker.log.error(f"❌ Worker {worker.pid} aborted")

def on_exit(server):
    """Called just before exiting."""
    server.log.info("🛑 VERSANT Backend shutting down")

# Environment variables
raw_env = [
    'FLASK_ENV=production',
    'PYTHONPATH=/app/backend',
]

# Performance tuning
worker_class = "sync"
worker_connections = 2000
max_requests = 2000
max_requests_jitter = 200
timeout = 600
keepalive = 5

# Memory optimization
worker_tmp_dir = "/dev/shm"

# Security
limit_request_line = 4094
limit_request_fields = 100
limit_request_field_size = 8190

# Debugging (disable in production)
reload = False
reload_extra_files = []

# Stats
statsd_host = None
statsd_prefix = "versant_backend"

# Custom settings for smart worker management
def post_worker_init(worker):
    """Called just after a worker has initialized the application."""
    try:
        # Import and initialize smart worker manager
        from utils.smart_worker_manager import smart_worker_manager
        worker.log.info(f"🔧 Smart Worker Manager initialized for worker {worker.pid}")
    except Exception as e:
        worker.log.error(f"❌ Failed to initialize Smart Worker Manager: {e}")

def worker_exit(server, worker):
    """Called just after a worker has been exited."""
    try:
        # Check for active tasks before worker exit
        from utils.smart_worker_manager import smart_worker_manager
        if smart_worker_manager.has_active_tasks():
            worker.log.warning(f"⚠️ Worker {worker.pid} exiting with active tasks")
        else:
            worker.log.info(f"✅ Worker {worker.pid} exiting cleanly")
    except Exception as e:
        worker.log.error(f"❌ Error checking worker exit status: {e}")

# Additional configuration for production
if os.environ.get('FLASK_ENV') == 'production':
    # Production optimizations
    workers = 2
    worker_class = "sync"
    worker_connections = 2000
    max_requests = 2000
    max_requests_jitter = 200
    timeout = 600
    keepalive = 5
    preload_app = True
    
    # Disable debug features
    reload = False
    debug = False
    
    # Enhanced logging
    loglevel = "info"
    accesslog = "/var/log/versant/access.log"
    errorlog = "/var/log/versant/error.log"
    
    # Security
    limit_request_line = 4094
    limit_request_fields = 100
    limit_request_field_size = 8190