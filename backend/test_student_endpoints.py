#!/usr/bin/env python3
"""
Test script for student dashboard endpoints
"""
import requests
import json

def test_endpoints():
    """Test the student dashboard endpoints"""
    base_url = "http://localhost:5000"
    
    # Test endpoints that were failing
    endpoints = [
        "/student/progress-summary",
        "/student/grammar-detailed-results", 
        "/student/vocabulary-detailed-results"
    ]
    
    print("Testing student dashboard endpoints...")
    print("=" * 50)
    
    for endpoint in endpoints:
        try:
            print(f"\nTesting: {endpoint}")
            response = requests.get(f"{base_url}{endpoint}", timeout=10)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ SUCCESS - Endpoint working")
                data = response.json()
                if data.get('success'):
                    print(f"   Response: {data.get('message', 'No message')}")
                else:
                    print(f"   Error: {data.get('message', 'Unknown error')}")
            else:
                print(f"❌ FAILED - Status: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data.get('message', 'Unknown error')}")
                except:
                    print(f"   Raw response: {response.text[:200]}")
                    
        except requests.exceptions.ConnectionError:
            print(f"❌ CONNECTION ERROR - Server not running on {base_url}")
            break
        except requests.exceptions.Timeout:
            print(f"❌ TIMEOUT - Request timed out")
        except Exception as e:
            print(f"❌ ERROR - {str(e)}")
    
    print("\n" + "=" * 50)
    print("Test completed!")

if __name__ == "__main__":
    test_endpoints()
