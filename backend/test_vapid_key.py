#!/usr/bin/env python3
"""
Test VAPID key format and pywebpush compatibility
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def test_vapid_key():
    """Test VAPID key format"""
    
    vapid_private_key = os.getenv('VAPID_PRIVATE_KEY')
    vapid_public_key = os.getenv('VAPID_PUBLIC_KEY')
    vapid_email = os.getenv('VAPID_EMAIL')
    
    print("🔍 Testing VAPID Key Format...")
    print(f"📧 Email: {vapid_email}")
    print(f"🔑 Public Key: {vapid_public_key}")
    print(f"🔐 Private Key (first 100 chars): {vapid_private_key[:100]}...")
    
    # Test 1: Check if private key has proper format
    if not vapid_private_key.startswith('-----BEGIN PRIVATE KEY-----'):
        print("❌ Private key doesn't start with proper PEM header")
        return False
    
    if not vapid_private_key.endswith('-----END PRIVATE KEY-----'):
        print("❌ Private key doesn't end with proper PEM footer")
        return False
    
    print("✅ Private key has proper PEM format")
    
    # Test 2: Check newline handling
    if '\\n' in vapid_private_key:
        print("⚠️ Private key contains escaped newlines")
        cleaned_key = vapid_private_key.replace('\\n', '\n')
        print(f"🔧 Cleaned key (first 100 chars): {cleaned_key[:100]}...")
    else:
        print("✅ Private key has proper newlines")
        cleaned_key = vapid_private_key
    
    # Test 3: Try to use with py_vapid
    try:
        from py_vapid import Vapid
        vapid = Vapid.from_pem(cleaned_key.encode('utf-8'))
        print("✅ VAPID key works with py_vapid")
        
        # Set claims
        vapid.claims = {
            "aud": "https://crt.pydahsoft.in",
            "sub": f"mailto:{vapid_email}"
        }
        print("✅ VAPID claims set successfully")
        
    except Exception as e:
        print(f"❌ Error with py_vapid: {e}")
        return False
    
    # Test 4: Try to use with pywebpush
    try:
        from pywebpush import webpush
        
        # Create a mock subscription
        mock_subscription = {
            "endpoint": "https://fcm.googleapis.com/fcm/send/test",
            "keys": {
                "p256dh": "test_p256dh_key",
                "auth": "test_auth_key"
            }
        }
        
        # This will fail due to invalid subscription, but we can see if the key is accepted
        try:
            response = webpush(
                subscription_info=mock_subscription,
                data='{"title":"Test"}',
                vapid_private_key=cleaned_key,
                vapid_claims={
                    "sub": f"mailto:{vapid_email}",
                    "aud": "https://crt.pydahsoft.in"
                }
            )
            print("✅ pywebpush accepted the VAPID key")
        except Exception as e:
            if "Could not deserialize key data" in str(e):
                print(f"❌ pywebpush rejected the VAPID key: {e}")
                return False
            else:
                print(f"✅ pywebpush accepted the VAPID key (expected error: {e})")
        
    except Exception as e:
        print(f"❌ Error importing pywebpush: {e}")
        return False
    
    return True

if __name__ == "__main__":
    success = test_vapid_key()
    if success:
        print("🎉 VAPID key format test passed")
    else:
        print("💥 VAPID key format test failed")
