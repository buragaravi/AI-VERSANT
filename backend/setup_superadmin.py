#!/usr/bin/env python3
"""
Script to create the initial super admin user for VERSANT system
"""

import bcrypt
import os
from datetime import datetime
from config.database import DatabaseConfig
from dotenv import load_dotenv

load_dotenv()

def create_super_admin():
    """Create the initial super admin user"""
    
    # Super admin credentials
    super_admin_data = {
        "username": "superadmin",
        "email": "superadmin@versant.com",
        "name": "Super Administrator",
        "first_name": "Super",
        "last_name": "Administrator",
        "role": "super_admin",
        "is_active": True,
        "is_verified": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "permissions": [
            "manage_users",
            "manage_campuses", 
            "manage_courses",
            "manage_tests",
            "view_analytics",
            "manage_system_settings"
        ],
        "profile": {
            "phone": "+1-555-0123",
            "department": "System Administration",
            "position": "Super Administrator"
        }
    }
    
    try:
        # Get database connection
        db = DatabaseConfig.get_database()
        users_collection = db['users']
        
        # Remove any existing superadmin with this username or email (for re-setup)
        users_collection.delete_many({
            "$or": [
                {"email": "superadmin@versant.com"},
                {"username": "superadmin"}
            ]
        })
        
        # Hash the password and store as 'password_hash'
        password = "Versant@2025".encode('utf-8')
        hashed_password = bcrypt.hashpw(password, bcrypt.gensalt())
        super_admin_data["password_hash"] = hashed_password.decode('utf-8')
        
        # Insert super admin into database
        result = users_collection.insert_one(super_admin_data)
        
        print("✅ Super Admin created successfully!")
        print("=" * 50)
        print("🔑 LOGIN CREDENTIALS:")
        print(f"Username: {super_admin_data['username']} (use this for login)")
        print(f"Email: {super_admin_data['email']} (login by email is not supported by default)")
        print(f"Password: Versant@2024")
        print("=" * 50)
        print("⚠️  IMPORTANT: Change the password after first login!")
        print("=" * 50)
        
        return super_admin_data
        
    except Exception as e:
        print(f"❌ Error creating super admin: {e}")
        return None

if __name__ == "__main__":
    print("🚀 Setting up VERSANT System...")
    print("=" * 50)
    
    # Create super admin
    admin = create_super_admin()
    
    if admin:
        print("\n🎉 VERSANT System setup completed!")
        print("=" * 50)
        print("📋 NEXT STEPS:")
        print("1. Start the backend server: python main.py")
        print("2. Start the frontend server: npm run dev (in frontend directory)")
        print("3. Login with super admin credentials")
        print("4. Create additional users and configure the system")
        print("=" * 50)
    else:
        print("❌ Setup failed. Please check the error messages above.") 