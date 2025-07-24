/**
 * Error Monitoring Integration
 * Integrates error monitoring throughout the extension
 */

import { errorMonitor } from './ErrorMonitor.js';
import { ERROR_MONITORING_CONFIG, ERROR_SEVERITY, ERROR_CATEGORY } from './config.js';

/**
 * Initialize error monitoring for the extension
 */
export async function initializeErrorMonitoring() {
  try {
    // Load user preferences
    const { errorMonitoringEnabled } = await browser.storage.local.get('errorMonitoringEnabled');
    
    // Override config if user has disabled
    if (errorMonitoringEnabled === false) {
      ERROR_MONITORING_CONFIG.enabled = false;
    }
    
    // Initialize with config
    errorMonitor.config = { ...errorMonitor.config, ...ERROR_MONITORING_CONFIG };
    await errorMonitor.init();
    
    // Set extension metadata
    const manifest = browser.runtime.getManifest();
    errorMonitor.setMetadata({
      extensionVersion: manifest.version,
      extensionName: manifest.name,
      browserName: getBrowserName(),
      platform: navigator.platform
    });
    
    console.log('Error monitoring initialized');
  } catch (error) {
    console.error('Failed to initialize error monitoring:', error);
  }
}

/**
 * Wrap a function with error monitoring
 */
export function withErrorMonitoring(fn, context = {}) {
  return async function(...args) {
    try {
      return await fn.apply(this, args);
    } catch (error) {
      errorMonitor.captureError(error, {
        function: fn.name || 'anonymous',
        args: args.length > 0 ? '[args provided]' : '[no args]',
        ...context
      });
      throw error;
    }
  };
}

/**
 * Monitor API calls
 */
export function monitorAPICall(apiName, request, response, error = null) {
  if (error) {
    errorMonitor.captureError(error, {
      type: 'api_error',
      category: ERROR_CATEGORY.API,
      api: apiName,
      request: sanitizeAPIData(request),
      response: response ? sanitizeAPIData(response) : null,
      severity: ERROR_SEVERITY.HIGH
    });
  } else if (response && response.error) {
    errorMonitor.captureError(new Error(response.error), {
      type: 'api_response_error',
      category: ERROR_CATEGORY.API,
      api: apiName,
      request: sanitizeAPIData(request),
      response: sanitizeAPIData(response),
      severity: ERROR_SEVERITY.MEDIUM
    });
  }
}

/**
 * Monitor storage operations
 */
export function monitorStorageOperation(operation, key, error = null) {
  if (error) {
    errorMonitor.captureError(error, {
      type: 'storage_error',
      category: ERROR_CATEGORY.STORAGE,
      operation,
      key,
      severity: ERROR_SEVERITY.HIGH
    });
  }
}

/**
 * Monitor performance issues
 */
export function monitorPerformance(operation, duration, threshold = 1000) {
  if (duration > threshold) {
    errorMonitor.captureError(new Error(`Slow operation: ${operation}`), {
      type: 'performance_issue',
      category: ERROR_CATEGORY.PERFORMANCE,
      operation,
      duration,
      threshold,
      severity: duration > threshold * 2 ? ERROR_SEVERITY.HIGH : ERROR_SEVERITY.MEDIUM
    });
  }
}

/**
 * Create monitored event handler
 */
export function createMonitoredHandler(handler, eventType) {
  return function(event) {
    try {
      return handler.call(this, event);
    } catch (error) {
      errorMonitor.captureError(error, {
        type: 'event_handler_error',
        category: ERROR_CATEGORY.UI,
        eventType,
        targetElement: event.target?.tagName,
        severity: ERROR_SEVERITY.MEDIUM
      });
      
      // Re-throw to maintain normal error flow
      throw error;
    }
  };
}

/**
 * Monitor component lifecycle
 */
export class MonitoredComponent {
  constructor(componentName) {
    this.componentName = componentName;
    this.initialized = false;
  }
  
  async init() {
    const startTime = performance.now();
    
    try {
      await this.onInit();
      this.initialized = true;
      
      const duration = performance.now() - startTime;
      monitorPerformance(`${this.componentName}.init`, duration);
    } catch (error) {
      errorMonitor.captureError(error, {
        type: 'component_init_error',
        category: ERROR_CATEGORY.UI,
        component: this.componentName,
        severity: ERROR_SEVERITY.HIGH
      });
      throw error;
    }
  }
  
  async cleanup() {
    try {
      await this.onCleanup();
      this.initialized = false;
    } catch (error) {
      errorMonitor.captureError(error, {
        type: 'component_cleanup_error',
        category: ERROR_CATEGORY.UI,
        component: this.componentName,
        severity: ERROR_SEVERITY.MEDIUM
      });
    }
  }
  
  // Override these in subclasses
  async onInit() {}
  async onCleanup() {}
}

/**
 * Sanitize API data to remove sensitive information
 */
function sanitizeAPIData(data) {
  if (!data) return null;
  
  const sanitized = { ...data };
  const sensitiveKeys = ['apiKey', 'token', 'password', 'secret'];
  
  Object.keys(sanitized).forEach(key => {
    if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

/**
 * Get browser name
 */
function getBrowserName() {
  const ua = navigator.userAgent;
  
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Chrome')) return 'Chrome';
  if (ua.includes('Safari')) return 'Safari';
  if (ua.includes('Edge')) return 'Edge';
  
  return 'Unknown';
}

/**
 * Create error boundary for async operations
 */
export async function errorBoundary(operation, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    errorMonitor.captureError(error, {
      type: 'error_boundary',
      severity: ERROR_SEVERITY.MEDIUM
    });
    
    if (typeof fallback === 'function') {
      return fallback(error);
    }
    
    return fallback;
  }
}

/**
 * Report user feedback as error context
 */
export function reportUserFeedback(feedback, category = 'user_feedback') {
  errorMonitor.captureError(new Error('User Feedback'), {
    type: 'user_feedback',
    category,
    feedback,
    severity: ERROR_SEVERITY.LOW,
    isUserReport: true
  });
}