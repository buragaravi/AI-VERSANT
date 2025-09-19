"""
Test Push Notification Endpoints
Quick test script to verify push notification API endpoints
"""

import requests
import json

def test_push_endpoints():
    """Test push notification endpoints"""
    base_url = "http://localhost:8000"
    
    print("🧪 Testing Push Notification Endpoints")
    print("=" * 50)
    
    # Test 1: Health Check
    print("\n1. Testing Health Check...")
    try:
        response = requests.get(f"{base_url}/health")
        if response.status_code == 200:
            print("✅ Health check passed")
        else:
            print(f"❌ Health check failed: {response.status_code}")
    except Exception as e:
        print(f"❌ Health check error: {e}")
    
    # Test 2: Push Notification Status (without auth - should fail)
    print("\n2. Testing Push Notification Status (no auth)...")
    try:
        response = requests.get(f"{base_url}/api/notifications/status")
        if response.status_code == 401:
            print("✅ Authentication required (expected)")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 3: Push Notification Stats (without auth - should fail)
    print("\n3. Testing Push Notification Stats (no auth)...")
    try:
        response = requests.get(f"{base_url}/api/notifications/stats")
        if response.status_code == 401:
            print("✅ Authentication required (expected)")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    # Test 4: Test Notification (without auth - should fail)
    print("\n4. Testing Test Notification (no auth)...")
    try:
        response = requests.post(f"{base_url}/api/notifications/test", 
                               json={"message": "Test message"})
        if response.status_code == 401:
            print("✅ Authentication required (expected)")
        else:
            print(f"❌ Unexpected response: {response.status_code}")
    except Exception as e:
        print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🎉 Push Notification Endpoints Test Complete!")
    print("\nNext steps:")
    print("1. Open http://localhost:3000/test/push-notifications")
    print("2. Login to the application")
    print("3. Test push notification subscription")
    print("4. Send test notifications")

if __name__ == "__main__":
    test_push_endpoints()
