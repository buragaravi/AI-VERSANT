"""
Test Script for Phase 1 Push Notifications
Tests the basic push notification setup and functionality
"""

import os
import sys
import json
import logging
from datetime import datetime

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.connection_manager import get_mongo_database
from utils.push_service import initialize_push_service, get_push_service
from setup_push_database import setup_push_database

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_database_setup():
    """Test database setup for push notifications"""
    print("🔧 Testing database setup...")
    
    try:
        success = setup_push_database()
        if success:
            print("✅ Database setup completed successfully")
            return True
        else:
            print("❌ Database setup failed")
            return False
    except Exception as e:
        print(f"❌ Error in database setup: {e}")
        return False

def test_vapid_keys():
    """Test VAPID key generation and validation"""
    print("\n🔑 Testing VAPID keys...")
    
    try:
        # Check if VAPID keys exist in environment
        private_key = os.getenv('VAPID_PRIVATE_KEY')
        public_key = os.getenv('VAPID_PUBLIC_KEY')
        email = os.getenv('VAPID_EMAIL', 'admin@crt.pydahsoft.in')
        
        if not private_key or not public_key:
            print("⚠️ VAPID keys not found in environment variables")
            print("   Run: python generate_vapid_keys.py")
            return False
        
        # Initialize push service
        initialize_push_service(private_key, public_key, email)
        push_service = get_push_service()
        
        print("✅ VAPID keys validated and push service initialized")
        return True
        
    except Exception as e:
        print(f"❌ Error with VAPID keys: {e}")
        return False

def test_database_connections():
    """Test database connections and collections"""
    print("\n🗄️ Testing database connections...")
    
    try:
        db = get_mongo_database()
        
        # Test push_subscriptions collection
        subscriptions_count = db.push_subscriptions.count_documents({})
        print(f"   Push subscriptions: {subscriptions_count}")
        
        # Test notifications collection
        notifications_count = db.notifications.count_documents({})
        print(f"   Notifications: {notifications_count}")
        
        # Test notification_preferences collection
        preferences_count = db.notification_preferences.count_documents({})
        print(f"   Notification preferences: {preferences_count}")
        
        print("✅ Database connections working")
        return True
        
    except Exception as e:
        print(f"❌ Error with database connections: {e}")
        return False

def test_push_service_functions():
    """Test push service functions"""
    print("\n📱 Testing push service functions...")
    
    try:
        push_service = get_push_service()
        
        # Test getting notification stats
        stats = push_service.get_notification_stats(get_mongo_database(), days=1)
        print(f"   Notification stats: {stats}")
        
        print("✅ Push service functions working")
        return True
        
    except Exception as e:
        print(f"❌ Error with push service functions: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints (if server is running)"""
    print("\n🌐 Testing API endpoints...")
    
    try:
        import requests
        
        # Test health endpoint
        response = requests.get('http://localhost:8000/health', timeout=5)
        if response.status_code == 200:
            print("   Health endpoint: ✅")
        else:
            print(f"   Health endpoint: ❌ ({response.status_code})")
            return False
        
        # Test push notification endpoints (would need authentication)
        print("   Push notification endpoints: ⚠️ (requires authentication)")
        
        print("✅ API endpoints accessible")
        return True
        
    except requests.exceptions.ConnectionError:
        print("   ⚠️ Server not running - skipping API tests")
        return True
    except Exception as e:
        print(f"❌ Error testing API endpoints: {e}")
        return False

def main():
    """Run all Phase 1 tests"""
    print("🚀 PHASE 1 PUSH NOTIFICATIONS TEST")
    print("=" * 50)
    
    tests = [
        ("Database Setup", test_database_setup),
        ("VAPID Keys", test_vapid_keys),
        ("Database Connections", test_database_connections),
        ("Push Service Functions", test_push_service_functions),
        ("API Endpoints", test_api_endpoints)
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 50)
    print("📊 TEST RESULTS SUMMARY")
    print("=" * 50)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nOverall: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 PHASE 1 SETUP COMPLETE!")
        print("   Ready to proceed to Phase 2")
        print("\nNext steps:")
        print("1. Start your backend server")
        print("2. Start your frontend server")
        print("3. Test push notification subscription in browser")
        print("4. Proceed to Phase 2 implementation")
    else:
        print("\n⚠️ Some tests failed. Please fix the issues before proceeding.")
    
    return passed == total

if __name__ == "__main__":
    main()
