/**
 * Error Monitor
 * Comprehensive error tracking and reporting system with optional Sentry integration
 */

export class ErrorMonitor {
  constructor(config = {}) {
    this.config = {
      enabled: config.enabled !== false,
      sentry: config.sentry || null,
      bufferSize: config.bufferSize || 50,
      flushInterval: config.flushInterval || 30000, // 30 seconds
      includeUserAgent: config.includeUserAgent !== false,
      includeMemoryInfo: config.includeMemoryInfo !== false,
      filters: config.filters || []
    };
    
    this.errorBuffer = [];
    this.metadata = {};
    this.flushTimer = null;
    this.initialized = false;
  }

  /**
   * Initialize error monitoring
   */
  async init() {
    if (!this.config.enabled || this.initialized) {
      return;
    }

    try {
      // Set up global error handlers
      this.setupErrorHandlers();
      
      // Initialize Sentry if configured
      if (this.config.sentry && window.Sentry) {
        await this.initializeSentry();
      }
      
      // Start periodic flush
      this.startPeriodicFlush();
      
      // Set up extension-specific monitoring
      this.setupExtensionMonitoring();
      
      this.initialized = true;
      console.log('Error monitoring initialized');
    } catch (error) {
      console.error('Failed to initialize error monitoring:', error);
    }
  }

  /**
   * Initialize Sentry integration
   */
  async initializeSentry() {
    const { dsn, environment, release, sampleRate = 1.0 } = this.config.sentry;
    
    if (!dsn) {
      console.warn('Sentry DSN not configured');
      return;
    }

    try {
      window.Sentry.init({
        dsn,
        environment: environment || 'production',
        release: release || browser.runtime.getManifest().version,
        sampleRate,
        integrations: [
          new window.Sentry.BrowserTracing(),
        ],
        tracesSampleRate: 0.1,
        beforeSend: (event, hint) => this.beforeSendToSentry(event, hint),
        beforeBreadcrumb: (breadcrumb) => this.filterBreadcrumb(breadcrumb)
      });

      // Set user context
      const userId = await this.getOrCreateUserId();
      window.Sentry.setUser({ id: userId });
      
      console.log('Sentry initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Sentry:', error);
    }
  }

  /**
   * Set up global error handlers
   */
  setupErrorHandlers() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.captureError(event.error || new Error(event.message), {
        type: 'uncaught',
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.captureError(new Error(event.reason), {
        type: 'unhandled_promise',
        promise: event.promise
      });
    });

    // Console error interceptor
    const originalError = console.error;
    console.error = (...args) => {
      this.captureError(new Error(args.join(' ')), {
        type: 'console_error',
        args
      });
      originalError.apply(console, args);
    };
  }

  /**
   * Set up extension-specific monitoring
   */
  setupExtensionMonitoring() {
    // Monitor extension API errors
    if (browser.runtime) {
      const checkLastError = () => {
        if (browser.runtime.lastError) {
          this.captureError(new Error(browser.runtime.lastError.message), {
            type: 'extension_api',
            api: 'runtime.lastError'
          });
        }
      };

      // Wrap common extension APIs
      this.wrapExtensionAPI('storage', ['get', 'set', 'remove'], checkLastError);
      this.wrapExtensionAPI('tabs', ['create', 'update', 'remove'], checkLastError);
      this.wrapExtensionAPI('runtime', ['sendMessage'], checkLastError);
    }

    // Monitor message passing errors
    if (browser.runtime && browser.runtime.onMessage) {
      browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
        try {
          // Let other handlers process the message
          return false;
        } catch (error) {
          this.captureError(error, {
            type: 'message_handler',
            request,
            sender
          });
          throw error;
        }
      });
    }
  }

  /**
   * Wrap extension API methods for error monitoring
   */
  wrapExtensionAPI(namespace, methods, errorChecker) {
    const api = browser[namespace];
    if (!api) return;

    methods.forEach(method => {
      if (!api[method]) return;
      
      const original = api[method];
      api[method] = function(...args) {
        try {
          const result = original.apply(this, args);
          
          // Check for errors after async operations
          if (result && typeof result.then === 'function') {
            result.then(errorChecker).catch(error => {
              this.captureError(error, {
                type: 'extension_api_async',
                api: `${namespace}.${method}`,
                args
              });
            });
          } else {
            errorChecker();
          }
          
          return result;
        } catch (error) {
          this.captureError(error, {
            type: 'extension_api_sync',
            api: `${namespace}.${method}`,
            args
          });
          throw error;
        }
      }.bind(api);
    });
  }

  /**
   * Capture an error
   */
  captureError(error, context = {}) {
    if (!this.config.enabled) {
      return;
    }

    // Apply filters
    if (!this.shouldCaptureError(error, context)) {
      return;
    }

    const errorData = {
      timestamp: Date.now(),
      message: error.message,
      stack: error.stack,
      type: context.type || 'generic',
      context: {
        ...context,
        url: window.location.href,
        userAgent: this.config.includeUserAgent ? navigator.userAgent : undefined,
        memory: this.config.includeMemoryInfo ? this.getMemoryInfo() : undefined,
        ...this.metadata
      }
    };

    // Add to buffer
    this.errorBuffer.push(errorData);
    
    // Send to Sentry if available
    if (window.Sentry && this.config.sentry) {
      window.Sentry.captureException(error, {
        tags: {
          error_type: errorData.type
        },
        extra: errorData.context
      });
    }

    // Trigger immediate flush if buffer is full
    if (this.errorBuffer.length >= this.config.bufferSize) {
      this.flush();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error captured:', errorData);
    }
  }

  /**
   * Check if error should be captured based on filters
   */
  shouldCaptureError(error, context) {
    for (const filter of this.config.filters) {
      if (typeof filter === 'function' && !filter(error, context)) {
        return false;
      }
      if (filter instanceof RegExp && filter.test(error.message)) {
        return false;
      }
      if (typeof filter === 'string' && error.message.includes(filter)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Filter breadcrumbs before sending to Sentry
   */
  filterBreadcrumb(breadcrumb) {
    // Filter out sensitive data from breadcrumbs
    if (breadcrumb.category === 'console' && breadcrumb.data) {
      // Remove potential API keys or tokens
      breadcrumb.data = this.sanitizeData(breadcrumb.data);
    }
    
    return breadcrumb;
  }

  /**
   * Process event before sending to Sentry
   */
  beforeSendToSentry(event, hint) {
    // Sanitize sensitive data
    if (event.extra) {
      event.extra = this.sanitizeData(event.extra);
    }
    
    // Add additional context
    event.tags = {
      ...event.tags,
      extension_version: browser.runtime.getManifest().version
    };
    
    return event;
  }

  /**
   * Sanitize sensitive data
   */
  sanitizeData(data) {
    const sensitivePatterns = [
      /api[_-]?key/i,
      /token/i,
      /password/i,
      /secret/i,
      /auth/i
    ];

    const sanitized = { ...data };
    
    Object.keys(sanitized).forEach(key => {
      // Check if key contains sensitive pattern
      if (sensitivePatterns.some(pattern => pattern.test(key))) {
        sanitized[key] = '[REDACTED]';
      }
      // Recursively sanitize nested objects
      else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    });
    
    return sanitized;
  }

  /**
   * Get memory information
   */
  getMemoryInfo() {
    if (!performance.memory) {
      return null;
    }

    return {
      usedJSHeapSize: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
      totalJSHeapSize: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
      jsHeapSizeLimit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
    };
  }

  /**
   * Get or create user ID for tracking
   */
  async getOrCreateUserId() {
    try {
      const result = await browser.storage.local.get('errorMonitorUserId');
      
      if (result.errorMonitorUserId) {
        return result.errorMonitorUserId;
      }
      
      const userId = this.generateUserId();
      await browser.storage.local.set({ errorMonitorUserId: userId });
      return userId;
    } catch (error) {
      console.error('Failed to get/create user ID:', error);
      return 'anonymous';
    }
  }

  /**
   * Generate unique user ID
   */
  generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Start periodic error flush
   */
  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      if (this.errorBuffer.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  /**
   * Flush error buffer
   */
  async flush() {
    if (this.errorBuffer.length === 0) {
      return;
    }

    const errors = [...this.errorBuffer];
    this.errorBuffer = [];

    try {
      // Store errors locally for debugging
      await this.storeErrorsLocally(errors);
      
      // Send to remote endpoint if configured
      if (this.config.remoteEndpoint) {
        await this.sendToRemote(errors);
      }
    } catch (error) {
      console.error('Failed to flush errors:', error);
      // Put errors back in buffer for retry
      this.errorBuffer.unshift(...errors);
    }
  }

  /**
   * Store errors locally
   */
  async storeErrorsLocally(errors) {
    try {
      const result = await browser.storage.local.get('errorLog');
      const errorLog = result.errorLog || [];
      
      // Keep only last 100 errors
      const updatedLog = [...errorLog, ...errors].slice(-100);
      
      await browser.storage.local.set({ errorLog: updatedLog });
    } catch (error) {
      console.error('Failed to store errors locally:', error);
    }
  }

  /**
   * Send errors to remote endpoint
   */
  async sendToRemote(errors) {
    if (!this.config.remoteEndpoint) {
      return;
    }

    const response = await fetch(this.config.remoteEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        errors,
        metadata: {
          version: browser.runtime.getManifest().version,
          timestamp: Date.now()
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to send errors: ${response.statusText}`);
    }
  }

  /**
   * Set metadata for all errors
   */
  setMetadata(metadata) {
    this.metadata = { ...this.metadata, ...metadata };
  }

  /**
   * Clear metadata
   */
  clearMetadata() {
    this.metadata = {};
  }

  /**
   * Get error statistics
   */
  async getErrorStats() {
    try {
      const result = await browser.storage.local.get('errorLog');
      const errorLog = result.errorLog || [];
      
      const stats = {
        total: errorLog.length,
        byType: {},
        recent: errorLog.slice(-10),
        oldestError: errorLog[0]?.timestamp,
        newestError: errorLog[errorLog.length - 1]?.timestamp
      };
      
      // Count by type
      errorLog.forEach(error => {
        stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
      });
      
      return stats;
    } catch (error) {
      console.error('Failed to get error stats:', error);
      return null;
    }
  }

  /**
   * Clear error log
   */
  async clearErrorLog() {
    try {
      await browser.storage.local.remove('errorLog');
      this.errorBuffer = [];
    } catch (error) {
      console.error('Failed to clear error log:', error);
    }
  }

  /**
   * Cleanup and shutdown
   */
  shutdown() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    // Flush remaining errors
    this.flush();
    
    this.initialized = false;
  }
}

// Export singleton instance with default config
export const errorMonitor = new ErrorMonitor();