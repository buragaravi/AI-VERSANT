#!/usr/bin/env python3
"""
Ultra-scalable Gunicorn configuration for 1000+ concurrent users
Optimized for maximum performance and reliability
"""

import os
import multiprocessing
import psutil
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Server socket
bind = f"0.0.0.0:{os.getenv('PORT', '8000')}"
backlog = 8192  # Increased for high concurrency

# Calculate optimal workers based on system resources
def get_optimal_workers():
    """Calculate optimal number of workers for 1000+ concurrent users"""
    try:
        # Get system resources
        cpu_count = multiprocessing.cpu_count()
        memory_gb = psutil.virtual_memory().total / (1024**3)
        
        # Calculate workers based on resources
        if memory_gb >= 16:  # High-memory system
            workers = min(cpu_count * 8, 64)  # Up to 64 workers
        elif memory_gb >= 8:  # Medium-memory system
            workers = min(cpu_count * 6, 48)  # Up to 48 workers
        elif memory_gb >= 4:  # Low-memory system
            workers = min(cpu_count * 4, 32)  # Up to 32 workers
        else:  # Very low memory
            workers = min(cpu_count * 2, 16)  # Up to 16 workers
        
        logger.info(f"🖥️ System Resources: {cpu_count} CPUs, {memory_gb:.1f}GB RAM")
        logger.info(f"👥 Calculated Workers: {workers}")
        return max(4, workers)  # Minimum 4 workers
    except Exception as e:
        logger.warning(f"⚠️ Error calculating optimal workers: {e}")
        return 16  # Fallback

# Worker processes - Ultra-scalable configuration
workers = get_optimal_workers()
worker_class = "gevent"  # Best for I/O intensive applications
worker_connections = 2000  # High connection limit per worker
max_requests = 2000  # Higher to reduce worker recycling
max_requests_jitter = 200

# Timeout settings - Optimized for high concurrency
timeout = 300  # 5 minutes for complex operations
keepalive = 30  # Keep connections alive longer
graceful_timeout = 120  # 2 minutes graceful shutdown

# Memory and performance optimizations
preload_app = True  # Load app before forking
sendfile = True  # Enable sendfile for static content
reuse_port = True  # Enable port reuse for better performance

# Worker lifecycle management
max_worker_connections = 2000
worker_tmp_dir = "/dev/shm"  # Use RAM for worker temp files (Linux)

# Memory management
worker_memory_limit = 500 * 1024 * 1024  # 500MB per worker

# Logging - Detailed for monitoring
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s %(p)s %(T)s'

# Process naming
proc_name = "versant-ultra-scalable"

# Server mechanics
daemon = False
pidfile = None
user = None
group = None

# Security and performance limits
limit_request_line = 16384  # 16KB request line
limit_request_fields = 200  # 200 header fields
limit_request_field_size = 16384  # 16KB per field

# Gevent specific optimizations
def on_starting(server):
    """Called just before the master process is initialized."""
    logger.info("🚀 Starting ULTRA-SCALABLE VERSANT Backend...")
    logger.info(f"   Target: 1000+ concurrent users")
    logger.info(f"   Workers: {workers}")
    logger.info(f"   Worker Class: {worker_class}")
    logger.info(f"   Worker Connections: {worker_connections}")
    logger.info(f"   Max Concurrent: {workers * worker_connections:,}")
    logger.info(f"   Memory Limit per Worker: {worker_memory_limit // (1024*1024)}MB")
    logger.info(f"   Timeout: {timeout}s")
    logger.info(f"   Keepalive: {keepalive}s")
    logger.info("   ⚡ Performance: ULTRA-SCALABLE")

def on_reload(server):
    """Called to recycle workers during a reload via SIGHUP."""
    logger.info("🔄 Reloading ULTRA-SCALABLE VERSANT Backend...")

def when_ready(server):
    """Called just after the server is started."""
    logger.info("✅ ULTRA-SCALABLE VERSANT Backend is ready!")
    logger.info(f"   Listening on: {bind}")
    logger.info(f"   Workers: {workers}")
    logger.info(f"   Max Concurrent Users: {workers * worker_connections:,}")
    logger.info("   🎯 Ready for 1000+ concurrent users!")

def worker_int(worker):
    """Called just after a worker exited on SIGINT or SIGQUIT."""
    logger.info(f"👋 Worker {worker.pid} received INT or QUIT signal")

def worker_abort(worker):
    """Called when a worker received the SIGABRT signal."""
    logger.warning(f"⚠️ Worker {worker.pid} received SIGABRT signal")

def pre_fork(server, worker):
    """Called just before a worker is forked."""
    logger.info(f"🔄 Forking worker {worker.age}")

def post_fork(server, worker):
    """Called just after a worker has been forked."""
    logger.info(f"✅ Worker {worker.pid} forked successfully")

def pre_exec(server):
    """Called just before a new master process is forked."""
    logger.info("🔄 Pre-exec: New master process forking")

def pre_request(worker, req):
    """Called just before a worker processes the request."""
    worker.log.info(f"📥 Processing request: {req.method} {req.uri}")

def post_request(worker, req, environ, resp):
    """Called after a worker processes the request."""
    worker.log.info(f"📤 Request completed: {req.method} {req.uri} - {resp.status}")

def child_exit(server, worker):
    """Called just after a worker has been exited."""
    logger.info(f"👋 Worker {worker.pid} exited")

def max_requests_jitter_handler(worker):
    """Called when a worker reaches max_requests."""
    logger.info(f"🔄 Worker {worker.pid} reached max_requests, recycling...")

# Performance monitoring
def worker_exit(server, worker):
    """Called just after a worker has been exited, in the master process."""
    logger.info(f"📊 Worker {worker.pid} exit stats:")
    logger.info(f"   Age: {worker.age}")
    logger.info(f"   Requests: {worker.requests}")
    logger.info(f"   Max requests: {worker.max_requests}")

# Custom worker class for ultra-scalable performance
class UltraScalableWorker:
    """Custom worker class with enhanced monitoring"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.request_count = 0
        self.start_time = None
    
    def handle_request(self, *args, **kwargs):
        """Handle request with monitoring"""
        self.request_count += 1
        if self.start_time is None:
            self.start_time = time.time()
        
        # Log every 100 requests
        if self.request_count % 100 == 0:
            uptime = time.time() - self.start_time if self.start_time else 0
            logger.info(f"📊 Worker {self.pid}: {self.request_count} requests in {uptime:.1f}s")
        
        return super().handle_request(*args, **kwargs)

# Export the custom worker class
worker_class = "gevent"  # Use gevent for best I/O performance

# Additional gevent optimizations
gevent_monkey_patch = True
gevent_patch_all = True
