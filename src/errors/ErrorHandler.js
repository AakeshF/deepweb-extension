/**
 * Centralized Error Handler
 * Manages error logging, reporting, and user notifications
 */

import { DeepWebError } from './DeepWebError.js';
import { ApiError, NetworkError, TimeoutError } from './ApiError.js';
import { ValidationError, ConfigurationError } from './ValidationError.js';
import { UIError, RenderError, ComponentError } from './UIError.js';
import { SecurityError, XSSError } from './SecurityError.js';
import { getConfig } from '../config/index.js';

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.errorListeners = new Set();
    this.maxLogSize = 100;
    this.reportQueue = [];
    this.isReporting = false;
    
    // Error statistics
    this.stats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      recovered: 0
    };
    
    // Setup global error handlers
    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandlers() {
    // Handle unhandled errors
    window.addEventListener('error', (event) => {
      this.handleError(new DeepWebError(
        event.message,
        'UNHANDLED_ERROR',
        'high',
        false,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      ));
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new DeepWebError(
        event.reason?.message || 'Unhandled promise rejection',
        'UNHANDLED_REJECTION',
        'high',
        false,
        { reason: event.reason }
      ));
    });
  }

  /**
   * Handle an error
   * @param {Error} error - Error to handle
   * @param {Object} context - Additional context
   * @returns {Object} Error handling result
   */
  handleError(error, context = {}) {
    // Convert to DeepWebError if needed
    const deepWebError = this.normalizeError(error, context);
    
    // Log the error
    this.logError(deepWebError);
    
    // Update statistics
    this.updateStats(deepWebError);
    
    // Notify listeners
    this.notifyListeners(deepWebError);
    
    // Report if needed
    if (deepWebError.shouldReport()) {
      this.queueErrorReport(deepWebError);
    }
    
    // Attempt recovery
    const recovered = this.attemptRecovery(deepWebError);
    
    return {
      error: deepWebError,
      recovered,
      userMessage: deepWebError.getUserMessage(),
      suggestions: deepWebError.getRecoverySuggestions()
    };
  }

  /**
   * Normalize error to DeepWebError
   * @private
   */
  normalizeError(error, context) {
    if (error instanceof DeepWebError) {
      return error;
    }
    
    // Check for specific error types
    if (error.name === 'NetworkError' || error.message.includes('Failed to fetch')) {
      return new NetworkError(error.message, error);
    }
    
    if (error.name === 'AbortError' || error.message.includes('aborted')) {
      return new TimeoutError(error.message);
    }
    
    if (error.name === 'ValidationError') {
      return new ValidationError(error.message, context.field, context.value);
    }
    
    if (error.name === 'SecurityError') {
      return new SecurityError(error.message, 'UNKNOWN', context.action);
    }
    
    // Default to generic DeepWebError
    return new DeepWebError(
      error.message || 'Unknown error',
      'UNKNOWN_ERROR',
      'medium',
      false,
      { originalError: error.toString(), context }
    );
  }

  /**
   * Log error
   * @private
   */
  logError(error) {
    const logEntry = {
      timestamp: error.timestamp,
      error: error.toJSON(),
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.errorLog.push(logEntry);
    
    // Maintain log size limit
    if (this.errorLog.length > this.maxLogSize) {
      this.errorLog.shift();
    }
    
    // Console logging based on severity
    const logMethod = {
      low: 'log',
      medium: 'warn',
      high: 'error',
      critical: 'error'
    }[error.severity] || 'log';
    
    console[logMethod]('[DeepWeb Error]', error.message, error);
  }

  /**
   * Update error statistics
   * @private
   */
  updateStats(error) {
    this.stats.total++;
    
    // By category
    const category = error.getCategory();
    this.stats.byCategory[category] = (this.stats.byCategory[category] || 0) + 1;
    
    // By severity
    this.stats.bySeverity[error.severity] = (this.stats.bySeverity[error.severity] || 0) + 1;
  }

  /**
   * Notify error listeners
   * @private
   */
  notifyListeners(error) {
    this.errorListeners.forEach(listener => {
      try {
        listener(error);
      } catch (e) {
        console.error('[ErrorHandler] Listener error:', e);
      }
    });
  }

  /**
   * Queue error for reporting
   * @private
   */
  queueErrorReport(error) {
    if (!getConfig('telemetry.enabled')) {
      return;
    }
    
    this.reportQueue.push({
      error: error.toJSON(),
      timestamp: Date.now()
    });
    
    // Process queue if not already processing
    if (!this.isReporting) {
      this.processReportQueue();
    }
  }

  /**
   * Process error report queue
   * @private
   */
  async processReportQueue() {
    if (this.reportQueue.length === 0 || this.isReporting) {
      return;
    }
    
    this.isReporting = true;
    
    try {
      const batch = this.reportQueue.splice(0, 10); // Process up to 10 at a time
      
      // In production, this would send to error reporting service
      // For now, just log
      console.log('[ErrorHandler] Would report errors:', batch);
      
      // Simulate async reporting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.error('[ErrorHandler] Failed to report errors:', error);
    } finally {
      this.isReporting = false;
      
      // Process remaining items
      if (this.reportQueue.length > 0) {
        setTimeout(() => this.processReportQueue(), 5000);
      }
    }
  }

  /**
   * Attempt error recovery
   * @private
   */
  attemptRecovery(error) {
    if (!error.recoverable) {
      return false;
    }
    
    // Implement recovery strategies based on error type
    if (error instanceof NetworkError) {
      // Could implement retry logic here
      return false;
    }
    
    if (error instanceof UIError) {
      // Could try to re-render component
      return false;
    }
    
    if (error instanceof ValidationError) {
      // Validation errors are typically user-correctable
      return true;
    }
    
    return false;
  }

  /**
   * Subscribe to error events
   * @param {Function} listener - Error listener
   * @returns {Function} Unsubscribe function
   */
  onError(listener) {
    this.errorListeners.add(listener);
    
    return () => {
      this.errorListeners.delete(listener);
    };
  }

  /**
   * Get error log
   * @param {Object} filters - Optional filters
   * @returns {Array} Filtered error log
   */
  getErrorLog(filters = {}) {
    let log = [...this.errorLog];
    
    if (filters.category) {
      log = log.filter(entry => entry.error.category === filters.category);
    }
    
    if (filters.severity) {
      log = log.filter(entry => entry.error.severity === filters.severity);
    }
    
    if (filters.since) {
      const sinceTime = new Date(filters.since).getTime();
      log = log.filter(entry => new Date(entry.timestamp).getTime() >= sinceTime);
    }
    
    return log;
  }

  /**
   * Get error statistics
   * @returns {Object} Error statistics
   */
  getStats() {
    return {
      ...this.stats,
      errorRate: this.calculateErrorRate(),
      topErrors: this.getTopErrors()
    };
  }

  /**
   * Calculate error rate
   * @private
   */
  calculateErrorRate() {
    const recentErrors = this.errorLog.filter(entry => {
      const age = Date.now() - new Date(entry.timestamp).getTime();
      return age < 3600000; // Last hour
    });
    
    return recentErrors.length;
  }

  /**
   * Get top errors
   * @private
   */
  getTopErrors() {
    const errorCounts = {};
    
    this.errorLog.forEach(entry => {
      const key = entry.error.code;
      errorCounts[key] = (errorCounts[key] || 0) + 1;
    });
    
    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, count]) => ({ code, count }));
  }

  /**
   * Clear error log
   */
  clearLog() {
    this.errorLog = [];
    this.stats = {
      total: 0,
      byCategory: {},
      bySeverity: {},
      recovered: 0
    };
  }

  /**
   * Export error log
   * @returns {Object} Exportable error data
   */
  exportLog() {
    return {
      timestamp: new Date().toISOString(),
      stats: this.getStats(),
      errors: this.errorLog,
      version: browser.runtime.getManifest().version
    };
  }
}

// Export singleton instance
export default new ErrorHandler();

// Export error classes for direct use
export {
  DeepWebError,
  ApiError,
  NetworkError,
  TimeoutError,
  ValidationError,
  ConfigurationError,
  UIError,
  RenderError,
  ComponentError,
  SecurityError,
  XSSError
};