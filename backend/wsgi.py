#!/usr/bin/env python3
"""
WSGI entry point for production deployment
"""
from main import app, socketio

if __name__ == '__main__':
    socketio.run(app)