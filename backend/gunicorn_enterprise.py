#!/usr/bin/env python3
"""
Enterprise Gunicorn Configuration for 200-500 Concurrent Users
Optimized for AWS EC2 with maximum performance
"""

import multiprocessing
import os

# Server socket
bind = "0.0.0.0:8000"
backlog = 2048

# Worker processes - CPU-based optimization for Enterprise
# For I/O-bound Flask apps with eventlet: (2 * CPU cores) + 1
cpu_count = multiprocessing.cpu_count()
workers = min((cpu_count * 2) + 1, 16)  # Balanced for enterprise, cap at 16 workers
worker_class = "eventlet"
worker_connections = 5000  # Increased for high concurrency
max_requests = 1000
max_requests_jitter = 100

# Timeouts
timeout = 300  # 5 minutes for long operations
keepalive = 5
graceful_timeout = 30

# Memory and performance
preload_app = True
worker_tmp_dir = "/dev/shm"  # Use RAM disk for better performance

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Process naming
proc_name = "versant_backend"

# Security
limit_request_line = 8192
limit_request_fields = 200
limit_request_field_size = 8192

# Performance tuning
worker_tmp_dir = "/dev/shm"
forwarded_allow_ips = "*"

# Eventlet specific settings
def when_ready(server):
    server.log.info("🚀 Enterprise Gunicorn server ready for 200-500 concurrent users")
    server.log.info(f"   Workers: {server.cfg.workers}")
    server.log.info(f"   Worker connections: {server.cfg.worker_connections}")
    server.log.info(f"   Max concurrent: {server.cfg.workers * server.cfg.worker_connections}")

def worker_int(worker):
    worker.log.info("Worker received INT or QUIT signal")

def pre_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def post_fork(server, worker):
    server.log.info(f"Worker spawned (pid: {worker.pid})")

def worker_abort(worker):
    worker.log.info(f"Worker received SIGABRT signal")
