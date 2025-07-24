/**
 * Mobile Responsive Design Manager
 * Handles device detection, breakpoints, and mobile-specific interactions
 */

export default class ResponsiveManager {
  constructor() {
    this.breakpoints = {
      mobile: 480,
      tablet: 768,
      desktop: 1024,
      wide: 1440
    };
    
    this.currentDevice = 'desktop';
    this.currentOrientation = 'landscape';
    this.touchSupported = false;
    this.isInitialized = false;
    
    // Touch gesture handling
    this.gestureHandlers = new Map();
    this.touchStartTime = 0;
    this.touchStartPos = { x: 0, y: 0 };
    this.lastTouchPos = { x: 0, y: 0 };
    this.touchThreshold = {
      swipe: 50,
      tap: 10,
      hold: 500
    };
    
    // Mobile keyboard handling
    this.initialViewportHeight = 0;
    this.keyboardVisible = false;
    
    // Pull-to-refresh handling
    this.pullToRefreshEnabled = false;
    this.pullStartY = 0;
    this.pullCurrentY = 0;
    this.pullThreshold = 80;
    
    // Event listeners cleanup
    this.eventListeners = [];
    
    this.initialize();
  }
  
  initialize() {
    if (this.isInitialized) return;
    
    this.detectDevice();
    this.detectTouchSupport();
    this.setupEventListeners();
    this.detectOrientation();
    this.setupViewportHandling();
    this.setupTouchGestures();
    
    this.isInitialized = true;
    console.log('[ResponsiveManager] Initialized:', {
      device: this.currentDevice,
      orientation: this.currentOrientation,
      touchSupported: this.touchSupported
    });
  }
  
  detectDevice() {
    const width = window.innerWidth;
    const userAgent = navigator.userAgent.toLowerCase();
    
    // Check user agent for mobile devices
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isTabletUA = /ipad|android/i.test(userAgent) && !/mobile/i.test(userAgent);
    
    // Determine device type based on width and user agent
    if (width <= this.breakpoints.mobile || (isMobileUA && !isTabletUA)) {
      this.currentDevice = 'mobile';
    } else if (width <= this.breakpoints.tablet || isTabletUA) {
      this.currentDevice = 'tablet';
    } else if (width <= this.breakpoints.desktop) {
      this.currentDevice = 'desktop';
    } else {
      this.currentDevice = 'wide';
    }
    
    // Add device class to document
    document.documentElement.setAttribute('data-device', this.currentDevice);
    
    return this.currentDevice;
  }
  
  detectTouchSupport() {
    this.touchSupported = (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    );
    
    if (this.touchSupported) {
      document.documentElement.classList.add('touch-device');
    } else {
      document.documentElement.classList.add('no-touch');
    }
    
    return this.touchSupported;
  }
  
  detectOrientation() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    this.currentOrientation = width > height ? 'landscape' : 'portrait';
    document.documentElement.setAttribute('data-orientation', this.currentOrientation);
    
    return this.currentOrientation;
  }
  
  setupEventListeners() {
    // Resize handler
    const resizeHandler = this.debounce(() => {
      this.handleResize();
    }, 100);
    
    // Orientation change handler
    const orientationHandler = () => {
      setTimeout(() => {
        this.handleOrientationChange();
      }, 100); // Delay to get accurate dimensions
    };
    
    // Viewport height change handler (for mobile keyboard)
    const viewportHandler = this.debounce(() => {
      this.handleViewportChange();
    }, 100);
    
    window.addEventListener('resize', resizeHandler);
    window.addEventListener('orientationchange', orientationHandler);
    window.addEventListener('resize', viewportHandler);
    
    this.eventListeners.push(
      () => window.removeEventListener('resize', resizeHandler),
      () => window.removeEventListener('orientationchange', orientationHandler),
      () => window.removeEventListener('resize', viewportHandler)
    );
  }
  
  setupViewportHandling() {
    this.initialViewportHeight = window.innerHeight;
    
    // Set CSS custom property for viewport height
    this.updateViewportHeight();
  }
  
  updateViewportHeight() {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  }
  
  setupTouchGestures() {
    if (!this.touchSupported) return;
    
    // Touch start
    const touchStartHandler = (e) => {
      this.handleTouchStart(e);
    };
    
    // Touch move
    const touchMoveHandler = (e) => {
      this.handleTouchMove(e);
    };
    
    // Touch end
    const touchEndHandler = (e) => {
      this.handleTouchEnd(e);
    };
    
    document.addEventListener('touchstart', touchStartHandler, { passive: false });
    document.addEventListener('touchmove', touchMoveHandler, { passive: false });
    document.addEventListener('touchend', touchEndHandler, { passive: false });
    
    this.eventListeners.push(
      () => document.removeEventListener('touchstart', touchStartHandler),
      () => document.removeEventListener('touchmove', touchMoveHandler),
      () => document.removeEventListener('touchend', touchEndHandler)
    );
  }
  
  handleResize() {
    const oldDevice = this.currentDevice;
    this.detectDevice();
    this.detectOrientation();
    this.updateViewportHeight();
    
    if (oldDevice !== this.currentDevice) {
      this.emit('devicechange', {
        oldDevice,
        newDevice: this.currentDevice
      });
    }
    
    this.emit('resize', {
      device: this.currentDevice,
      orientation: this.currentOrientation,
      width: window.innerWidth,
      height: window.innerHeight
    });
  }
  
  handleOrientationChange() {
    const oldOrientation = this.currentOrientation;
    this.detectOrientation();
    this.updateViewportHeight();
    
    this.emit('orientationchange', {
      oldOrientation,
      newOrientation: this.currentOrientation
    });
  }
  
  handleViewportChange() {
    const currentHeight = window.innerHeight;
    const heightDiff = this.initialViewportHeight - currentHeight;
    const threshold = 150; // Threshold for keyboard detection
    
    const wasKeyboardVisible = this.keyboardVisible;
    this.keyboardVisible = heightDiff > threshold;
    
    if (wasKeyboardVisible !== this.keyboardVisible) {
      document.documentElement.setAttribute('data-keyboard', this.keyboardVisible ? 'visible' : 'hidden');
      
      this.emit('keyboardchange', {
        visible: this.keyboardVisible,
        heightDiff
      });
    }
    
    this.updateViewportHeight();
  }
  
  handleTouchStart(e) {
    const touch = e.touches[0];
    this.touchStartTime = Date.now();
    this.touchStartPos = { x: touch.clientX, y: touch.clientY };
    this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
    
    // Handle pull-to-refresh start
    if (this.pullToRefreshEnabled && window.scrollY === 0) {
      this.pullStartY = touch.clientY;
    }
  }
  
  handleTouchMove(e) {
    if (e.touches.length === 0) return;
    
    const touch = e.touches[0];
    this.lastTouchPos = { x: touch.clientX, y: touch.clientY };
    
    // Handle pull-to-refresh
    if (this.pullToRefreshEnabled && this.pullStartY > 0) {
      this.pullCurrentY = touch.clientY;
      const pullDistance = this.pullCurrentY - this.pullStartY;
      
      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault();
        this.emit('pullmove', { distance: pullDistance });
      }
    }
    
    // Handle pinch-to-zoom detection
    if (e.touches.length === 2) {
      this.handlePinchGesture(e);
    }
  }
  
  handleTouchEnd(e) {
    const touchEndTime = Date.now();
    const touchDuration = touchEndTime - this.touchStartTime;
    
    const deltaX = this.lastTouchPos.x - this.touchStartPos.x;
    const deltaY = this.lastTouchPos.y - this.touchStartPos.y;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // Determine gesture type
    if (distance < this.touchThreshold.tap) {
      if (touchDuration < this.touchThreshold.hold) {
        this.emit('tap', {
          x: this.touchStartPos.x,
          y: this.touchStartPos.y,
          target: e.target
        });
      } else {
        this.emit('longpress', {
          x: this.touchStartPos.x,
          y: this.touchStartPos.y,
          target: e.target
        });
      }
    } else if (distance > this.touchThreshold.swipe) {
      const direction = this.getSwipeDirection(deltaX, deltaY);
      this.emit('swipe', {
        direction,
        distance,
        deltaX,
        deltaY,
        target: e.target
      });
    }
    
    // Handle pull-to-refresh end
    if (this.pullToRefreshEnabled && this.pullStartY > 0) {
      const pullDistance = this.pullCurrentY - this.pullStartY;
      
      if (pullDistance > this.pullThreshold) {
        this.emit('pullrefresh');
      }
      
      this.emit('pullend', { distance: pullDistance });
      this.pullStartY = 0;
      this.pullCurrentY = 0;
    }
  }
  
  handlePinchGesture(e) {
    const touch1 = e.touches[0];
    const touch2 = e.touches[1];
    
    const distance = Math.sqrt(
      Math.pow(touch2.clientX - touch1.clientX, 2) +
      Math.pow(touch2.clientY - touch1.clientY, 2)
    );
    
    if (!this.lastPinchDistance) {
      this.lastPinchDistance = distance;
      return;
    }
    
    const scale = distance / this.lastPinchDistance;
    this.emit('pinch', { scale, distance });
    
    this.lastPinchDistance = distance;
  }
  
  getSwipeDirection(deltaX, deltaY) {
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);
    
    if (absDeltaX > absDeltaY) {
      return deltaX > 0 ? 'right' : 'left';
    } else {
      return deltaY > 0 ? 'down' : 'up';
    }
  }
  
  // Public API methods
  
  isMobile() {
    return this.currentDevice === 'mobile';
  }
  
  isTablet() {
    return this.currentDevice === 'tablet';
  }
  
  isDesktop() {
    return this.currentDevice === 'desktop' || this.currentDevice === 'wide';
  }
  
  isTouchDevice() {
    return this.touchSupported;
  }
  
  isPortrait() {
    return this.currentOrientation === 'portrait';
  }
  
  isLandscape() {
    return this.currentOrientation === 'landscape';
  }
  
  isKeyboardVisible() {
    return this.keyboardVisible;
  }
  
  getDevice() {
    return this.currentDevice;
  }
  
  getOrientation() {
    return this.currentOrientation;
  }
  
  getBreakpoint() {
    const width = window.innerWidth;
    
    if (width <= this.breakpoints.mobile) return 'mobile';
    if (width <= this.breakpoints.tablet) return 'tablet';
    if (width <= this.breakpoints.desktop) return 'desktop';
    return 'wide';
  }
  
  enablePullToRefresh() {
    this.pullToRefreshEnabled = true;
  }
  
  disablePullToRefresh() {
    this.pullToRefreshEnabled = false;
  }
  
  // Touch-friendly element sizing
  makeTouchFriendly(element, minSize = 44) {
    if (!this.isTouchDevice()) return;
    
    const rect = element.getBoundingClientRect();
    if (rect.width < minSize || rect.height < minSize) {
      element.style.minWidth = `${minSize}px`;
      element.style.minHeight = `${minSize}px`;
      element.style.padding = `${Math.max(0, (minSize - rect.height) / 2)}px ${Math.max(0, (minSize - rect.width) / 2)}px`;
    }
  }
  
  // Responsive font scaling
  scaleFont(baseSize, scaleRatio = 0.9) {
    if (this.isMobile()) {
      return `${baseSize * scaleRatio}px`;
    }
    return `${baseSize}px`;
  }
  
  // Utility methods
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
  
  // Event emitter functionality
  emit(event, data) {
    const customEvent = new CustomEvent(`responsive:${event}`, {
      detail: data
    });
    document.dispatchEvent(customEvent);
  }
  
  on(event, callback) {
    const handler = (e) => callback(e.detail);
    document.addEventListener(`responsive:${event}`, handler);
    
    // Return cleanup function
    return () => document.removeEventListener(`responsive:${event}`, handler);
  }
  
  // Cleanup
  destroy() {
    this.eventListeners.forEach(cleanup => cleanup());
    this.eventListeners.length = 0;
    this.gestureHandlers.clear();
    this.isInitialized = false;
  }
}

// Export singleton instance
export const responsiveManager = new ResponsiveManager();