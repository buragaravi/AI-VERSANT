#!/usr/bin/env python3
"""
Performance monitoring script for Study Edge Backend on AWS EC2
Monitors system resources, service health, and performance metrics
"""

import psutil
import subprocess
import time
import json
import os
from datetime import datetime

class EC2PerformanceMonitor:
    def __init__(self):
        self.service_name = "study-edge-backend"
        self.port = 8000
        
    def get_system_info(self):
        """Get system resource information"""
        try:
            memory = psutil.virtual_memory()
            cpu_percent = psutil.cpu_percent(interval=1)
            disk = psutil.disk_usage('/')
            
            return {
                'memory_total_gb': round(memory.total / (1024**3), 2),
                'memory_available_gb': round(memory.available / (1024**3), 2),
                'memory_used_percent': memory.percent,
                'cpu_percent': cpu_percent,
                'disk_total_gb': round(disk.total / (1024**3), 2),
                'disk_used_gb': round(disk.used / (1024**3), 2),
                'disk_used_percent': round((disk.used / disk.total) * 100, 2)
            }
        except Exception as e:
            return {'error': f'Failed to get system info: {e}'}
    
    def get_service_status(self):
        """Check if the service is running"""
        try:
            result = subprocess.run(
                ['systemctl', 'is-active', self.service_name],
                capture_output=True,
                text=True
            )
            is_active = result.stdout.strip() == 'active'
            
            # Get service memory usage
            memory_usage = 0
            process_count = 0
            try:
                result = subprocess.run(
                    ['ps', 'aux'],
                    capture_output=True,
                    text=True
                )
                lines = result.stdout.split('\n')
                for line in lines:
                    if 'gunicorn' in line and 'study-edge' in line:
                        parts = line.split()
                        if len(parts) > 5:
                            memory_usage += float(parts[5])  # RSS in KB
                            process_count += 1
            except:
                pass
            
            return {
                'is_active': is_active,
                'memory_usage_mb': round(memory_usage / 1024, 2),
                'process_count': process_count
            }
        except Exception as e:
            return {'error': f'Failed to get service status: {e}'}
    
    def get_network_connections(self):
        """Get network connection information"""
        try:
            connections = psutil.net_connections()
            port_connections = [conn for conn in connections if conn.laddr.port == self.port]
            
            return {
                'total_connections': len(port_connections),
                'established_connections': len([conn for conn in port_connections if conn.status == 'ESTABLISHED']),
                'listening_connections': len([conn for conn in port_connections if conn.status == 'LISTEN'])
            }
        except Exception as e:
            return {'error': f'Failed to get network info: {e}'}
    
    def get_service_logs(self, lines=10):
        """Get recent service logs"""
        try:
            result = subprocess.run(
                ['journalctl', '-u', self.service_name, '--lines', str(lines), '--no-pager'],
                capture_output=True,
                text=True
            )
            return result.stdout
        except Exception as e:
            return f'Failed to get logs: {e}'
    
    def check_performance_thresholds(self, system_info, service_info):
        """Check if performance is within acceptable thresholds"""
        warnings = []
        
        # Memory warnings
        if system_info.get('memory_used_percent', 0) > 80:
            warnings.append(f"High memory usage: {system_info['memory_used_percent']}%")
        
        # CPU warnings
        if system_info.get('cpu_percent', 0) > 80:
            warnings.append(f"High CPU usage: {system_info['cpu_percent']}%")
        
        # Service memory warnings
        if service_info.get('memory_usage_mb', 0) > 600:
            warnings.append(f"High service memory usage: {service_info['memory_usage_mb']}MB")
        
        # Disk warnings
        if system_info.get('disk_used_percent', 0) > 90:
            warnings.append(f"High disk usage: {system_info['disk_used_percent']}%")
        
        return warnings
    
    def generate_report(self):
        """Generate a comprehensive performance report"""
        print("=" * 60)
        print("📊 Study Edge Backend - EC2 Performance Report")
        print("=" * 60)
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print()
        
        # System information
        print("🖥️  System Resources:")
        system_info = self.get_system_info()
        if 'error' not in system_info:
            print(f"   Memory: {system_info['memory_used_percent']:.1f}% used ({system_info['memory_available_gb']:.1f}GB available)")
            print(f"   CPU: {system_info['cpu_percent']:.1f}%")
            print(f"   Disk: {system_info['disk_used_percent']:.1f}% used ({system_info['disk_used_gb']:.1f}GB used)")
        else:
            print(f"   Error: {system_info['error']}")
        print()
        
        # Service status
        print("🔧 Service Status:")
        service_info = self.get_service_status()
        if 'error' not in service_info:
            status = "✅ Running" if service_info['is_active'] else "❌ Stopped"
            print(f"   Status: {status}")
            print(f"   Memory Usage: {service_info['memory_usage_mb']:.1f}MB")
            print(f"   Worker Processes: {service_info['process_count']}")
        else:
            print(f"   Error: {service_info['error']}")
        print()
        
        # Network connections
        print("🌐 Network Connections:")
        network_info = self.get_network_connections()
        if 'error' not in network_info:
            print(f"   Total Connections: {network_info['total_connections']}")
            print(f"   Established: {network_info['established_connections']}")
            print(f"   Listening: {network_info['listening_connections']}")
        else:
            print(f"   Error: {network_info['error']}")
        print()
        
        # Performance warnings
        warnings = self.check_performance_thresholds(system_info, service_info)
        if warnings:
            print("⚠️  Performance Warnings:")
            for warning in warnings:
                print(f"   - {warning}")
            print()
        
        # Performance rating
        if 'error' not in system_info and 'error' not in service_info:
            memory_ok = system_info['memory_used_percent'] < 80
            cpu_ok = system_info['cpu_percent'] < 80
            service_ok = service_info['is_active']
            
            if memory_ok and cpu_ok and service_ok:
                print("🎯 Performance Rating: EXCELLENT ✅")
            elif memory_ok and service_ok:
                print("🎯 Performance Rating: GOOD ⚠️")
            else:
                print("🎯 Performance Rating: NEEDS ATTENTION ❌")
        
        print("=" * 60)
    
    def monitor_continuous(self, interval=30):
        """Monitor performance continuously"""
        print("🔄 Starting continuous monitoring...")
        print(f"   Update interval: {interval} seconds")
        print("   Press Ctrl+C to stop")
        print()
        
        try:
            while True:
                os.system('clear')  # Clear screen
                self.generate_report()
                time.sleep(interval)
        except KeyboardInterrupt:
            print("\n🛑 Monitoring stopped")

def main():
    monitor = EC2PerformanceMonitor()
    
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--continuous':
        interval = int(sys.argv[2]) if len(sys.argv) > 2 else 30
        monitor.monitor_continuous(interval)
    else:
        monitor.generate_report()

if __name__ == "__main__":
    main()
