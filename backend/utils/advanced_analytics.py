"""
Advanced Analytics System for AI-VERSANT
Comprehensive request tracking, endpoint performance, and system health monitoring
"""

import time
import psutil
import threading
from datetime import datetime, timedelta
from collections import defaultdict, deque
from typing import Dict, List, Any, Optional
import json
import logging

class AdvancedAnalytics:
    def __init__(self):
        self.request_count = 0
        self.start_time = time.time()
        
        # Request tracking
        self.requests_by_endpoint = defaultdict(int)
        self.requests_by_hour = defaultdict(int)
        self.requests_by_minute = defaultdict(int)
        
        # Response time tracking
        self.response_times = defaultdict(list)
        self.slow_endpoints = defaultdict(list)
        
        # Error tracking
        self.error_count = 0
        self.errors_by_endpoint = defaultdict(int)
        self.response_codes = defaultdict(int)
        self.error_details = []
        
        # Network tracking
        self.bytes_sent = 0
        self.bytes_received = 0
        self.network_by_endpoint = defaultdict(lambda: {'sent': 0, 'received': 0})
        
        # System health tracking
        self.cpu_history = deque(maxlen=100)
        self.memory_history = deque(maxlen=100)
        self.system_health_history = deque(maxlen=100)
        
        # Time-based data storage
        self.hourly_data = defaultdict(lambda: {
            'requests': 0,
            'errors': 0,
            'avg_response_time': 0,
            'bytes_sent': 0,
            'bytes_received': 0,
            'top_endpoints': defaultdict(int),
            'response_codes': defaultdict(int)
        })
        
        # Start background monitoring
        self.start_monitoring()
        
    def start_monitoring(self):
        """Start background monitoring tasks"""
        def monitor_system():
            while True:
                try:
                    # Update system metrics
                    cpu_percent = psutil.cpu_percent(interval=1)
                    memory = psutil.virtual_memory()
                    
                    self.cpu_history.append({
                        'timestamp': datetime.now().isoformat(),
                        'cpu_percent': cpu_percent,
                        'memory_percent': memory.percent,
                        'memory_available': memory.available,
                        'memory_used': memory.used
                    })
                    
                    # Update system health
                    health_status = self.calculate_system_health()
                    self.system_health_history.append({
                        'timestamp': datetime.now().isoformat(),
                        'status': health_status['status'],
                        'cpu_percent': cpu_percent,
                        'memory_percent': memory.percent,
                        'response_time_avg': self.get_average_response_time()
                    })
                    
                    time.sleep(30)  # Update every 30 seconds
                except Exception as e:
                    logging.error(f"Error in system monitoring: {e}")
                    time.sleep(60)
        
        thread = threading.Thread(target=monitor_system, daemon=True)
        thread.start()
    
    def track_request(self, endpoint: str, method: str, response_code: int, 
                     response_time: float, bytes_sent: int = 0, bytes_received: int = 0):
        """Track a request with all relevant metrics"""
        current_time = datetime.now()
        hour_key = current_time.strftime('%Y-%m-%d %H:00')
        minute_key = current_time.strftime('%Y-%m-%d %H:%M:00')
        
        # Increment counters
        self.request_count += 1
        self.requests_by_endpoint[endpoint] += 1
        self.requests_by_hour[hour_key] += 1
        self.requests_by_minute[minute_key] += 1
        self.response_codes[response_code] += 1
        
        # Track response times
        self.response_times[endpoint].append(response_time)
        if len(self.response_times[endpoint]) > 1000:  # Keep only last 1000 requests
            self.response_times[endpoint] = self.response_times[endpoint][-1000:]
        
        # Track slow endpoints (response time > 1 second)
        if response_time > 1.0:
            self.slow_endpoints[endpoint].append({
                'timestamp': current_time.isoformat(),
                'response_time': response_time,
                'method': method,
                'response_code': response_code
            })
            if len(self.slow_endpoints[endpoint]) > 100:
                self.slow_endpoints[endpoint] = self.slow_endpoints[endpoint][-100:]
        
        # Track errors
        if response_code >= 400:
            self.error_count += 1
            self.errors_by_endpoint[endpoint] += 1
            self.error_details.append({
                'timestamp': current_time.isoformat(),
                'endpoint': endpoint,
                'method': method,
                'response_code': response_code,
                'response_time': response_time
            })
            if len(self.error_details) > 1000:
                self.error_details = self.error_details[-1000:]
        
        # Track network usage
        self.bytes_sent += bytes_sent
        self.bytes_received += bytes_received
        self.network_by_endpoint[endpoint]['sent'] += bytes_sent
        self.network_by_endpoint[endpoint]['received'] += bytes_received
        
        # Update hourly data
        self.hourly_data[hour_key]['requests'] += 1
        self.hourly_data[hour_key]['errors'] += (1 if response_code >= 400 else 0)
        self.hourly_data[hour_key]['bytes_sent'] += bytes_sent
        self.hourly_data[hour_key]['bytes_received'] += bytes_received
        self.hourly_data[hour_key]['top_endpoints'][endpoint] += 1
        self.hourly_data[hour_key]['response_codes'][response_code] += 1
        
        # Update average response time for this hour
        endpoint_times = self.response_times[endpoint]
        if endpoint_times:
            self.hourly_data[hour_key]['avg_response_time'] = sum(endpoint_times) / len(endpoint_times)
    
    def get_request_analytics(self, time_period: str = '1hour') -> Dict[str, Any]:
        """Get comprehensive request analytics for specified time period"""
        now = datetime.now()
        
        if time_period == '1hour':
            cutoff = now - timedelta(hours=1)
        elif time_period == '5hours':
            cutoff = now - timedelta(hours=5)
        elif time_period == '1day':
            cutoff = now - timedelta(days=1)
        else:
            cutoff = now - timedelta(hours=1)
        
        # Filter data by time period
        filtered_requests = {}
        filtered_errors = {}
        filtered_response_codes = {}
        filtered_network = {}
        
        for endpoint, count in self.requests_by_endpoint.items():
            # This is a simplified filter - in production, you'd store timestamps
            filtered_requests[endpoint] = count
        
        for endpoint, count in self.errors_by_endpoint.items():
            filtered_errors[endpoint] = count
        
        for code, count in self.response_codes.items():
            filtered_response_codes[code] = count
        
        for endpoint, data in self.network_by_endpoint.items():
            filtered_network[endpoint] = data
        
        # Calculate top endpoints
        top_endpoints = sorted(filtered_requests.items(), key=lambda x: x[1], reverse=True)[:10]
        
        # Calculate slowest endpoints
        slowest_endpoints = []
        for endpoint, times in self.response_times.items():
            if times:
                avg_time = sum(times) / len(times)
                slowest_endpoints.append((endpoint, avg_time, len(times)))
        slowest_endpoints.sort(key=lambda x: x[1], reverse=True)
        
        # Calculate error rate
        total_requests = sum(filtered_requests.values())
        error_rate = (self.error_count / total_requests * 100) if total_requests > 0 else 0
        
        return {
            'time_period': time_period,
            'total_requests': total_requests,
            'error_count': self.error_count,
            'error_rate': round(error_rate, 2),
            'top_endpoints': top_endpoints,
            'slowest_endpoints': slowest_endpoints[:10],
            'response_codes': dict(filtered_response_codes),
            'errors_by_endpoint': dict(filtered_errors),
            'network_usage': {
                'total_bytes_sent': self.bytes_sent,
                'total_bytes_received': self.bytes_received,
                'by_endpoint': dict(filtered_network)
            },
            'requests_per_hour': dict(self.requests_by_hour),
            'requests_per_minute': dict(self.requests_by_minute)
        }
    
    def get_endpoint_performance(self, endpoint: str = None) -> Dict[str, Any]:
        """Get detailed performance metrics for specific endpoint or all endpoints"""
        if endpoint:
            if endpoint not in self.response_times:
                return {'error': 'Endpoint not found'}
            
            times = self.response_times[endpoint]
            return {
                'endpoint': endpoint,
                'total_requests': self.requests_by_endpoint[endpoint],
                'error_count': self.errors_by_endpoint[endpoint],
                'avg_response_time': sum(times) / len(times) if times else 0,
                'min_response_time': min(times) if times else 0,
                'max_response_time': max(times) if times else 0,
                'response_times': times[-50:],  # Last 50 requests
                'network_usage': self.network_by_endpoint[endpoint],
                'slow_requests': self.slow_endpoints[endpoint][-10:]  # Last 10 slow requests
            }
        else:
            # Return performance for all endpoints
            performance_data = {}
            for ep in self.requests_by_endpoint.keys():
                performance_data[ep] = self.get_endpoint_performance(ep)
            return performance_data
    
    def get_system_health_detailed(self) -> Dict[str, Any]:
        """Get detailed system health metrics"""
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Calculate system health score
        health_score = 100
        if cpu_percent > 80:
            health_score -= 20
        if memory.percent > 80:
            health_score -= 20
        if disk.percent > 90:
            health_score -= 20
        
        # Determine health status
        if health_score >= 80:
            status = 'excellent'
        elif health_score >= 60:
            status = 'good'
        elif health_score >= 40:
            status = 'warning'
        else:
            status = 'critical'
        
        return {
            'timestamp': datetime.now().isoformat(),
            'health_score': health_score,
            'status': status,
            'uptime_seconds': time.time() - self.start_time,
            'cpu': {
                'percent': cpu_percent,
                'history': list(self.cpu_history)[-20:]  # Last 20 readings
            },
            'memory': {
                'total': memory.total,
                'available': memory.available,
                'used': memory.used,
                'percent': memory.percent,
                'history': list(self.memory_history)[-20:]
            },
            'disk': {
                'total': disk.total,
                'used': disk.used,
                'free': disk.free,
                'percent': (disk.used / disk.total) * 100
            },
            'network': {
                'bytes_sent': self.bytes_sent,
                'bytes_received': self.bytes_received,
                'total_transfer': self.bytes_sent + self.bytes_received
            },
            'requests': {
                'total': self.request_count,
                'per_second': self.request_count / (time.time() - self.start_time) if time.time() > self.start_time else 0,
                'error_rate': (self.error_count / self.request_count * 100) if self.request_count > 0 else 0
            }
        }
    
    def get_time_based_analytics(self) -> Dict[str, Any]:
        """Get analytics broken down by time periods"""
        now = datetime.now()
        
        # Last hour data
        last_hour = now - timedelta(hours=1)
        last_hour_key = last_hour.strftime('%Y-%m-%d %H:00')
        
        # Last 5 hours data
        last_5_hours = now - timedelta(hours=5)
        last_5_hours_data = {}
        for i in range(5):
            hour_key = (last_5_hours + timedelta(hours=i)).strftime('%Y-%m-%d %H:00')
            if hour_key in self.hourly_data:
                last_5_hours_data[hour_key] = self.hourly_data[hour_key]
        
        # Last 24 hours data
        last_24_hours = now - timedelta(hours=24)
        last_24_hours_data = {}
        for i in range(24):
            hour_key = (last_24_hours + timedelta(hours=i)).strftime('%Y-%m-%d %H:00')
            if hour_key in self.hourly_data:
                last_24_hours_data[hour_key] = self.hourly_data[hour_key]
        
        return {
            'last_hour': self.hourly_data.get(last_hour_key, {}),
            'last_5_hours': last_5_hours_data,
            'last_24_hours': last_24_hours_data,
            'peak_hours': self.get_peak_hours(),
            'busiest_minutes': self.get_busiest_minutes()
        }
    
    def get_peak_hours(self) -> List[Dict[str, Any]]:
        """Get peak request hours"""
        peak_data = []
        for hour, data in self.hourly_data.items():
            peak_data.append({
                'hour': hour,
                'requests': data['requests'],
                'errors': data['errors'],
                'avg_response_time': data['avg_response_time']
            })
        return sorted(peak_data, key=lambda x: x['requests'], reverse=True)[:10]
    
    def get_busiest_minutes(self) -> List[Dict[str, Any]]:
        """Get busiest minutes"""
        minute_data = []
        for minute, count in self.requests_by_minute.items():
            minute_data.append({
                'minute': minute,
                'requests': count
            })
        return sorted(minute_data, key=lambda x: x['requests'], reverse=True)[:20]
    
    def get_response_time_distribution(self) -> Dict[str, int]:
        """Get response time distribution"""
        all_times = []
        for times in self.response_times.values():
            all_times.extend(times)
        
        if not all_times:
            return {}
        
        distribution = {
            'under_100ms': 0,
            '100ms_to_500ms': 0,
            '500ms_to_1s': 0,
            '1s_to_2s': 0,
            'over_2s': 0
        }
        
        for time_val in all_times:
            if time_val < 0.1:
                distribution['under_100ms'] += 1
            elif time_val < 0.5:
                distribution['100ms_to_500ms'] += 1
            elif time_val < 1.0:
                distribution['500ms_to_1s'] += 1
            elif time_val < 2.0:
                distribution['1s_to_2s'] += 1
            else:
                distribution['over_2s'] += 1
        
        return distribution
    
    def get_average_response_time(self) -> float:
        """Get average response time across all endpoints"""
        all_times = []
        for times in self.response_times.values():
            all_times.extend(times)
        return sum(all_times) / len(all_times) if all_times else 0
    
    def calculate_system_health(self) -> Dict[str, Any]:
        """Calculate overall system health"""
        memory = psutil.virtual_memory()
        cpu_percent = psutil.cpu_percent(interval=1)
        
        health_issues = []
        if cpu_percent > 80:
            health_issues.append(f"High CPU usage: {cpu_percent:.1f}%")
        if memory.percent > 80:
            health_issues.append(f"High memory usage: {memory.percent:.1f}%")
        if self.error_count > self.request_count * 0.1:  # More than 10% errors
            health_issues.append(f"High error rate: {(self.error_count/self.request_count*100):.1f}%")
        
        if not health_issues:
            status = 'healthy'
        elif len(health_issues) == 1:
            status = 'warning'
        else:
            status = 'critical'
        
        return {
            'status': status,
            'issues': health_issues,
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'error_rate': (self.error_count / self.request_count * 100) if self.request_count > 0 else 0
        }
    
    def get_comprehensive_analytics(self) -> Dict[str, Any]:
        """Get comprehensive analytics combining all metrics"""
        return {
            'timestamp': datetime.now().isoformat(),
            'request_analytics': self.get_request_analytics('1hour'),
            'endpoint_performance': self.get_endpoint_performance(),
            'system_health': self.get_system_health_detailed(),
            'time_based_analytics': self.get_time_based_analytics(),
            'error_analysis': {
                'total_errors': self.error_count,
                'error_rate': (self.error_count / self.request_count * 100) if self.request_count > 0 else 0,
                'errors_by_endpoint': dict(self.errors_by_endpoint),
                'recent_errors': self.error_details[-20:]  # Last 20 errors
            },
            'performance_summary': {
                'avg_response_time': self.get_average_response_time(),
                'slowest_endpoints': sorted(
                    [(ep, sum(times)/len(times) if times else 0) for ep, times in self.response_times.items()],
                    key=lambda x: x[1], reverse=True
                )[:10],
                'most_requested_endpoints': sorted(
                    self.requests_by_endpoint.items(),
                    key=lambda x: x[1], reverse=True
                )[:10]
            }
        }

# Global analytics instance
analytics_instance = None

def initialize_advanced_analytics():
    """Initialize the advanced analytics system"""
    global analytics_instance
    analytics_instance = AdvancedAnalytics()
    return analytics_instance

def get_analytics_instance():
    """Get the global analytics instance"""
    return analytics_instance

def track_request(endpoint: str, method: str, response_code: int, 
                 response_time: float, bytes_sent: int = 0, bytes_received: int = 0):
    """Track a request (convenience function)"""
    if analytics_instance:
        analytics_instance.track_request(endpoint, method, response_code, response_time, bytes_sent, bytes_received)
