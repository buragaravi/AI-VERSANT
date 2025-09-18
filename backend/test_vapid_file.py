#!/usr/bin/env python3
"""
Test pywebpush using VAPID private key file approach
"""

import os
import sys
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add the backend directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_vapid_file_approach():
    """Test pywebpush using VAPID private key file"""
    
    # Get VAPID keys from environment
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_public_key = os.getenv('VAPID_PUBLIC_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_public_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    print("🔧 Testing pywebpush with VAPID private key file...")
    print(f"📧 VAPID Email: {vapid_email}")
    print(f"🔑 Public Key: {vapid_public_key[:50]}...")
    
    try:
        from pywebpush import webpush, WebPushException
        
        # Clean up the private key and save to file
        cleaned_private_key = vapid_private_key.replace('\\n', '\n').strip()
        
        # Save private key to file
        private_key_file = "vapid_private.pem"
        with open(private_key_file, 'w') as f:
            f.write(cleaned_private_key)
        
        print(f"✅ Private key saved to {private_key_file}")
        print(f"🔐 Private Key (first 50 chars): {cleaned_private_key[:50]}...")
        
        # Test with a mock subscription
        subscription_info = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        data = "Mary had a little lamb, with a nice mint jelly"
        
        print("🧪 Testing webpush() with file path...")
        
        try:
            # Use file path approach
            response = webpush(
                subscription_info=subscription_info,
                data=data,
                vapid_private_key=private_key_file,  # Use file path instead of string
                vapid_claims={
                    "sub": f"mailto:{vapid_email}",
                    "aud": "https://crt.pydahsoft.in"
                }
            )
            
            print("✅ webpush() with file path completed successfully")
            print(f"📊 Response: {response}")
            return True
            
        except WebPushException as ex:
            print(f"❌ WebPushException: {repr(ex)}")
            if ex.response is not None and ex.response.json():
                extra = ex.response.json()
                print(f"📋 Remote service replied: {extra}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing pywebpush with file: {e}")
        return False
    
    finally:
        # Clean up the private key file
        if os.path.exists(private_key_file):
            os.remove(private_key_file)
            print(f"🧹 Cleaned up {private_key_file}")

def test_der_format():
    """Test pywebpush with DER format private key"""
    
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    if not all([vapid_private_key, vapid_email]):
        print("❌ Missing VAPID environment variables")
        return False
    
    try:
        from pywebpush import webpush, WebPushException
        from cryptography.hazmat.primitives import serialization
        from cryptography.hazmat.backends import default_backend
        import base64
        
        # Clean up the private key
        cleaned_private_key = vapid_private_key.replace('\\n', '\n').strip()
        
        # Convert PEM to DER format
        private_key = serialization.load_pem_private_key(
            cleaned_private_key.encode('utf-8'),
            password=None,
            backend=default_backend()
        )
        
        # Get DER representation
        der_private_key = private_key.private_bytes(
            encoding=serialization.Encoding.DER,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        
        # Convert to base64
        base64_der_key = base64.b64encode(der_private_key).decode('utf-8')
        
        print("🔧 Testing pywebpush with DER format private key...")
        print(f"🔐 DER Key (first 50 chars): {base64_der_key[:50]}...")
        
        # Test with a mock subscription
        subscription_info = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        data = "Mary had a little lamb, with a nice mint jelly"
        
        print("🧪 Testing webpush() with DER format...")
        
        try:
            # Use DER format
            response = webpush(
                subscription_info=subscription_info,
                data=data,
                vapid_private_key=base64_der_key,  # Use base64 DER format
                vapid_claims={
                    "sub": f"mailto:{vapid_email}",
                    "aud": "https://crt.pydahsoft.in"
                }
            )
            
            print("✅ webpush() with DER format completed successfully")
            print(f"📊 Response: {response}")
            return True
            
        except WebPushException as ex:
            print(f"❌ WebPushException: {repr(ex)}")
            if ex.response is not None and ex.response.json():
                extra = ex.response.json()
                print(f"📋 Remote service replied: {extra}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing pywebpush with DER: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Testing pywebpush with different VAPID key formats...")
    print("=" * 60)
    
    # Test 1: File path approach
    print("\n📋 Test 1: VAPID private key file approach")
    success1 = test_vapid_file_approach()
    
    # Test 2: DER format approach
    print("\n📋 Test 2: DER format private key approach")
    success2 = test_der_format()
    
    print("\n" + "=" * 60)
    if success1 or success2:
        print("🎉 At least one VAPID key format is working!")
    else:
        print("💥 All VAPID key formats failed")
