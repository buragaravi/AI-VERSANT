"""
Connection Manager for MongoDB
Prevents socket buffer exhaustion on Windows
"""
import threading
import time
from config.database_simple import DatabaseConfig
from pymongo import MongoClient
import logging

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Singleton connection manager to prevent socket exhaustion"""
    _instance = None
    _lock = threading.Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super(ConnectionManager, cls).__new__(cls)
                    cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if not self._initialized:
            self._client = None
            self._db = None
            self._last_used = time.time()
            self._connection_lock = threading.Lock()
            self._initialized = True
    
    def get_client(self):
        """Get MongoDB client with connection pooling"""
        with self._connection_lock:
            current_time = time.time()
            
            # Recreate client if it's been idle for too long or doesn't exist
            if (self._client is None or 
                current_time - self._last_used > 300):  # 5 minutes idle
                
                if self._client:
                    try:
                        self._client.close()
                    except:
                        pass
                
                try:
                    # Create new client with optimized settings
                    self._client = DatabaseConfig.get_client()
                    logger.info("🔄 Created new MongoDB client connection")
                except Exception as e:
                    logger.error(f"❌ Failed to create MongoDB client: {e}")
                    raise
            
            self._last_used = current_time
            return self._client
    
    def get_database(self):
        """Get database instance"""
        if self._db is None:
            self._db = DatabaseConfig.get_database()
        return self._db
    
    def close_connection(self):
        """Close MongoDB connection"""
        with self._connection_lock:
            if self._client:
                try:
                    self._client.close()
                    logger.info("🔌 Closed MongoDB connection")
                except Exception as e:
                    logger.error(f"❌ Error closing MongoDB connection: {e}")
                finally:
                    self._client = None
                    self._db = None
    
    def health_check(self):
        """Check if connection is healthy"""
        try:
            client = self.get_client()
            client.admin.command('ping')
            return True
        except Exception as e:
            logger.error(f"❌ MongoDB health check failed: {e}")
            return False

# Global connection manager instance
connection_manager = ConnectionManager()

def get_mongo_client():
    """Get MongoDB client from connection manager"""
    return connection_manager.get_client()

def get_mongo_database():
    """Get MongoDB database from connection manager"""
    return connection_manager.get_database()

def close_mongo_connection():
    """Close MongoDB connection"""
    connection_manager.close_connection()
