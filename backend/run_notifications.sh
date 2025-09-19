#!/bin/bash

echo "🎓 VERSANT Student Notification Manager"
echo "====================================="
echo ""
echo "Starting the notification manager..."
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    if ! command -v python &> /dev/null; then
        echo "❌ Python is not installed or not in PATH"
        echo "Please install Python and try again"
        exit 1
    else
        PYTHON_CMD="python"
    fi
else
    PYTHON_CMD="python3"
fi

# Check if we're in the right directory
if [ ! -f "manual_student_notifications.py" ]; then
    echo "❌ Please run this script from the backend directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

# Run the notification manager
$PYTHON_CMD manual_student_notifications.py

echo ""
echo "Press Enter to exit..."
read
