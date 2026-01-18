"""
Performance monitoring API endpoints.
Provides performance metrics and system health information.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text, func
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from ..database import get_db
from ..utils.query_optimizer import performance_monitor
from ..utils.rate_limiter import get_rate_limiter, get_ip_blocker
from ..logging_config import get_logger
from ..config import settings
import psutil
import time

router = APIRouter()
logger = get_logger(__name__)

@router.get("/metrics", tags=["Performance"])
async def get_performance_metrics(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get comprehensive performance metrics.
    
    Returns system performance data including database performance,
    API response times, cache hit rates, and system resource usage.
    
    Returns:
        Dict containing performance metrics
        
    Raises:
        HTTPException: If metrics collection fails
    """
    try:
        start_time = time.time()
        
        # Database performance metrics
        db_metrics = await get_database_metrics(db)
        
        # System resource metrics
        system_metrics = get_system_metrics()
        
        # API performance metrics
        api_metrics = get_api_metrics()
        
        # Cache performance metrics
        cache_metrics = get_cache_metrics()
        
        # Rate limiting metrics
        rate_limit_metrics = get_rate_limit_metrics()
        
        # Query optimizer metrics
        query_metrics = performance_monitor.get_performance_stats()
        
        # Total response time
        response_time = time.time() - start_time
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "response_time_ms": round(response_time * 1000, 2),
            "database": db_metrics,
            "system": system_metrics,
            "api": api_metrics,
            "cache": cache_metrics,
            "rate_limiting": rate_limit_metrics,
            "queries": query_metrics,
            "status": "healthy"
        }
        
    except Exception as e:
        logger.error(f"Failed to get performance metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to collect performance metrics")

@router.get("/database", tags=["Performance"])
async def get_database_performance(
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    """Get database performance metrics.
    
    Returns detailed database performance information including
    connection pool status, query performance, and table statistics.
    
    Returns:
        Dict containing database performance metrics
    """
    return await get_database_metrics(db)

@router.get("/system", tags=["Performance"])
async def get_system_performance() -> Dict[str, Any]:
    """Get system resource performance metrics.
    
    Returns CPU, memory, disk, and network usage statistics.
    
    Returns:
        Dict containing system performance metrics
    """
    return get_system_metrics()

@router.get("/cache", tags=["Performance"])
async def get_cache_performance() -> Dict[str, Any]:
    """Get cache performance metrics.
    
    Returns Redis cache statistics including hit rates and memory usage.
    
    Returns:
        Dict containing cache performance metrics
    """
    return get_cache_metrics()

@router.get("/queries", tags=["Performance"])
async def get_query_performance() -> Dict[str, Any]:
    """Get query performance statistics.
    
    Returns performance statistics for database queries including
    slow queries and optimization recommendations.
    
    Returns:
        Dict containing query performance metrics
    """
    return performance_monitor.get_performance_stats()

@router.get("/health", tags=["Performance"])
async def performance_health_check() -> Dict[str, Any]:
    """Perform comprehensive performance health check.
    
    Evaluates system health based on performance thresholds and
    returns health status with recommendations.
    
    Returns:
        Dict containing health status and recommendations
    """
    try:
        health_status = {
            "status": "healthy",
            "timestamp": datetime.utcnow().isoformat(),
            "checks": {},
            "recommendations": [],
            "score": 100
        }
        
        # Database health check
        db_health = await check_database_health()
        health_status["checks"]["database"] = db_health
        
        # System health check
        system_health = check_system_health()
        health_status["checks"]["system"] = system_health
        
        # Cache health check
        cache_health = check_cache_health()
        health_status["checks"]["cache"] = cache_health
        
        # Calculate overall score
        checks = [db_health, system_health, cache_health]
        healthy_checks = sum(1 for check in checks if check["status"] == "healthy")
        health_status["score"] = int((healthy_checks / len(checks)) * 100)
        
        # Determine overall status
        if health_status["score"] >= 90:
            health_status["status"] = "healthy"
        elif health_status["score"] >= 70:
            health_status["status"] = "warning"
        else:
            health_status["status"] = "critical"
        
        # Generate recommendations
        for check in checks:
            if check["status"] != "healthy":
                health_status["recommendations"].extend(check.get("recommendations", []))
        
        return health_status
        
    except Exception as e:
        logger.error(f"Performance health check failed: {e}")
        return {
            "status": "error",
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e),
            "score": 0
        }

async def get_database_metrics(db: Session) -> Dict[str, Any]:
    """Collect database performance metrics."""
    try:
        # Connection pool metrics
        pool_stats = await get_connection_pool_stats(db)
        
        # Table statistics
        table_stats = await get_table_statistics(db)
        
        # Query performance
        query_stats = await get_query_statistics(db)
        
        # Database size
        db_size = await get_database_size(db)
        
        return {
            "connection_pool": pool_stats,
            "tables": table_stats,
            "queries": query_stats,
            "size": db_size,
            "status": "healthy"
        }
        
    except Exception as e:
        logger.error(f"Failed to collect database metrics: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

async def get_connection_pool_stats(db: Session) -> Dict[str, Any]:
    """Get database connection pool statistics."""
    try:
        # Get connection count
        result = db.execute(text("""
            SELECT count(*) as active_connections
            FROM pg_stat_activity
            WHERE state = 'active'
        """))
        
        active_connections = result.fetchone()[0]
        
        return {
            "active_connections": active_connections,
            "max_connections": getattr(db.bind.pool, 'size', 0),
            "utilization_percent": round((active_connections / getattr(db.bind.pool, 'size', 1)) * 100, 2)
        }
        
    except Exception as e:
        logger.error(f"Failed to get connection pool stats: {e}")
        return {"error": str(e)}

async def get_table_statistics(db: Session) -> Dict[str, Any]:
    """Get table statistics for performance monitoring."""
    try:
        result = db.execute(text("""
            SELECT 
                schemaname,
                tablename,
                n_tup_ins as inserts,
                n_tup_upd as updates,
                n_tup_del as deletes,
                n_live_tup as live_rows,
                n_dead_tup as dead_rows,
                last_vacuum,
                last_autovacuum,
                last_analyze,
                last_autoanalyze
            FROM pg_stat_user_tables
            ORDER BY n_live_tup DESC
        """))
        
        tables = []
        for row in result:
            tables.append({
                "schema": row[0],
                "table": row[1],
                "inserts": row[2],
                "updates": row[3],
                "deletes": row[4],
                "live_rows": row[5],
                "dead_rows": row[6],
                "last_vacuum": row[7],
                "last_autovacuum": row[8],
                "last_analyze": row[9],
                "last_autoanalyze": row[10],
                "dead_row_ratio": round(row[6] / max(1, row[5] + row[6]) * 100, 2) if row[5] + row[6] > 0 else 0
            })
        
        return {"tables": tables}
        
    except Exception as e:
        logger.error(f"Failed to get table statistics: {e}")
        return {"error": str(e)}

async def get_query_statistics(db: Session) -> Dict[str, Any]:
    """Get query performance statistics."""
    try:
        # Get slow queries
        result = db.execute(text("""
            SELECT 
                query,
                calls,
                total_time,
                mean_time,
                rows,
                100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
            FROM pg_stat_statements
            ORDER BY mean_time DESC
            LIMIT 10
        """))
        
        slow_queries = []
        for row in result:
            slow_queries.append({
                "query": row[0][:200] + "..." if len(row[0]) > 200 else row[0],
                "calls": row[1],
                "total_time": round(row[2], 3),
                "mean_time": round(row[3], 3),
                "rows": row[4],
                "hit_percent": round(row[5], 2)
            })
        
        # Get total query statistics
        result = db.execute(text("""
            SELECT 
                SUM(calls) as total_calls,
                SUM(total_time) as total_time,
                AVG(mean_time) as avg_time
            FROM pg_stat_statements
        """))
        
        total_stats = result.fetchone()
        
        return {
            "slow_queries": slow_queries,
            "total_calls": total_stats[0] or 0,
            "total_time": round(total_stats[1] or 0, 3),
            "avg_time": round(total_stats[2] or 0, 3)
        }
        
    except Exception as e:
        logger.error(f"Failed to get query statistics: {e}")
        return {"error": str(e)}

async def get_database_size(db: Session) -> Dict[str, Any]:
    """Get database size information."""
    try:
        result = db.execute(text("""
            SELECT 
                pg_database_size(current_database()) as total_size,
                pg_size_pretty(pg_database_size(current_database())) as size_pretty
        """))
        
        size_info = result.fetchone()
        
        # Get table sizes
        result = db.execute(text("""
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
            FROM pg_tables
            WHERE schemaname = 'public'
            ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
            LIMIT 10
        """))
        
        table_sizes = []
        for row in result:
            table_sizes.append({
                "schema": row[0],
                "table": row[1],
                "size": row[2]
            })
        
        return {
            "total_size_bytes": size_info[0],
            "total_size_pretty": size_info[1],
            "largest_tables": table_sizes
        }
        
    except Exception as e:
        logger.error(f"Failed to get database size: {e}")
        return {"error": str(e)}

def get_system_metrics() -> Dict[str, Any]:
    """Get system resource performance metrics."""
    try:
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_count = psutil.cpu_count()
        
        # Memory usage
        memory = psutil.virtual_memory()
        
        # Disk usage
        disk = psutil.disk_usage('/')
        
        # Network I/O
        network = psutil.net_io_counters()
        
        # Process information
        process = psutil.Process()
        
        return {
            "cpu": {
                "usage_percent": cpu_percent,
                "count": cpu_count,
                "load_average": psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            },
            "memory": {
                "total": memory.total,
                "available": memory.available,
                "used": memory.used,
                "percent": memory.percent,
                "available_gb": round(memory.available / (1024**3), 2),
                "used_gb": round(memory.used / (1024**3), 2)
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": disk.percent,
                "free_gb": round(disk.free / (1024**3), 2),
                "used_gb": round(disk.used / (1024**3), 2)
            },
            "network": {
                "bytes_sent": network.bytes_sent,
                "bytes_recv": network.bytes_recv,
                "packets_sent": network.packets_sent,
                "packets_recv": network.packets_recv
            },
            "process": {
                "pid": process.pid,
                "memory_percent": process.memory_percent(),
                "cpu_percent": process.cpu_percent(),
                "create_time": process.create_time(),
                "num_threads": process.num_threads()
            },
            "status": "healthy"
        }
        
    except Exception as e:
        logger.error(f"Failed to get system metrics: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

def get_api_metrics() -> Dict[str, Any]:
    """Get API performance metrics."""
    try:
        # Get query optimizer stats
        query_stats = performance_monitor.get_performance_stats()
        
        # Calculate API performance metrics
        total_queries = len(query_stats)
        avg_duration = 0
        slow_queries = 0
        
        for name, stats in query_stats.items():
            if stats['avg_duration'] > 1000:  # > 1 second
                slow_queries += 1
            avg_duration += stats['avg_duration']
        
        if total_queries > 0:
            avg_duration /= total_queries
        
        return {
            "total_queries": total_queries,
            "slow_queries": slow_queries,
            "avg_duration_ms": round(avg_duration, 2),
            "slow_query_percent": round((slow_queries / max(1, total_queries)) * 100, 2),
            "status": "healthy" if slow_queries < 5 else "warning"
        }
        
    except Exception as e:
        logger.error(f"Failed to get API metrics: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

def get_cache_metrics() -> Dict[str, Any]:
    """Get cache performance metrics."""
    try:
        rate_limiter = get_rate_limiter()
        ip_blocker = get_ip_blocker()
        
        if not rate_limiter or not rate_limiter.redis:
            return {
                "status": "disabled",
                "message": "Redis not available"
            }
        
        redis = rate_limiter.redis
        
        # Get Redis info
        info = redis.info()
        
        return {
            "status": "healthy",
            "connected_clients": info.get('connected_clients', 0),
            "used_memory": info.get('used_memory', 0),
            "used_memory_human": info.get('used_memory_human', '0B'),
            "maxmemory": info.get('maxmemory', 0),
            "maxmemory_human": info.get('maxmemory_human', '0B'),
            "memory_usage_percent": round(
                (info.get('used_memory', 0) / max(1, info.get('maxmemory', 1))) * 100, 2
            ),
            "keyspace_hits": info.get('keyspace_hits', 0),
            "keyspace_misses": info.get('keyspace_misses', 0),
            "hit_rate_percent": round(
                (info.get('keyspace_hits', 0) / max(1, info.get('keyspace_hits', 0) + info.get('keyspace_misses', 0))) * 100, 2
            ),
            "expired_keys": info.get('expired_keys', 0),
            "evicted_keys": info.get('evicted_keys', 0)
        }
        
    except Exception as e:
        logger.error(f"Failed to get cache metrics: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

def get_rate_limit_metrics() -> Dict[str, Any]:
    """Get rate limiting metrics."""
    try:
        rate_limiter = get_rate_limiter()
        ip_blocker = get_ip_blocker()
        
        if not rate_limiter or not rate_limiter.redis:
            return {
                "status": "disabled",
                "message": "Rate limiting not available"
            }
        
        # Get Redis keys for rate limiting
        redis = rate_limiter.redis
        rate_limit_keys = 0
        blocked_ips = 0
        
        try:
            # Count rate limit keys
            for key in redis.scan_iter(match="rate_limit:*"):
                rate_limit_keys += 1
            
            # Count blocked IPs
            for key in redis.scan_iter(match="blocked:*"):
                blocked_ips += 1
                
        except Exception as e:
            logger.warning(f"Failed to count Redis keys: {e}")
        
        return {
            "status": "healthy",
            "rate_limit_keys": rate_limit_keys,
            "blocked_ips": blocked_ips,
            "active_limits": len(rate_limiter.default_limits),
            "limits": rate_limiter.default_limits
        }
        
    except Exception as e:
        logger.error(f"Failed to get rate limit metrics: {e}")
        return {
            "status": "error",
            "error": str(e)
        }

async def check_database_health() -> Dict[str, Any]:
    """Check database health status."""
    try:
        # Test database connection
        from ..database import SessionLocal
        test_db = SessionLocal()
        test_db.execute(text("SELECT 1"))
        test_db.close()
        
        # Check connection pool
        pool_stats = await get_connection_pool_stats(test_db)
        
        health = {
            "status": "healthy",
            "message": "Database connection successful"
        }
        
        # Check connection pool utilization
        if pool_stats.get("utilization_percent", 0) > 80:
            health["status"] = "warning"
            health["message"] = "High connection pool utilization"
            health["recommendations"] = [
                "Consider increasing connection pool size",
                "Check for connection leaks"
            ]
        
        return health
        
    except Exception as e:
        return {
            "status": "critical",
            "message": f"Database connection failed: {str(e)}",
            "recommendations": [
                "Check database server status",
                "Verify connection string",
                "Check network connectivity"
            ]
        }

def check_system_health() -> Dict[str, Any]:
    """Check system resource health."""
    try:
        system_metrics = get_system_metrics()
        
        health = {
            "status": "healthy",
            "message": "System resources normal"
        }
        
        recommendations = []
        
        # Check CPU usage
        cpu_usage = system_metrics["cpu"]["usage_percent"]
        if cpu_usage > 80:
            health["status"] = "warning"
            recommendations.append("High CPU usage detected")
        elif cpu_usage > 95:
            health["status"] = "critical"
            recommendations.append("Critical CPU usage - immediate attention required")
        
        # Check memory usage
        memory_usage = system_metrics["memory"]["percent"]
        if memory_usage > 80:
            health["status"] = "warning"
            recommendations.append("High memory usage detected")
        elif memory_usage > 95:
            health["status"] = "critical"
            recommendations.append("Critical memory usage - immediate attention required")
        
        # Check disk usage
        disk_usage = system_metrics["disk"]["percent"]
        if disk_usage > 80:
            health["status"] = "warning"
            recommendations.append("High disk usage detected")
        elif disk_usage > 95:
            health["status"] = "critical"
            recommendations.append("Critical disk usage - immediate attention required")
        
        if recommendations:
            health["recommendations"] = recommendations
        
        return health
        
    except Exception as e:
        return {
            "status": "critical",
            "message": f"System health check failed: {str(e)}",
            "recommendations": ["Check system monitoring tools"]
        }

def check_cache_health() -> Dict[str, Any]:
    """Check cache health status."""
    try:
        cache_metrics = get_cache_metrics()
        
        if cache_metrics.get("status") == "disabled":
            return {
                "status": "warning",
                "message": "Cache is disabled",
                "recommendations": [
                    "Enable Redis for better performance",
                    "Check Redis configuration"
                ]
            }
        
        if cache_metrics.get("status") == "error":
            return {
                "status": "critical",
                "message": "Cache system error",
                "recommendations": [
                    "Check Redis server status",
                    "Verify Redis connection",
                    "Check Redis configuration"
                ]
            }
        
        health = {
            "status": "healthy",
            "message": "Cache system operating normally"
        }
        
        recommendations = []
        
        # Check memory usage
        memory_usage = cache_metrics.get("memory_usage_percent", 0)
        if memory_usage > 80:
            health["status"] = "warning"
            recommendations.append("High Redis memory usage")
        elif memory_usage > 95:
            health["status"] = "critical"
            recommendations.append("Critical Redis memory usage")
        
        # Check hit rate
        hit_rate = cache_metrics.get("hit_rate_percent", 0)
        if hit_rate < 70:
            health["status"] = "warning"
            recommendations.append("Low cache hit rate - consider optimizing cache strategy")
        
        if recommendations:
            health["recommendations"] = recommendations
        
        return health
        
    except Exception as e:
        return {
            "status": "critical",
            "message": f"Cache health check failed: {str(e)}",
            "recommendations": ["Check cache configuration"]
        }
