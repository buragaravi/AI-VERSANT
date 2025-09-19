#!/usr/bin/env python3
"""
Update .env file with new VAPID keys
"""

import os
import re

def update_env_file():
    """Update .env file with new VAPID keys"""
    
    # Read the new keys from vapid_keys.json
    with open('vapid_keys.json', 'r') as f:
        keys_data = json.load(f)
    
    new_private_key = keys_data['private_key']
    new_public_key = keys_data['public_key']
    new_email = keys_data['email']
    
    # Read current .env file
    with open('.env', 'r') as f:
        content = f.read()
    
    # Update VAPID private key
    content = re.sub(
        r'VAPID_PRIVATE_KEY=".*?"',
        f'VAPID_PRIVATE_KEY="{new_private_key}"',
        content
    )
    
    # Update VAPID public key
    content = re.sub(
        r'VAPID_PUBLIC_KEY=.*',
        f'VAPID_PUBLIC_KEY={new_public_key}',
        content
    )
    
    # Update VAPID email
    content = re.sub(
        r'VAPID_EMAIL=.*',
        f'VAPID_EMAIL={new_email}',
        content
    )
    
    # Write back to .env file
    with open('.env', 'w') as f:
        f.write(content)
    
    print("✅ .env file updated with new VAPID keys")

if __name__ == "__main__":
    import json
    update_env_file()
