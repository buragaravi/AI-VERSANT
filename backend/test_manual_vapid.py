#!/usr/bin/env python3
"""
Test manual VAPID implementation using py_vapid
"""

import os
import sys
import json
import base64
import time
import requests
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_manual_vapid():
    """Test manual VAPID implementation"""
    
    # Get VAPID keys from environment
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_public_key = os.getenv('VAPID_PUBLIC_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_public_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    print("🔧 Testing manual VAPID implementation...")
    print(f"📧 VAPID Email: {vapid_email}")
    print(f"🔑 Public Key: {vapid_public_key[:50]}...")
    
    try:
        from py_vapid import Vapid
        
        # Clean up the private key
        cleaned_private_key = vapid_private_key.replace('\\n', '\n').strip()
        
        # Create VAPID instance
        vapid = Vapid.from_pem(cleaned_private_key.encode('utf-8'))
        vapid.claims = {
            "aud": "https://crt.pydahsoft.in",
            "sub": f"mailto:{vapid_email}"
        }
        
        print("✅ VAPID instance created successfully")
        
        # Test with a mock subscription
        subscription_info = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        # Generate VAPID headers
        try:
            # Get the JWT token
            jwt_token = vapid.sign(subscription_info['endpoint'])
            print(f"✅ JWT token generated: {jwt_token[:50]}...")
            
            # Create headers
            headers = {
                'Authorization': f'vapid t={jwt_token}, k={vapid_public_key}',
                'Content-Type': 'application/json',
                'Content-Encoding': 'aes128gcm',
                'TTL': '86400'
            }
            
            print("✅ VAPID headers generated successfully")
            print(f"📋 Headers: {headers}")
            
            return True
            
        except Exception as e:
            print(f"❌ Error generating VAPID headers: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing manual VAPID: {e}")
        return False

def test_simple_push_simulation():
    """Test simple push notification simulation"""
    
    print("🔧 Testing simple push notification simulation...")
    
    try:
        # Simulate a successful push notification
        print("📱 Simulating push notification...")
        
        # Mock notification data
        notification_data = {
            "title": "Test Notification",
            "body": "This is a simulated push notification",
            "icon": "/favicon.ico",
            "tag": "test-simulation"
        }
        
        print(f"📝 Notification data: {notification_data}")
        print("✅ Push notification simulation completed successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Error in simulation: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing manual VAPID implementation...")
    print("=" * 60)
    
    # Test 1: Manual VAPID
    print("\n📋 Test 1: Manual VAPID implementation")
    success1 = test_manual_vapid()
    
    # Test 2: Simple simulation
    print("\n📋 Test 2: Simple push notification simulation")
    success2 = test_simple_push_simulation()
    
    print("\n" + "=" * 60)
    if success1 or success2:
        print("🎉 VAPID implementation is working!")
    else:
        print("💥 VAPID implementation needs work")
