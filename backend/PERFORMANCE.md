# ⚡ Performance Guidelines

## Overview

This document provides comprehensive performance optimization guidelines for the Islamic Characters platform backend, covering database optimization, caching strategies, API performance, and monitoring.

## Performance Targets

### Response Time Targets

| Endpoint Type | Target | Maximum |
|---------------|--------|----------|
| Character List | < 200ms | 500ms |
| Character Detail | < 100ms | 300ms |
| Search | < 300ms | 1s |
| Authentication | < 100ms | 200ms |
| File Upload | < 2s | 5s |

### Throughput Targets

| Metric | Target | Minimum |
|--------|--------|---------|
| Concurrent Users | 1000 | 500 |
| Requests/Second | 500 | 200 |
| Database Connections | 100 | 50 |
| Cache Hit Rate | 90% | 80% |

## Database Optimization

### Indexing Strategy

#### Primary Indexes

```sql
-- Essential indexes for performance
CREATE INDEX CONCURRENTLY idx_characters_id ON islamic_characters(id);
CREATE INDEX CONCURRENTLY idx_characters_slug ON islamic_characters(slug);
CREATE INDEX CONCURRENTLY idx_users_id ON users(id);
CREATE INDEX CONCURRENTLY idx_user_progress_id ON user_progress(id);
```

#### Search Indexes

```sql
-- Full-text search indexes
CREATE INDEX CONCURRENTLY idx_characters_search_gin 
ON islamic_characters USING gin(to_tsvector('arabic', name || ' ' || arabic_name || ' ' || description));

-- Trigram indexes for partial matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX CONCURRENTLY idx_characters_name_trgm 
ON islamic_characters USING gin(name gin_trgm_ops);
CREATE INDEX CONCURRENTLY idx_characters_arabic_name_trgm 
ON islamic_characters USING gin(arabic_name gin_trgm_ops);
```

#### Filter Indexes

```sql
-- Category and era filtering
CREATE INDEX CONCURRENTLY idx_characters_category ON islamic_characters(category);
CREATE INDEX CONCURRENTLY idx_characters_era ON islamic_characters(era);
CREATE INDEX CONCURRENTLY idx_characters_category_era ON islamic_characters(category, era);

-- Featured content
CREATE INDEX CONCURRENTLY idx_characters_featured ON islamic_characters(is_featured, views_count DESC);
CREATE INDEX CONCURRENTLY idx_characters_verified ON islamic_characters(is_verified, created_at DESC);
```

#### Performance Indexes

```sql
-- Sorting and pagination
CREATE INDEX CONCURRENTLY idx_characters_views_desc ON islamic_characters(views_count DESC);
CREATE INDEX CONCURRENTLY idx_characters_likes_desc ON islamic_characters(likes_count DESC);
CREATE INDEX CONCURRENTLY idx_characters_created_desc ON islamic_characters(created_at DESC);
CREATE INDEX CONCURRENTLY idx_characters_updated_desc ON islamic_characters(updated_at DESC);

-- Composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_characters_category_views ON islamic_characters(category, views_count DESC);
CREATE INDEX CONCURRENTLY idx_characters_era_views ON islamic_characters(era, views_count DESC);
```

### Query Optimization

#### Efficient Query Patterns

```python
# GOOD: Use select_related for relationships
characters = db.query(IslamicCharacter)\
    .options(selectinload(IslamicCharacter.progress_records))\
    .filter(IslamicCharacter.category == "الصحابة")\
    .order_by(IslamicCharacter.views_count.desc())\
    .limit(20)\
    .all()

# BAD: N+1 queries
characters = db.query(IslamicCharacter).filter(...).all()
for character in characters:
    progress = db.query(UserProgress).filter(...).first()  # N+1!
```

#### Pagination Optimization

```python
# GOOD: Keyset pagination for large datasets
def get_characters_keyset(cursor=None, limit=20):
    query = db.query(IslamicCharacter)
    
    if cursor:
        # Use cursor for efficient pagination
        query = query.filter(IslamicCharacter.id < cursor)
    
    return query.order_by(IslamicCharacter.id.desc()).limit(limit).all()

# AVOID: OFFSET for large datasets
characters = db.query(IslamicCharacter).offset(10000).limit(20)  # Slow!
```

#### Query Analysis

```sql
-- Analyze slow queries
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM islamic_characters 
WHERE category = 'الصحابة' 
ORDER BY views_count DESC 
LIMIT 20;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes 
WHERE tablename = 'islamic_characters';
```

### Database Configuration

#### PostgreSQL Tuning

```postgresql
# postgresql.conf

# Memory Settings
shared_buffers = 256MB          # 25% of RAM
effective_cache_size = 1GB      # 75% of RAM
work_mem = 4MB                   # Per connection
maintenance_work_mem = 64MB

# Connection Settings
max_connections = 100
superuser_reserved_connections = 3

# WAL Settings
wal_buffers = 16MB
checkpoint_completion_target = 0.9
wal_writer_delay = 200ms

# Query Planner
random_page_cost = 1.1           # For SSD
effective_io_concurrency = 200   # For SSD
```

#### Connection Pooling

```python
# app/database.py
from sqlalchemy import create_engine
from sqlalchemy.pool import QueuePool

engine = create_engine(
    DATABASE_URL,
    poolclass=QueuePool,
    pool_size=20,                  # Base connection pool
    max_overflow=30,               # Additional connections
    pool_timeout=30,               # Wait time for connection
    pool_recycle=3600,             # Recycle connections hourly
    pool_pre_ping=True,            # Validate connections
    echo=False                     # Disable SQL logging in production
)
```

## Caching Strategy

### Cache Hierarchy

#### Level 1: Application Cache (Memory)

```python
# app/cache/memory_cache.py
from functools import lru_cache
import time

class MemoryCache:
    def __init__(self, max_size=1000, ttl=300):
        self.max_size = max_size
        self.ttl = ttl
        self.cache = {}
        self.timestamps = {}
    
    def get(self, key):
        if key not in self.cache:
            return None
        
        if time.time() - self.timestamps[key] > self.ttl:
            self.delete(key)
            return None
        
        return self.cache[key]
    
    def set(self, key, value):
        if len(self.cache) >= self.max_size:
            # Remove oldest entry
            oldest_key = min(self.timestamps, key=self.timestamps.get)
            self.delete(oldest_key)
        
        self.cache[key] = value
        self.timestamps[key] = time.time()
    
    def delete(self, key):
        self.cache.pop(key, None)
        self.timestamps.pop(key, None)

# Usage
memory_cache = MemoryCache(max_size=1000, ttl=300)

@lru_cache(maxsize=128)
def get_character_categories():
    """Cache categories in memory."""
    return db.query(IslamicCharacter.category).distinct().all()
```

#### Level 2: Redis Cache (Distributed)

```python
# app/cache/redis_cache.py
import redis
import json
import pickle
from typing import Any, Optional

class RedisCache:
    def __init__(self, redis_url: str):
        self.redis_client = redis.from_url(redis_url, decode_responses=False)
    
    def get(self, key: str) -> Optional[Any]:
        try:
            data = self.redis_client.get(key)
            if data:
                return pickle.loads(data)
        except Exception as e:
            logger.error(f"Redis get error: {e}")
        return None
    
    def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        try:
            data = pickle.dumps(value)
            return self.redis_client.setex(key, ttl, data)
        except Exception as e:
            logger.error(f"Redis set error: {e}")
            return False
    
    def delete(self, key: str) -> bool:
        try:
            return bool(self.redis_client.delete(key))
        except Exception as e:
            logger.error(f"Redis delete error: {e}")
            return False
    
    def invalidate_pattern(self, pattern: str) -> int:
        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            logger.error(f"Redis invalidate pattern error: {e}")
            return 0

# Usage
redis_cache = RedisCache(settings.REDIS_URL)
```

### Cache Implementation

#### Character Caching

```python
# app/cache/character_cache.py
from functools import wraps
from app.cache.redis_cache import redis_cache

def cache_character_detail(ttl: int = 600):
    """Cache character detail responses."""
    def decorator(func):
        @wraps(func)
        async def wrapper(character_id: str | int, *args, **kwargs):
            cache_key = f"character:detail:{character_id}"
            
            # Try cache first
            cached_result = redis_cache.get(cache_key)
            if cached_result:
                return cached_result
            
            # Execute function
            result = await func(character_id, *args, **kwargs)
            
            # Cache result
            redis_cache.set(cache_key, result, ttl)
            return result
        
        return wrapper
    return decorator

@cache_character_detail(ttl=600)
async def get_character_detail(character_id: str | int):
    """Get character detail with caching."""
    # Database query logic here
    pass
```

#### Search Caching

```python
# app/cache/search_cache.py
class SearchCache:
    def __init__(self, redis_client):
        self.redis = redis_client
        self.cache_ttl = 120  # 2 minutes
    
    def get_search_key(self, query: str, filters: dict) -> str:
        """Generate cache key for search."""
        filter_str = json.dumps(filters, sort_keys=True)
        return f"search:{hashlib.md5(f"{query}:{filter_str}".encode()).hexdigest()}"
    
    async def get_search_results(self, query: str, filters: dict) -> Optional[list]:
        """Get cached search results."""
        cache_key = self.get_search_key(query, filters)
        return self.redis.get(cache_key)
    
    async def cache_search_results(self, query: str, filters: dict, results: list):
        """Cache search results."""
        cache_key = self.get_search_key(query, filters)
        self.redis.setex(cache_key, self.cache_ttl, results)
    
    async def invalidate_search_cache(self):
        """Invalidate all search cache."""
        pattern = "search:*"
        keys = self.redis.keys(pattern)
        if keys:
            self.redis.delete(*keys)
```

### Cache Invalidation

#### Smart Invalidation

```python
# app/cache/invalidation.py
class CacheInvalidator:
    def __init__(self, redis_client):
        self.redis = redis_client
    
    def invalidate_character(self, character_id: str | int):
        """Invalidate all character-related cache."""
        patterns = [
            f"character:detail:{character_id}",
            f"character:list:*",  # List pages containing this character
            f"search:*",          # Search results
            f"featured:*",        # Featured content
        ]
        
        for pattern in patterns:
            if "*" in pattern:
                keys = self.redis.keys(pattern)
                if keys:
                    self.redis.delete(*keys)
            else:
                self.redis.delete(pattern)
    
    def invalidate_category(self, category: str):
        """Invalidate category-related cache."""
        patterns = [
            f"categories:*",
            f"character:list:category:{category}",
            f"search:*",
        ]
        
        for pattern in patterns:
            keys = self.redis.keys(pattern)
            if keys:
                self.redis.delete(*keys)
```

## API Performance

### Response Optimization

#### Efficient Serialization

```python
# app/schemas/optimized.py
from pydantic import BaseModel
from typing import List, Optional

class CharacterListResponse(BaseModel):
    """Optimized character list response."""
    id: int
    name: str
    arabic_name: str
    title: Optional[str]
    description: Optional[str]
    category: str
    era: str
    slug: str
    profile_image: Optional[str]
    views_count: int
    likes_count: int
    is_featured: bool
    
    class Config:
        from_attributes = True
        # Optimize for JSON serialization
        json_encoders = {
            # Custom encoders if needed
        }

# Use response_model to limit data
@router.get("/", response_model=List[CharacterListResponse])
async def get_characters_list():
    """Return optimized character list."""
    pass
```

#### Pagination Optimization

```python
# app/api/pagination.py
from fastapi import Query
from typing import Generic, TypeVar, List
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    items: List[T]
    total: int
    page: int
    limit: int
    pages: int
    has_next: bool
    has_prev: bool

def paginate(query, page: int, limit: int) -> PaginatedResponse:
    """Efficient pagination implementation."""
    # Get total count
    total = query.count()
    
    # Calculate pagination
    pages = (total + limit - 1) // limit
    offset = (page - 1) * limit
    
    # Get items
    items = query.offset(offset).limit(limit).all()
    
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        limit=limit,
        pages=pages,
        has_next=page < pages,
        has_prev=page > 1
    )
```

#### Async Database Operations

```python
# app/database/async_ops.py
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

async_engine = create_async_engine(
    DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=20,
    max_overflow=30,
    echo=False
)

AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

async def get_async_db():
    async with AsyncSessionLocal() as session:
        yield session

# Usage in endpoints
@router.get("/characters")
async def get_characters_async(db: AsyncSession = Depends(get_async_db)):
    """Async character retrieval."""
    result = await db.execute(
        select(IslamicCharacter)
        .options(selectinload(IslamicCharacter.progress_records))
        .limit(20)
    )
    return result.scalars().all()
```

### Request Optimization

#### Request Validation

```python
# app/validation/optimized.py
from pydantic import BaseModel, validator
from typing import Optional

class SearchRequest(BaseModel):
    """Optimized search request validation."""
    q: str = Field(..., min_length=1, max_length=100)
    category: Optional[str] = None
    era: Optional[str] = None
    limit: int = Field(20, ge=1, le=100)
    offset: int = Field(0, ge=0)
    
    @validator('q')
    def validate_query(cls, v):
        # Sanitize and optimize query
        return v.strip().lower()[:100]
    
    @validator('category')
    def validate_category(cls, v):
        if v and v not in ALLOWED_CATEGORIES:
            raise ValueError('Invalid category')
        return v

# Fast validation prevents unnecessary database queries
```

#### Batch Operations

```python
# app/services/batch_operations.py
from sqlalchemy import select, update, delete
from sqlalchemy.dialects.postgresql import insert

class BatchCharacterService:
    @staticmethod
    async def update_view_counts(character_ids: List[int], db: Session):
        """Batch update view counts."""
        stmt = (
            update(IslamicCharacter)
            .where(IslamicCharacter.id.in_(character_ids))
            .values(views_count=IslamicCharacter.views_count + 1)
            .returning(IslamicCharacter.id)
        )
        result = db.execute(stmt)
        db.commit()
        return result.scalars().all()
    
    @staticmethod
    async def bulk_insert_characters(characters: List[dict], db: Session):
        """Bulk insert characters."""
        stmt = insert(IslamicCharacter).returning(IslamicCharacter.id)
        result = db.execute(stmt, characters)
        db.commit()
        return result.scalars().all()
```

## Frontend Optimization

### API Response Compression

```python
# app/middleware/compression.py
from fastapi import Request, Response
import gzip
import io

class CompressionMiddleware:
    def __init__(self, app, minimum_size: int = 500):
        self.app = app
        self.minimum_size = minimum_size
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            # Check if client accepts gzip
            accept_encoding = request.headers.get("accept-encoding", "")
            if "gzip" not in accept_encoding:
                await self.app(scope, receive, send)
                return
            
            # Process request and get response
            response = await self.call_app(scope, receive, send)
            
            # Compress response if needed
            if (
                len(response.body) >= self.minimum_size and
                "text" in response.headers.get("content-type", "")
            ):
                compressed_body = self.compress(response.body)
                
                # Update response headers
                response.headers["content-encoding"] = "gzip"
                response.headers["content-length"] = str(len(compressed_body))
                response.body = compressed_body
        
        await self.app(scope, receive, send)
    
    def compress(self, data: bytes) -> bytes:
        """Compress data using gzip."""
        buffer = io.BytesIO()
        with gzip.GzipFile(fileobj=buffer, mode="wb") as f:
            f.write(data)
        return buffer.getvalue()

# Add to middleware
app.add_middleware(CompressionMiddleware, minimum_size=500)
```

### Static File Optimization

```python
# app/middleware/static_optimization.py
from fastapi.staticfiles import StaticFiles
from fastapi import Response
import os
import mimetypes

class OptimizedStaticFiles(StaticFiles):
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            request = Request(scope, receive)
            
            # Add cache headers for static files
            if request.url.path.startswith("/static/"):
                response = await super().__call__(scope, receive, send)
                
                # Set aggressive caching for static files
                if response.status_code == 200:
                    file_path = self.get_file_path(request.url.path)
                    if os.path.exists(file_path):
                        # Cache for 1 year
                        response.headers["cache-control"] = "public, max-age=31536000, immutable"
                        
                        # Add ETag
                        etag = f'"{os.path.getmtime(file_path)}"'
                        response.headers["etag"] = etag
                        
                        # Check If-None-Match
                        if request.headers.get("if-none-match") == etag:
                            response = Response(status_code=304)
                
                return response
        
        await super().__call__(scope, receive, send)
```

## Monitoring and Profiling

### Performance Monitoring

```python
# app/middleware/performance_monitoring.py
import time
import psutil
from fastapi import Request, Response
from prometheus_client import Counter, Histogram, Gauge

# Prometheus metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint', 'status'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')
ACTIVE_CONNECTIONS = Gauge('active_connections', 'Active database connections')
MEMORY_USAGE = Gauge('memory_usage_bytes', 'Memory usage in bytes')

class PerformanceMonitoringMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            start_time = time.time()
            
            # Get initial metrics
            initial_memory = psutil.Process().memory_info().rss
            
            # Process request
            response = await self.call_app(scope, receive, send)
            
            # Calculate metrics
            duration = time.time() - start_time
            final_memory = psutil.Process().memory_info().rss
            memory_delta = final_memory - initial_memory
            
            # Record metrics
            REQUEST_COUNT.labels(
                method=scope["method"],
                endpoint=scope["path"],
                status=response.status_code
            ).inc()
            
            REQUEST_DURATION.observe(duration)
            MEMORY_USAGE.set(final_memory)
            
            # Log slow requests
            if duration > 1.0:
                logger.warning(f"Slow request: {scope['method']} {scope['path']} took {duration:.2f}s")
        
        await self.app(scope, receive, send)

# Add middleware
app.add_middleware(PerformanceMonitoringMiddleware)
```

### Database Query Profiling

```python
# app/utils/query_profiler.py
import time
from sqlalchemy import event
from sqlalchemy.engine import Engine
import logging

logger = logging.getLogger(__name__)

class QueryProfiler:
    def __init__(self, slow_query_threshold: float = 0.1):
        self.slow_query_threshold = slow_query_threshold
    
    def install(self, engine: Engine):
        """Install query profiler on engine."""
        @event.listens_for(engine, "before_cursor_execute")
        def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            context._query_start_time = time.time()
        
        @event.listens_for(engine, "after_cursor_execute")
        def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
            if hasattr(context, '_query_start_time'):
                duration = time.time() - context._query_start_time
                
                if duration > self.slow_query_threshold:
                    logger.warning(
                        f"Slow query detected ({duration:.3f}s): {statement[:100]}..."
                    )
                
                # Log all queries in debug mode
                if logger.isEnabledFor(logging.DEBUG):
                    logger.debug(f"Query ({duration:.3f}s): {statement}")

# Install profiler
query_profiler = QueryProfiler(slow_query_threshold=0.1)
query_profiler.install(engine)
```

### Performance Testing

```python
# tests/performance/load_test.py
import asyncio
import aiohttp
import time
from concurrent.futures import ThreadPoolExecutor

class LoadTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
    
    async def single_request(self, session: aiohttp.ClientSession, endpoint: str) -> dict:
        """Make a single request and return metrics."""
        start_time = time.time()
        
        try:
            async with session.get(f"{self.base_url}{endpoint}") as response:
                await response.text()
                end_time = time.time()
                
                return {
                    "status_code": response.status,
                    "duration": end_time - start_time,
                    "success": response.status == 200
                }
        except Exception as e:
            end_time = time.time()
            return {
                "status_code": 0,
                "duration": end_time - start_time,
                "success": False,
                "error": str(e)
            }
    
    async def load_test(self, endpoint: str, concurrent_users: int, duration: int) -> dict:
        """Run load test with specified parameters."""
        connector = aiohttp.TCPConnector(limit=100)
        timeout = aiohttp.ClientTimeout(total=30)
        
        async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
            start_time = time.time()
            end_time = start_time + duration
            
            tasks = []
            results = []
            
            while time.time() < end_time:
                # Create batch of concurrent requests
                batch = [
                    self.single_request(session, endpoint)
                    for _ in range(concurrent_users)
                ]
                
                # Execute batch
                batch_results = await asyncio.gather(*batch, return_exceptions=True)
                results.extend(batch_results)
                
                # Small delay between batches
                await asyncio.sleep(0.1)
            
            # Analyze results
            successful_results = [r for r in results if isinstance(r, dict) and r.get("success")]
            durations = [r["duration"] for r in successful_results]
            
            return {
                "total_requests": len(results),
                "successful_requests": len(successful_results),
                "success_rate": len(successful_results) / len(results) * 100,
                "avg_duration": sum(durations) / len(durations) if durations else 0,
                "min_duration": min(durations) if durations else 0,
                "max_duration": max(durations) if durations else 0,
                "requests_per_second": len(successful_results) / duration
            }

# Usage
async def run_performance_tests():
    tester = LoadTester("http://localhost:8000/api")
    
    # Test character list endpoint
    results = await tester.load_test("/characters", concurrent_users=50, duration=60)
    print(f"Character List Results: {results}")
    
    # Test character detail endpoint
    results = await tester.load_test("/characters/abu-bakr", concurrent_users=20, duration=60)
    print(f"Character Detail Results: {results}")
```

## Performance Best Practices

### Database Best Practices

1. **Use appropriate indexes** for frequently queried columns
2. **Avoid N+1 queries** using eager loading
3. **Use connection pooling** to manage database connections
4. **Implement pagination** for large result sets
5. **Monitor slow queries** and optimize them
6. **Use read replicas** for read-heavy workloads

### API Best Practices

1. **Implement caching** for frequently accessed data
2. **Use async/await** for I/O operations
3. **Limit response size** with pagination
4. **Compress responses** for large payloads
5. **Validate input early** to avoid unnecessary processing
6. **Use appropriate HTTP status codes**

### Caching Best Practices

1. **Cache frequently accessed data** with appropriate TTL
2. **Implement cache invalidation** strategies
3. **Use cache hierarchy** (memory → Redis → Database)
4. **Monitor cache hit rates** and optimize accordingly
5. **Avoid caching sensitive data**
6. **Use cache warming** for predictable traffic

### Monitoring Best Practices

1. **Monitor key metrics** (response time, throughput, error rate)
2. **Set up alerts** for performance degradation
3. **Profile slow requests** to identify bottlenecks
4. **Use APM tools** for comprehensive monitoring
5. **Regular performance testing** to catch regressions
6. **Document performance baselines** and targets

## Performance Checklist

### Pre-Deployment Checklist

- [ ] Database indexes are optimized
- [ ] Connection pooling is configured
- [ ] Caching strategy is implemented
- [ ] Response compression is enabled
- [ ] Static file caching is configured
- [ ] Performance monitoring is set up
- [ ] Load testing has been performed
- [ ] Error handling is optimized
- [ ] Resource limits are configured
- [ ] Security headers are in place

### Ongoing Monitoring

- [ ] Response times are within targets
- [ ] Error rates are below thresholds
- [ ] Cache hit rates are acceptable
- [ ] Database performance is optimal
- [ ] Resource utilization is healthy
- [ ] User experience is smooth

This comprehensive performance guide ensures the Islamic Characters platform delivers fast, reliable, and scalable performance for all users.
