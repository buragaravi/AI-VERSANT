"""
Ultra-scalable monitoring system for 1000+ concurrent users
Real-time performance monitoring and alerting
"""

import time
import threading
import psutil
import logging
import json
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
from collections import deque, defaultdict
import os
import gc

logger = logging.getLogger(__name__)

class PerformanceMonitor:
    """Ultra-scalable performance monitoring system"""
    
    def __init__(self, max_metrics_history: int = 1000):
        self.max_metrics_history = max_metrics_history
        
        # Metrics storage
        self.metrics_history = deque(maxlen=max_metrics_history)
        self.current_metrics = {}
        self.alert_thresholds = {
            'cpu_percent': 80.0,
            'memory_percent': 85.0,
            'disk_percent': 90.0,
            'response_time': 5.0,  # seconds
            'error_rate': 5.0,  # percentage
            'active_connections': 800,  # 80% of 1000
            'queue_size': 100
        }
        
        # Alert system
        self.alerts = deque(maxlen=100)
        self.alert_cooldown = 300  # 5 minutes
        self.last_alert_times = {}
        
        # Performance counters
        self.request_count = 0
        self.error_count = 0
        self.response_times = deque(maxlen=1000)
        self.active_connections = 0
        self.queue_size = 0
        
        # Database metrics
        self.db_connection_count = 0
        self.db_query_count = 0
        self.db_query_times = deque(maxlen=1000)
        self.db_error_count = 0
        
        # Cache metrics
        self.cache_hits = 0
        self.cache_misses = 0
        self.cache_size = 0
        
        # Thread safety
        self._lock = threading.RLock()
        
        # Start monitoring
        self._start_monitoring()
        
        logger.info("📊 Ultra-scalable performance monitor initialized")
    
    def _start_monitoring(self):
        """Start background monitoring thread"""
        def monitor_worker():
            while True:
                try:
                    self._collect_metrics()
                    self._check_alerts()
                    time.sleep(10)  # Collect metrics every 10 seconds
                except Exception as e:
                    logger.error(f"❌ Monitoring error: {e}")
        
        monitor_thread = threading.Thread(target=monitor_worker, daemon=True)
        monitor_thread.start()
        logger.info("📊 Performance monitoring started")
    
    def _collect_metrics(self):
        """Collect current system metrics"""
        try:
            # System metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            # Process metrics
            process = psutil.Process()
            process_memory = process.memory_info()
            process_cpu = process.cpu_percent()
            
            # Network metrics
            network_io = psutil.net_io_counters()
            
            # Calculate response time average
            avg_response_time = sum(self.response_times) / len(self.response_times) if self.response_times else 0
            
            # Calculate error rate
            total_requests = self.request_count
            error_rate = (self.error_count / total_requests * 100) if total_requests > 0 else 0
            
            # Calculate cache hit rate
            total_cache_requests = self.cache_hits + self.cache_misses
            cache_hit_rate = (self.cache_hits / total_cache_requests * 100) if total_cache_requests > 0 else 0
            
            # Calculate database query time average
            avg_db_query_time = sum(self.db_query_times) / len(self.db_query_times) if self.db_query_times else 0
            
            # Create metrics snapshot
            metrics = {
                'timestamp': time.time(),
                'datetime': datetime.now().isoformat(),
                
                # System metrics
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_used_gb': memory.used / (1024**3),
                'memory_available_gb': memory.available / (1024**3),
                'disk_percent': disk.percent,
                'disk_used_gb': disk.used / (1024**3),
                'disk_free_gb': disk.free / (1024**3),
                
                # Process metrics
                'process_memory_mb': process_memory.rss / (1024**2),
                'process_cpu_percent': process_cpu,
                'process_threads': process.num_threads(),
                'process_fds': process.num_fds() if hasattr(process, 'num_fds') else 0,
                
                # Network metrics
                'network_bytes_sent': network_io.bytes_sent,
                'network_bytes_recv': network_io.bytes_recv,
                'network_packets_sent': network_io.packets_sent,
                'network_packets_recv': network_io.packets_recv,
                
                # Application metrics
                'request_count': self.request_count,
                'error_count': self.error_count,
                'error_rate': error_rate,
                'avg_response_time': avg_response_time,
                'active_connections': self.active_connections,
                'queue_size': self.queue_size,
                
                # Database metrics
                'db_connection_count': self.db_connection_count,
                'db_query_count': self.db_query_count,
                'db_error_count': self.db_error_count,
                'avg_db_query_time': avg_db_query_time,
                
                # Cache metrics
                'cache_hits': self.cache_hits,
                'cache_misses': self.cache_misses,
                'cache_hit_rate': cache_hit_rate,
                'cache_size': self.cache_size,
                
                # Load metrics
                'load_1min': os.getloadavg()[0] if hasattr(os, 'getloadavg') else 0,
                'load_5min': os.getloadavg()[1] if hasattr(os, 'getloadavg') else 0,
                'load_15min': os.getloadavg()[2] if hasattr(os, 'getloadavg') else 0,
            }
            
            with self._lock:
                self.current_metrics = metrics
                self.metrics_history.append(metrics)
            
            logger.debug(f"📊 Metrics collected: CPU={cpu_percent}%, Memory={memory.percent}%, Requests={self.request_count}")
            
        except Exception as e:
            logger.error(f"❌ Error collecting metrics: {e}")
    
    def _check_alerts(self):
        """Check for alert conditions"""
        if not self.current_metrics:
            return
        
        current_time = time.time()
        
        for metric, threshold in self.alert_thresholds.items():
            if metric not in self.current_metrics:
                continue
            
            value = self.current_metrics[metric]
            
            # Check if threshold exceeded
            if value > threshold:
                # Check cooldown
                last_alert = self.last_alert_times.get(metric, 0)
                if current_time - last_alert > self.alert_cooldown:
                    self._trigger_alert(metric, value, threshold)
                    self.last_alert_times[metric] = current_time
    
    def _trigger_alert(self, metric: str, value: float, threshold: float):
        """Trigger an alert"""
        alert = {
            'timestamp': time.time(),
            'datetime': datetime.now().isoformat(),
            'metric': metric,
            'value': value,
            'threshold': threshold,
            'severity': 'WARNING' if value < threshold * 1.5 else 'CRITICAL',
            'message': f"{metric} exceeded threshold: {value:.2f} > {threshold:.2f}"
        }
        
        with self._lock:
            self.alerts.append(alert)
        
        logger.warning(f"🚨 ALERT: {alert['message']} (Severity: {alert['severity']})")
        
        # Send alert to external systems (implement as needed)
        self._send_alert(alert)
    
    def _send_alert(self, alert: Dict[str, Any]):
        """Send alert to external systems"""
        try:
            # Log to file
            alert_file = os.getenv('ALERT_LOG_FILE', '/var/log/versant/alerts.log')
            os.makedirs(os.path.dirname(alert_file), exist_ok=True)
            
            with open(alert_file, 'a') as f:
                f.write(json.dumps(alert) + '\n')
            
            # Send to external monitoring (implement as needed)
            # Example: Send to Slack, Discord, email, etc.
            
        except Exception as e:
            logger.error(f"❌ Error sending alert: {e}")
    
    def record_request(self, response_time: float, is_error: bool = False):
        """Record a request"""
        with self._lock:
            self.request_count += 1
            self.response_times.append(response_time)
            
            if is_error:
                self.error_count += 1
    
    def record_db_query(self, query_time: float, is_error: bool = False):
        """Record a database query"""
        with self._lock:
            self.db_query_count += 1
            self.db_query_times.append(query_time)
            
            if is_error:
                self.db_error_count += 1
    
    def record_cache_hit(self):
        """Record a cache hit"""
        with self._lock:
            self.cache_hits += 1
    
    def record_cache_miss(self):
        """Record a cache miss"""
        with self._lock:
            self.cache_misses += 1
    
    def set_active_connections(self, count: int):
        """Set active connection count"""
        with self._lock:
            self.active_connections = count
    
    def set_queue_size(self, size: int):
        """Set queue size"""
        with self._lock:
            self.queue_size = size
    
    def set_db_connection_count(self, count: int):
        """Set database connection count"""
        with self._lock:
            self.db_connection_count = count
    
    def set_cache_size(self, size: int):
        """Set cache size"""
        with self._lock:
            self.cache_size = size
    
    def get_current_metrics(self) -> Dict[str, Any]:
        """Get current metrics"""
        with self._lock:
            return self.current_metrics.copy()
    
    def get_metrics_history(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get metrics history"""
        with self._lock:
            return list(self.metrics_history)[-limit:]
    
    def get_alerts(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent alerts"""
        with self._lock:
            return list(self.alerts)[-limit:]
    
    def get_performance_summary(self) -> Dict[str, Any]:
        """Get performance summary"""
        with self._lock:
            if not self.current_metrics:
                return {}
            
            # Calculate trends
            recent_metrics = list(self.metrics_history)[-10:]  # Last 10 data points
            if len(recent_metrics) >= 2:
                cpu_trend = recent_metrics[-1]['cpu_percent'] - recent_metrics[0]['cpu_percent']
                memory_trend = recent_metrics[-1]['memory_percent'] - recent_metrics[0]['memory_percent']
            else:
                cpu_trend = 0
                memory_trend = 0
            
            return {
                'current_metrics': self.current_metrics,
                'trends': {
                    'cpu_trend': cpu_trend,
                    'memory_trend': memory_trend
                },
                'recent_alerts': list(self.alerts)[-5:],
                'status': self._get_system_status()
            }
    
    def _get_system_status(self) -> str:
        """Get overall system status"""
        if not self.current_metrics:
            return 'UNKNOWN'
        
        # Check critical metrics
        critical_metrics = ['cpu_percent', 'memory_percent', 'error_rate']
        for metric in critical_metrics:
            if metric in self.current_metrics:
                value = self.current_metrics[metric]
                threshold = self.alert_thresholds.get(metric, 100)
                if value > threshold * 1.5:  # 50% above threshold
                    return 'CRITICAL'
                elif value > threshold:
                    return 'WARNING'
        
        return 'HEALTHY'
    
    def reset_metrics(self):
        """Reset all metrics"""
        with self._lock:
            self.request_count = 0
            self.error_count = 0
            self.response_times.clear()
            self.db_query_count = 0
            self.db_error_count = 0
            self.db_query_times.clear()
            self.cache_hits = 0
            self.cache_misses = 0
            self.active_connections = 0
            self.queue_size = 0
            self.db_connection_count = 0
            self.cache_size = 0
        
        logger.info("📊 Metrics reset")

# Global performance monitor instance
performance_monitor = PerformanceMonitor()

# Decorator for monitoring function performance
def monitor_performance(func_name: str = None):
    """Decorator for monitoring function performance"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            is_error = False
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                is_error = True
                raise
            finally:
                end_time = time.time()
                response_time = end_time - start_time
                
                # Record metrics
                performance_monitor.record_request(response_time, is_error)
                
                # Log slow requests
                if response_time > 1.0:  # Log requests taking more than 1 second
                    logger.warning(f"🐌 Slow request: {func_name or func.__name__} took {response_time:.2f}s")
        
        return wrapper
    return decorator

# Database query monitoring
def monitor_db_query(query_name: str = None):
    """Decorator for monitoring database queries"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            start_time = time.time()
            is_error = False
            
            try:
                result = func(*args, **kwargs)
                return result
            except Exception as e:
                is_error = True
                raise
            finally:
                end_time = time.time()
                query_time = end_time - start_time
                
                # Record database metrics
                performance_monitor.record_db_query(query_time, is_error)
                
                # Log slow queries
                if query_time > 0.5:  # Log queries taking more than 500ms
                    logger.warning(f"🐌 Slow DB query: {query_name or func.__name__} took {query_time:.2f}s")
        
        return wrapper
    return decorator

# Health check endpoint data
def get_health_status() -> Dict[str, Any]:
    """Get health status for health check endpoint"""
    metrics = performance_monitor.get_current_metrics()
    if not metrics:
        return {'status': 'UNKNOWN', 'message': 'No metrics available'}
    
    status = performance_monitor._get_system_status()
    
    return {
        'status': status,
        'timestamp': datetime.now().isoformat(),
        'uptime': time.time() - psutil.Process().create_time(),
        'metrics': {
            'cpu_percent': metrics.get('cpu_percent', 0),
            'memory_percent': metrics.get('memory_percent', 0),
            'request_count': metrics.get('request_count', 0),
            'error_rate': metrics.get('error_rate', 0),
            'active_connections': metrics.get('active_connections', 0)
        }
    }

# Performance logging
def log_performance_summary():
    """Log performance summary"""
    summary = performance_monitor.get_performance_summary()
    if not summary or 'current_metrics' not in summary:
        return
    
    metrics = summary['current_metrics']
    status = summary['status']
    
    logger.info(f"📊 Performance Summary - Status: {status}")
    logger.info(f"   CPU: {metrics.get('cpu_percent', 0):.1f}%")
    logger.info(f"   Memory: {metrics.get('memory_percent', 0):.1f}%")
    logger.info(f"   Requests: {metrics.get('request_count', 0):,}")
    logger.info(f"   Error Rate: {metrics.get('error_rate', 0):.2f}%")
    logger.info(f"   Active Connections: {metrics.get('active_connections', 0)}")
    logger.info(f"   Avg Response Time: {metrics.get('avg_response_time', 0):.3f}s")

# Start performance logging
def start_performance_logging():
    """Start background performance logging"""
    def log_performance():
        while True:
            time.sleep(300)  # Log every 5 minutes
            log_performance_summary()
    
    perf_thread = threading.Thread(target=log_performance, daemon=True)
    perf_thread.start()
    logger.info("📊 Performance logging started")

# Start performance logging
start_performance_logging()
