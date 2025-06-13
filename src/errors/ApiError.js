/**
 * API Error Class
 * Handles API-related errors with specific error codes and recovery strategies
 */

import { DeepWebError } from './DeepWebError.js';

export class ApiError extends DeepWebError {
  constructor(message, statusCode, responseData = null) {
    const code = ApiError.getErrorCode(statusCode);
    const severity = ApiError.getSeverity(statusCode);
    const recoverable = ApiError.isRecoverable(statusCode);
    
    super(message, code, severity, recoverable, {
      statusCode,
      responseData,
      endpoint: responseData?.endpoint || 'unknown'
    });
    
    this.statusCode = statusCode;
    this.responseData = responseData;
  }

  static getErrorCode(statusCode) {
    const codes = {
      400: 'API_BAD_REQUEST',
      401: 'API_UNAUTHORIZED',
      403: 'API_FORBIDDEN',
      404: 'API_NOT_FOUND',
      429: 'API_RATE_LIMITED',
      500: 'API_SERVER_ERROR',
      502: 'API_BAD_GATEWAY',
      503: 'API_UNAVAILABLE',
      504: 'API_TIMEOUT'
    };
    return codes[statusCode] || 'API_UNKNOWN_ERROR';
  }

  static getSeverity(statusCode) {
    if (statusCode >= 500) return 'high';
    if (statusCode === 429) return 'medium';
    if (statusCode === 401) return 'high';
    return 'medium';
  }

  static isRecoverable(statusCode) {
    return statusCode === 429 || statusCode >= 500;
  }

  getUserMessage() {
    const messages = {
      400: 'Invalid request. Please check your input and try again.',
      401: 'Authentication failed. Please check your API key in settings.',
      403: 'Access denied. Your API key may not have the required permissions.',
      404: 'Resource not found. The API endpoint may have changed.',
      429: 'Too many requests. Please wait a moment and try again.',
      500: 'Server error. The service is experiencing issues.',
      502: 'Gateway error. Unable to reach the API service.',
      503: 'Service unavailable. Please try again later.',
      504: 'Request timeout. The server took too long to respond.'
    };
    
    return messages[this.statusCode] || 'An unexpected API error occurred.';
  }

  getRecoverySuggestions() {
    const suggestions = {
      401: [
        'Check your API key in the extension settings',
        'Ensure your API key hasn\'t expired',
        'Generate a new API key from your DeepSeek account'
      ],
      429: [
        'Wait a few seconds before trying again',
        'Reduce the frequency of your requests',
        'Check your API usage limits'
      ],
      500: [
        'Try again in a few moments',
        'Check the DeepSeek status page',
        'Contact support if the issue persists'
      ],
      503: [
        'The service may be under maintenance',
        'Try again in a few minutes',
        'Check for service announcements'
      ]
    };
    
    return suggestions[this.statusCode] || ['Please try again later'];
  }

  getRetryDelay() {
    // Get retry delay in milliseconds
    if (this.statusCode === 429) {
      // Check for Retry-After header
      const retryAfter = this.responseData?.headers?.['retry-after'];
      if (retryAfter) {
        return parseInt(retryAfter) * 1000;
      }
      return 10000; // Default 10 seconds for rate limit
    }
    
    if (this.statusCode >= 500) {
      return 5000; // 5 seconds for server errors
    }
    
    return 0; // No retry for client errors
  }

  getCategory() {
    return 'api';
  }
}

/**
 * Network Error Class
 */
export class NetworkError extends ApiError {
  constructor(message = 'Network connection failed', originalError = null) {
    super(message, 0, null);
    
    this.code = 'NETWORK_ERROR';
    this.severity = 'high';
    this.recoverable = true;
    this.originalError = originalError;
  }

  getUserMessage() {
    return 'Unable to connect to the server. Please check your internet connection.';
  }

  getRecoverySuggestions() {
    return [
      'Check your internet connection',
      'Disable VPN or proxy if using one',
      'Try refreshing the page',
      'Check if your firewall is blocking the connection'
    ];
  }
}

/**
 * Timeout Error Class
 */
export class TimeoutError extends ApiError {
  constructor(message = 'Request timed out', timeout = 30000) {
    super(message, 504, null);
    
    this.code = 'REQUEST_TIMEOUT';
    this.severity = 'medium';
    this.recoverable = true;
    this.timeout = timeout;
  }

  getUserMessage() {
    return `Request timed out after ${this.timeout / 1000} seconds. The server may be busy.`;
  }

  getRecoverySuggestions() {
    return [
      'Try again with a shorter message',
      'Check if the service is experiencing high load',
      'Wait a moment and try again'
    ];
  }
}