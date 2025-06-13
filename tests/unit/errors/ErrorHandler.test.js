/**
 * ErrorHandler Test Suite
 */

import ErrorHandler, { 
  DeepWebError,
  ApiError,
  NetworkError,
  ValidationError,
  UIError,
  SecurityError
} from '../../../src/errors/index.js';

// Mock browser storage
global.browser = {
  runtime: {
    getManifest: () => ({ version: '1.0.0' })
  }
};

// Mock window
global.window = {
  addEventListener: jest.fn(),
  location: { href: 'https://example.com' }
};

// Mock navigator
global.navigator = {
  userAgent: 'Mozilla/5.0 Test Browser'
};

describe('ErrorHandler', () => {
  beforeEach(() => {
    ErrorHandler.clearLog();
    jest.clearAllMocks();
  });

  describe('handleError', () => {
    it('should handle DeepWebError instances', () => {
      const error = new DeepWebError('Test error', 'TEST_ERROR', 'medium', true);
      const result = ErrorHandler.handleError(error);
      
      expect(result.error).toBe(error);
      expect(result.userMessage).toBe('Test error');
      expect(result.suggestions).toEqual([]);
      expect(result.recovered).toBe(false);
    });

    it('should normalize regular errors', () => {
      const error = new Error('Regular error');
      const result = ErrorHandler.handleError(error);
      
      expect(result.error).toBeInstanceOf(DeepWebError);
      expect(result.error.code).toBe('UNKNOWN_ERROR');
      expect(result.userMessage).toBe('Regular error');
    });

    it('should handle network errors', () => {
      const error = new TypeError('Failed to fetch');
      const result = ErrorHandler.handleError(error);
      
      expect(result.error).toBeInstanceOf(NetworkError);
      expect(result.userMessage).toContain('Unable to connect');
    });

    it('should log errors', () => {
      const error = new ApiError('API failed', 500);
      ErrorHandler.handleError(error);
      
      const log = ErrorHandler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error.code).toBe('API_SERVER_ERROR');
    });

    it('should update statistics', () => {
      ErrorHandler.handleError(new ApiError('Error 1', 401));
      ErrorHandler.handleError(new ValidationError('Error 2', 'field', 'value'));
      
      const stats = ErrorHandler.getStats();
      expect(stats.total).toBe(2);
      expect(stats.byCategory.api).toBe(1);
      expect(stats.byCategory.validation).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.low).toBe(1);
    });
  });

  describe('error listeners', () => {
    it('should notify listeners on error', () => {
      const listener = jest.fn();
      const unsubscribe = ErrorHandler.onError(listener);
      
      const error = new ApiError('Test', 404);
      ErrorHandler.handleError(error);
      
      expect(listener).toHaveBeenCalledWith(error);
    });

    it('should handle listener errors gracefully', () => {
      const badListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      ErrorHandler.onError(badListener);
      
      // Should not throw
      expect(() => {
        ErrorHandler.handleError(new ApiError('Test', 404));
      }).not.toThrow();
    });

    it('should unsubscribe listeners', () => {
      const listener = jest.fn();
      const unsubscribe = ErrorHandler.onError(listener);
      
      unsubscribe();
      
      ErrorHandler.handleError(new ApiError('Test', 404));
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('error log management', () => {
    it('should maintain log size limit', () => {
      // Set max log size
      ErrorHandler.maxLogSize = 5;
      
      // Add more than max errors
      for (let i = 0; i < 10; i++) {
        ErrorHandler.handleError(new DeepWebError(`Error ${i}`, 'TEST'));
      }
      
      const log = ErrorHandler.getErrorLog();
      expect(log).toHaveLength(5);
      expect(log[0].error.message).toBe('Error 5'); // Oldest remaining
    });

    it('should filter error log', () => {
      ErrorHandler.handleError(new ApiError('API Error', 500));
      ErrorHandler.handleError(new ValidationError('Validation Error', 'field', 'value'));
      ErrorHandler.handleError(new SecurityError('Security Error', 'XSS_ATTEMPT', 'test'));
      
      const apiErrors = ErrorHandler.getErrorLog({ category: 'api' });
      expect(apiErrors).toHaveLength(1);
      
      const highSeverity = ErrorHandler.getErrorLog({ severity: 'critical' });
      expect(highSeverity).toHaveLength(1);
    });

    it('should export error log', () => {
      ErrorHandler.handleError(new ApiError('Test', 404));
      
      const exported = ErrorHandler.exportLog();
      
      expect(exported.timestamp).toBeDefined();
      expect(exported.stats).toBeDefined();
      expect(exported.errors).toHaveLength(1);
      expect(exported.version).toBe('1.0.0');
    });
  });

  describe('error statistics', () => {
    it('should calculate error rate', () => {
      // Add recent errors
      for (let i = 0; i < 5; i++) {
        ErrorHandler.handleError(new ApiError('Test', 429));
      }
      
      const stats = ErrorHandler.getStats();
      expect(stats.errorRate).toBe(5);
    });

    it('should track top errors', () => {
      ErrorHandler.handleError(new ApiError('Test', 429));
      ErrorHandler.handleError(new ApiError('Test', 429));
      ErrorHandler.handleError(new ApiError('Test', 401));
      
      const stats = ErrorHandler.getStats();
      const topErrors = stats.topErrors;
      
      expect(topErrors[0].code).toBe('API_RATE_LIMITED');
      expect(topErrors[0].count).toBe(2);
    });
  });

  describe('error recovery', () => {
    it('should attempt recovery for recoverable errors', () => {
      const error = new ValidationError('Invalid input', 'field', 'value');
      const result = ErrorHandler.handleError(error);
      
      expect(error.recoverable).toBe(true);
      expect(result.recovered).toBe(true);
    });

    it('should not attempt recovery for non-recoverable errors', () => {
      const error = new SecurityError('Security violation', 'XSS_ATTEMPT', 'action');
      const result = ErrorHandler.handleError(error);
      
      expect(error.recoverable).toBe(false);
      expect(result.recovered).toBe(false);
    });
  });

  describe('global error handlers', () => {
    it('should handle unhandled errors', () => {
      const errorEvent = new Event('error');
      errorEvent.message = 'Unhandled error';
      errorEvent.filename = 'test.js';
      errorEvent.lineno = 10;
      errorEvent.colno = 5;
      
      // Trigger the error handler
      const handler = window.addEventListener.mock.calls.find(
        call => call[0] === 'error'
      )[1];
      
      handler(errorEvent);
      
      const log = ErrorHandler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error.code).toBe('UNHANDLED_ERROR');
    });

    it('should handle unhandled rejections', () => {
      const rejectionEvent = {
        reason: new Error('Unhandled rejection')
      };
      
      // Trigger the rejection handler
      const handler = window.addEventListener.mock.calls.find(
        call => call[0] === 'unhandledrejection'
      )[1];
      
      handler(rejectionEvent);
      
      const log = ErrorHandler.getErrorLog();
      expect(log).toHaveLength(1);
      expect(log[0].error.code).toBe('UNHANDLED_REJECTION');
    });
  });
});