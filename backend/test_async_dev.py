#!/usr/bin/env python3
"""
Development Testing Script for Async Features
Run this to test async functionality with python main.py
"""

import requests
import time
import threading
import json
from concurrent.futures import ThreadPoolExecutor
import sys

# Configuration
BASE_URL = "http://localhost:5000"
TEST_USER = {
    "username": "test_user",
    "password": "test_password"
}

def test_sequential_requests():
    """Test sequential requests to see blocking behavior"""
    print("🔄 Testing Sequential Requests...")
    
    start_time = time.time()
    
    # Make 5 sequential requests
    for i in range(5):
        try:
            response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER, timeout=10)
            print(f"Request {i+1}: {response.status_code} - {time.time() - start_time:.2f}s")
        except Exception as e:
            print(f"Request {i+1}: Error - {e}")
    
    total_time = time.time() - start_time
    print(f"✅ Sequential requests completed in {total_time:.2f}s")
    return total_time

def test_parallel_requests():
    """Test parallel requests to see async behavior"""
    print("\n🚀 Testing Parallel Requests...")
    
    def make_request(request_id):
        try:
            start = time.time()
            response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER, timeout=10)
            end = time.time()
            return {
                'id': request_id,
                'status': response.status_code,
                'time': end - start,
                'success': response.status_code == 200
            }
        except Exception as e:
            return {
                'id': request_id,
                'status': 'error',
                'time': 0,
                'success': False,
                'error': str(e)
            }
    
    start_time = time.time()
    
    # Make 5 parallel requests
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_request, i) for i in range(5)]
        results = [future.result() for future in futures]
    
    total_time = time.time() - start_time
    
    print(f"✅ Parallel requests completed in {total_time:.2f}s")
    for result in results:
        status = "✅" if result['success'] else "❌"
        print(f"  {status} Request {result['id']}: {result['status']} - {result['time']:.2f}s")
    
    return total_time, results

def test_async_routes():
    """Test the new async routes"""
    print("\n🎯 Testing Async Routes...")
    
    # Test async login
    try:
        start = time.time()
        response = requests.post(f"{BASE_URL}/async-auth/login", json=TEST_USER, timeout=15)
        end = time.time()
        
        print(f"✅ Async Login: {response.status_code} - {end - start:.2f}s")
        if response.status_code == 200:
            data = response.json()
            print(f"   Response: {data.get('message', 'No message')}")
    except Exception as e:
        print(f"❌ Async Login Error: {e}")
    
    # Test async health check
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/async-auth/health", timeout=10)
        end = time.time()
        
        print(f"✅ Async Health: {response.status_code} - {end - start:.2f}s")
        if response.status_code == 200:
            data = response.json()
            print(f"   Status: {data.get('data', {}).get('status', 'Unknown')}")
    except Exception as e:
        print(f"❌ Async Health Error: {e}")

def test_performance_metrics():
    """Test performance monitoring endpoints"""
    print("\n📊 Testing Performance Metrics...")
    
    try:
        # Note: This requires authentication, so we'll just test the endpoint exists
        response = requests.get(f"{BASE_URL}/performance/metrics", timeout=5)
        print(f"✅ Performance Metrics: {response.status_code}")
        
        if response.status_code == 401:
            print("   (Authentication required - this is expected)")
        elif response.status_code == 200:
            data = response.json()
            print(f"   System Status: {data.get('system', {}).get('cpu_percent', 'N/A')}% CPU")
    except Exception as e:
        print(f"❌ Performance Metrics Error: {e}")

def test_concurrent_load():
    """Test with higher concurrent load"""
    print("\n🔥 Testing Concurrent Load (10 requests)...")
    
    def make_request(request_id):
        try:
            start = time.time()
            response = requests.post(f"{BASE_URL}/auth/login", json=TEST_USER, timeout=15)
            end = time.time()
            return {
                'id': request_id,
                'status': response.status_code,
                'time': end - start,
                'success': response.status_code == 200
            }
        except Exception as e:
            return {
                'id': request_id,
                'status': 'error',
                'time': 0,
                'success': False,
                'error': str(e)
            }
    
    start_time = time.time()
    
    # Make 10 concurrent requests
    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = [executor.submit(make_request, i) for i in range(10)]
        results = [future.result() for future in futures]
    
    total_time = time.time() - start_time
    successful_requests = sum(1 for r in results if r['success'])
    
    print(f"✅ Concurrent load test completed in {total_time:.2f}s")
    print(f"   Successful requests: {successful_requests}/10")
    print(f"   Average response time: {sum(r['time'] for r in results) / len(results):.2f}s")
    
    return total_time, successful_requests

def wait_for_server():
    """Wait for server to be ready"""
    print("⏳ Waiting for server to be ready...")
    
    for i in range(30):  # Wait up to 30 seconds
        try:
            response = requests.get(f"{BASE_URL}/", timeout=2)
            if response.status_code == 200:
                print("✅ Server is ready!")
                return True
        except:
            pass
        
        time.sleep(1)
        print(f"   Attempt {i+1}/30...")
    
    print("❌ Server not ready after 30 seconds")
    return False

def main():
    """Main testing function"""
    print("🧪 Async Development Testing")
    print("=" * 50)
    
    # Wait for server
    if not wait_for_server():
        print("❌ Cannot proceed - server not ready")
        return
    
    print("\n📋 Running Tests...")
    
    # Test 1: Sequential requests
    sequential_time = test_sequential_requests()
    
    # Test 2: Parallel requests
    parallel_time, parallel_results = test_parallel_requests()
    
    # Test 3: Async routes
    test_async_routes()
    
    # Test 4: Performance metrics
    test_performance_metrics()
    
    # Test 5: Concurrent load
    load_time, successful = test_concurrent_load()
    
    # Summary
    print("\n📊 Test Summary")
    print("=" * 50)
    print(f"Sequential time: {sequential_time:.2f}s")
    print(f"Parallel time: {parallel_time:.2f}s")
    print(f"Concurrent load: {load_time:.2f}s ({successful}/10 successful)")
    
    if parallel_time < sequential_time:
        improvement = ((sequential_time - parallel_time) / sequential_time) * 100
        print(f"✅ Parallel processing is {improvement:.1f}% faster!")
    else:
        print("⚠️ Parallel processing not showing improvement")
    
    print("\n🎯 What to look for:")
    print("- Parallel requests should complete faster than sequential")
    print("- Async routes should respond quickly")
    print("- High concurrent load should handle multiple requests")
    print("- Check server logs for async processing messages")

if __name__ == "__main__":
    main()
