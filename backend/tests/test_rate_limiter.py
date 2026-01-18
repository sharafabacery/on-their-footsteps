"""
Test suite for rate limiting functionality.
"""

import pytest
import asyncio
import time
from unittest.mock import Mock, AsyncMock
from fastapi import HTTPException
from app.utils.rate_limiter import RateLimiter, IPBlocker
from app.utils.rate_limiter import rate_limit, get_rate_limiter, set_rate_limiter


class TestRateLimiter:
    """Test cases for RateLimiter class."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        mock_redis.exists.return_value = False
        mock_redis.delete.return_value = 1
        return mock_redis
    
    @pytest.fixture
    def rate_limiter(self, mock_redis):
        """Create RateLimiter instance with mock Redis."""
        return RateLimiter(mock_redis)
    
    @pytest.mark.asyncio
    async def test_is_allowed_first_request(self, rate_limiter):
        """Test that first request is allowed."""
        result = await rate_limiter.is_allowed(
            key='test',
            limit=10,
            window=3600,
            identifier='test_ip'
        )
        
        assert result['allowed'] is True
        assert result['remaining'] == 9  # 10 - 1 consumed
        assert result['reset_time'] > time.time()
    
    @pytest.mark.asyncio
    async def test_is_allowed_within_limit(self, rate_limiter):
        """Test requests within limit are allowed."""
        # Make 5 requests within limit of 10
        for i in range(5):
            result = await rate_limiter.is_allowed(
                key='test',
                limit=10,
                window=3600,
                identifier='test_ip'
            )
            assert result['allowed'] is True
            assert result['remaining'] == 9 - i
    
    @pytest.mark.asyncio
    async def test_is_allowed_exceeds_limit(self, rate_limiter):
        """Test requests exceeding limit are blocked."""
        # Make 10 requests to reach limit
        for i in range(10):
            await rate_limiter.is_allowed(
                key='test',
                limit=10,
                window=3600,
                identifier='test_ip'
            )
        
        # 11th request should be blocked
        result = await rate_limiter.is_allowed(
            key='test',
            limit=10,
            window=3600,
            identifier='test_ip'
        )
        
        assert result['allowed'] is False
        assert result['remaining'] == 0
    
    @pytest.mark.asyncio
    async def test_is_allowed_different_identifiers(self, rate_limiter):
        """Test that different identifiers have separate limits."""
        # Make 10 requests for first identifier
        for i in range(10):
            await rate_limiter.is_allowed(
                key='test',
                limit=10,
                window=3600,
                identifier='ip1'
            )
        
        # First identifier should be blocked
        result1 = await rate_limiter.is_allowed(
            key='test',
            limit=10,
            window=3600,
            identifier='ip1'
        )
        assert result1['allowed'] is False
        
        # Second identifier should still be allowed
        result2 = await rate_limiter.is_allowed(
            key='test',
            limit=10,
            window=3600,
            identifier='ip2'
        )
        assert result2['allowed'] is True
    
    @pytest.mark.asyncio
    async def test_is_allowed_window_reset(self, rate_limiter, mock_redis):
        """Test that limits reset when window expires."""
        # Set up expired bucket
        past_time = int(time.time()) - 3700  # 1 hour and 100 seconds ago
        mock_redis.get.return_value = json.dumps({
            'tokens': 5,
            'last_refill': past_time,
            'reset_time': past_time + 3600
        })
        
        # Request should be allowed with fresh bucket
        result = await rate_limiter.is_allowed(
            key='test',
            limit=10,
            window=3600,
            identifier='test_ip'
        )
        
        assert result['allowed'] is True
        assert result['remaining'] == 9  # Fresh bucket
    
    @pytest.mark.asyncio
    async def test_is_allowed_redis_error(self, rate_limiter, mock_redis):
        """Test fallback behavior when Redis fails."""
        mock_redis.get.side_effect = Exception("Redis error")
        
        # Should allow request when Redis fails
        result = await rate_limiter.is_allowed(
            key='test',
            limit=10,
            window=3600,
            identifier='test_ip'
        )
        
        assert result['allowed'] is True
        assert result['remaining'] == 10  # Fallback to full limit
    
    @pytest.mark.asyncio
    async def test_check_rate_limit(self, rate_limiter):
        """Test check_rate_limit method."""
        mock_request = Mock()
        mock_request.client.host = "192.168.1.1"
        
        result = await rate_limiter.check_rate_limit(
            request=mock_request,
            key='default'
        )
        
        assert result['allowed'] is True
        assert 'remaining' in result
        assert 'reset_time' in result
    
    @pytest.mark.asyncio
    async def test_check_rate_limit_with_identifier(self, rate_limiter):
        """Test check_rate_limit with custom identifier."""
        mock_request = Mock()
        mock_request.client.host = "192.168.1.1"
        
        result = await rate_limiter.check_rate_limit(
            request=mock_request,
            key='auth',
            identifier='user123'
        )
        
        assert result['allowed'] is True
        # Should use custom identifier instead of IP


class TestIPBlocker:
    """Test cases for IPBlocker class."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        mock_redis = AsyncMock()
        mock_redis.exists.return_value = False
        mock_redis.incr.return_value = 1
        mock_redis.expire.return_value = True
        mock_redis.delete.return_value = 1
        return mock_redis
    
    @pytest.fixture
    def ip_blocker(self, mock_redis):
        """Create IPBlocker instance with mock Redis."""
        return IPBlocker(mock_redis)
    
    @pytest.mark.asyncio
    async def test_record_violation_first_time(self, ip_blocker):
        """Test first violation doesn't block IP."""
        result = await ip_blocker.record_violation("192.168.1.1")
        
        assert result is False  # Not blocked
    
    @pytest.mark.asyncio
    async def test_record_violation_threshold_not_reached(self, ip_blocker):
        """Test violations below threshold don't block IP."""
        # Record 5 violations (threshold is 10)
        for i in range(5):
            result = await ip_blocker.record_violation("192.168.1.1")
            assert result is False
    
    @pytest.mark.asyncio
    async def test_record_violation_threshold_reached(self, ip_blocker):
        """Test violations at threshold block IP."""
        # Record 10 violations to reach threshold
        for i in range(10):
            await ip_blocker.record_violation("192.168.1.1")
        
        # 11th violation should block
        result = await ip_blocker.record_violation("192.168.1.1")
        assert result is True  # Blocked
    
    @pytest.mark.asyncio
    async def test_is_blocked(self, ip_blocker, mock_redis):
        """Test is_blocked method."""
        mock_redis.exists.return_value = True
        
        result = await ip_blocker.is_blocked("192.168.1.1")
        assert result is True
    
    @pytest.mark.asyncio
    async def test_is_blocked_not_blocked(self, ip_blocker, mock_redis):
        """Test is_blocked for non-blocked IP."""
        mock_redis.exists.return_value = False
        
        result = await ip_blocker.is_blocked("192.168.1.1")
        assert result is False
    
    @pytest.mark.asyncio
    async def test_unblock_ip(self, ip_blocker, mock_redis):
        """Test unblock IP functionality."""
        mock_redis.exists.return_value = True
        
        # IP should be blocked initially
        blocked_before = await ip_blocker.is_blocked("192.168.1.1")
        assert blocked_before is True
        
        # Unblock IP
        result = await ip_blocker.unblock_ip("192.168.1.1")
        assert result is True
        
        # IP should not be blocked anymore
        blocked_after = await ip_blocker.is_blocked("192.168.1.1")
        assert blocked_after is False
    
    @pytest.mark.asyncio
    async def test_unblock_ip_not_blocked(self, ip_blocker):
        """Test unblocking non-blocked IP."""
        result = await ip_blocker.unblock_ip("192.168.1.1")
        assert result is True  # Should still succeed


class TestRateLimitDecorator:
    """Test cases for rate_limit decorator."""
    
    @pytest.fixture
    def mock_redis(self):
        """Mock Redis client."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        return mock_redis
    
    @pytest.fixture
    def setup_rate_limiter(self, mock_redis):
        """Setup rate limiter for decorator tests."""
        set_rate_limiter(mock_redis)
        yield
        # Cleanup
        set_rate_limiter(None)
    
    @pytest.mark.asyncio
    async def test_rate_limit_decorator_allowed(self, setup_rate_limiter):
        """Test decorator allows requests within limit."""
        @rate_limit(key='test', limit=5, window=3600)
        async def test_endpoint():
            return {"message": "success"}
        
        # Mock request
        mock_request = Mock()
        mock_request.client.host = "192.168.1.1"
        
        # Should allow request
        result = await test_endpoint()
        assert result["message"] == "success"
    
    @pytest.mark.asyncio
    async def test_rate_limit_decorator_exceeded(self, setup_rate_limiter):
        """Test decorator blocks requests exceeding limit."""
        @rate_limit(key='test', limit=1, window=3600)
        async def test_endpoint():
            return {"message": "success"}
        
        # Mock request
        mock_request = Mock()
        mock_request.client.host = "192.168.1.1"
        
        # First request should work
        result1 = await test_endpoint()
        assert result1["message"] == "success"
        
        # Second request should be blocked
        with pytest.raises(HTTPException) as exc_info:
            await test_endpoint()
        
        assert exc_info.value.status_code == 429
        assert "Rate limit exceeded" in str(exc_info.value.detail)
    
    @pytest.mark.asyncio
    async def test_rate_limit_decorator_no_redis(self):
        """Test decorator works when Redis is not available."""
        # Don't setup rate limiter
        set_rate_limiter(None)
        
        @rate_limit(key='test', limit=1, window=3600)
        async def test_endpoint():
            return {"message": "success"}
        
        # Mock request
        mock_request = Mock()
        mock_request.client.host = "192.168.1.1"
        
        # Should allow request when Redis is not available
        result = await test_endpoint()
        assert result["message"] == "success"


class TestRateLimitIntegration:
    """Integration tests for rate limiting."""
    
    @pytest.mark.asyncio
    async def test_multiple_keys_different_limits(self):
        """Test multiple rate limit keys with different limits."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        
        rate_limiter = RateLimiter(mock_redis)
        
        # Test different keys have different limits
        default_result = await rate_limiter.is_allowed('default', 100, 3600, 'ip1')
        auth_result = await rate_limiter.is_allowed('auth', 10, 300, 'ip1')
        search_result = await rate_limiter.is_allowed('search', 30, 300, 'ip1')
        
        assert default_result['remaining'] == 99  # 100 - 1
        assert auth_result['remaining'] == 9       # 10 - 1
        assert search_result['remaining'] == 29    # 30 - 1
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self):
        """Test concurrent requests to rate limiter."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        
        rate_limiter = RateLimiter(mock_redis)
        
        # Make 10 concurrent requests
        tasks = []
        for i in range(10):
            task = rate_limiter.is_allowed('test', 10, 3600, f'ip{i}')
            tasks.append(task)
        
        results = await asyncio.gather(*tasks)
        
        # All should be allowed (within limit)
        assert all(result['allowed'] for result in results)
        assert all(result['remaining'] == 9 for result in results)
    
    @pytest.mark.asyncio
    async def test_rate_limit_headers(self):
        """Test rate limit headers in HTTP response."""
        mock_redis = AsyncMock()
        mock_redis.get.return_value = None
        mock_redis.setex.return_value = True
        
        rate_limiter = RateLimiter(mock_redis)
        
        # Simulate HTTP response headers
        result = await rate_limiter.check_rate_limit(
            request=Mock(client=Mock(host="192.168.1.1")),
            key='default'
        )
        
        # In real implementation, headers would be added to response
        # This test verifies the data is available for headers
        assert 'allowed' in result
        assert 'remaining' in result
        assert 'reset_time' in result


if __name__ == '__main__':
    pytest.main([__file__])
