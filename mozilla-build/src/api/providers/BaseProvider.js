/**
 * Base API Provider Class
 * Abstract base class for all API providers
 */

import { ApiError, NetworkError, TimeoutError } from '../../errors/index.js';
import { getConfig } from '../../config/index.js';

export default class BaseProvider {
  constructor(config) {
    if (new.target === BaseProvider) {
      throw new Error('BaseProvider is an abstract class and cannot be instantiated directly');
    }
    
    this.config = config;
    this.name = this.constructor.name;
    this.requestQueue = [];
    this.activeRequests = new Map();
    this.rateLimiter = this.createRateLimiter();
  }

  /**
   * Send chat completion request
   * @abstract
   * @param {Array} messages - Chat messages
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async chat(messages, options = {}) {
    throw new Error('chat() must be implemented by subclass');
  }

  /**
   * Send streaming chat completion request
   * @abstract
   * @param {Array} messages - Chat messages
   * @param {Object} options - Request options
   * @returns {AsyncGenerator} Response stream
   */
  async *stream(messages, options = {}) {
    throw new Error('stream() must be implemented by subclass');
  }

  /**
   * Validate API key format
   * @abstract
   * @param {string} key - API key to validate
   * @returns {boolean} Is valid
   */
  validateApiKey(key) {
    throw new Error('validateApiKey() must be implemented by subclass');
  }

  /**
   * Calculate request cost
   * @abstract
   * @param {Object} usage - Token usage
   * @returns {number} Cost in dollars
   */
  calculateCost(usage) {
    throw new Error('calculateCost() must be implemented by subclass');
  }

  /**
   * Make HTTP request with retry logic
   * @protected
   * @param {string} url - Request URL
   * @param {Object} options - Fetch options
   * @returns {Promise<Response>} HTTP response
   */
  async makeRequest(url, options = {}) {
    const requestId = this.generateRequestId();
    const retryConfig = getConfig('api.retries');
    let lastError = null;
    
    // Check rate limit
    await this.rateLimiter.checkLimit();
    
    for (let attempt = 0; attempt <= retryConfig.max; attempt++) {
      try {
        // Add to active requests
        const controller = new AbortController();
        this.activeRequests.set(requestId, controller);
        
        // Set timeout
        const timeout = setTimeout(
          () => controller.abort(),
          options.timeout || getConfig('api.timeout')
        );
        
        // Make request
        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });
        
        clearTimeout(timeout);
        this.activeRequests.delete(requestId);
        
        // Update rate limiter
        this.rateLimiter.recordRequest();
        
        return response;
        
      } catch (error) {
        this.activeRequests.delete(requestId);
        
        // Handle specific errors
        if (error.name === 'AbortError') {
          lastError = new TimeoutError(
            `Request timed out after ${options.timeout || getConfig('api.timeout')}ms`
          );
        } else if (error instanceof TypeError && error.message.includes('fetch')) {
          lastError = new NetworkError('Network request failed', error);
        } else {
          lastError = error;
        }
        
        console.error(`[${this.name}] Request attempt ${attempt + 1} failed:`, lastError);
        
        // Check if we should retry
        if (attempt < retryConfig.max && this.shouldRetry(lastError)) {
          const delay = this.calculateRetryDelay(attempt, retryConfig);
          await this.delay(delay);
        } else {
          break;
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Parse API response
   * @protected
   * @param {Response} response - HTTP response
   * @returns {Promise<Object>} Parsed response
   */
  async parseResponse(response) {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error?.message || `API error: ${response.status}`,
        response.status,
        {
          ...errorData,
          provider: this.name,
          headers: Object.fromEntries(response.headers.entries())
        }
      );
    }
    
    const data = await response.json();
    
    // Validate response structure
    this.validateResponse(data);
    
    return data;
  }

  /**
   * Validate response structure
   * @protected
   * @param {Object} data - Response data
   * @throws {ApiError} If response is invalid
   */
  validateResponse(data) {
    // Override in subclasses for specific validation
    if (!data) {
      throw new ApiError('Empty response received', 500);
    }
  }

  /**
   * Create rate limiter
   * @protected
   * @returns {Object} Rate limiter
   */
  createRateLimiter() {
    const config = getConfig('api.rateLimit');
    let requests = [];
    
    return {
      async checkLimit() {
        const now = Date.now();
        
        // Remove old requests
        requests = requests.filter(time => now - time < 3600000); // Keep last hour
        
        // Check rate limits
        if (config.maxPerHour && requests.length >= config.maxPerHour) {
          const oldestRequest = Math.min(...requests);
          const waitTime = 3600000 - (now - oldestRequest);
          
          throw new ApiError(
            'Hourly rate limit exceeded',
            429,
            {
              retryAfter: Math.ceil(waitTime / 1000),
              limit: config.maxPerHour
            }
          );
        }
        
        // Check interval limit
        if (config.interval && requests.length > 0) {
          const lastRequest = Math.max(...requests);
          const timeSince = now - lastRequest;
          
          if (timeSince < config.interval) {
            await new Promise(resolve => 
              setTimeout(resolve, config.interval - timeSince)
            );
          }
        }
      },
      
      recordRequest() {
        requests.push(Date.now());
      },
      
      reset() {
        requests = [];
      }
    };
  }

  /**
   * Check if error is retryable
   * @protected
   * @param {Error} error - Error to check
   * @returns {boolean} Should retry
   */
  shouldRetry(error) {
    if (error instanceof ApiError) {
      // Retry on server errors and rate limits
      return error.statusCode >= 500 || error.statusCode === 429;
    }
    
    if (error instanceof NetworkError || error instanceof TimeoutError) {
      return true;
    }
    
    return false;
  }

  /**
   * Calculate retry delay
   * @protected
   * @param {number} attempt - Attempt number
   * @param {Object} config - Retry configuration
   * @returns {number} Delay in milliseconds
   */
  calculateRetryDelay(attempt, config) {
    // Check for rate limit retry-after header
    if (this.lastError instanceof ApiError && this.lastError.responseData?.retryAfter) {
      return this.lastError.responseData.retryAfter * 1000;
    }
    
    // Exponential backoff with jitter
    const baseDelay = config.delay * Math.pow(config.backoff, attempt);
    const jitter = Math.random() * 0.3 * baseDelay; // 30% jitter
    
    return Math.min(baseDelay + jitter, 30000); // Max 30 seconds
  }

  /**
   * Cancel request
   * @param {string} requestId - Request ID
   */
  cancelRequest(requestId) {
    const controller = this.activeRequests.get(requestId);
    if (controller) {
      controller.abort();
      this.activeRequests.delete(requestId);
    }
  }

  /**
   * Cancel all active requests
   */
  cancelAllRequests() {
    for (const [id, controller] of this.activeRequests) {
      controller.abort();
    }
    this.activeRequests.clear();
  }

  /**
   * Generate unique request ID
   * @protected
   * @returns {string} Request ID
   */
  generateRequestId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   * @protected
   * @param {number} ms - Milliseconds to delay
   * @returns {Promise<void>}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return {
      streaming: false,
      models: [],
      maxTokens: 4000,
      features: []
    };
  }

  /**
   * Health check
   * @returns {Promise<boolean>} Is healthy
   */
  async healthCheck() {
    try {
      // Simple test request
      await this.makeRequest(this.config.endpoint, {
        method: 'GET',
        timeout: 5000
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}