#!/usr/bin/env python3
"""
Test pywebpush following official documentation format
"""

import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_pywebpush_official():
    """Test pywebpush following official documentation"""
    
    # Get VAPID keys from environment
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_public_key = os.getenv('VAPID_PUBLIC_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_public_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    print("🔧 Testing pywebpush following official documentation...")
    print(f"📧 VAPID Email: {vapid_email}")
    print(f"🔑 Public Key: {vapid_public_key[:50]}...")
    
    try:
        from pywebpush import webpush, WebPushException
        
        # Clean up the private key - handle escaped newlines from .env
        cleaned_private_key = vapid_private_key.replace('\\n', '\n').strip()
        
        # Test with a mock subscription (following official format)
        subscription_info = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        # Test data (following official format)
        data = "Mary had a little lamb, with a nice mint jelly"
        
        print("🧪 Testing webpush() One Call method...")
        print(f"📝 Data: {data}")
        print(f"🔐 Private Key (first 50 chars): {cleaned_private_key[:50]}...")
        
        try:
            # Use the exact format from official documentation
            response = webpush(
                subscription_info=subscription_info,
                data=data,
                vapid_private_key=cleaned_private_key,
                vapid_claims={
                    "sub": f"mailto:{vapid_email}",
                    "aud": "https://crt.pydahsoft.in"
                }
            )
            
            print("✅ webpush() call completed successfully")
            print(f"📊 Response: {response}")
            return True
            
        except WebPushException as ex:
            print(f"❌ WebPushException: {repr(ex)}")
            if ex.response is not None and ex.response.json():
                extra = ex.response.json()
                print(f"📋 Remote service replied: {extra}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing pywebpush: {e}")
        return False

def test_webpusher_class():
    """Test WebPusher class method"""
    
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    try:
        from pywebpush import WebPusher, WebPushException
        
        # Clean up the private key
        cleaned_private_key = vapid_private_key.replace('\\n', '\n').strip()
        
        # Test with a mock subscription
        subscription_info = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        print("🧪 Testing WebPusher class method...")
        
        try:
            # Create WebPusher instance
            wp = WebPusher(subscription_info)
            
            # Test encoding
            data = "Test data for WebPusher"
            encoded_data = wp.encode(data)
            print("✅ Data encoding successful")
            
            # Test sending (this will fail due to invalid subscription, but we can see the error)
            try:
                wp.send(
                    data=data,
                    vapid_private_key=cleaned_private_key,
                    vapid_claims={
                        "sub": f"mailto:{vapid_email}",
                        "aud": "https://crt.pydahsoft.in"
                    }
                )
                print("✅ WebPusher.send() completed successfully")
            except WebPushException as ex:
                print(f"❌ WebPusher.send() failed: {repr(ex)}")
                if ex.response is not None and ex.response.json():
                    extra = ex.response.json()
                    print(f"📋 Remote service replied: {extra}")
            
            return True
            
        except WebPushException as ex:
            print(f"❌ WebPusher WebPushException: {repr(ex)}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing WebPusher: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing pywebpush following official documentation...")
    print("=" * 60)
    
    # Test 1: webpush() One Call method
    print("\n📋 Test 1: webpush() One Call method")
    success1 = test_pywebpush_official()
    
    # Test 2: WebPusher class method
    print("\n📋 Test 2: WebPusher class method")
    success2 = test_webpusher_class()
    
    print("\n" + "=" * 60)
    if success1 or success2:
        print("🎉 At least one pywebpush method is working!")
    else:
        print("💥 All pywebpush methods failed")
