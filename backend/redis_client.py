"""
Redis client for message queuing and caching
Optional - falls back to in-memory storage if Redis is not available
"""
import os
import json
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

logger = logging.getLogger("EcoAtlas.Redis")

# Try to import Redis
try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    logger.warning("Redis not installed. Using in-memory fallback.")

# In-memory fallback storage
_memory_store: Dict[str, Any] = {}
_memory_expiry: Dict[str, datetime] = {}


class RedisClient:
    """Redis client with in-memory fallback"""
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.use_redis = False
        
        if REDIS_AVAILABLE:
            redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
            try:
                self.redis_client = redis.from_url(
                    redis_url,
                    decode_responses=True,
                    socket_connect_timeout=2
                )
                # Test connection
                self.redis_client.ping()
                self.use_redis = True
                logger.info("Redis connected successfully")
            except Exception as e:
                logger.warning(f"Redis connection failed: {e}. Using in-memory fallback.")
                self.use_redis = False
        else:
            logger.info("Using in-memory storage (Redis not available)")
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set a key-value pair with optional TTL (time to live in seconds)"""
        try:
            if self.use_redis and self.redis_client:
                if isinstance(value, (dict, list)):
                    value = json.dumps(value)
                return self.redis_client.set(key, value, ex=ttl) if ttl else self.redis_client.set(key, value)
            else:
                # In-memory fallback
                _memory_store[key] = value
                if ttl:
                    _memory_expiry[key] = datetime.now() + timedelta(seconds=ttl)
                return True
        except Exception as e:
            logger.error(f"Error setting key {key}: {e}")
            return False
    
    def get(self, key: str) -> Optional[Any]:
        """Get a value by key"""
        try:
            if self.use_redis and self.redis_client:
                value = self.redis_client.get(key)
                if value:
                    try:
                        return json.loads(value)
                    except (json.JSONDecodeError, TypeError):
                        return value
                return None
            else:
                # In-memory fallback
                if key in _memory_expiry and datetime.now() > _memory_expiry[key]:
                    del _memory_store[key]
                    del _memory_expiry[key]
                    return None
                return _memory_store.get(key)
        except Exception as e:
            logger.error(f"Error getting key {key}: {e}")
            return None
    
    def delete(self, key: str) -> bool:
        """Delete a key"""
        try:
            if self.use_redis and self.redis_client:
                return bool(self.redis_client.delete(key))
            else:
                # In-memory fallback
                _memory_store.pop(key, None)
                _memory_expiry.pop(key, None)
                return True
        except Exception as e:
            logger.error(f"Error deleting key {key}: {e}")
            return False
    
    def push_queue(self, queue_name: str, value: Any) -> bool:
        """Push a value to a queue (list)"""
        try:
            if self.use_redis and self.redis_client:
                if isinstance(value, (dict, list)):
                    value = json.dumps(value)
                return bool(self.redis_client.lpush(queue_name, value))
            else:
                # In-memory fallback
                if queue_name not in _memory_store:
                    _memory_store[queue_name] = []
                _memory_store[queue_name].insert(0, value)
                return True
        except Exception as e:
            logger.error(f"Error pushing to queue {queue_name}: {e}")
            return False
    
    def pop_queue(self, queue_name: str, timeout: int = 0) -> Optional[Any]:
        """Pop a value from a queue (blocking if timeout > 0)"""
        try:
            if self.use_redis and self.redis_client:
                if timeout > 0:
                    result = self.redis_client.brpop(queue_name, timeout=timeout)
                    if result:
                        _, value = result
                        try:
                            return json.loads(value)
                        except (json.JSONDecodeError, TypeError):
                            return value
                    return None
                else:
                    value = self.redis_client.rpop(queue_name)
                    if value:
                        try:
                            return json.loads(value)
                        except (json.JSONDecodeError, TypeError):
                            return value
                    return None
            else:
                # In-memory fallback
                if queue_name in _memory_store and _memory_store[queue_name]:
                    return _memory_store[queue_name].pop()
                return None
        except Exception as e:
            logger.error(f"Error popping from queue {queue_name}: {e}")
            return None
    
    def queue_length(self, queue_name: str) -> int:
        """Get the length of a queue"""
        try:
            if self.use_redis and self.redis_client:
                return self.redis_client.llen(queue_name)
            else:
                # In-memory fallback
                return len(_memory_store.get(queue_name, []))
        except Exception as e:
            logger.error(f"Error getting queue length for {queue_name}: {e}")
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if a key exists"""
        try:
            if self.use_redis and self.redis_client:
                return bool(self.redis_client.exists(key))
            else:
                # In-memory fallback
                if key in _memory_expiry and datetime.now() > _memory_expiry[key]:
                    del _memory_store[key]
                    del _memory_expiry[key]
                    return False
                return key in _memory_store
        except Exception as e:
            logger.error(f"Error checking existence of key {key}: {e}")
            return False
    
    def clear_all(self):
        """Clear all data (use with caution!)"""
        try:
            if self.use_redis and self.redis_client:
                self.redis_client.flushdb()
            else:
                # In-memory fallback
                _memory_store.clear()
                _memory_expiry.clear()
        except Exception as e:
            logger.error(f"Error clearing all data: {e}")


# Global Redis client instance
redis_client = RedisClient()
