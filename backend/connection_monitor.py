#!/usr/bin/env python3
"""
MongoDB Connection Health Monitor
Monitors and maintains database connection health for high-load applications
"""

import time
import threading
import logging
from config.database import DatabaseConfig

logger = logging.getLogger(__name__)

class ConnectionMonitor:
    """Monitor and maintain MongoDB connection health"""
    
    def __init__(self, check_interval=30):
        self.check_interval = check_interval
        self.is_running = False
        self.monitor_thread = None
        self.last_health_check = None
        self.connection_errors = 0
        self.max_errors = 5
        
    def start_monitoring(self):
        """Start the connection monitoring thread"""
        if self.is_running:
            return
            
        self.is_running = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("🔍 MongoDB connection monitor started")
        
    def stop_monitoring(self):
        """Stop the connection monitoring thread"""
        self.is_running = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=5)
        logger.info("⏹️ MongoDB connection monitor stopped")
        
    def _monitor_loop(self):
        """Main monitoring loop"""
        while self.is_running:
            try:
                self._check_connection_health()
                time.sleep(self.check_interval)
            except Exception as e:
                logger.error(f"❌ Connection monitor error: {e}")
                time.sleep(self.check_interval)
                
    def _check_connection_health(self):
        """Check database connection health"""
        try:
            # Test connection
            client = DatabaseConfig.get_client()
            client.admin.command('ping')
            
            # Reset error counter on successful connection
            self.connection_errors = 0
            self.last_health_check = time.time()
            
            logger.debug("✅ Database connection health check passed")
            
        except Exception as e:
            self.connection_errors += 1
            logger.warning(f"⚠️ Database connection health check failed (Error {self.connection_errors}/{self.max_errors}): {e}")
            
            # If too many errors, try to reconnect
            if self.connection_errors >= self.max_errors:
                logger.error(f"🚨 Too many connection errors ({self.connection_errors}), attempting reconnection...")
                self._force_reconnection()
                
    def _force_reconnection(self):
        """Force reconnection by creating a new client"""
        try:
            # Force garbage collection to close old connections
            import gc
            gc.collect()
            
            # Wait a bit before reconnecting
            time.sleep(5)
            
            # Test new connection
            client = DatabaseConfig.get_client()
            client.admin.command('ping')
            
            self.connection_errors = 0
            logger.info("✅ Database reconnection successful")
            
        except Exception as e:
            logger.error(f"❌ Database reconnection failed: {e}")
            
    def get_health_status(self):
        """Get current connection health status"""
        return {
            'is_healthy': self.connection_errors < self.max_errors,
            'connection_errors': self.connection_errors,
            'last_check': self.last_health_check,
            'is_monitoring': self.is_running
        }

# Global monitor instance
connection_monitor = ConnectionMonitor()

def start_connection_monitoring():
    """Start the global connection monitor"""
    connection_monitor.start_monitoring()

def stop_connection_monitoring():
    """Stop the global connection monitor"""
    connection_monitor.stop_monitoring()

def get_connection_health():
    """Get current connection health status"""
    return connection_monitor.get_health_status()
