@echo off
echo 🚀 Starting VERSANT Backend in Development Mode with Async Features
echo ================================================================

REM Set environment variables for development
set FLASK_DEBUG=True
set DEV_MODE=True
set PYTHONUNBUFFERED=1

REM Start the development server with async features
python main.py

pause
