/**
 * AnimationManager - Centralized animation and interaction system
 * Provides CSS-based animations, micro-interactions, and performance monitoring
 */

export default class AnimationManager {
  constructor() {
    // Animation state
    this.animationsEnabled = true;
    this.animationSpeed = 'normal';
    this.reducedMotion = false;
    
    // Performance monitoring
    this.performanceMetrics = {
      animations: new Map(),
      frameDrops: 0,
      totalAnimations: 0
    };
    
    // Check for reduced motion preference
    this.checkReducedMotion();
    
    // Animation presets
    this.presets = {
      fadeIn: {
        keyframes: [
          { opacity: 0 },
          { opacity: 1 }
        ],
        options: {
          duration: 200,
          easing: 'ease-out',
          fill: 'forwards'
        }
      },
      fadeOut: {
        keyframes: [
          { opacity: 1 },
          { opacity: 0 }
        ],
        options: {
          duration: 200,
          easing: 'ease-in',
          fill: 'forwards'
        }
      },
      slideIn: {
        keyframes: [
          { transform: 'translateY(20px)', opacity: 0 },
          { transform: 'translateY(0)', opacity: 1 }
        ],
        options: {
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        }
      },
      slideOut: {
        keyframes: [
          { transform: 'translateY(0)', opacity: 1 },
          { transform: 'translateY(20px)', opacity: 0 }
        ],
        options: {
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        }
      },
      slideInLeft: {
        keyframes: [
          { transform: 'translateX(-20px)', opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 }
        ],
        options: {
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        }
      },
      slideInRight: {
        keyframes: [
          { transform: 'translateX(20px)', opacity: 0 },
          { transform: 'translateX(0)', opacity: 1 }
        ],
        options: {
          duration: 300,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        }
      },
      scaleIn: {
        keyframes: [
          { transform: 'scale(0.95)', opacity: 0 },
          { transform: 'scale(1)', opacity: 1 }
        ],
        options: {
          duration: 250,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        }
      },
      scaleOut: {
        keyframes: [
          { transform: 'scale(1)', opacity: 1 },
          { transform: 'scale(0.95)', opacity: 0 }
        ],
        options: {
          duration: 250,
          easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          fill: 'forwards'
        }
      },
      bounceIn: {
        keyframes: [
          { transform: 'scale(0.3)', opacity: 0 },
          { transform: 'scale(1.05)', opacity: 0.8 },
          { transform: 'scale(0.97)', opacity: 1 },
          { transform: 'scale(1)', opacity: 1 }
        ],
        options: {
          duration: 500,
          easing: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
          fill: 'forwards'
        }
      },
      shake: {
        keyframes: [
          { transform: 'translateX(0)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(-10px)' },
          { transform: 'translateX(10px)' },
          { transform: 'translateX(0)' }
        ],
        options: {
          duration: 500,
          easing: 'ease-in-out',
          fill: 'forwards'
        }
      },
      pulse: {
        keyframes: [
          { transform: 'scale(1)' },
          { transform: 'scale(1.05)' },
          { transform: 'scale(1)' }
        ],
        options: {
          duration: 300,
          easing: 'ease-in-out',
          fill: 'forwards'
        }
      },
      rotate: {
        keyframes: [
          { transform: 'rotate(0deg)' },
          { transform: 'rotate(360deg)' }
        ],
        options: {
          duration: 600,
          easing: 'linear',
          fill: 'forwards'
        }
      },
      ripple: {
        keyframes: [
          { transform: 'scale(0)', opacity: 1 },
          { transform: 'scale(4)', opacity: 0 }
        ],
        options: {
          duration: 600,
          easing: 'ease-out',
          fill: 'forwards'
        }
      }
    };
    
    // Speed multipliers
    this.speedMultipliers = {
      slow: 1.5,
      normal: 1,
      fast: 0.7
    };
    
    // Initialize settings from storage
    this.loadSettings();
  }
  
  /**
   * Check system preference for reduced motion
   */
  checkReducedMotion() {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = mediaQuery.matches;
    
    // Listen for changes
    mediaQuery.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      this.notifyReducedMotionChange();
    });
  }
  
  /**
   * Load animation settings from storage
   */
  async loadSettings() {
    try {
      const result = await browser.storage.local.get(['animationSettings']);
      if (result.animationSettings) {
        this.animationsEnabled = result.animationSettings.enabled !== false;
        this.animationSpeed = result.animationSettings.speed || 'normal';
      }
    } catch (error) {
      console.error('[AnimationManager] Failed to load settings:', error);
    }
  }
  
  /**
   * Save animation settings to storage
   */
  async saveSettings() {
    try {
      await browser.storage.local.set({
        animationSettings: {
          enabled: this.animationsEnabled,
          speed: this.animationSpeed
        }
      });
    } catch (error) {
      console.error('[AnimationManager] Failed to save settings:', error);
    }
  }
  
  /**
   * Animate an element with a preset animation
   * @param {HTMLElement} element - Element to animate
   * @param {string} preset - Animation preset name
   * @param {Object} options - Override options
   * @returns {Promise} Animation promise
   */
  animate(element, preset, options = {}) {
    if (!element || !this.presets[preset]) {
      return Promise.resolve();
    }
    
    // Skip animation if disabled or reduced motion
    if (!this.animationsEnabled || this.reducedMotion) {
      // Apply final state immediately
      if (preset.includes('In')) {
        element.style.opacity = '1';
        element.style.transform = 'none';
      } else if (preset.includes('Out')) {
        element.style.opacity = '0';
      }
      return Promise.resolve();
    }
    
    // Get animation configuration
    const animation = this.presets[preset];
    const speedMultiplier = this.speedMultipliers[this.animationSpeed];
    
    // Merge options
    const animationOptions = {
      ...animation.options,
      ...options,
      duration: (animation.options.duration * speedMultiplier) * (options.duration ? 1 : 1)
    };
    
    // Track performance
    const startTime = performance.now();
    const animationId = `${preset}_${Date.now()}`;
    
    // Create and run animation
    const anim = element.animate(animation.keyframes, animationOptions);
    
    // Monitor performance
    this.trackAnimation(animationId, startTime);
    
    return new Promise((resolve) => {
      anim.onfinish = () => {
        this.completeAnimation(animationId);
        resolve();
      };
      
      anim.oncancel = () => {
        this.completeAnimation(animationId);
        resolve();
      };
    });
  }
  
  /**
   * Apply micro-interaction to an element
   * @param {HTMLElement} element - Element to apply interaction to
   * @param {string} type - Type of interaction (hover, click, focus)
   */
  applyMicroInteraction(element, type) {
    if (!this.animationsEnabled || this.reducedMotion) return;
    
    switch (type) {
      case 'hover':
        this.applyHoverInteraction(element);
        break;
      case 'click':
        this.applyClickInteraction(element);
        break;
      case 'focus':
        this.applyFocusInteraction(element);
        break;
      case 'ripple':
        this.applyRippleInteraction(element);
        break;
    }
  }
  
  /**
   * Apply hover interaction
   */
  applyHoverInteraction(element) {
    element.addEventListener('mouseenter', () => {
      if (!this.animationsEnabled) return;
      element.style.transition = `transform ${150 * this.speedMultipliers[this.animationSpeed]}ms ease`;
      element.style.transform = 'translateY(-2px)';
    });
    
    element.addEventListener('mouseleave', () => {
      if (!this.animationsEnabled) return;
      element.style.transform = 'translateY(0)';
    });
  }
  
  /**
   * Apply click interaction
   */
  applyClickInteraction(element) {
    element.addEventListener('click', () => {
      if (!this.animationsEnabled) return;
      this.animate(element, 'pulse');
    });
  }
  
  /**
   * Apply focus interaction
   */
  applyFocusInteraction(element) {
    element.addEventListener('focus', () => {
      if (!this.animationsEnabled) return;
      element.style.transition = `box-shadow ${200 * this.speedMultipliers[this.animationSpeed]}ms ease`;
      element.style.boxShadow = '0 0 0 3px rgba(66, 153, 225, 0.5)';
    });
    
    element.addEventListener('blur', () => {
      if (!this.animationsEnabled) return;
      element.style.boxShadow = 'none';
    });
  }
  
  /**
   * Apply ripple interaction
   */
  applyRippleInteraction(element) {
    element.style.position = 'relative';
    element.style.overflow = 'hidden';
    
    element.addEventListener('click', (e) => {
      if (!this.animationsEnabled) return;
      
      const ripple = document.createElement('span');
      ripple.className = 'deepweb-ripple';
      
      const rect = element.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      
      element.appendChild(ripple);
      
      this.animate(ripple, 'ripple').then(() => {
        ripple.remove();
      });
    });
  }
  
  /**
   * Create loading spinner
   * @param {string} size - Size of spinner (small, medium, large)
   * @returns {HTMLElement} Spinner element
   */
  createSpinner(size = 'medium') {
    const spinner = document.createElement('div');
    spinner.className = `deepweb-spinner deepweb-spinner-${size}`;
    
    if (!this.reducedMotion && this.animationsEnabled) {
      spinner.classList.add('deepweb-spinner-animated');
    }
    
    return spinner;
  }
  
  /**
   * Create progress bar
   * @param {number} progress - Progress value (0-100)
   * @returns {HTMLElement} Progress bar element
   */
  createProgressBar(progress = 0) {
    const container = document.createElement('div');
    container.className = 'deepweb-progress-bar';
    
    const fill = document.createElement('div');
    fill.className = 'deepweb-progress-fill';
    fill.style.width = `${progress}%`;
    
    if (this.animationsEnabled) {
      fill.style.transition = `width ${300 * this.speedMultipliers[this.animationSpeed]}ms ease`;
    }
    
    container.appendChild(fill);
    
    // Update method
    container.updateProgress = (newProgress) => {
      fill.style.width = `${Math.min(100, Math.max(0, newProgress))}%`;
    };
    
    return container;
  }
  
  /**
   * Create skeleton loader
   * @param {string} type - Type of skeleton (text, card, list)
   * @returns {HTMLElement} Skeleton element
   */
  createSkeleton(type = 'text') {
    const skeleton = document.createElement('div');
    skeleton.className = `deepweb-skeleton deepweb-skeleton-${type}`;
    
    if (!this.reducedMotion && this.animationsEnabled) {
      skeleton.classList.add('deepweb-skeleton-animated');
    }
    
    return skeleton;
  }
  
  /**
   * Apply entrance animation to multiple elements
   * @param {NodeList|Array} elements - Elements to animate
   * @param {string} preset - Animation preset
   * @param {number} stagger - Stagger delay between elements
   */
  async animateStagger(elements, preset = 'fadeIn', stagger = 50) {
    if (!this.animationsEnabled || this.reducedMotion) {
      // Show all elements immediately
      elements.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }
    
    const animations = [];
    const adjustedStagger = stagger * this.speedMultipliers[this.animationSpeed];
    
    elements.forEach((element, index) => {
      const delay = index * adjustedStagger;
      animations.push(
        new Promise(resolve => {
          setTimeout(() => {
            this.animate(element, preset).then(resolve);
          }, delay);
        })
      );
    });
    
    return Promise.all(animations);
  }
  
  /**
   * Track animation performance
   */
  trackAnimation(id, startTime) {
    this.performanceMetrics.animations.set(id, {
      startTime,
      frameCount: 0,
      dropped: false
    });
    
    this.performanceMetrics.totalAnimations++;
  }
  
  /**
   * Complete animation tracking
   */
  completeAnimation(id) {
    const animation = this.performanceMetrics.animations.get(id);
    if (!animation) return;
    
    const duration = performance.now() - animation.startTime;
    
    // Check for poor performance (>16ms per frame average)
    if (duration > 500 && animation.frameCount < duration / 16) {
      this.performanceMetrics.frameDrops++;
      animation.dropped = true;
    }
    
    // Clean up old metrics
    if (this.performanceMetrics.animations.size > 100) {
      const oldestKey = this.performanceMetrics.animations.keys().next().value;
      this.performanceMetrics.animations.delete(oldestKey);
    }
  }
  
  /**
   * Get performance report
   */
  getPerformanceReport() {
    const dropRate = this.performanceMetrics.totalAnimations > 0
      ? (this.performanceMetrics.frameDrops / this.performanceMetrics.totalAnimations) * 100
      : 0;
    
    return {
      totalAnimations: this.performanceMetrics.totalAnimations,
      frameDrops: this.performanceMetrics.frameDrops,
      dropRate: dropRate.toFixed(2) + '%',
      recommendation: dropRate > 10 ? 'Consider disabling animations for better performance' : 'Performance is good'
    };
  }
  
  /**
   * Set animation speed
   * @param {string} speed - Speed setting (slow, normal, fast)
   */
  setSpeed(speed) {
    if (this.speedMultipliers[speed]) {
      this.animationSpeed = speed;
      this.saveSettings();
    }
  }
  
  /**
   * Enable/disable animations
   * @param {boolean} enabled - Whether animations are enabled
   */
  setEnabled(enabled) {
    this.animationsEnabled = enabled;
    this.saveSettings();
    
    // Add/remove global class
    if (enabled && !this.reducedMotion) {
      document.body.classList.remove('deepweb-no-animations');
    } else {
      document.body.classList.add('deepweb-no-animations');
    }
  }
  
  /**
   * Notify about reduced motion change
   */
  notifyReducedMotionChange() {
    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('deepweb-reduced-motion-change', {
      detail: { reducedMotion: this.reducedMotion }
    }));
  }
  
  /**
   * Apply page transition
   * @param {string} direction - Transition direction (in, out)
   */
  async pageTransition(direction = 'in') {
    const overlay = document.createElement('div');
    overlay.className = 'deepweb-page-transition';
    document.body.appendChild(overlay);
    
    if (direction === 'in') {
      await this.animate(overlay, 'fadeIn', { duration: 300 });
    } else {
      await this.animate(overlay, 'fadeOut', { duration: 300 });
    }
    
    overlay.remove();
  }
  
  /**
   * Create and show toast notification
   * @param {string} message - Toast message
   * @param {string} type - Toast type (info, success, warning, error)
   * @param {number} duration - Display duration
   */
  async showToast(message, type = 'info', duration = 3000) {
    const toast = document.createElement('div');
    toast.className = `deepweb-toast deepweb-toast-${type}`;
    toast.textContent = message;
    
    // Position off-screen initially
    toast.style.transform = 'translateY(100px)';
    document.body.appendChild(toast);
    
    // Animate in
    await this.animate(toast, 'slideIn');
    
    // Wait for duration
    await new Promise(resolve => setTimeout(resolve, duration));
    
    // Animate out
    await this.animate(toast, 'slideOut');
    toast.remove();
  }
}

// Create singleton instance
const animationManager = new AnimationManager();
export { animationManager };