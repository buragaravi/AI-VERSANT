#!/usr/bin/env python3
"""
MongoDB Connection Pool Manager
Manages connection pools for high-load applications with SSL stability
"""

import threading
import time
import logging
from config.database import DatabaseConfig

logger = logging.getLogger(__name__)

class ConnectionPoolManager:
    """Manages MongoDB connection pools for high load scenarios"""
    
    def __init__(self):
        self._clients = {}
        self._lock = threading.Lock()
        self._max_clients = 5
        self._client_timeout = 300  # 5 minutes
        self._last_cleanup = time.time()
        
    def get_client(self, pool_name="default"):
        """Get a MongoDB client from the pool"""
        with self._lock:
            current_time = time.time()
            
            # Cleanup old clients periodically
            if current_time - self._last_cleanup > 60:  # Every minute
                self._cleanup_old_clients()
                self._last_cleanup = current_time
            
            # Get or create client for this pool
            if pool_name not in self._clients:
                self._clients[pool_name] = {
                    'client': None,
                    'created_at': current_time,
                    'last_used': current_time,
                    'use_count': 0
                }
            
            client_info = self._clients[pool_name]
            
            # Create new client if needed
            if client_info['client'] is None:
                try:
                    client_info['client'] = DatabaseConfig.get_client()
                    client_info['created_at'] = current_time
                    logger.info(f"✅ Created new MongoDB client for pool: {pool_name}")
                except Exception as e:
                    logger.error(f"❌ Failed to create MongoDB client for pool {pool_name}: {e}")
                    raise e
            
            # Update usage info
            client_info['last_used'] = current_time
            client_info['use_count'] += 1
            
            return client_info['client']
    
    def _cleanup_old_clients(self):
        """Clean up old or unused clients"""
        current_time = time.time()
        clients_to_remove = []
        
        for pool_name, client_info in self._clients.items():
            # Remove clients that are too old or haven't been used recently
            if (current_time - client_info['last_used'] > self._client_timeout or
                (client_info['client'] is not None and 
                 current_time - client_info['created_at'] > self._client_timeout * 2)):
                
                try:
                    if client_info['client']:
                        client_info['client'].close()
                    clients_to_remove.append(pool_name)
                    logger.info(f"🧹 Cleaned up old client for pool: {pool_name}")
                except Exception as e:
                    logger.warning(f"⚠️ Error closing client for pool {pool_name}: {e}")
        
        # Remove cleaned up clients
        for pool_name in clients_to_remove:
            del self._clients[pool_name]
    
    def close_all_clients(self):
        """Close all clients in the pool"""
        with self._lock:
            for pool_name, client_info in self._clients.items():
                try:
                    if client_info['client']:
                        client_info['client'].close()
                        logger.info(f"🔒 Closed client for pool: {pool_name}")
                except Exception as e:
                    logger.warning(f"⚠️ Error closing client for pool {pool_name}: {e}")
            
            self._clients.clear()
    
    def get_pool_status(self):
        """Get status of all connection pools"""
        with self._lock:
            current_time = time.time()
            status = {
                'total_pools': len(self._clients),
                'pools': {}
            }
            
            for pool_name, client_info in self._clients.items():
                status['pools'][pool_name] = {
                    'has_client': client_info['client'] is not None,
                    'created_at': client_info['created_at'],
                    'last_used': client_info['last_used'],
                    'use_count': client_info['use_count'],
                    'age_seconds': current_time - client_info['created_at'],
                    'idle_seconds': current_time - client_info['last_used']
                }
            
            return status

# Global pool manager instance
pool_manager = ConnectionPoolManager()

def get_pooled_client(pool_name="default"):
    """Get a MongoDB client from the global pool"""
    return pool_manager.get_client(pool_name)

def close_all_pools():
    """Close all connection pools"""
    pool_manager.close_all_pools()

def get_pool_status():
    """Get status of all connection pools"""
    return pool_manager.get_pool_status()
