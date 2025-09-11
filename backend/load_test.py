#!/usr/bin/env python3
"""
Load Testing Script for 200-500 Concurrent Users
Tests the enterprise backend under high load
"""

import asyncio
import aiohttp
import time
import json
from concurrent.futures import ThreadPoolExecutor
import statistics

class LoadTester:
    def __init__(self, base_url="http://localhost:8000", max_concurrent=500):
        self.base_url = base_url
        self.max_concurrent = max_concurrent
        self.results = []
        
    async def make_request(self, session, endpoint, method="GET", data=None):
        """Make a single HTTP request"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            if method == "GET":
                async with session.get(url) as response:
                    result = await response.text()
                    status = response.status
            elif method == "POST":
                async with session.post(url, json=data) as response:
                    result = await response.text()
                    status = response.status
            else:
                raise ValueError(f"Unsupported method: {method}")
                
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                'endpoint': endpoint,
                'status': status,
                'duration': duration,
                'success': 200 <= status < 300,
                'timestamp': start_time
            }
            
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            
            return {
                'endpoint': endpoint,
                'status': 0,
                'duration': duration,
                'success': False,
                'error': str(e),
                'timestamp': start_time
            }
    
    async def run_load_test(self, duration_seconds=60):
        """Run load test for specified duration"""
        print(f"🚀 Starting load test for {duration_seconds} seconds...")
        print(f"   Target: {self.max_concurrent} concurrent users")
        print(f"   Server: {self.base_url}")
        
        # Test endpoints
        endpoints = [
            "/",
            "/health",
            "/performance/metrics",
            "/student/progress-summary",
            "/student/grammar-detailed-results",
            "/student/vocabulary-detailed-results"
        ]
        
        start_time = time.time()
        
        async with aiohttp.ClientSession() as session:
            tasks = []
            
            while time.time() - start_time < duration_seconds:
                # Create batch of concurrent requests
                batch_tasks = []
                for _ in range(min(50, self.max_concurrent - len(tasks))):  # Batch size of 50
                    import random
                    endpoint = random.choice(endpoints)
                    task = self.make_request(session, endpoint)
                    batch_tasks.append(task)
                
                # Execute batch
                batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)
                
                # Process results
                for result in batch_results:
                    if isinstance(result, dict):
                        self.results.append(result)
                
                # Small delay between batches
                await asyncio.sleep(0.1)
                
                # Print progress
                elapsed = time.time() - start_time
                if int(elapsed) % 10 == 0:
                    print(f"   Progress: {elapsed:.0f}s, Requests: {len(self.results)}")
        
        print(f"✅ Load test completed!")
        return self.results
    
    def analyze_results(self):
        """Analyze load test results"""
        if not self.results:
            print("❌ No results to analyze")
            return
        
        total_requests = len(self.results)
        successful_requests = sum(1 for r in self.results if r['success'])
        failed_requests = total_requests - successful_requests
        
        durations = [r['duration'] for r in self.results if r['success']]
        
        if durations:
            avg_duration = statistics.mean(durations)
            median_duration = statistics.median(durations)
            p95_duration = statistics.quantiles(durations, n=20)[18]  # 95th percentile
            p99_duration = statistics.quantiles(durations, n=100)[98]  # 99th percentile
        else:
            avg_duration = median_duration = p95_duration = p99_duration = 0
        
        # Group by endpoint
        endpoint_stats = {}
        for result in self.results:
            endpoint = result['endpoint']
            if endpoint not in endpoint_stats:
                endpoint_stats[endpoint] = {'total': 0, 'success': 0, 'durations': []}
            
            endpoint_stats[endpoint]['total'] += 1
            if result['success']:
                endpoint_stats[endpoint]['success'] += 1
                endpoint_stats[endpoint]['durations'].append(result['duration'])
        
        print("\n" + "="*60)
        print("📊 LOAD TEST RESULTS")
        print("="*60)
        print(f"Total Requests: {total_requests}")
        print(f"Successful: {successful_requests} ({successful_requests/total_requests*100:.1f}%)")
        print(f"Failed: {failed_requests} ({failed_requests/total_requests*100:.1f}%)")
        print(f"Average Response Time: {avg_duration:.3f}s")
        print(f"Median Response Time: {median_duration:.3f}s")
        print(f"95th Percentile: {p95_duration:.3f}s")
        print(f"99th Percentile: {p99_duration:.3f}s")
        
        print(f"\n📈 ENDPOINT BREAKDOWN:")
        for endpoint, stats in endpoint_stats.items():
            success_rate = stats['success'] / stats['total'] * 100
            avg_dur = statistics.mean(stats['durations']) if stats['durations'] else 0
            print(f"  {endpoint}: {stats['success']}/{stats['total']} ({success_rate:.1f}%) - {avg_dur:.3f}s avg")
        
        # Performance assessment
        print(f"\n🎯 PERFORMANCE ASSESSMENT:")
        if successful_requests / total_requests >= 0.95:
            print("✅ Excellent: >95% success rate")
        elif successful_requests / total_requests >= 0.90:
            print("✅ Good: >90% success rate")
        elif successful_requests / total_requests >= 0.80:
            print("⚠️  Fair: >80% success rate")
        else:
            print("❌ Poor: <80% success rate")
        
        if avg_duration <= 1.0:
            print("✅ Excellent: <1s average response time")
        elif avg_duration <= 2.0:
            print("✅ Good: <2s average response time")
        elif avg_duration <= 5.0:
            print("⚠️  Fair: <5s average response time")
        else:
            print("❌ Poor: >5s average response time")
        
        if p95_duration <= 3.0:
            print("✅ Excellent: <3s 95th percentile")
        elif p95_duration <= 5.0:
            print("✅ Good: <5s 95th percentile")
        else:
            print("⚠️  Needs improvement: >5s 95th percentile")

async def main():
    """Main load testing function"""
    print("🚀 VERSANT BACKEND LOAD TESTER")
    print("   Testing for 200-500 concurrent users")
    print("="*50)
    
    # Check if server is running
    import aiohttp
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get("http://localhost:8000/health") as response:
                if response.status == 200:
                    print("✅ Server is running and healthy")
                else:
                    print("⚠️  Server responded but not healthy")
    except Exception as e:
        print(f"❌ Server not accessible: {e}")
        print("   Make sure to start the server first:")
        print("   python start_enterprise.py")
        return
    
    # Run load test
    tester = LoadTester(max_concurrent=500)
    await tester.run_load_test(duration_seconds=120)  # 2 minutes
    tester.analyze_results()

if __name__ == "__main__":
    asyncio.run(main())
