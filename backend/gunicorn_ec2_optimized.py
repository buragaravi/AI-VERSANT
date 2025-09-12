#!/usr/bin/env python3
"""
Optimized Gunicorn configuration for AWS EC2 Free Tier
Designed to handle 100+ concurrent users on limited resources
"""

import os
import multiprocessing

# Server socket
port = os.getenv('PORT', '8000')
bind = f"0.0.0.0:{port}"

# Worker processes - Optimized for EC2 Free Tier (1 vCPU, 1GB RAM)
# Conservative settings to avoid memory issues
workers = min(multiprocessing.cpu_count() * 2, 4)  # Max 4 workers for free tier
worker_class = "sync"  # Use sync workers for better memory management
worker_connections = 1000  # Reduced for free tier

# Performance tuning for limited resources
max_requests = 500  # Restart workers after 500 requests to prevent memory leaks
max_requests_jitter = 50
timeout = 300  # 5 minutes for bulk operations (1000+ students)
keepalive = 5  # Reduced keepalive
graceful_timeout = 20

# Memory management for free tier
preload_app = False  # Disable preload to save memory
worker_tmp_dir = "/tmp"  # Use /tmp instead of /dev/shm
max_requests = 500  # Restart workers to prevent memory leaks

# Logging
accesslog = "-"
errorlog = "-"
loglevel = "info"
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(D)s'

# Security and performance limits for free tier
limit_request_line = 4096
limit_request_fields = 100
limit_request_field_size = 8192

# Memory limits
worker_memory_limit = 200 * 1024 * 1024  # 200MB per worker

def on_starting(server):
    print("🚀 Starting OPTIMIZED Study Edge Backend on AWS EC2...")
    print(f"   Port: {port}")
    print(f"   Workers: {workers}")
    print(f"   Worker Class: {worker_class}")
    print(f"   Worker Connections: {worker_connections}")
    print(f"   Max Requests: {max_requests}")
    print(f"   Timeout: {timeout}s")
    print(f"   Keepalive: {keepalive}s")
    print("   🎯 Target: 100+ concurrent users on EC2 Free Tier")
    print("   ⚡ Memory Optimized for 1GB RAM")

def on_reload(server):
    print("🔄 Reloading OPTIMIZED Study Edge Backend...")

def worker_int(worker):
    print(f"⚠️ Worker {worker.pid} received INT or QUIT signal")

def pre_fork(server, worker):
    print(f"🔧 Pre-forking worker {worker.age}")

def post_fork(server, worker):
    print(f"✅ Worker {worker.pid} spawned")

def worker_abort(worker):
    print(f"💥 Worker {worker.pid} aborted")

def on_exit(server):
    print("👋 OPTIMIZED Study Edge Backend shutting down...")
