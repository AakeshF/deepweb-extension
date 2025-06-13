/**
 * Error Handling Module
 * Exports all error classes and utilities
 */

// Export error handler singleton
export { default as ErrorHandler } from './ErrorHandler.js';

// Export error classes
export { DeepWebError } from './DeepWebError.js';
export { ApiError, NetworkError, TimeoutError } from './ApiError.js';
export { ValidationError, ConfigurationError, SanitizationError } from './ValidationError.js';
export { UIError, RenderError, ComponentError, TemplateError } from './UIError.js';
export { SecurityError, XSSError, CSPError, ApiKeySecurityError } from './SecurityError.js';

// Export error boundary
export { ErrorBoundary } from './ErrorBoundary.js';

// Helper functions for common error handling patterns
import ErrorHandler from './ErrorHandler.js';

/**
 * Handle error with user notification
 * @param {Error} error - Error to handle
 * @param {Object} context - Error context
 * @returns {Object} Error result
 */
export function handleError(error, context = {}) {
  return ErrorHandler.handleError(error, context);
}

/**
 * Create API error from response
 * @param {Response} response - Fetch response
 * @param {string} message - Error message
 * @returns {ApiError}
 */
export async function createApiError(response, message = 'API request failed') {
  let responseData = null;
  
  try {
    responseData = await response.json();
  } catch (e) {
    // Response may not be JSON
  }
  
  return new ApiError(
    responseData?.error?.message || message,
    response.status,
    responseData
  );
}

/**
 * Wrap async function with error handling
 * @param {Function} fn - Async function to wrap
 * @param {Object} context - Error context
 * @returns {Function} Wrapped function
 */
export function withErrorHandling(fn, context = {}) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const result = ErrorHandler.handleError(error, context);
      throw result.error;
    }
  };
}

/**
 * Create error boundary for function
 * @param {Function} fn - Function to wrap
 * @param {Function} fallback - Fallback function
 * @returns {Function} Wrapped function
 */
export function withErrorBoundary(fn, fallback) {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (error) {
      const result = ErrorHandler.handleError(error);
      if (fallback) {
        return fallback(result.error, ...args);
      }
      throw result.error;
    }
  };
}