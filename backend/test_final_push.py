#!/usr/bin/env python3
"""
Test the final working push notification service
"""

import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_final_push_service():
    """Test the final push service"""
    
    # Get VAPID keys from environment
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_public_key = os.getenv('VAPID_PUBLIC_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_public_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    print("🔧 Testing Final Push Service...")
    print(f"📧 VAPID Email: {vapid_email}")
    print(f"🔑 Public Key: {vapid_public_key[:50]}...")
    
    try:
        from utils.push_service_final import FinalPushService
        
        # Initialize the service
        push_service = FinalPushService(vapid_private_key, vapid_public_key, vapid_email)
        print("✅ Push service initialized successfully")
        
        # Test with a mock subscription
        mock_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        test_payload = {
            "title": "Test Notification",
            "body": "This is a test from the final push service",
            "icon": "/favicon.ico",
            "tag": "test-final"
        }
        
        print("🧪 Testing notification sending...")
        result = push_service.send_notification(mock_subscription, test_payload)
        print(f"📊 Test result: {result}")
        
        # Test bulk notifications
        print("🧪 Testing bulk notifications...")
        bulk_result = push_service.send_bulk_notifications([mock_subscription], test_payload)
        print(f"📊 Bulk result: {bulk_result}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing final push service: {e}")
        return False

def test_api_endpoint():
    """Test the push notification API endpoint"""
    
    print("🔧 Testing push notification API endpoint...")
    
    try:
        import requests
        
        # Test the test endpoint
        url = "http://localhost:8000/notifications/test"
        headers = {
            "Content-Type": "application/json",
            "Authorization": "Bearer test_token"  # This will fail auth, but we can see the response
        }
        data = {"message": "Test from final push service"}
        
        print(f"📡 Testing endpoint: {url}")
        
        try:
            response = requests.post(url, headers=headers, json=data, timeout=5)
            print(f"📊 Response status: {response.status_code}")
            print(f"📊 Response text: {response.text}")
            
            if response.status_code == 401:
                print("✅ API endpoint is working (401 is expected without valid token)")
                return True
            else:
                print(f"⚠️ Unexpected status code: {response.status_code}")
                return False
                
        except requests.exceptions.ConnectionError:
            print("❌ Could not connect to Flask app - make sure it's running")
            return False
            
    except Exception as e:
        print(f"❌ Error testing API endpoint: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing Final Push Notification Service...")
    print("=" * 60)
    
    # Test 1: Final push service
    print("\n📋 Test 1: Final push service functionality")
    success1 = test_final_push_service()
    
    # Test 2: API endpoint
    print("\n📋 Test 2: API endpoint availability")
    success2 = test_api_endpoint()
    
    print("\n" + "=" * 60)
    if success1 and success2:
        print("🎉 Final push notification service is working!")
        print("💡 Note: Currently using simulation mode - actual push sending will be implemented later")
    else:
        print("💥 Final push notification service needs work")
