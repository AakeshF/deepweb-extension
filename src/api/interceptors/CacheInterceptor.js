/**
 * Cache Interceptor
 * Caches API responses for identical requests
 */

export class CacheInterceptor {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.ttl = options.ttl || 300000; // 5 minutes default
    this.maxSize = options.maxSize || 100;
    this.cache = new Map();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Request interceptor
   * @param {Object} request - Request object
   * @returns {Object} Modified request
   */
  async request(request) {
    if (!this.enabled || request.noCache) return request;
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(request);
    request._cacheKey = cacheKey;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && !this.isExpired(cached)) {
      this.cacheHits++;
      
      // Return cached response
      throw {
        _cached: true,
        response: this.cloneResponse(cached.data)
      };
    }
    
    this.cacheMisses++;
    return request;
  }

  /**
   * Response interceptor
   * @param {Object} response - Response object
   * @param {Object} request - Original request
   * @returns {Object} Modified response
   */
  async response(response, request) {
    if (!this.enabled || request.noCache || !request._cacheKey) {
      return response;
    }
    
    // Cache successful responses
    if (response.choices && response.choices.length > 0) {
      this.addToCache(request._cacheKey, response);
    }
    
    return response;
  }

  /**
   * Error interceptor
   * @param {Error} error - Error object
   * @param {Object} request - Original request
   * @returns {Object|null} Cached response or null
   */
  async onError(error, request) {
    // Handle cached response
    if (error._cached) {
      console.log('[CacheInterceptor] Returning cached response');
      return error.response;
    }
    
    return null; // Let error propagate
  }

  /**
   * Generate cache key
   * @private
   */
  generateCacheKey(request) {
    const keyData = {
      provider: request.provider || 'deepseek',
      model: request.model,
      messages: request.messages?.map(m => ({
        role: m.role,
        content: m.content
      })),
      temperature: request.temperature,
      maxTokens: request.maxTokens
    };
    
    // Simple hash function
    const str = JSON.stringify(keyData);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    return `${request.provider || 'deepseek'}-${request.model}-${hash}`;
  }

  /**
   * Add to cache
   * @private
   */
  addToCache(key, data) {
    // Implement LRU eviction
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      data: this.cloneResponse(data),
      timestamp: Date.now()
    });
  }

  /**
   * Check if cache entry is expired
   * @private
   */
  isExpired(entry) {
    return Date.now() - entry.timestamp > this.ttl;
  }

  /**
   * Clone response to prevent mutations
   * @private
   */
  cloneResponse(response) {
    return JSON.parse(JSON.stringify(response));
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache stats
   */
  getStats() {
    const total = this.cacheHits + this.cacheMisses;
    const hitRate = total > 0 ? this.cacheHits / total : 0;
    
    return {
      size: this.cache.size,
      hits: this.cacheHits,
      misses: this.cacheMisses,
      hitRate: (hitRate * 100).toFixed(2) + '%',
      maxSize: this.maxSize,
      ttl: this.ttl
    };
  }

  /**
   * Remove expired entries
   */
  prune() {
    const now = Date.now();
    const expired = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        expired.push(key);
      }
    }
    
    expired.forEach(key => this.cache.delete(key));
    
    return expired.length;
  }
}