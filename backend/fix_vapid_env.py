#!/usr/bin/env python3
"""
Fix VAPID keys in .env file
"""

import os
import re

def fix_vapid_env():
    """Fix VAPID keys in .env file"""
    
    # Read the correct keys from vapid_keys.json
    with open('vapid_keys.json', 'r') as f:
        keys_data = json.load(f)
    
    new_private_key = keys_data['private_key']
    new_public_key = keys_data['public_key']
    new_email = keys_data['email']
    
    # Read current .env file
    with open('.env', 'r') as f:
        content = f.read()
    
    # Find and replace the VAPID section
    vapid_section = f'''# VAPID KEYS FOR PUSH NOTIFICATIONS
VAPID_PRIVATE_KEY="{new_private_key}"
VAPID_PUBLIC_KEY={new_public_key}
VAPID_EMAIL={new_email}'''
    
    # Replace the entire VAPID section
    pattern = r'# VAPID KEYS FOR PUSH NOTIFICATIONS.*?VAPID_EMAIL=.*?'
    content = re.sub(pattern, vapid_section, content, flags=re.DOTALL)
    
    # Write back to .env file
    with open('.env', 'w') as f:
        f.write(content)
    
    print("✅ .env file fixed with proper VAPID keys")
    print(f"📧 Email: {new_email}")
    print(f"🔑 Public Key: {new_public_key}")
    print(f"🔐 Private Key (first 50 chars): {new_private_key[:50]}...")

if __name__ == "__main__":
    import json
    fix_vapid_env()
