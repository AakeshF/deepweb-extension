/**
 * Memory Manager
 * Monitors and optimizes memory usage in the extension
 */

export class MemoryManager {
  constructor() {
    this.observers = new WeakMap();
    this.timers = new Map();
    this.caches = new Map();
    this.memoryThreshold = 50 * 1024 * 1024; // 50MB
  }

  /**
   * Initialize memory monitoring
   */
  init() {
    // Monitor memory usage periodically
    this.startMemoryMonitoring();
    
    // Set up cleanup listeners
    this.setupCleanupListeners();
    
    // Initialize performance observer
    if ('PerformanceObserver' in window) {
      this.initPerformanceObserver();
    }
  }

  /**
   * Start periodic memory monitoring
   */
  startMemoryMonitoring() {
    const monitorInterval = setInterval(() => {
      this.checkMemoryUsage();
    }, 30000); // Check every 30 seconds
    
    this.timers.set('memoryMonitor', monitorInterval);
  }

  /**
   * Check current memory usage
   */
  async checkMemoryUsage() {
    if (!performance.memory) {
      return; // Memory API not available
    }

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usagePercent = (usedJSHeapSize / jsHeapSizeLimit) * 100;

    console.log(`Memory usage: ${(usedJSHeapSize / 1024 / 1024).toFixed(2)}MB (${usagePercent.toFixed(1)}%)`);

    // Trigger cleanup if memory usage is high
    if (usedJSHeapSize > this.memoryThreshold || usagePercent > 80) {
      console.warn('High memory usage detected, triggering cleanup...');
      await this.performCleanup();
    }
  }

  /**
   * Perform memory cleanup
   */
  async performCleanup() {
    // Clear expired caches
    this.clearExpiredCaches();
    
    // Remove detached DOM nodes
    this.cleanupDetachedNodes();
    
    // Clear unused timers
    this.clearUnusedTimers();
    
    // Trigger garbage collection if available
    if (window.gc) {
      window.gc();
    }
    
    // Notify components to cleanup
    window.dispatchEvent(new CustomEvent('deepweb-memory-cleanup'));
  }

  /**
   * Setup cleanup event listeners
   */
  setupCleanupListeners() {
    // Cleanup on page hide
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.performLightCleanup();
      }
    });

    // Cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.cleanup();
    });
  }

  /**
   * Initialize performance observer
   */
  initPerformanceObserver() {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'measure' && entry.duration > 100) {
          console.warn(`Slow operation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      }
    });

    observer.observe({ entryTypes: ['measure'] });
    this.observers.set('performance', observer);
  }

  /**
   * Create a managed cache with automatic cleanup
   */
  createCache(name, options = {}) {
    const cache = {
      data: new Map(),
      maxSize: options.maxSize || 100,
      ttl: options.ttl || 300000, // 5 minutes default
      lastAccess: Date.now()
    };

    this.caches.set(name, cache);

    return {
      get: (key) => {
        cache.lastAccess = Date.now();
        const item = cache.data.get(key);
        if (item && Date.now() - item.timestamp < cache.ttl) {
          return item.value;
        }
        cache.data.delete(key);
        return null;
      },
      
      set: (key, value) => {
        cache.lastAccess = Date.now();
        
        // Enforce size limit
        if (cache.data.size >= cache.maxSize) {
          const firstKey = cache.data.keys().next().value;
          cache.data.delete(firstKey);
        }
        
        cache.data.set(key, {
          value,
          timestamp: Date.now()
        });
      },
      
      clear: () => {
        cache.data.clear();
      }
    };
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCaches() {
    for (const [name, cache] of this.caches) {
      const now = Date.now();
      
      // Remove caches not accessed in 10 minutes
      if (now - cache.lastAccess > 600000) {
        cache.data.clear();
        this.caches.delete(name);
        continue;
      }
      
      // Remove expired entries
      for (const [key, item] of cache.data) {
        if (now - item.timestamp > cache.ttl) {
          cache.data.delete(key);
        }
      }
    }
  }

  /**
   * Clean up detached DOM nodes
   */
  cleanupDetachedNodes() {
    // Find and remove deepweb elements not attached to DOM
    const allDeepwebElements = document.querySelectorAll('[class*="deepweb-"]');
    
    for (const element of allDeepwebElements) {
      if (!document.body.contains(element)) {
        element.remove();
      }
    }
  }

  /**
   * Clear unused timers
   */
  clearUnusedTimers() {
    // This is handled by components themselves
    // Emit event for components to check their timers
    window.dispatchEvent(new CustomEvent('deepweb-check-timers'));
  }

  /**
   * Perform light cleanup (doesn't affect user experience)
   */
  performLightCleanup() {
    // Clear old cache entries
    this.clearExpiredCaches();
    
    // Remove any error messages older than 5 minutes
    const errorMessages = document.querySelectorAll('.deepweb-error-message');
    const fiveMinutesAgo = Date.now() - 300000;
    
    errorMessages.forEach(msg => {
      const timestamp = parseInt(msg.dataset.timestamp || '0');
      if (timestamp < fiveMinutesAgo) {
        msg.remove();
      }
    });
  }

  /**
   * Monitor object for memory leaks
   */
  monitorObject(obj, name) {
    if (!this.observers.has('objects')) {
      this.observers.set('objects', new Map());
    }
    
    const objectMonitors = this.observers.get('objects');
    objectMonitors.set(name, new WeakRef(obj));
    
    // Check for leaks periodically
    setTimeout(() => {
      const ref = objectMonitors.get(name);
      if (ref && !ref.deref()) {
        console.log(`Object ${name} has been garbage collected`);
        objectMonitors.delete(name);
      }
    }, 60000);
  }

  /**
   * Create a memory-efficient event handler
   */
  createManagedEventHandler(element, event, handler, options = {}) {
    const managedHandler = (e) => {
      try {
        handler(e);
      } catch (error) {
        console.error(`Error in ${event} handler:`, error);
      }
    };

    element.addEventListener(event, managedHandler, options);

    // Store for cleanup
    if (!this.observers.has(element)) {
      this.observers.set(element, new Map());
    }
    
    this.observers.get(element).set(event, managedHandler);

    return () => {
      element.removeEventListener(event, managedHandler, options);
      const handlers = this.observers.get(element);
      if (handlers) {
        handlers.delete(event);
        if (handlers.size === 0) {
          this.observers.delete(element);
        }
      }
    };
  }

  /**
   * Get memory statistics
   */
  getMemoryStats() {
    if (!performance.memory) {
      return null;
    }

    const { usedJSHeapSize, totalJSHeapSize, jsHeapSizeLimit } = performance.memory;
    
    return {
      used: Math.round(usedJSHeapSize / 1024 / 1024),
      total: Math.round(totalJSHeapSize / 1024 / 1024),
      limit: Math.round(jsHeapSizeLimit / 1024 / 1024),
      percent: Math.round((usedJSHeapSize / jsHeapSizeLimit) * 100),
      caches: this.caches.size,
      timers: this.timers.size
    };
  }

  /**
   * Cleanup all resources
   */
  cleanup() {
    // Clear all timers
    for (const [name, timer] of this.timers) {
      clearInterval(timer);
    }
    this.timers.clear();

    // Clear all caches
    for (const [name, cache] of this.caches) {
      cache.data.clear();
    }
    this.caches.clear();

    // Remove all event listeners
    for (const [element, handlers] of this.observers) {
      if (element instanceof Element && handlers instanceof Map) {
        for (const [event, handler] of handlers) {
          element.removeEventListener(event, handler);
        }
      }
    }
    this.observers = new WeakMap();
  }
}

// Export singleton instance
export const memoryManager = new MemoryManager();