#!/bin/bash

# Simple startup script for Study Edge Backend on AWS EC2
# Use this for immediate deployment without full setup

echo "🚀 Starting Study Edge Backend on AWS EC2..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies if needed
if [ ! -f "venv/lib/python3.*/site-packages/flask" ]; then
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Install Gunicorn if not installed
pip install gunicorn

# Set environment variables
export FLASK_ENV=production
export PORT=8000

# Start with optimized Gunicorn configuration
echo "Starting Gunicorn with EC2 optimized configuration..."
gunicorn --config gunicorn_ec2_optimized.py application:application
