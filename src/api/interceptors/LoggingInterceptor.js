/**
 * Logging Interceptor
 * Logs API requests and responses for debugging
 */

export class LoggingInterceptor {
  constructor(options = {}) {
    this.enabled = options.enabled ?? true;
    this.logLevel = options.logLevel || 'info';
    this.maskSensitive = options.maskSensitive ?? true;
    this.maxContentLength = options.maxContentLength || 500;
  }

  /**
   * Request interceptor
   * @param {Object} request - Request object
   * @returns {Object} Modified request
   */
  async request(request) {
    if (!this.enabled) return request;
    
    const logData = {
      timestamp: new Date().toISOString(),
      type: 'API_REQUEST',
      provider: request.provider || 'deepseek',
      model: request.model,
      messageCount: request.messages?.length || 0,
      options: this.sanitizeOptions(request)
    };
    
    this.log('info', 'API Request', logData);
    
    // Add request timestamp for response logging
    request._requestTimestamp = Date.now();
    
    return request;
  }

  /**
   * Response interceptor
   * @param {Object} response - Response object
   * @param {Object} request - Original request
   * @returns {Object} Modified response
   */
  async response(response, request) {
    if (!this.enabled) return response;
    
    const duration = request._requestTimestamp 
      ? Date.now() - request._requestTimestamp 
      : null;
    
    const logData = {
      timestamp: new Date().toISOString(),
      type: 'API_RESPONSE',
      provider: request.provider || 'deepseek',
      model: response.model || request.model,
      duration: duration ? `${duration}ms` : 'unknown',
      usage: response.usage,
      cost: response.cost,
      contentLength: response.choices?.[0]?.message?.content?.length || 0
    };
    
    this.log('info', 'API Response', logData);
    
    return response;
  }

  /**
   * Stream interceptor
   * @param {Object} chunk - Stream chunk
   * @param {Object} request - Original request
   * @returns {Object} Modified chunk
   */
  async onStream(chunk, request) {
    if (!this.enabled || chunk.type !== 'content') return chunk;
    
    // Log first chunk
    if (!request._firstChunkLogged) {
      this.log('debug', 'Stream started', {
        provider: request.provider || 'deepseek',
        model: request.model
      });
      request._firstChunkLogged = true;
    }
    
    return chunk;
  }

  /**
   * Error interceptor
   * @param {Error} error - Error object
   * @param {Object} request - Original request
   * @returns {null} Let error propagate
   */
  async onError(error, request) {
    if (!this.enabled) return null;
    
    const duration = request._requestTimestamp 
      ? Date.now() - request._requestTimestamp 
      : null;
    
    const logData = {
      timestamp: new Date().toISOString(),
      type: 'API_ERROR',
      provider: request.provider || 'deepseek',
      model: request.model,
      duration: duration ? `${duration}ms` : 'unknown',
      error: {
        name: error.name,
        message: error.message,
        code: error.code,
        statusCode: error.statusCode
      }
    };
    
    this.log('error', 'API Error', logData);
    
    return null; // Let error propagate
  }

  /**
   * Sanitize options for logging
   * @private
   */
  sanitizeOptions(request) {
    const options = { ...request };
    
    // Remove sensitive data
    delete options.messages;
    delete options._requestTimestamp;
    
    if (this.maskSensitive) {
      if (options.apiKey) {
        options.apiKey = this.maskString(options.apiKey);
      }
    }
    
    return options;
  }

  /**
   * Mask sensitive string
   * @private
   */
  maskString(str) {
    if (!str || str.length < 8) return '***';
    return str.substring(0, 4) + '...' + str.substring(str.length - 4);
  }

  /**
   * Log message
   * @private
   */
  log(level, message, data) {
    const logMessage = `[APIClient] ${message}`;
    
    switch (level) {
      case 'debug':
        console.debug(logMessage, data);
        break;
      case 'info':
        console.log(logMessage, data);
        break;
      case 'warn':
        console.warn(logMessage, data);
        break;
      case 'error':
        console.error(logMessage, data);
        break;
    }
  }
}