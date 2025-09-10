#!/usr/bin/env python3
"""
Start Study Edge Backend with SMS Reminder System
Includes automated test reminders and SMS notifications
"""

import os
import sys
import time
import threading
from datetime import datetime

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def start_reminder_system():
    """Start the SMS reminder system in a separate thread"""
    try:
        from test_reminder_scheduler import start_reminder_system
        print("🔄 Starting SMS Reminder System...")
        start_reminder_system()
        print("✅ SMS Reminder System started successfully")
    except Exception as e:
        print(f"❌ Error starting SMS Reminder System: {e}")

def start_main_application():
    """Start the main Flask application"""
    try:
        from main import app, socketio
        
        print("🚀 Starting Study Edge Backend with SMS Reminders...")
        print("=" * 60)
        print("📱 SMS Features Enabled:")
        print("   - Student registration credentials")
        print("   - Test scheduled notifications")
        print("   - Automated test reminders")
        print("   - Course/Batch-based targeting")
        print("=" * 60)
        
        # Start the reminder system in a separate thread
        reminder_thread = threading.Thread(target=start_reminder_system, daemon=True)
        reminder_thread.start()
        
        # Wait a moment for reminder system to initialize
        time.sleep(2)
        
        # Start the main application
        port = int(os.environ.get("PORT", 8000))
        debug = os.environ.get("FLASK_DEBUG", "False").lower() == "true"
        
        print(f"🌐 Starting server on port {port}")
        print(f"🔧 Debug mode: {debug}")
        print("=" * 60)
        
        socketio.run(
            app, 
            host="0.0.0.0", 
            port=port, 
            debug=debug,
            use_reloader=debug,
            log_output=True
        )
        
    except Exception as e:
        print(f"❌ Error starting main application: {e}")
        sys.exit(1)

if __name__ == "__main__":
    start_main_application()
