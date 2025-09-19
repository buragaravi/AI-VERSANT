#!/usr/bin/env python3
"""
Test script for the working push notification service
"""

import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.push_service_working import WorkingPushService

def test_working_push_service():
    """Test the working push service"""
    
    # Get VAPID keys from environment
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_public_key = os.getenv('VAPID_PUBLIC_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_public_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    print("🔧 Testing Working Push Service...")
    print(f"📧 VAPID Email: {vapid_email}")
    print(f"🔑 Public Key: {vapid_public_key[:50]}...")
    
    try:
        # Initialize the service
        push_service = WorkingPushService(vapid_private_key, vapid_public_key, vapid_email)
        print("✅ Push service initialized successfully")
        
        # Test with a mock subscription (this won't actually send)
        mock_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        test_payload = {
            "title": "Test Notification",
            "body": "This is a test from the working push service",
            "icon": "/favicon.ico",
            "tag": "test-working"
        }
        
        print("🧪 Testing notification sending...")
        # This will likely fail due to invalid subscription, but we can see the error
        result = push_service.send_notification(mock_subscription, test_payload)
        print(f"📊 Test result: {result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing push service: {e}")
        return False

if __name__ == "__main__":
    success = test_working_push_service()
    if success:
        print("🎉 Working push service test completed")
    else:
        print("💥 Working push service test failed")
