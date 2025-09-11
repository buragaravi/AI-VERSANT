#!/bin/bash
echo "🚀 Starting VERSANT Backend in Development Mode with Async Features"
echo "================================================================"

# Set environment variables for development
export FLASK_DEBUG=True
export PYTHONUNBUFFERED=1

# Start the development server with async features
python dev_async_main.py
