#!/usr/bin/env python3
"""
Test pywebpush with real subscription data from frontend
"""

import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_with_real_subscription():
    """Test pywebpush with real subscription data"""
    
    # Get VAPID keys from environment
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_public_key = os.getenv('VAPID_PUBLIC_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_public_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    print("🔧 Testing pywebpush with real subscription data...")
    print(f"📧 VAPID Email: {vapid_email}")
    print(f"🔑 Public Key: {vapid_public_key[:50]}...")
    
    try:
        from pywebpush import webpush, WebPushException
        from mongo import mongo_db
        
        # Clean up the private key
        cleaned_private_key = vapid_private_key.replace('\\n', '\n').strip()
        
        # Get real subscription from database
        db = mongo_db.db
        subscriptions = db.push_subscriptions.find({'active': True}).limit(1)
        subscription_list = list(subscriptions)
        
        if not subscription_list:
            print("⚠️ No active subscriptions found in database")
            print("💡 Please subscribe to push notifications from the frontend first")
            return False
        
        subscription = subscription_list[0]
        print(f"📱 Found subscription for user: {subscription.get('user_id', 'unknown')}")
        print(f"🔗 Endpoint: {subscription.get('endpoint', 'unknown')[:50]}...")
        
        # Test data
        data = json.dumps({
            "title": "Test Notification",
            "body": "This is a test from the working push service",
            "icon": "/favicon.ico",
            "tag": "test-real"
        })
        
        print("🧪 Testing webpush() with real subscription...")
        
        try:
            # Use real subscription data
            response = webpush(
                subscription_info={
                    "endpoint": subscription['endpoint'],
                    "keys": subscription['keys']
                },
                data=data,
                vapid_private_key=cleaned_private_key,
                vapid_claims={
                    "sub": f"mailto:{vapid_email}",
                    "aud": "https://crt.pydahsoft.in"
                }
            )
            
            print("✅ webpush() with real subscription completed successfully")
            print(f"📊 Response: {response}")
            return True
            
        except WebPushException as ex:
            print(f"❌ WebPushException: {repr(ex)}")
            if ex.response is not None and ex.response.json():
                extra = ex.response.json()
                print(f"📋 Remote service replied: {extra}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing pywebpush with real subscription: {e}")
        return False

def test_with_valid_mock_subscription():
    """Test pywebpush with a valid mock subscription format"""
    
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    try:
        from pywebpush import webpush, WebPushException
        import base64
        
        # Clean up the private key
        cleaned_private_key = vapid_private_key.replace('\\n', '\n').strip()
        
        # Create a valid mock subscription with proper base64 keys
        # These are dummy keys but in the correct format
        mock_p256dh = base64.urlsafe_b64encode(b"dummy_p256dh_key_32_bytes_long").decode('utf-8').rstrip('=')
        mock_auth = base64.urlsafe_b64encode(b"dummy_auth_key_16_bytes").decode('utf-8').rstrip('=')
        
        subscription_info = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/dummy_endpoint",
            "keys": {
                "p256dh": mock_p256dh,
                "auth": mock_auth
            }
        }
        
        print("🔧 Testing pywebpush with valid mock subscription...")
        print(f"🔑 Mock p256dh: {mock_p256dh}")
        print(f"🔑 Mock auth: {mock_auth}")
        
        data = json.dumps({
            "title": "Test Notification",
            "body": "This is a test with valid mock subscription",
            "icon": "/favicon.ico",
            "tag": "test-valid-mock"
        })
        
        print("🧪 Testing webpush() with valid mock subscription...")
        
        try:
            response = webpush(
                subscription_info=subscription_info,
                data=data,
                vapid_private_key=cleaned_private_key,
                vapid_claims={
                    "sub": f"mailto:{vapid_email}",
                    "aud": "https://crt.pydahsoft.in"
                }
            )
            
            print("✅ webpush() with valid mock subscription completed successfully")
            print(f"📊 Response: {response}")
            return True
            
        except WebPushException as ex:
            print(f"❌ WebPushException: {repr(ex)}")
            if ex.response is not None and ex.response.json():
                extra = ex.response.json()
                print(f"📋 Remote service replied: {extra}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing pywebpush with valid mock: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing pywebpush with real and valid mock subscriptions...")
    print("=" * 60)
    
    # Test 1: Real subscription from database
    print("\n📋 Test 1: Real subscription from database")
    success1 = test_with_real_subscription()
    
    # Test 2: Valid mock subscription
    print("\n📋 Test 2: Valid mock subscription format")
    success2 = test_with_valid_mock_subscription()
    
    print("\n" + "=" * 60)
    if success1 or success2:
        print("🎉 Push notifications are working!")
    else:
        print("💥 Push notifications still need work")
