@echo off
echo 🎓 VERSANT Student Notification Manager
echo =====================================
echo.
echo Starting the notification manager...
echo.

REM Check if Python is available
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    echo Please install Python and try again
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "manual_student_notifications.py" (
    echo ❌ Please run this script from the backend directory
    echo Current directory: %CD%
    pause
    exit /b 1
)

REM Run the notification manager
python manual_student_notifications.py

echo.
echo Press any key to exit...
pause >nul
