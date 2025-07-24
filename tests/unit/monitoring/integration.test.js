/**
 * Tests for Error Monitoring Integration
 */

import { 
  initializeErrorMonitoring,
  withErrorMonitoring,
  monitorAPICall,
  monitorStorageOperation,
  monitorPerformance,
  createMonitoredHandler,
  MonitoredComponent,
  errorBoundary,
  reportUserFeedback
} from '../../../src/monitoring/integration.js';
import { errorMonitor } from '../../../src/monitoring/ErrorMonitor.js';

jest.mock('../../../src/monitoring/ErrorMonitor.js', () => ({
  errorMonitor: {
    config: {},
    init: jest.fn(),
    setMetadata: jest.fn(),
    captureError: jest.fn()
  }
}));

describe('Error Monitoring Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    global.browser = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({})
        }
      },
      runtime: {
        getManifest: () => ({
          version: '1.0.0',
          name: 'Test Extension'
        })
      }
    };
    
    global.navigator = {
      userAgent: 'Test Browser',
      platform: 'Test Platform'
    };
  });
  
  describe('initializeErrorMonitoring', () => {
    it('should initialize error monitoring with config', async () => {
      await initializeErrorMonitoring();
      
      expect(errorMonitor.init).toHaveBeenCalled();
      expect(errorMonitor.setMetadata).toHaveBeenCalledWith({
        extensionVersion: '1.0.0',
        extensionName: 'Test Extension',
        browserName: expect.any(String),
        platform: 'Test Platform'
      });
    });
    
    it('should respect user preference to disable', async () => {
      global.browser.storage.local.get.mockResolvedValue({
        errorMonitoringEnabled: false
      });
      
      await initializeErrorMonitoring();
      
      expect(errorMonitor.config.enabled).toBe(false);
    });
  });
  
  describe('withErrorMonitoring', () => {
    it('should wrap function and capture errors', async () => {
      const error = new Error('Test error');
      const failingFn = jest.fn().mockRejectedValue(error);
      const wrapped = withErrorMonitoring(failingFn, { component: 'test' });
      
      await expect(wrapped('arg1', 'arg2')).rejects.toThrow('Test error');
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(error, {
        function: 'failingFn',
        args: '[args provided]',
        component: 'test'
      });
    });
    
    it('should pass through successful calls', async () => {
      const successFn = jest.fn().mockResolvedValue('result');
      const wrapped = withErrorMonitoring(successFn);
      
      const result = await wrapped('arg1');
      
      expect(result).toBe('result');
      expect(successFn).toHaveBeenCalledWith('arg1');
      expect(errorMonitor.captureError).not.toHaveBeenCalled();
    });
  });
  
  describe('monitorAPICall', () => {
    it('should capture API errors', () => {
      const error = new Error('Network error');
      
      monitorAPICall('fetchData', { url: '/api/data' }, null, error);
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(error, {
        type: 'api_error',
        category: 'api',
        api: 'fetchData',
        request: { url: '/api/data' },
        response: null,
        severity: 'high'
      });
    });
    
    it('should capture API response errors', () => {
      const response = { error: 'Invalid request' };
      
      monitorAPICall('fetchData', { url: '/api/data' }, response);
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(
        new Error('Invalid request'),
        expect.objectContaining({
          type: 'api_response_error',
          category: 'api',
          severity: 'medium'
        })
      );
    });
    
    it('should not capture successful responses', () => {
      monitorAPICall('fetchData', {}, { data: 'success' });
      
      expect(errorMonitor.captureError).not.toHaveBeenCalled();
    });
  });
  
  describe('monitorStorageOperation', () => {
    it('should capture storage errors', () => {
      const error = new Error('Storage quota exceeded');
      
      monitorStorageOperation('set', 'userData', error);
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(error, {
        type: 'storage_error',
        category: 'storage',
        operation: 'set',
        key: 'userData',
        severity: 'high'
      });
    });
  });
  
  describe('monitorPerformance', () => {
    it('should capture slow operations', () => {
      monitorPerformance('renderUI', 1500, 1000);
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(
        new Error('Slow operation: renderUI'),
        {
          type: 'performance_issue',
          category: 'performance',
          operation: 'renderUI',
          duration: 1500,
          threshold: 1000,
          severity: 'medium'
        }
      );
    });
    
    it('should set high severity for very slow operations', () => {
      monitorPerformance('renderUI', 2500, 1000);
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          severity: 'high'
        })
      );
    });
    
    it('should not capture fast operations', () => {
      monitorPerformance('renderUI', 500, 1000);
      
      expect(errorMonitor.captureError).not.toHaveBeenCalled();
    });
  });
  
  describe('createMonitoredHandler', () => {
    it('should monitor event handler errors', () => {
      const error = new Error('Handler error');
      const handler = jest.fn().mockImplementation(() => {
        throw error;
      });
      
      const monitored = createMonitoredHandler(handler, 'click');
      const event = { target: { tagName: 'BUTTON' } };
      
      expect(() => monitored(event)).toThrow('Handler error');
      expect(errorMonitor.captureError).toHaveBeenCalledWith(error, {
        type: 'event_handler_error',
        category: 'ui',
        eventType: 'click',
        targetElement: 'BUTTON',
        severity: 'medium'
      });
    });
  });
  
  describe('MonitoredComponent', () => {
    class TestComponent extends MonitoredComponent {
      async onInit() {
        // Simulate initialization
      }
      
      async onCleanup() {
        // Simulate cleanup
      }
    }
    
    it('should monitor component initialization', async () => {
      const component = new TestComponent('TestComponent');
      await component.init();
      
      expect(component.initialized).toBe(true);
    });
    
    it('should capture init errors', async () => {
      class FailingComponent extends MonitoredComponent {
        async onInit() {
          throw new Error('Init failed');
        }
      }
      
      const component = new FailingComponent('FailingComponent');
      
      await expect(component.init()).rejects.toThrow('Init failed');
      expect(errorMonitor.captureError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          type: 'component_init_error',
          component: 'FailingComponent',
          severity: 'high'
        })
      );
    });
    
    it('should monitor cleanup errors', async () => {
      class CleanupFailComponent extends MonitoredComponent {
        async onCleanup() {
          throw new Error('Cleanup failed');
        }
      }
      
      const component = new CleanupFailComponent('CleanupFailComponent');
      await component.cleanup();
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          type: 'component_cleanup_error',
          severity: 'medium'
        })
      );
    });
  });
  
  describe('errorBoundary', () => {
    it('should catch errors and return fallback', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      
      const result = await errorBoundary(operation, 'fallback');
      
      expect(result).toBe('fallback');
      expect(errorMonitor.captureError).toHaveBeenCalledWith(error, {
        type: 'error_boundary',
        severity: 'medium'
      });
    });
    
    it('should execute fallback function on error', async () => {
      const error = new Error('Operation failed');
      const operation = jest.fn().mockRejectedValue(error);
      const fallback = jest.fn().mockReturnValue('fallback result');
      
      const result = await errorBoundary(operation, fallback);
      
      expect(result).toBe('fallback result');
      expect(fallback).toHaveBeenCalledWith(error);
    });
    
    it('should return result on success', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await errorBoundary(operation);
      
      expect(result).toBe('success');
      expect(errorMonitor.captureError).not.toHaveBeenCalled();
    });
  });
  
  describe('reportUserFeedback', () => {
    it('should capture user feedback as error context', () => {
      const feedback = {
        issue: 'Button not working',
        details: 'Clicked multiple times'
      };
      
      reportUserFeedback(feedback, 'bug_report');
      
      expect(errorMonitor.captureError).toHaveBeenCalledWith(
        new Error('User Feedback'),
        {
          type: 'user_feedback',
          category: 'bug_report',
          feedback,
          severity: 'low',
          isUserReport: true
        }
      );
    });
  });
});