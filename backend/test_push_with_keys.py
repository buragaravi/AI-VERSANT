"""
Test Push Notifications with VAPID Keys
Sets environment variables and tests the push service
"""

import os
import sys
import json
import logging
from datetime import datetime

# Set VAPID keys as environment variables
os.environ['VAPID_PRIVATE_KEY'] = """-----BEGIN PRIVATE KEY-----
MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgYD8NtAQyo5R+TMOX
fyWk7VKGa8ZwcrgDMKTRgsvzoZ2hRANCAARkg0lfpxUIMW9OtEFA46IBny+rFBEA
p8zTuMeKM330WN5IJmxlL+HvJwdaO9qj/b3kZd7H5jXJQuZfvi/vv1iu
-----END PRIVATE KEY-----"""

os.environ['VAPID_PUBLIC_KEY'] = "BGSDSV-nFQgxb060QUDjogGfL6sUEQCnzNO4x4ozffRY3kgmbGUv4e8nB1o72qP9veRl3sfmNclC5l--L--_WK4"
os.environ['VAPID_EMAIL'] = "admin@crt.pydahsoft.in"

# Add the backend directory to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.connection_manager import get_mongo_database
from utils.push_service import initialize_push_service, get_push_service

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_push_service_with_keys():
    """Test push service with VAPID keys"""
    print("🔑 Testing Push Service with VAPID Keys...")
    
    try:
        # Initialize push service
        initialize_push_service(
            os.environ['VAPID_PRIVATE_KEY'],
            os.environ['VAPID_PUBLIC_KEY'],
            os.environ['VAPID_EMAIL']
        )
        
        print("✅ Push service initialized successfully")
        
        # Get push service instance
        push_service = get_push_service()
        print("✅ Push service instance created")
        
        # Test getting notification stats
        db = get_mongo_database()
        stats = push_service.get_notification_stats(db, days=1)
        print(f"📊 Notification stats: {stats}")
        
        print("✅ Push service functions working correctly")
        return True
        
    except Exception as e:
        print(f"❌ Error testing push service: {e}")
        return False

def test_database_operations():
    """Test database operations for push notifications"""
    print("\n🗄️ Testing Database Operations...")
    
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
        
        print("✅ Database operations working")
        return True
        
    except Exception as e:
        print(f"❌ Error with database operations: {e}")
        return False

def main():
    """Run the test with VAPID keys"""
    print("🚀 PUSH NOTIFICATIONS TEST WITH VAPID KEYS")
    print("=" * 50)
    
    tests = [
        ("Push Service with Keys", test_push_service_with_keys),
        ("Database Operations", test_database_operations)
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
        print("   Push notifications are ready!")
        print("\nNext steps:")
        print("1. Add VAPID keys to your .env file")
        print("2. Start your backend server")
        print("3. Start your frontend server")
        print("4. Test push notification subscription in browser")
    else:
        print("\n⚠️ Some tests failed. Please check the errors above.")
    
    return passed == total

if __name__ == "__main__":
    main()
