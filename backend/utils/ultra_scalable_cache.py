"""
Ultra-scalable caching system for 1000+ concurrent users
Supports both in-memory and Redis caching with intelligent fallback
"""

import time
import threading
import json
import hashlib
import logging
from typing import Any, Optional, Dict, List, Callable
from functools import wraps
import weakref
import gc

logger = logging.getLogger(__name__)

class UltraScalableCache:
    """Ultra-scalable caching system with multiple tiers"""
    
    def __init__(self, max_memory_items: int = 50000, default_ttl: int = 300):
        self.max_memory_items = max_memory_items
        self.default_ttl = default_ttl
        
        # Memory cache
        self.memory_cache = {}
        self.access_times = {}
        self.expiry_times = {}
        self.cache_stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'sets': 0
        }
        self._lock = threading.RLock()
        
        # Redis cache (if available)
        self.redis_client = None
        self.redis_available = False
        self._init_redis()
        
        # Background cleanup
        self._start_cleanup_thread()
        
        logger.info(f"🚀 Ultra-scalable cache initialized")
        logger.info(f"   Memory items: {max_memory_items:,}")
        logger.info(f"   Redis available: {self.redis_available}")
        logger.info(f"   Default TTL: {default_ttl}s")
    
    def _init_redis(self):
        """Initialize Redis client if available"""
        try:
            import redis
            from redis.sentinel import Sentinel
            
            # Try to connect to Redis
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379/0')
            self.redis_client = redis.from_url(redis_url, decode_responses=True)
            
            # Test connection
            self.redis_client.ping()
            self.redis_available = True
            logger.info("✅ Redis cache connected successfully")
            
        except ImportError:
            logger.warning("⚠️ Redis not available - using memory cache only")
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed: {e} - using memory cache only")
            self.redis_available = False
    
    def _start_cleanup_thread(self):
        """Start background cleanup thread"""
        def cleanup_worker():
            while True:
                try:
                    time.sleep(60)  # Cleanup every minute
                    self._cleanup_expired()
                    self._cleanup_lru()
                except Exception as e:
                    logger.error(f"❌ Cache cleanup error: {e}")
        
        cleanup_thread = threading.Thread(target=cleanup_worker, daemon=True)
        cleanup_thread.start()
        logger.info("🧹 Cache cleanup thread started")
    
    def _cleanup_expired(self):
        """Remove expired items from memory cache"""
        with self._lock:
            current_time = time.time()
            expired_keys = []
            
            for key, expiry_time in self.expiry_times.items():
                if current_time > expiry_time:
                    expired_keys.append(key)
            
            for key in expired_keys:
                self._remove_from_memory(key)
            
            if expired_keys:
                logger.info(f"🧹 Cleaned up {len(expired_keys)} expired cache items")
    
    def _cleanup_lru(self):
        """Remove least recently used items if cache is full"""
        with self._lock:
            if len(self.memory_cache) <= self.max_memory_items:
                return
            
            # Sort by access time and remove oldest
            items_to_remove = len(self.memory_cache) - self.max_memory_items
            sorted_items = sorted(self.access_times.items(), key=lambda x: x[1])
            
            for i in range(min(items_to_remove, len(sorted_items))):
                key = sorted_items[i][0]
                self._remove_from_memory(key)
            
            if items_to_remove > 0:
                logger.info(f"🧹 Evicted {items_to_remove} LRU cache items")
                self.cache_stats['evictions'] += items_to_remove
    
    def _remove_from_memory(self, key: str):
        """Remove item from memory cache"""
        if key in self.memory_cache:
            del self.memory_cache[key]
        if key in self.access_times:
            del self.access_times[key]
        if key in self.expiry_times:
            del self.expiry_times[key]
    
    def _generate_key(self, prefix: str, *args, **kwargs) -> str:
        """Generate cache key from arguments"""
        key_data = {
            'prefix': prefix,
            'args': args,
            'kwargs': sorted(kwargs.items()) if kwargs else {}
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return hashlib.md5(key_string.encode()).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache (Redis first, then memory)"""
        # Try Redis first
        if self.redis_available:
            try:
                value = self.redis_client.get(key)
                if value is not None:
                    self.cache_stats['hits'] += 1
                    return json.loads(value)
            except Exception as e:
                logger.warning(f"⚠️ Redis get error: {e}")
        
        # Try memory cache
        with self._lock:
            if key in self.memory_cache:
                current_time = time.time()
                
                # Check if expired
                if key in self.expiry_times and current_time > self.expiry_times[key]:
                    self._remove_from_memory(key)
                    self.cache_stats['misses'] += 1
                    return None
                
                # Update access time
                self.access_times[key] = current_time
                self.cache_stats['hits'] += 1
                return self.memory_cache[key]
        
        self.cache_stats['misses'] += 1
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache (both Redis and memory)"""
        if ttl is None:
            ttl = self.default_ttl
        
        success = True
        
        # Set in Redis
        if self.redis_available:
            try:
                serialized_value = json.dumps(value)
                self.redis_client.setex(key, ttl, serialized_value)
            except Exception as e:
                logger.warning(f"⚠️ Redis set error: {e}")
                success = False
        
        # Set in memory cache
        with self._lock:
            current_time = time.time()
            self.memory_cache[key] = value
            self.access_times[key] = current_time
            self.expiry_times[key] = current_time + ttl
            self.cache_stats['sets'] += 1
        
        return success
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        success = True
        
        # Delete from Redis
        if self.redis_available:
            try:
                self.redis_client.delete(key)
            except Exception as e:
                logger.warning(f"⚠️ Redis delete error: {e}")
                success = False
        
        # Delete from memory
        with self._lock:
            self._remove_from_memory(key)
        
        return success
    
    def clear(self, pattern: str = None) -> int:
        """Clear cache entries (optionally by pattern)"""
        cleared_count = 0
        
        # Clear Redis
        if self.redis_available:
            try:
                if pattern:
                    keys = self.redis_client.keys(pattern)
                    if keys:
                        cleared_count += self.redis_client.delete(*keys)
                else:
                    cleared_count += self.redis_client.flushdb()
            except Exception as e:
                logger.warning(f"⚠️ Redis clear error: {e}")
        
        # Clear memory cache
        with self._lock:
            if pattern:
                keys_to_remove = [k for k in self.memory_cache.keys() if pattern in k]
                for key in keys_to_remove:
                    self._remove_from_memory(key)
                cleared_count += len(keys_to_remove)
            else:
                cleared_count += len(self.memory_cache)
                self.memory_cache.clear()
                self.access_times.clear()
                self.expiry_times.clear()
        
        logger.info(f"🧹 Cleared {cleared_count} cache entries")
        return cleared_count
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        with self._lock:
            total_requests = self.cache_stats['hits'] + self.cache_stats['misses']
            hit_rate = (self.cache_stats['hits'] / total_requests * 100) if total_requests > 0 else 0
            
            return {
                'memory_items': len(self.memory_cache),
                'max_memory_items': self.max_memory_items,
                'redis_available': self.redis_available,
                'hits': self.cache_stats['hits'],
                'misses': self.cache_stats['misses'],
                'hit_rate': round(hit_rate, 2),
                'evictions': self.cache_stats['evictions'],
                'sets': self.cache_stats['sets']
            }
    
    def invalidate_pattern(self, pattern: str) -> int:
        """Invalidate cache entries matching pattern"""
        return self.clear(pattern)

# Global ultra-scalable cache instance
ultra_cache = UltraScalableCache(max_memory_items=50000, default_ttl=300)

def cached(prefix: str, ttl: int = 300, key_func: Optional[Callable] = None):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            if key_func:
                cache_key = key_func(*args, **kwargs)
            else:
                cache_key = ultra_cache._generate_key(prefix, func.__name__, *args, **kwargs)
            
            # Try to get from cache
            result = ultra_cache.get(cache_key)
            if result is not None:
                return result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            ultra_cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator

def cache_invalidate(prefix: str, pattern: str = None):
    """Decorator for invalidating cache on function execution"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            result = func(*args, **kwargs)
            
            # Invalidate cache
            if pattern:
                ultra_cache.invalidate_pattern(pattern)
            else:
                ultra_cache.invalidate_pattern(f"{prefix}:*")
            
            return result
        
        return wrapper
    return decorator

# Cache management functions
def get_cache_stats() -> Dict[str, Any]:
    """Get current cache statistics"""
    return ultra_cache.get_stats()

def clear_cache(pattern: str = None) -> int:
    """Clear cache entries"""
    return ultra_cache.clear(pattern)

def warm_cache(cache_entries: List[Dict[str, Any]]):
    """Warm up cache with predefined entries"""
    logger.info(f"🔥 Warming cache with {len(cache_entries)} entries...")
    
    for entry in cache_entries:
        ultra_cache.set(
            entry['key'],
            entry['value'],
            entry.get('ttl', 300)
        )
    
    logger.info("✅ Cache warming completed")

# Performance monitoring
def log_cache_performance():
    """Log cache performance metrics"""
    stats = ultra_cache.get_stats()
    logger.info("📊 Cache Performance:")
    logger.info(f"   Memory Items: {stats['memory_items']:,}/{stats['max_memory_items']:,}")
    logger.info(f"   Hit Rate: {stats['hit_rate']}%")
    logger.info(f"   Total Requests: {stats['hits'] + stats['misses']:,}")
    logger.info(f"   Evictions: {stats['evictions']:,}")
    logger.info(f"   Redis Available: {stats['redis_available']}")

# Background performance logging
def start_performance_logging():
    """Start background performance logging"""
    def log_performance():
        while True:
            time.sleep(300)  # Log every 5 minutes
            log_cache_performance()
    
    perf_thread = threading.Thread(target=log_performance, daemon=True)
    perf_thread.start()
    logger.info("📊 Cache performance logging started")

# Start performance logging
start_performance_logging()
