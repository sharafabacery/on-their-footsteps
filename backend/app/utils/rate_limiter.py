"""
Rate limiting utility for API endpoints.
Implements token bucket algorithm with Redis backend.
"""

import time
import json
import asyncio
from typing import Dict, Any, Optional
from redis import Redis
from fastapi import Request, HTTPException, status
from ..logging_config import get_logger, log_security_event

logger = get_logger(__name__)

class RateLimiter:
    """Rate limiter using token bucket algorithm with Redis."""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.default_limits = {
            'default': {'requests': 100, 'window': 3600},  # 100 requests per hour
            'auth': {'requests': 10, 'window': 300},        # 10 requests per 5 minutes
            'search': {'requests': 30, 'window': 300},      # 30 requests per 5 minutes
            'upload': {'requests': 5, 'window': 3600},       # 5 requests per hour
        }
    
    async def is_allowed(
        self, 
        key: str, 
        limit: int = 100, 
        window: int = 3600,
        identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check if request is allowed based on rate limit.
        
        Args:
            key: Rate limit key (e.g., 'default', 'auth')
            limit: Number of requests allowed
            window: Time window in seconds
            identifier: Unique identifier (IP address, user ID, etc.)
        
        Returns:
            Dict with 'allowed', 'remaining', 'reset_time' keys
        """
        if not self.redis:
            # Fallback to always allow if Redis is not available
            return {'allowed': True, 'remaining': limit, 'reset_time': int(time.time()) + window}
        
        current_time = int(time.time())
        bucket_key = f"rate_limit:{key}:{identifier or 'anonymous'}"
        
        try:
            # Get current bucket state
            bucket_data = await self.redis.get(bucket_key)
            
            if bucket_data:
                bucket = json.loads(bucket_data)
                # Check if window has expired
                if current_time > bucket['reset_time']:
                    # Reset bucket
                    bucket = {
                        'tokens': limit - 1,
                        'last_refill': current_time,
                        'reset_time': current_time + window
                    }
                else:
                    # Consume one token
                    bucket['tokens'] = max(0, bucket['tokens'] - 1)
            else:
                # Create new bucket
                bucket = {
                    'tokens': limit - 1,
                    'last_refill': current_time,
                    'reset_time': current_time + window
                }
            
            # Save bucket state
            await self.redis.setex(
                bucket_key, 
                window, 
                json.dumps(bucket)
            )
            
            return {
                'allowed': bucket['tokens'] > 0,
                'remaining': bucket['tokens'],
                'reset_time': bucket['reset_time']
            }
            
        except Exception as e:
            logger.error(f"Rate limiter error: {e}")
            # Fallback to allow request if rate limiter fails
            return {'allowed': True, 'remaining': limit, 'reset_time': int(time.time()) + window}
    
    async def check_rate_limit(
        self, 
        request: Request, 
        key: str = 'default',
        identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Check rate limit for a request.
        
        Args:
            request: FastAPI Request object
            key: Rate limit key
            identifier: Optional identifier override
        
        Returns:
            Dict with rate limit information
        """
        # Get client IP
        client_ip = request.client.host if request.client else "unknown"
        
        # Use provided identifier or fall back to IP
        request_identifier = identifier or client_ip
        
        # Get limits for this key
        limits = self.default_limits.get(key, self.default_limits['default'])
        
        # Check rate limit
        result = await self.is_allowed(
            key=key,
            limit=limits['requests'],
            window=limits['window'],
            identifier=request_identifier
        )
        
        # Log rate limit check
        log_security_event(
            logger,
            "rate_limit_check",
            {
                "ip": client_ip,
                "key": key,
                "identifier": request_identifier,
                "allowed": result['allowed'],
                "remaining": result['remaining'],
                "limit": limits['requests'],
                "window": limits['window']
            }
        )
        
        return result

# Global rate limiter instance
_rate_limiter: Optional[RateLimiter] = None

def get_rate_limiter() -> Optional[RateLimiter]:
    """Get the global rate limiter instance."""
    return _rate_limiter

def set_rate_limiter(redis_client: Redis):
    """Set the global rate limiter instance."""
    global _rate_limiter
    _rate_limiter = RateLimiter(redis_client)

# Decorator for rate limiting
def rate_limit(key: str = 'default', identifier: Optional[str] = None):
    """Decorator to apply rate limiting to endpoints."""
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract request from kwargs (FastAPI dependency injection)
            request = kwargs.get('request')
            if not request:
                # Try to get request from other sources
                for arg in args:
                    if hasattr(arg, 'client'):
                        request = arg
                        break
            
            if not request:
                # If no request found, allow the call
                return await func(*args, **kwargs)
            
            rate_limiter = get_rate_limiter()
            if not rate_limiter:
                # If rate limiter is not available, allow the call
                return await func(*args, **kwargs)
            
            # Check rate limit
            result = await rate_limiter.check_rate_limit(request, key, identifier)
            
            if not result['allowed']:
                # Rate limit exceeded
                reset_time = result['reset_time']
                retry_after = max(1, reset_time - int(time.time()))
                
                log_security_event(
                    logger,
                    "rate_limit_exceeded",
                    {
                        "ip": request.client.host if request.client else "unknown",
                        "key": key,
                        "retry_after": retry_after
                    }
                )
                
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Rate limit exceeded",
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(rate_limiter.default_limits.get(key, rate_limiter.default_limits['default'])['requests']),
                        "X-RateLimit-Remaining": str(result['remaining']),
                        "X-RateLimit-Reset": str(result['reset_time'])
                    }
                )
            
            # Add rate limit headers to response
            response = await func(*args, **kwargs)
            if hasattr(response, 'headers'):
                response.headers.update({
                    "X-RateLimit-Limit": str(rate_limiter.default_limits.get(key, rate_limiter.default_limits['default'])['requests']),
                    "X-RateLimit-Remaining": str(result['remaining']),
                    "X-RateLimit-Reset": str(result['reset_time'])
                })
            
            return response
        
        return wrapper
    return decorator

# Middleware for rate limiting
async def rate_limit_middleware(request: Request, call_next):
    """Middleware to apply rate limiting to all requests."""
    rate_limiter = get_rate_limiter()
    if not rate_limiter:
        # If rate limiter is not available, skip rate limiting
        return await call_next(request)
    
    # Check default rate limit
    result = await rate_limiter.check_rate_limit(request, 'default')
    
    if not result['allowed']:
        reset_time = result['reset_time']
        retry_after = max(1, reset_time - int(time.time()))
        
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(rate_limiter.default_limits['default']['requests']),
                "X-RateLimit-Remaining": str(result['remaining']),
                "X-RateLimit-Reset": str(result['reset_time'])
            }
        )
    
    response = await call_next(request)
    
    # Add rate limit headers
    response.headers.update({
        "X-RateLimit-Limit": str(rate_limiter.default_limits['default']['requests']),
        "X-RateLimit-Remaining": str(result['remaining']),
        "X-RateLimit-Reset": str(result['reset_time'])
    })
    
    return response

# IP-based blocking for repeated violations
class IPBlocker:
    """Block IPs that repeatedly violate rate limits."""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.violation_threshold = 10  # Number of violations before blocking
        self.block_duration = 3600    # Block duration in seconds (1 hour)
    
    async def record_violation(self, ip: str) -> bool:
        """
        Record a rate limit violation and check if IP should be blocked.
        
        Args:
            ip: Client IP address
        
        Returns:
            True if IP is blocked, False otherwise
        """
        if not self.redis:
            return False
        
        violation_key = f"violations:{ip}"
        block_key = f"blocked:{ip}"
        
        try:
            # Check if IP is already blocked
            if await self.redis.exists(block_key):
                return True
            
            # Increment violation count
            violation_count = await self.redis.incr(violation_key)
            
            # Set expiration for violation count
            if violation_count == 1:
                await self.redis.expire(violation_key, self.block_duration)
            
            # Check if threshold exceeded
            if violation_count >= self.violation_threshold:
                # Block the IP
                await self.redis.setex(block_key, self.block_duration, "1")
                
                log_security_event(
                    logger,
                    "ip_blocked",
                    {
                        "ip": ip,
                        "violations": violation_count,
                        "duration": self.block_duration
                    }
                )
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"IP blocker error: {e}")
            return False
    
    async def is_blocked(self, ip: str) -> bool:
        """Check if IP is blocked."""
        if not self.redis:
            return False
        
        try:
            block_key = f"blocked:{ip}"
            return await self.redis.exists(block_key)
        except Exception as e:
            logger.error(f"IP block check error: {e}")
            return False
    
    async def unblock_ip(self, ip: str) -> bool:
        """Manually unblock an IP."""
        if not self.redis:
            return False
        
        try:
            block_key = f"blocked:{ip}"
            violation_key = f"violations:{ip}"
            
            await self.redis.delete(block_key)
            await self.redis.delete(violation_key)
            
            log_security_event(
                logger,
                "ip_unblocked",
                {"ip": ip}
            )
            
            return True
            
        except Exception as e:
            logger.error(f"IP unblock error: {e}")
            return False

# Global IP blocker instance
_ip_blocker: Optional[IPBlocker] = None

def get_ip_blocker() -> Optional[IPBlocker]:
    """Get the global IP blocker instance."""
    return _ip_blocker

def set_ip_blocker(redis_client: Redis):
    """Set the global IP blocker instance."""
    global _ip_blocker
    _ip_blocker = IPBlocker(redis_client)
