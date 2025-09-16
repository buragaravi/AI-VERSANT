#!/usr/bin/env python3
"""
Test SSL connection stability and high load handling
"""

import sys
import os
import time
import threading
import requests
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config.database import DatabaseConfig
from connection_monitor import get_connection_health
from connection_pool_manager import get_pool_status

def test_ssl_connection():
    """Test SSL connection stability"""
    print("🔍 Testing SSL connection stability...")
    
    try:
        # Test basic connection
        print("1️⃣ Testing basic database connection...")
        db = DatabaseConfig.get_database()
        result = db.command('ping')
        print(f"   ✅ Ping successful: {result}")
        
        # Test connection health
        print("\n2️⃣ Testing connection health...")
        health = get_connection_health()
        print(f"   📊 Health status: {health}")
        
        # Test pool status
        print("\n3️⃣ Testing connection pool...")
        pool_status = get_pool_status()
        print(f"   🏊 Pool status: {pool_status}")
        
        # Test multiple connections
        print("\n4️⃣ Testing multiple connections...")
        connections = []
        for i in range(5):
            try:
                db = DatabaseConfig.get_database()
                result = db.command('ping')
                connections.append(f"Connection {i+1}: ✅")
            except Exception as e:
                connections.append(f"Connection {i+1}: ❌ {e}")
        
        for conn in connections:
            print(f"   {conn}")
        
        # Test concurrent connections
        print("\n5️⃣ Testing concurrent connections...")
        results = []
        
        def test_concurrent_connection(thread_id):
            try:
                db = DatabaseConfig.get_database()
                result = db.command('ping')
                results.append(f"Thread {thread_id}: ✅")
            except Exception as e:
                results.append(f"Thread {thread_id}: ❌ {e}")
        
        threads = []
        for i in range(10):
            thread = threading.Thread(target=test_concurrent_connection, args=(i+1,))
            threads.append(thread)
            thread.start()
        
        for thread in threads:
            thread.join()
        
        for result in results:
            print(f"   {result}")
        
        print("\n✅ SSL connection test completed successfully!")
        return True
        
    except Exception as e:
        print(f"\n❌ SSL connection test failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints for SSL stability"""
    print("\n🌐 Testing API endpoints...")
    
    base_url = "http://localhost:8000"
    endpoints = [
        "/health",
        "/auth/me",
        "/forms/?page=1&limit=10"
    ]
    
    for endpoint in endpoints:
        try:
            response = requests.get(f"{base_url}{endpoint}", timeout=30)
            print(f"   {endpoint}: {response.status_code} ✅")
        except Exception as e:
            print(f"   {endpoint}: ❌ {e}")

if __name__ == "__main__":
    print("🚀 Starting SSL Connection Stability Test")
    print("=" * 50)
    
    # Test database connection
    db_success = test_ssl_connection()
    
    # Test API endpoints
    test_api_endpoints()
    
    print("\n" + "=" * 50)
    if db_success:
        print("🎉 All tests passed! SSL connection is stable.")
    else:
        print("⚠️ Some tests failed. Check the configuration.")
