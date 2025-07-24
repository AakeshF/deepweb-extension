/**
 * Tests for MemoryManager
 */

import { MemoryManager } from '../../../src/utils/MemoryManager.js';

describe('MemoryManager', () => {
  let memoryManager;
  let mockPerformance;
  
  beforeEach(() => {
    // Mock performance.memory
    mockPerformance = {
      memory: {
        usedJSHeapSize: 30 * 1024 * 1024, // 30MB
        totalJSHeapSize: 50 * 1024 * 1024, // 50MB
        jsHeapSizeLimit: 100 * 1024 * 1024 // 100MB
      }
    };
    
    global.performance = mockPerformance;
    global.PerformanceObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn()
    }));
    
    memoryManager = new MemoryManager();
    
    // Mock timers
    jest.useFakeTimers();
  });
  
  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });
  
  describe('init', () => {
    it('should initialize memory monitoring', () => {
      const spy = jest.spyOn(memoryManager, 'startMemoryMonitoring');
      memoryManager.init();
      
      expect(spy).toHaveBeenCalled();
      expect(global.PerformanceObserver).toHaveBeenCalled();
    });
  });
  
  describe('checkMemoryUsage', () => {
    it('should check memory usage and log stats', async () => {
      const consoleSpy = jest.spyOn(console, 'log');
      await memoryManager.checkMemoryUsage();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Memory usage: 30.00MB')
      );
    });
    
    it('should trigger cleanup on high memory usage', async () => {
      mockPerformance.memory.usedJSHeapSize = 60 * 1024 * 1024; // 60MB
      const cleanupSpy = jest.spyOn(memoryManager, 'performCleanup');
      
      await memoryManager.checkMemoryUsage();
      
      expect(cleanupSpy).toHaveBeenCalled();
    });
  });
  
  describe('createCache', () => {
    it('should create a cache with get/set functionality', () => {
      const cache = memoryManager.createCache('test', { maxSize: 3 });
      
      cache.set('key1', 'value1');
      expect(cache.get('key1')).toBe('value1');
    });
    
    it('should respect max size limit', () => {
      const cache = memoryManager.createCache('test', { maxSize: 2 });
      
      cache.set('key1', 'value1');
      cache.set('key2', 'value2');
      cache.set('key3', 'value3'); // Should evict key1
      
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toBe('value2');
      expect(cache.get('key3')).toBe('value3');
    });
    
    it('should expire entries based on TTL', () => {
      const cache = memoryManager.createCache('test', { ttl: 100 });
      
      cache.set('key1', 'value1');
      
      // Fast forward time
      jest.advanceTimersByTime(200);
      
      expect(cache.get('key1')).toBeNull();
    });
  });
  
  describe('createManagedEventHandler', () => {
    it('should create and track event handlers', () => {
      const element = document.createElement('button');
      const handler = jest.fn();
      
      const cleanup = memoryManager.createManagedEventHandler(
        element,
        'click',
        handler
      );
      
      element.click();
      expect(handler).toHaveBeenCalled();
      
      cleanup();
      handler.mockClear();
      element.click();
      expect(handler).not.toHaveBeenCalled();
    });
    
    it('should catch errors in handlers', () => {
      const element = document.createElement('button');
      const errorHandler = jest.fn(() => {
        throw new Error('Test error');
      });
      
      const cleanup = memoryManager.createManagedEventHandler(
        element,
        'click',
        errorHandler
      );
      
      const consoleSpy = jest.spyOn(console, 'error');
      element.click();
      
      expect(consoleSpy).toHaveBeenCalledWith(
        'Error in click handler:',
        expect.any(Error)
      );
    });
  });
  
  describe('monitorObject', () => {
    it('should monitor objects with WeakRef', () => {
      const obj = { test: 'value' };
      global.WeakRef = jest.fn().mockImplementation((target) => ({
        deref: () => target
      }));
      
      memoryManager.monitorObject(obj, 'testObject');
      
      expect(global.WeakRef).toHaveBeenCalledWith(obj);
    });
  });
  
  describe('getMemoryStats', () => {
    it('should return memory statistics', () => {
      memoryManager.createCache('cache1');
      memoryManager.createCache('cache2');
      
      const stats = memoryManager.getMemoryStats();
      
      expect(stats).toEqual({
        used: 30,
        total: 50,
        limit: 100,
        percent: 30,
        caches: 2,
        timers: 0
      });
    });
    
    it('should return null if performance.memory not available', () => {
      global.performance.memory = undefined;
      
      const stats = memoryManager.getMemoryStats();
      expect(stats).toBeNull();
    });
  });
  
  describe('performCleanup', () => {
    it('should dispatch cleanup event', async () => {
      const dispatchSpy = jest.spyOn(window, 'dispatchEvent');
      
      await memoryManager.performCleanup();
      
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'deepweb-memory-cleanup'
        })
      );
    });
    
    it('should trigger garbage collection if available', async () => {
      global.gc = jest.fn();
      
      await memoryManager.performCleanup();
      
      expect(global.gc).toHaveBeenCalled();
    });
  });
  
  describe('cleanup', () => {
    it('should clean up all resources', () => {
      // Create some resources
      memoryManager.createCache('cache1');
      memoryManager.timers.set('timer1', setInterval(() => {}, 1000));
      
      memoryManager.cleanup();
      
      expect(memoryManager.caches.size).toBe(0);
      expect(memoryManager.timers.size).toBe(0);
    });
  });
});