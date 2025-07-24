/**
 * Error Monitoring Configuration
 */

export const ERROR_MONITORING_CONFIG = {
  // Enable/disable error monitoring
  enabled: true,
  
  // Buffer settings
  bufferSize: 50,
  flushInterval: 30000, // 30 seconds
  
  // Data collection settings
  includeUserAgent: true,
  includeMemoryInfo: true,
  
  // Error filters (errors matching these will be ignored)
  filters: [
    // Ignore common browser errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    'Non-Error promise rejection captured',
    
    // Ignore network errors that are expected
    /Failed to fetch/i,
    /NetworkError/i,
    /Load timeout/i,
    
    // Custom filter function
    (error, context) => {
      // Ignore errors from third-party scripts
      if (context.filename && !context.filename.includes('deepweb')) {
        return false;
      }
      return true;
    }
  ],
  
  // Sentry configuration (optional)
  sentry: {
    // DSN will be set via environment variable or build config
    dsn: process.env.SENTRY_DSN || null,
    environment: process.env.NODE_ENV || 'production',
    sampleRate: 1.0,
    // Release will be auto-detected from manifest
  },
  
  // Remote endpoint for custom error collection (optional)
  remoteEndpoint: process.env.ERROR_ENDPOINT || null
};

/**
 * Error severity levels
 */
export const ERROR_SEVERITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Error categories
 */
export const ERROR_CATEGORY = {
  NETWORK: 'network',
  API: 'api',
  STORAGE: 'storage',
  UI: 'ui',
  EXTENSION: 'extension',
  SECURITY: 'security',
  PERFORMANCE: 'performance',
  UNKNOWN: 'unknown'
};