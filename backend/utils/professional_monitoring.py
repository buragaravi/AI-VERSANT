"""
Professional Monitoring System for AI-VERSANT
Uses Flask-MonitoringDashboard and Prometheus for enterprise-grade analytics
"""

import os
import time
import psutil
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_monitoringdashboard import config
from flask_monitoringdashboard import bind
from prometheus_flask_exporter import PrometheusMetrics
import logging

class ProfessionalMonitoring:
    def __init__(self, app):
        self.app = app
        self.metrics = None
        self.setup_monitoring()
        
    def setup_monitoring(self):
        """Setup professional monitoring with Flask-MonitoringDashboard and Prometheus"""
        
        try:
            # Configure Flask-MonitoringDashboard
            config.database_name = 'sqlite:///monitoring_dashboard.db'
            config.username = 'admin'
            config.password = 'admin123'  # Change in production
            config.blueprint_name = 'monitoring'
            config.link = '/dashboard'
            config.sampling_rate = 1.0  # Monitor 100% of requests
            config.measure_func = self.custom_measure_function
            
            # Initialize monitoring
            bind(self.app)
            print("✅ Flask-MonitoringDashboard initialized successfully")
            
        except Exception as e:
            print(f"⚠️ Warning: Flask-MonitoringDashboard initialization failed: {e}")
            print("   Continuing with Prometheus metrics only...")
        
        try:
            # Setup Prometheus metrics
            self.metrics = PrometheusMetrics(self.app, group_by='endpoint')
            print("✅ Prometheus metrics initialized successfully")
            
            # Add custom metrics
            self.setup_custom_metrics()
            
        except Exception as e:
            print(f"⚠️ Warning: Prometheus metrics initialization failed: {e}")
            self.metrics = None
        
        # Setup logging
        self.setup_logging()
        
    def custom_measure_function(self, func):
        """Custom measurement function for detailed monitoring"""
        def wrapper(*args, **kwargs):
            start_time = time.time()
            start_memory = psutil.Process().memory_info().rss
            
            try:
                result = func(*args, **kwargs)
                status = 'success'
                return result
            except Exception as e:
                status = 'error'
                raise
            finally:
                end_time = time.time()
                end_memory = psutil.Process().memory_info().rss
                
                # Log detailed metrics
                self.log_request_metrics(
                    func.__name__,
                    end_time - start_time,
                    end_memory - start_memory,
                    status
                )
                
        return wrapper
    
    def setup_custom_metrics(self):
        """Setup custom Prometheus metrics"""
        
        if not self.metrics:
            print("⚠️ Skipping custom metrics setup - Prometheus not available")
            return
        
        try:
            # Custom metrics
            self.request_duration = self.metrics.histogram(
                'request_duration_seconds',
                'Request duration in seconds',
                ['method', 'endpoint', 'status']
            )
            
            self.request_count = self.metrics.counter(
                'request_total',
                'Total number of requests',
                ['method', 'endpoint', 'status']
            )
            
            self.active_connections = self.metrics.gauge(
                'active_connections',
                'Number of active connections'
            )
            
            self.memory_usage = self.metrics.gauge(
                'memory_usage_bytes',
                'Memory usage in bytes'
            )
            
            self.cpu_usage = self.metrics.gauge(
                'cpu_usage_percent',
                'CPU usage percentage'
            )
            
            # Update system metrics every 30 seconds
            self.start_system_metrics_updater()
            print("✅ Custom metrics setup completed")
            
        except Exception as e:
            print(f"⚠️ Warning: Custom metrics setup failed: {e}")
            # Set default values to prevent errors
            self.request_duration = None
            self.request_count = None
            self.active_connections = None
            self.memory_usage = None
            self.cpu_usage = None
    
    def setup_logging(self):
        """Setup comprehensive logging"""
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler('monitoring.log'),
                logging.StreamHandler()
            ]
        )
        
        self.logger = logging.getLogger('monitoring')
    
    def start_system_metrics_updater(self):
        """Start background task to update system metrics"""
        import threading
        
        def update_metrics():
            while True:
                try:
                    # Update memory usage
                    if self.memory_usage:
                        memory_info = psutil.Process().memory_info()
                        self.memory_usage.set(memory_info.rss)
                    
                    # Update CPU usage
                    if self.cpu_usage:
                        cpu_percent = psutil.cpu_percent()
                        self.cpu_usage.set(cpu_percent)
                    
                    # Update active connections
                    if self.active_connections:
                        connections = len(psutil.Process().connections())
                        self.active_connections.set(connections)
                    
                    time.sleep(30)  # Update every 30 seconds
                except Exception as e:
                    if hasattr(self, 'logger'):
                        self.logger.error(f"Error updating system metrics: {e}")
                    else:
                        print(f"Error updating system metrics: {e}")
                    time.sleep(60)  # Wait longer on error
        
        thread = threading.Thread(target=update_metrics, daemon=True)
        thread.start()
    
    def log_request_metrics(self, endpoint, duration, memory_delta, status):
        """Log detailed request metrics"""
        self.logger.info(f"Request: {endpoint}, Duration: {duration:.3f}s, Memory: {memory_delta} bytes, Status: {status}")
    
    def get_system_health(self):
        """Get comprehensive system health status"""
        try:
            # System metrics
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Process metrics
            process = psutil.Process()
            process_memory = process.memory_info()
            process_cpu = process.cpu_percent()
            
            # Network metrics
            network = psutil.net_io_counters()
            
            return {
                'timestamp': datetime.now().isoformat(),
                'system': {
                    'memory': {
                        'total': memory.total,
                        'available': memory.available,
                        'used': memory.used,
                        'percentage': memory.percent
                    },
                    'disk': {
                        'total': disk.total,
                        'used': disk.used,
                        'free': disk.free,
                        'percentage': (disk.used / disk.total) * 100
                    },
                    'cpu_percent': cpu_percent
                },
                'process': {
                    'memory_rss': process_memory.rss,
                    'memory_vms': process_memory.vms,
                    'cpu_percent': process_cpu,
                    'num_threads': process.num_threads(),
                    'create_time': process.create_time()
                },
                'network': {
                    'bytes_sent': network.bytes_sent,
                    'bytes_recv': network.bytes_recv,
                    'packets_sent': network.packets_sent,
                    'packets_recv': network.packets_recv
                },
                'status': 'healthy' if memory.percent < 90 and cpu_percent < 90 else 'warning'
            }
        except Exception as e:
            return {
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'status': 'error'
            }
    
    def get_performance_analytics(self):
        """Get performance analytics from monitoring dashboard"""
        try:
            # This would typically query the monitoring dashboard database
            # For now, return a structured response
            return {
                'timestamp': datetime.now().isoformat(),
                'metrics': {
                    'total_requests': 'Available in dashboard',
                    'average_response_time': 'Available in dashboard',
                    'error_rate': 'Available in dashboard',
                    'endpoint_performance': 'Available in dashboard'
                },
                'dashboard_url': '/dashboard',
                'prometheus_metrics': '/metrics'
            }
        except Exception as e:
            return {
                'timestamp': datetime.now().isoformat(),
                'error': str(e),
                'status': 'error'
            }

# Global monitoring instance
monitoring_instance = None

def initialize_professional_monitoring(app):
    """Initialize professional monitoring system"""
    global monitoring_instance
    monitoring_instance = ProfessionalMonitoring(app)
    return monitoring_instance

def get_monitoring_instance():
    """Get the global monitoring instance"""
    return monitoring_instance
