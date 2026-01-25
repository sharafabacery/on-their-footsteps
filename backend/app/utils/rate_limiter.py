"""
Rate limiting utility for API endpoints.
Implements token bucket algorithm with in-memory storage.
"""

import time
import json
import asyncio
from typing import Dict, Any, Optional, Tuple, DefaultDict, Union
from collections import defaultdict
from fastapi import Request, HTTPException, status
from ..logging_config import get_logger, log_security_event

logger = get_logger(__name__)

# In-memory storage for rate limiting
class RateLimiterStore:
    def __init__(self):
        self.buckets = defaultdict(dict)
        self.lock = asyncio.Lock()
    
    async def get_bucket(self, key: str) -> Dict[str, Any]:
        async with self.lock:
            return self.buckets.get(key, {})
    
    async def set_bucket(self, key: str, bucket: Dict[str, Any], window: int) -> None:
        async with self.lock:
            self.buckets[key] = bucket
            # Schedule cleanup of expired buckets
            self._cleanup_expired()
    
    def _cleanup_expired(self):
        current_time = time.time()
        expired_keys = [k for k, v in self.buckets.items() 
                       if v.get('reset_time', 0) < current_time]
        for key in expired_keys:
            del self.buckets[key]

class RateLimiter:
    """Rate limiter using token bucket algorithm with in-memory storage."""
    
    def __init__(self):
        """Initialize rate limiter with in-memory storage."""
        self.store = RateLimiterStore()
        self.default_limits = {
            'default': {'requests': 1000, 'window': 60},  # 1000 requests per minute
            'auth': {'requests': 100, 'window': 60},     # 100 auth attempts per minute
            'api': {'requests': 10000, 'window': 3600}   # 10000 requests per hour
        }
    
    async def is_allowed(
        self, 
        key: str, 
        limit: int = 100, 
        window: int = 3600,
        identifier: Optional[str] = None
    ) -> Dict[str, Any]:
        """Check if request is allowed based on rate limit.
        
        Args:
            key: Rate limit key (e.g., 'default', 'auth')
            limit: Number of requests allowed
            window: Time window in seconds
            identifier: Unique identifier (IP address, user ID, etc.)
        
        Returns:
            Dict with 'allowed', 'remaining', 'reset_time' keys
        """
        current_time = int(time.time())
        bucket_key = f"rate_limit:{key}:{identifier or 'anonymous'}"
        
        try:
            # Get current bucket state
            bucket = await self.store.get_bucket(bucket_key)
            
            if bucket:
                # Check if window has expired
                if current_time > bucket.get('reset_time', 0):
                    # Reset bucket
                    bucket = {
                        'tokens': limit - 1,
                        'last_refill': current_time,
                        'reset_time': current_time + window
                    }
                else:
                    # Consume one token
                    bucket['tokens'] = max(0, bucket.get('tokens', limit) - 1)
            else:
                # Create new bucket
                bucket = {
                    'tokens': limit - 1,
                    'last_refill': current_time,
                    'reset_time': current_time + window
                }
            
            # Save bucket state
            await self.store.set_bucket(bucket_key, bucket, window)
            
            return {
                'allowed': bucket['tokens'] >= 0,
                'remaining': max(0, bucket['tokens']),
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
        
        # Log rate limit check (only log when approaching limit or denied)
        if not result['allowed'] or result['remaining'] < (limits['requests'] * 0.2):
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

def set_rate_limiter(redis_client: Optional[Any] = None):
    """Set the global rate limiter instance.
    
    Args:
        redis_client: Kept for backward compatibility, not used.
    """
    global _rate_limiter
    _rate_limiter = RateLimiter()

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
    """Block IPs that repeatedly violate rate limits using in-memory storage."""
    
    def __init__(self):
        self.violation_threshold = 10  # Number of violations before blocking
        self.block_duration = 3600    # Block duration in seconds (1 hour)
        self.violations = {}  # {ip: {'count': int, 'expire_time': float}}
        self.blocked_ips = {}  # {ip: expire_time}
        self.lock = asyncio.Lock()
    
    async def record_violation(self, ip: str) -> bool:
        """
        Record a rate limit violation and check if IP should be blocked.
        
        Args:
            ip: Client IP address
        
        Returns:
            True if IP is blocked, False otherwise
        """
        current_time = time.time()
        
        async with self.lock:
            # Check if IP is already blocked
            if await self._is_blocked(ip, current_time):
                return True
            
            # Initialize or update violation count
            if ip not in self.violations:
                self.violations[ip] = {
                    'count': 1,
                    'expire_time': current_time + self.block_duration
                }
            else:
                self.violations[ip]['count'] += 1
            
            violation_count = self.violations[ip]['count']
            
            # Check if threshold exceeded
            if violation_count >= self.violation_threshold:
                # Block the IP
                self.blocked_ips[ip] = current_time + self.block_duration
                
                log_security_event(
                    logger,
                    "ip_blocked",
                    {
                        "ip": ip,
                        "violations": violation_count,
                        "duration": self.block_duration
                    }
                )
                
                # Clean up violations
                if ip in self.violations:
                    del self.violations[ip]
                
                return True
            
            return False
    
    async def _is_blocked(self, ip: str, current_time: float = None) -> bool:
        """Internal method to check if IP is blocked."""
        if current_time is None:
            current_time = time.time()
        
        # Check if IP is blocked and block hasn't expired
        if ip in self.blocked_ips:
            if self.blocked_ips[ip] > current_time:
                return True
            else:
                # Block expired, remove it
                del self.blocked_ips[ip]
        
        # Clean up expired violations
        if ip in self.violations and self.violations[ip]['expire_time'] <= current_time:
            del self.violations[ip]
        
        return False
    
    async def is_blocked(self, ip: str) -> bool:
        """Check if IP is blocked."""
        async with self.lock:
            return await self._is_blocked(ip)
    
    async def unblock_ip(self, ip: str) -> bool:
        """Manually unblock an IP."""
        async with self.lock:
            if ip in self.blocked_ips:
                del self.blocked_ips[ip]
            
            # Also clear any violations
            if ip in self.violations:
                del self.violations[ip]
            
            log_security_event(
                logger,
                "ip_unblocked",
                {"ip": ip}
            )
            
            return True
            
    def _cleanup_expired(self):
        """Clean up expired blocks and violations."""
        current_time = time.time()
        
        # Clean up expired blocks
        expired_blocks = [ip for ip, expire in self.blocked_ips.items() 
                         if expire <= current_time]
        for ip in expired_blocks:
            del self.blocked_ips[ip]
        
        # Clean up expired violations
        expired_violations = [ip for ip, data in self.violations.items() 
                            if data['expire_time'] <= current_time]
        for ip in expired_violations:
            del self.violations[ip]

# Global IP blocker instance
_ip_blocker: Optional[IPBlocker] = None

def get_ip_blocker() -> Optional[IPBlocker]:
    """Get the global IP blocker instance."""
    global _ip_blocker
    if _ip_blocker is None:
        _ip_blocker = IPBlocker()
    return _ip_blocker

def set_ip_blocker(redis_client=None):
    """Set the global IP blocker instance.
    
    Note: The redis_client parameter is kept for backward compatibility
    but is no longer used.
    """
    global _ip_blocker
    _ip_blocker = IPBlocker()
