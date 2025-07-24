/**
 * Tests for ErrorMonitor
 */

import { ErrorMonitor } from '../../../src/monitoring/ErrorMonitor.js';

describe('ErrorMonitor', () => {
  let errorMonitor;
  let mockBrowser;
  
  beforeEach(() => {
    // Mock browser storage
    mockBrowser = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined),
          remove: jest.fn().mockResolvedValue(undefined)
        }
      },
      runtime: {
        getManifest: () => ({ version: '1.0.0' }),
        lastError: null,
        onMessage: {
          addListener: jest.fn()
        }
      }
    };
    
    global.browser = mockBrowser;
    
    // Mock window.Sentry
    global.window = {
      ...global.window,
      Sentry: {
        init: jest.fn(),
        captureException: jest.fn(),
        setUser: jest.fn()
      },
      addEventListener: jest.fn(),
      location: { href: 'http://test.com' },
      gc: jest.fn()
    };
    
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
    
    errorMonitor = new ErrorMonitor({
      enabled: true,
      bufferSize: 5,
      flushInterval: 1000
    });
    
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  
  describe('init', () => {
    it('should initialize error monitoring', async () => {
      await errorMonitor.init();
      
      expect(errorMonitor.initialized).toBe(true);
      expect(window.addEventListener).toHaveBeenCalledWith(
        'error',
        expect.any(Function)
      );
      expect(window.addEventListener).toHaveBeenCalledWith(
        'unhandledrejection',
        expect.any(Function)
      );
    });
    
    it('should not initialize if disabled', async () => {
      errorMonitor.config.enabled = false;
      await errorMonitor.init();
      
      expect(errorMonitor.initialized).toBe(false);
    });
    
    it('should initialize Sentry if configured', async () => {
      errorMonitor.config.sentry = {
        dsn: 'test-dsn',
        environment: 'test'
      };
      
      await errorMonitor.init();
      
      expect(window.Sentry.init).toHaveBeenCalledWith(
        expect.objectContaining({
          dsn: 'test-dsn',
          environment: 'test'
        })
      );
    });
  });
  
  describe('captureError', () => {
    beforeEach(async () => {
      await errorMonitor.init();
    });
    
    it('should capture errors to buffer', () => {
      const error = new Error('Test error');
      errorMonitor.captureError(error, { type: 'test' });
      
      expect(errorMonitor.errorBuffer).toHaveLength(1);
      expect(errorMonitor.errorBuffer[0]).toMatchObject({
        message: 'Test error',
        type: 'test'
      });
    });
    
    it('should send to Sentry if available', () => {
      errorMonitor.config.sentry = { dsn: 'test' };
      const error = new Error('Test error');
      
      errorMonitor.captureError(error);
      
      expect(window.Sentry.captureException).toHaveBeenCalledWith(
        error,
        expect.any(Object)
      );
    });
    
    it('should trigger flush when buffer is full', async () => {
      const flushSpy = jest.spyOn(errorMonitor, 'flush');
      
      // Fill buffer
      for (let i = 0; i < 5; i++) {
        errorMonitor.captureError(new Error(`Error ${i}`));
      }
      
      expect(flushSpy).toHaveBeenCalled();
    });
    
    it('should apply filters', () => {
      errorMonitor.config.filters = [
        'Ignored error',
        (error) => !error.message.includes('capture')
      ];
      
      errorMonitor.captureError(new Error('Ignored error'));
      errorMonitor.captureError(new Error('Should not capture'));
      errorMonitor.captureError(new Error('Should be captured'));
      
      expect(errorMonitor.errorBuffer).toHaveLength(1);
      expect(errorMonitor.errorBuffer[0].message).toBe('Should be captured');
    });
  });
  
  describe('sanitizeData', () => {
    it('should redact sensitive data', () => {
      const data = {
        apiKey: 'secret-key',
        token: 'auth-token',
        normalData: 'keep this',
        nested: {
          password: 'secret',
          user: 'john'
        }
      };
      
      const sanitized = errorMonitor.sanitizeData(data);
      
      expect(sanitized).toEqual({
        apiKey: '[REDACTED]',
        token: '[REDACTED]',
        normalData: 'keep this',
        nested: {
          password: '[REDACTED]',
          user: 'john'
        }
      });
    });
  });
  
  describe('getMemoryInfo', () => {
    it('should return memory info if available', () => {
      global.performance = {
        memory: {
          usedJSHeapSize: 50 * 1024 * 1024,
          totalJSHeapSize: 100 * 1024 * 1024,
          jsHeapSizeLimit: 200 * 1024 * 1024
        }
      };
      
      const info = errorMonitor.getMemoryInfo();
      
      expect(info).toEqual({
        usedJSHeapSize: 50,
        totalJSHeapSize: 100,
        jsHeapSizeLimit: 200
      });
    });
    
    it('should return null if performance.memory not available', () => {
      global.performance = {};
      
      const info = errorMonitor.getMemoryInfo();
      expect(info).toBeNull();
    });
  });
  
  describe('flush', () => {
    beforeEach(async () => {
      await errorMonitor.init();
    });
    
    it('should store errors locally', async () => {
      errorMonitor.errorBuffer = [
        { message: 'Error 1' },
        { message: 'Error 2' }
      ];
      
      await errorMonitor.flush();
      
      expect(mockBrowser.storage.local.set).toHaveBeenCalledWith({
        errorLog: expect.arrayContaining([
          expect.objectContaining({ message: 'Error 1' }),
          expect.objectContaining({ message: 'Error 2' })
        ])
      });
    });
    
    it('should send to remote endpoint if configured', async () => {
      errorMonitor.config.remoteEndpoint = 'https://api.test.com/errors';
      errorMonitor.errorBuffer = [{ message: 'Test error' }];
      
      await errorMonitor.flush();
      
      expect(fetch).toHaveBeenCalledWith(
        'https://api.test.com/errors',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });
    
    it('should handle flush errors gracefully', async () => {
      mockBrowser.storage.local.set.mockRejectedValue(new Error('Storage error'));
      errorMonitor.errorBuffer = [{ message: 'Test error' }];
      
      await errorMonitor.flush();
      
      // Errors should be put back in buffer
      expect(errorMonitor.errorBuffer).toHaveLength(1);
    });
  });
  
  describe('getErrorStats', () => {
    it('should return error statistics', async () => {
      mockBrowser.storage.local.get.mockResolvedValue({
        errorLog: [
          { type: 'network', timestamp: Date.now() - 1000 },
          { type: 'network', timestamp: Date.now() - 500 },
          { type: 'ui', timestamp: Date.now() }
        ]
      });
      
      const stats = await errorMonitor.getErrorStats();
      
      expect(stats).toMatchObject({
        total: 3,
        byType: {
          network: 2,
          ui: 1
        },
        recent: expect.arrayContaining([
          expect.objectContaining({ type: 'network' })
        ])
      });
    });
  });
  
  describe('generateUserId', () => {
    it('should generate unique user IDs', () => {
      const id1 = errorMonitor.generateUserId();
      const id2 = errorMonitor.generateUserId();
      
      expect(id1).toMatch(/^user_\d+_[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });
  });
  
  describe('periodic flush', () => {
    it('should flush errors periodically', async () => {
      await errorMonitor.init();
      const flushSpy = jest.spyOn(errorMonitor, 'flush');
      
      errorMonitor.errorBuffer.push({ message: 'Test' });
      
      jest.advanceTimersByTime(30000);
      
      expect(flushSpy).toHaveBeenCalled();
    });
  });
});