"""
VAPID Key Generation Script
Generates VAPID keys for Web Push API
"""

import base64
import json
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.backends import default_backend

def generate_vapid_keys():
    """Generate VAPID key pair for Web Push API"""
    try:
        # Generate private key
        private_key = ec.generate_private_key(ec.SECP256R1(), default_backend())
        
        # Get public key
        public_key = private_key.public_key()
        
        # Serialize private key to PEM format
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        # Get public key in uncompressed format
        public_numbers = public_key.public_numbers()
        x = public_numbers.x
        y = public_numbers.y
        
        # Convert to bytes (32 bytes each for x and y coordinates)
        x_bytes = x.to_bytes(32, 'big')
        y_bytes = y.to_bytes(32, 'big')
        
        # Combine x and y coordinates
        uncompressed_public_key = b'\x04' + x_bytes + y_bytes
        
        # Encode to base64url (without padding)
        public_key_b64 = base64.urlsafe_b64encode(uncompressed_public_key).decode('utf-8').rstrip('=')
        
        print("🔑 VAPID Keys Generated Successfully!")
        print("=" * 50)
        print(f"Private Key (PEM):")
        print(private_pem)
        print("\n" + "=" * 50)
        print(f"Public Key (Base64URL):")
        print(public_key_b64)
        print("\n" + "=" * 50)
        
        # Save to file
        keys_data = {
            'private_key': private_pem,
            'public_key': public_key_b64,
            'email': 'team@pydahsoft.in'
        }
        
        with open('vapid_keys.json', 'w') as f:
            json.dump(keys_data, f, indent=2)
        
        print("✅ Keys saved to 'vapid_keys.json'")
        print("\n📋 Next Steps:")
        print("1. Add the public key to your frontend .env file:")
        print(f"   REACT_APP_VAPID_PUBLIC_KEY={public_key_b64}")
        print("2. Add the private key to your backend .env file:")
        print(f"   VAPID_PRIVATE_KEY='{private_pem}'")
        print("3. Set the VAPID email in your backend .env file:")
        print("   VAPID_EMAIL=team@pydahsoft.in")
        
        return keys_data
        
    except Exception as e:
        print(f"❌ Error generating VAPID keys: {e}")
        return None

if __name__ == "__main__":
    generate_vapid_keys()
