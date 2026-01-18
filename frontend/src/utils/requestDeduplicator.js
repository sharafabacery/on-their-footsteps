/**
 * Request deduplication utility for API calls.
 * Prevents duplicate requests and provides response caching.
 */

class RequestDeduplicator {
  constructor() {
    this.pendingRequests = new Map();
    this.responseCache = new Map();
    this.cacheConfig = {
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxCacheSize: 100,
      enableCache: true
    };
    
    // Clean up expired cache entries periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredCache();
    }, 60 * 1000); // Every minute
  }

  /**
   * Generate cache key for a request
   */
  generateCacheKey(method, url, data = null, config = {}) {
    const keyData = {
      method: method.toUpperCase(),
      url,
      data: data ? JSON.stringify(data) : null,
      params: config.params ? JSON.stringify(config.params) : null,
      headers: config.headers ? JSON.stringify(config.headers) : null
    };
    
    return btoa(JSON.stringify(keyData));
  }

  /**
   * Check if request is cached and still valid
   */
  getCachedResponse(cacheKey) {
    if (!this.cacheConfig.enableCache) {
      return null;
    }

    const cached = this.responseCache.get(cacheKey);
    if (!cached) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() > cached.expiresAt) {
      this.responseCache.delete(cacheKey);
      return null;
    }

    return cached.response;
  }

  /**
   * Cache a response
   */
  cacheResponse(cacheKey, response, ttl = null) {
    if (!this.cacheConfig.enableCache) {
      return;
    }

    const expiresAt = Date.now() + (ttl || this.cacheConfig.defaultTTL);
    
    this.responseCache.set(cacheKey, {
      response,
      expiresAt,
      cachedAt: Date.now()
    });

    // Limit cache size
    if (this.responseCache.size > this.cacheConfig.maxCacheSize) {
      this.evictOldestCacheEntry();
    }
  }

  /**
   * Evict oldest cache entry
   */
  evictOldestCacheEntry() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, value] of this.responseCache.entries()) {
      if (value.cachedAt < oldestTime) {
        oldestTime = value.cachedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.responseCache.delete(oldestKey);
    }
  }

  /**
   * Clean up expired cache entries
   */
  cleanupExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, value] of this.responseCache.entries()) {
      if (now > value.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.responseCache.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Execute a request with deduplication
   */
  async executeRequest(requestFn, method, url, data = null, config = {}) {
    const cacheKey = this.generateCacheKey(method, url, data, config);

    // Check cache first for GET requests
    if (method.toUpperCase() === 'GET') {
      const cached = this.getCachedResponse(cacheKey);
      if (cached) {
        console.log(`Cache hit for ${method} ${url}`);
        return cached;
      }
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      console.log(`Request deduplication: ${method} ${url} already in progress`);
      return await this.pendingRequests.get(cacheKey);
    }

    // Create new request promise
    const requestPromise = this.executeRequestWithTracking(
      requestFn,
      cacheKey,
      method,
      url,
      data,
      config
    );

    // Store pending request
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const response = await requestPromise;
      
      // Cache successful GET requests
      if (method.toUpperCase() === 'GET' && response.status >= 200 && response.status < 300) {
        this.cacheResponse(cacheKey, response);
      }
      
      return response;
    } finally {
      // Remove from pending requests
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Execute request with performance tracking
   */
  async executeRequestWithTracking(requestFn, cacheKey, method, url, data, config) {
    const startTime = performance.now();
    
    try {
      const response = await requestFn();
      const duration = performance.now() - startTime;
      
      // Log performance metrics
      this.logRequestMetrics(method, url, duration, response.status, cacheKey);
      
      return response;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      // Log error metrics
      this.logRequestMetrics(method, url, duration, 'ERROR', cacheKey, error);
      
      throw error;
    }
  }

  /**
   * Log request performance metrics
   */
  logRequestMetrics(method, url, duration, status, cacheKey, error = null) {
    const metrics = {
      method,
      url,
      duration,
      status,
      cacheKey,
      timestamp: Date.now(),
      error: error ? error.message : null
    };

    // Send to performance monitoring
    if (window.performanceMonitor) {
      window.performanceMonitor.recordMetric('api_request', {
        duration,
        method,
        url,
        status,
        error: error ? error.message : null
      });
    }

    // Log slow requests
    if (duration > 1000) { // 1 second
      console.warn(`Slow API request: ${method} ${url} took ${duration.toFixed(2)}ms`);
    }

    // Log errors
    if (error) {
      console.error(`API request failed: ${method} ${url}`, error);
    }
  }

  /**
   * Clear cache for specific URL pattern
   */
  clearCacheByPattern(pattern) {
    const regex = new RegExp(pattern);
    const keysToDelete = [];

    for (const key of this.responseCache.keys()) {
      try {
        const keyData = JSON.parse(atob(key));
        if (regex.test(keyData.url)) {
          keysToDelete.push(key);
        }
      } catch (e) {
        // Invalid key format, skip
      }
    }

    keysToDelete.forEach(key => {
      this.responseCache.delete(key);
    });

    console.log(`Cleared ${keysToDelete.length} cache entries matching pattern: ${pattern}`);
  }

  /**
   * Clear all cache
   */
  clearCache() {
    this.responseCache.clear();
    console.log('Cleared all request cache');
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const stats = {
      cacheSize: this.responseCache.size,
      pendingRequests: this.pendingRequests.size,
      cacheEnabled: this.cacheConfig.enableCache,
      maxCacheSize: this.cacheConfig.maxCacheSize,
      defaultTTL: this.cacheConfig.defaultTTL
    };

    // Calculate cache hit ratio (would need tracking)
    stats.cacheHitRatio = 0; // TODO: Implement hit ratio tracking

    return stats;
  }

  /**
   * Configure cache settings
   */
  configureCache(config) {
    this.cacheConfig = {
      ...this.cacheConfig,
      ...config
    };

    // Apply new cache size limit
    if (config.maxCacheSize && this.responseCache.size > config.maxCacheSize) {
      const excess = this.responseCache.size - config.maxCacheSize;
      for (let i = 0; i < excess; i++) {
        this.evictOldestCacheEntry();
      }
    }
  }

  /**
   * Cancel pending request
   */
  cancelRequest(method, url, data = null, config = {}) {
    const cacheKey = this.generateCacheKey(method, url, data, config);
    
    if (this.pendingRequests.has(cacheKey)) {
      // Note: Actual cancellation would need AbortController support
      this.pendingRequests.delete(cacheKey);
      console.log(`Cancelled pending request: ${method} ${url}`);
      return true;
    }
    
    return false;
  }

  /**
   * Cancel all pending requests
   */
  cancelAllRequests() {
    const count = this.pendingRequests.size;
    this.pendingRequests.clear();
    console.log(`Cancelled ${count} pending requests`);
    return count;
  }

  /**
   * Preload cache for common requests
   */
  async preloadRequests(requestConfigs) {
    const preloadPromises = requestConfigs.map(async (config) => {
      try {
        const cacheKey = this.generateCacheKey(config.method, config.url, config.data, config.config);
        
        // Skip if already cached
        if (this.getCachedResponse(cacheKey)) {
          return;
        }

        // Execute request to populate cache
        await this.executeRequest(
          config.requestFn,
          config.method,
          config.url,
          config.data,
          config.config
        );
        
        console.log(`Preloaded cache for: ${config.method} ${config.url}`);
      } catch (error) {
        console.warn(`Failed to preload ${config.method} ${config.url}:`, error);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Cleanup and destroy
   */
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.clearCache();
    this.cancelAllRequests();
    
    console.log('Request deduplicator destroyed');
  }
}

// Create singleton instance
const requestDeduplicator = new RequestDeduplicator();

// Export utilities
export const requestDeduplication = {
  executeRequest: (requestFn, method, url, data, config) => 
    requestDeduplicator.executeRequest(requestFn, method, url, data, config),
  
  clearCache: (pattern) => 
    pattern ? requestDeduplicator.clearCacheByPattern(pattern) : requestDeduplicator.clearCache(),
  
  configureCache: (config) => 
    requestDeduplicator.configureCache(config),
  
  getStats: () => 
    requestDeduplicator.getCacheStats(),
  
  cancelRequest: (method, url, data, config) => 
    requestDeduplicator.cancelRequest(method, url, data, config),
  
  cancelAllRequests: () => 
    requestDeduplicator.cancelAllRequests(),
  
  preloadRequests: (configs) => 
    requestDeduplicator.preloadRequests(configs),
  
  destroy: () => 
    requestDeduplicator.destroy()
};

export default requestDeduplicator;
