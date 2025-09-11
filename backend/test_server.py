#!/usr/bin/env python3
"""
Simple test script to check if the development server is working
"""

import requests
import time
import json

def test_server():
    """Test if the development server is running"""
    try:
        print("🧪 Testing development server...")
        
        # Wait a moment for server to start
        time.sleep(3)
        
        # Test async status endpoint
        print("📊 Testing async status endpoint...")
        response = requests.get('http://localhost:5000/dev/async-status', timeout=5)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Server is running!")
            print(f"   Status: {data.get('success', 'Unknown')}")
            print(f"   Workers: {data.get('async_system', {}).get('workers', 'Unknown')}")
            print(f"   DB Pool: {data.get('database_pool', {}).get('active_connections', 'Unknown')}")
            print(f"   Cache: {data.get('cache', {}).get('current_size', 'Unknown')}")
            return True
        else:
            print(f"❌ Server returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server - is it running?")
        return False
    except Exception as e:
        print(f"❌ Error testing server: {e}")
        return False

def test_parallel_endpoint():
    """Test the parallel processing endpoint"""
    try:
        print("\n🚀 Testing parallel processing endpoint...")
        response = requests.get('http://localhost:5000/dev/test-parallel', timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Parallel processing test successful!")
            print(f"   Execution time: {data.get('execution_time', 'Unknown')}")
            print(f"   Results: {data.get('results', [])}")
            return True
        else:
            print(f"❌ Parallel test failed with status {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing parallel endpoint: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Development Server Test")
    print("=" * 40)
    
    # Test basic server
    if test_server():
        # Test parallel processing
        test_parallel_endpoint()
    
    print("\n🎯 Next steps:")
    print("1. Open http://localhost:5000/dev/async-status in browser")
    print("2. Open http://localhost:5000/dev/test-parallel in browser")
    print("3. Run: python test_async_dev.py")
