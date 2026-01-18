"""
Advanced caching system with intelligent invalidation and multi-layer support.
Provides distributed caching, cache warming, and performance optimization.
"""

import json
import hashlib
import pickle
import time
from typing import Any, Optional, Dict, List, Union, Callable
from datetime import datetime, timedelta
from functools import wraps
from dataclasses import dataclass
from enum import Enum
import asyncio
import logging

logger = logging.getLogger(__name__)

class CacheLayer(Enum):
    """Cache layer types."""
    MEMORY = "memory"
    REDIS = "redis"
    DATABASE = "database"

@dataclass
class CacheConfig:
    """Cache configuration."""
    default_ttl: int = 3600  # 1 hour
    max_size: int = 1000
    enable_compression: bool = True
    enable_serialization: bool = True
    enable_stats: bool = True
    layers: List[CacheLayer] = None
    warm_up_enabled: bool = False
    warm_up_delay: int = 5

@dataclass
class CacheEntry:
    """Cache entry with metadata."""
    key: str
    value: Any
    ttl: int
    created_at: datetime
    accessed_at: datetime
    access_count: int
    size_bytes: int
    layer: CacheLayer
    compressed: bool = False
    serialized: bool = False

class CacheStats:
    """Cache statistics tracking."""
    def __init__(self):
        self.hits = 0
        self.misses = 0
        self.sets = 0
        self.deletes = 0
        self.evictions = 0
        self.compression_saves = 0
        self.layer_stats = {layer: {"hits": 0, "misses": 0, "sets": 0, "deletes": 0} for layer in CacheLayer}
    
    def hit_rate(self) -> float:
        """Calculate hit rate."""
        total = self.hits + self.misses
        return (self.hits / total * 100) if total > 0 else 0.0
    
    def get_layer_hit_rate(self, layer: CacheLayer) -> float:
        """Get hit rate for specific layer."""
        layer_stats = self.layer_stats[layer]
        total = layer_stats["hits"] + layer_stats["misses"]
        return (layer_stats["hits"] / total * 100) if total > 0 else 0.0

class MemoryCache:
    """In-memory cache implementation."""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self.cache = {}
        self.access_order = []
        self.stats = CacheStats()
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache."""
        entry = self.cache.get(key)
        
        if entry:
            # Update access tracking
            entry.accessed_at = datetime.utcnow()
            entry.access_count += 1
            
            # Move to end of access order (LRU)
            self.access_order.remove(key)
            self.access_order.append(key)
            
            self.stats.hits += 1
            self.stats.layer_stats[CacheLayer.MEMORY]["hits"] += 1
            
            return entry.value
        
        self.stats.misses += 1
        self.stats.layer_stats[CacheLayer.MEMORY]["misses"] += 1
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in cache."""
        try:
            # Calculate size (rough estimation)
            size_bytes = len(str(value)) if isinstance(value, str) else len(pickle.dumps(value))
            
            entry = CacheEntry(
                key=key,
                value=value,
                ttl=ttl,
                created_at=datetime.utcnow(),
                accessed_at=datetime.utcnow(),
                access_count=1,
                size_bytes=size_bytes,
                layer=CacheLayer.MEMORY
            )
            
            # Evict if necessary
            if len(self.cache) >= self.max_size:
                self._evict_lru()
            
            self.cache[key] = entry
            self.access_order.append(key)
            
            self.stats.sets += 1
            self.stats.layer_stats[CacheLayer.MEMORY]["sets"] += 1
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set cache entry: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache."""
        if key in self.cache:
            del self.cache[key]
            self.access_order.remove(key)
            
            self.stats.deletes += 1
            self.stats.layer_stats[CacheLayer.MEMORY]["deletes"] += 1
            return True
        
        return False
    
    def clear(self):
        """Clear all cache entries."""
        self.cache.clear()
        self.access_order.clear()
        self.stats.evictions += len(self.cache)
    
    def _evict_lru(self):
        """Evict least recently used entry."""
        if self.access_order:
            lru_key = self.access_order.pop(0)
            del self.cache[lru_key]
            self.stats.evictions += 1
    
    def get_stats(self) -> CacheStats:
        """Get cache statistics."""
        return self.stats

class RedisCache:
    """Redis cache implementation."""
    
    def __init__(self, redis_client=None):
        self.redis = redis_client
        self.stats = CacheStats()
        self.key_prefix = "cache:"
    
    def _make_key(self, key: str) -> str:
        """Make Redis key with prefix."""
        return f"{self.key_prefix}{key}"
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from Redis cache."""
        try:
            if not self.redis:
                return None
            
            redis_key = self._make_key(key)
            data = self.redis.get(redis_key)
            
            if data:
                # Deserialize
                try:
                    entry = pickle.loads(data)
                    
                    # Update access tracking
                    entry.accessed_at = datetime.utcnow()
                    entry.access_count += 1
                    
                    # Save updated stats
                    self.redis.setex(
                        redis_key,
                        entry.ttl,
                        pickle.dumps(entry)
                    )
                    
                    self.stats.hits += 1
                    self.stats.layer_stats[CacheLayer.REDIS]["hits"] += 1
                    
                    return entry.value
                    
                except Exception as e:
                    logger.error(f"Failed to deserialize cache entry: {e}")
                    self.stats.misses += 1
                    self.stats.layer_stats[CacheLayer.REDIS]["misses"] += 1
                    return None
            else:
                self.stats.misses += 1
                self.stats.layer_stats[CacheLayer.REDIS]["misses"] += 1
                return None
                
        except Exception as e:
            logger.error(f"Failed to get from Redis cache: {e}")
            self.stats.misses += 1
            self.stats.layer_stats[CacheLayer.REDIS]["misses"] += 1
            return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Set value in Redis cache."""
        try:
            if not self.redis:
                return False
            
            # Calculate size
            size_bytes = len(str(value)) if isinstance(value, str) else len(pickle.dumps(value))
            
            entry = CacheEntry(
                key=key,
                value=value,
                ttl=ttl,
                created_at=datetime.utcnow(),
                accessed_at=datetime.utcnow(),
                access_count=1,
                size_bytes=size_bytes,
                layer=CacheLayer.REDIS
            )
            
            redis_key = self._make_key(key)
            serialized = pickle.dumps(entry)
            
            self.redis.setex(redis_key, ttl, serialized)
            
            self.stats.sets += 1
            self.stats.layer_stats[CacheLayer.REDIS]["sets"] += 1
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to set Redis cache entry: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from Redis cache."""
        try:
            if not self.redis:
                return False
            
            redis_key = self._make_key(key)
            
            if self.redis.delete(redis_key):
                self.stats.deletes += 1
                self.stats.layer_stats[CacheLayer.REDIS]["deletes"] += 1
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Failed to delete from Redis cache: {e}")
            return False
    
    def clear(self, pattern: str = None):
        """Clear cache entries."""
        try:
            if not self.redis:
                return
            
            if pattern:
                keys = self.redis.keys(f"{self.key_prefix}{pattern}")
                if keys:
                    self.redis.delete(*keys)
            else:
                keys = self.redis.keys(f"{self.key_prefix}*")
                if keys:
                    self.redis.delete(*keys)
            
            self.stats.evictions += len(keys) if keys else 0
            
        except Exception as e:
            logger.error(f"Failed to clear Redis cache: {e}")
    
    def get_stats(self) -> CacheStats:
        """Get cache statistics."""
        return self.stats

class AdvancedCache:
    """Advanced multi-layer caching system."""
    
    def __init__(self, config: CacheConfig = None):
        self.config = config or CacheConfig()
        self.layers = []
        self.stats = CacheStats()
        
        # Initialize cache layers
        if not self.config.layers:
            self.config.layers = [CacheLayer.MEMORY]
            if hasattr(self, '_redis_client') and self._redis_client:
                self.config.layers.append(CacheLayer.REDIS)
        
        for layer in self.config.layers:
            if layer == CacheLayer.MEMORY:
                self.layers.append(MemoryCache(self.config.max_size))
            elif layer == CacheLayer.REDIS:
                if hasattr(self, '_redis_client') and self._redis_client:
                    self.layers.append(RedisCache(self._redis_client))
        
        # Initialize cache warming
        if self.config.warm_up_enabled:
            self._warm_up_tasks = []
    
    def get(self, key: str) -> Optional[Any]:
        """Get value from cache (layer by layer)."""
        for layer in self.layers:
            value = layer.get(key)
            if value is not None:
                # Promote to higher layers if needed
                self._promote_if_needed(key, value, layer)
                self.stats.hits += 1
                return value
        
        self.stats.misses += 1
        return None
    
    def set(self, key: str, value: Any, ttl: int = None) -> bool:
        """Set value in cache (highest layer first)."""
        ttl = ttl or self.config.default_ttl
        
        # Apply compression if enabled
        processed_value = value
        if self.config.enable_compression and self._should_compress(value):
            processed_value = self._compress(value)
        
        # Apply serialization if enabled
        if self.config.enable_serialization:
            processed_value = self._serialize(processed_value)
        
        # Set in highest layer
        if self.layers:
            success = self.layers[0].set(key, processed_value, ttl)
            if success:
                self.stats.sets += 1
            return success
        
        return False
    
    def delete(self, key: str) -> bool:
        """Delete from all cache layers."""
        success = False
        for layer in self.layers:
            if layer.delete(key):
                success = True
        
        if success:
            self.stats.deletes += 1
        
        return success
    
    def clear(self, pattern: str = None):
        """Clear cache entries from all layers."""
        for layer in self.layers:
            layer.clear(pattern)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        layer_stats = {}
        
        for i, layer in enumerate(self.layers):
            layer_stats[f"layer_{i}"] = layer.get_stats()
        
        return {
            "overall": self.stats,
            "layers": layer_stats,
            "hit_rate": self.stats.hit_rate(),
            "total_entries": sum(len(layer.cache.cache) if hasattr(layer, 'cache') else 0 for layer in self.layers),
            "config": {
                "default_ttl": self.config.default_ttl,
                "max_size": self.config.max_size,
                "enable_compression": self.config.enable_compression,
                "enable_serialization": self.config.enable_serialization,
                "layers": self.config.layers
            }
        }
    
    def _should_compress(self, value: Any) -> bool:
        """Check if value should be compressed."""
        if isinstance(value, str):
            return len(value) > 1024  # Compress strings > 1KB
        elif isinstance(value, (dict, list)):
            return len(str(value)) > 2048  # Compress complex objects > 2KB
        return False
    
    def _compress(self, value: Any) -> Any:
        """Compress value."""
        try:
            import gzip
            return gzip.compress(pickle.dumps(value))
        except Exception as e:
            logger.error(f"Failed to compress value: {e}")
            return value
    
    def _serialize(self, value: Any) -> Any:
        """Serialize value for caching."""
        try:
            return pickle.dumps(value)
        except Exception as e:
            logger.error(f"Failed to serialize value: {e}")
            return value
    
    def _promote_if_needed(self, key: str, value: Any, current_layer):
        """Promote value to higher cache layers if needed."""
        current_index = self.layers.index(current_layer)
        
        # Promote to higher layers
        for i in range(current_index + 1, len(self.layers)):
            self.layers[i].set(key, value, self.config.default_ttl)
    
    def add_warm_up_task(self, key: str, data_fetcher: Callable, ttl: int = None):
        """Add cache warming task."""
        if self.config.warm_up_enabled:
            self._warm_up_tasks.append({
                'key': key,
                'fetcher': data_fetcher,
                'ttl': ttl or self.config.default_ttl,
                'delay': self.config.warm_up_delay
            })
    
    async def warm_up(self):
        """Execute cache warming tasks."""
        if not self._warm_up_tasks:
            return
        
        logger.info(f"Warming up {len(self._warm_up_tasks)} cache entries...")
        
        for task in self._warm_up_tasks:
            try:
                # Add delay to prevent overwhelming the system
                await asyncio.sleep(task['delay'])
                
                # Fetch data and cache it
                value = await task['fetcher']()
                self.set(task['key'], value, task['ttl'])
                
                logger.debug(f"Warmed up cache entry: {task['key']}")
                
            except Exception as e:
                logger.error(f"Failed to warm up cache entry {task['key']}: {e}")
        
        logger.info("Cache warming completed")
    
    def invalidate_pattern(self, pattern: str):
        """Invalidate cache entries matching pattern."""
        logger.info(f"Invalidating cache entries matching pattern: {pattern}")
        self.clear(pattern)
    
    def invalidate_by_tags(self, tags: List[str]):
        """Invalidate cache entries by tags (if implemented)."""
        # This would require tag support in cache entries
        logger.info(f"Invalidating cache entries by tags: {tags}")
        self.clear()

# Global cache instance
_advanced_cache = None

def get_advanced_cache(config: CacheConfig = None) -> AdvancedCache:
    """Get or create global advanced cache instance."""
    global _advanced_cache
    if _advanced_cache is None:
        _advanced_cache = AdvancedCache(config)
    return _advanced_cache

def cache(ttl: int = None, key_prefix: str = "", tags: List[str] = None):
    """Cache decorator with advanced features."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            cache_key = _generate_cache_key(func, args, kwargs, key_prefix)
            
            # Get cache instance
            cache = get_advanced_cache()
            
            # Try to get from cache
            cached_value = cache.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    return decorator

def _generate_cache_key(func, args, kwargs, prefix: str = "") -> str:
    """Generate cache key for function."""
    # Create a unique key based on function name and arguments
    key_parts = [prefix, func.__name__]
    
    # Add argument hash
    if args or kwargs:
        args_str = str(args) + str(sorted(kwargs.items()))
        key_hash = hashlib.md5(args_str.encode()).hexdigest()
        key_parts.append(key_hash)
    
    return ":".join(key_parts)

# Cache warming utilities
class CacheWarmer:
    """Cache warming utilities."""
    
    def __init__(self, cache: AdvancedCache):
        self.cache = cache
        self.warm_up_jobs = []
    
    def add_job(self, key: str, fetcher: Callable, ttl: int = None, priority: int = 0):
        """Add cache warming job."""
        self.warm_up_jobs.append({
            'key': key,
            'fetcher': fetcher,
            'ttl': ttl,
            'priority': priority
        })
    
    async def warm_all(self):
        """Execute all warming jobs."""
        # Sort by priority (higher priority first)
        self.warm_up_jobs.sort(key=lambda x: x['priority'], reverse=True)
        
        for job in self.warm_up_jobs:
            try:
                value = await job['fetcher']()
                self.cache.set(job['key'], value, job['ttl'])
                logger.info(f"Warmed up cache: {job['key']}")
            except Exception as e:
                logger.error(f"Failed to warm up cache {job['key']}: {e}")
    
    def add_character_warming(self):
        """Add character data warming jobs."""
        from app.repositories.character_repository import CharacterRepository
        
        repo = CharacterRepository()
        
        # Warm up popular characters
        self.add_job(
            "featured_characters",
            lambda: repo.get_featured(limit=10),
            ttl=1800,  # 30 minutes
        )
        
        self.add_job(
            "categories",
            lambda: repo.get_categories(),
            ttl=3600  # 1 hour
        )
        
        self.add_job(
            "eras",
            lambda: repo.get_eras(),
            ttl=3600  # 1 hour
        )

# Export cache utilities
__all__ = [
    'AdvancedCache',
    'CacheConfig',
    'CacheStats',
    'CacheLayer',
    'get_advanced_cache',
    'cache',
    'CacheWarmer'
]
