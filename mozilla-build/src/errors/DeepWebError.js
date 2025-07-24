/**
 * Base Error Class for DeepWeb Extension
 * Provides standardized error handling with proper inheritance
 */

export class DeepWebError extends Error {
  constructor(message, code, severity = 'medium', recoverable = false, details = {}) {
    super(message);
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
    
    this.name = this.constructor.name;
    this.code = code;
    this.severity = severity; // 'low', 'medium', 'high', 'critical'
    this.recoverable = recoverable;
    this.timestamp = new Date().toISOString();
    this.details = details;
    
    // Additional context
    this.userAgent = navigator.userAgent;
    this.url = window.location?.href || 'unknown';
  }

  /**
   * Convert error to JSON
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      severity: this.severity,
      recoverable: this.recoverable,
      timestamp: this.timestamp,
      details: this.details,
      stack: this.stack,
      userAgent: this.userAgent,
      url: this.url
    };
  }

  /**
   * Get user-friendly error message
   * @returns {string}
   */
  getUserMessage() {
    return this.message;
  }

  /**
   * Get recovery suggestions
   * @returns {Array<string>}
   */
  getRecoverySuggestions() {
    return [];
  }

  /**
   * Check if error should be reported
   * @returns {boolean}
   */
  shouldReport() {
    return this.severity === 'high' || this.severity === 'critical';
  }

  /**
   * Get error category
   * @returns {string}
   */
  getCategory() {
    return 'general';
  }
}