/**
 * Error Boundary for UI Components
 * Catches and handles errors in component tree
 */

import ErrorHandler, { UIError, ComponentError } from './ErrorHandler.js';
import DOMUtils from '../../content/utils/dom-utils.js';

export class ErrorBoundary {
  constructor(options = {}) {
    this.fallbackUI = options.fallbackUI || this.defaultFallbackUI;
    this.onError = options.onError || (() => {});
    this.component = options.component || 'Unknown';
    this.resetHandlers = new Map();
  }

  /**
   * Wrap a component with error boundary
   * @param {Object} component - Component to wrap
   * @returns {Object} Wrapped component
   */
  wrap(component) {
    const originalRender = component.render.bind(component);
    const originalInit = component.init ? component.init.bind(component) : null;
    const originalDestroy = component.destroy ? component.destroy.bind(component) : null;
    
    // Wrap render method
    component.render = async (...args) => {
      try {
        return await originalRender(...args);
      } catch (error) {
        return this.handleRenderError(component, error);
      }
    };
    
    // Wrap init method
    if (originalInit) {
      component.init = async (...args) => {
        try {
          return await originalInit(...args);
        } catch (error) {
          return this.handleInitError(component, error);
        }
      };
    }
    
    // Wrap event handlers
    this.wrapEventHandlers(component);
    
    // Add error recovery method
    component.recover = () => this.recoverComponent(component);
    
    return component;
  }

  /**
   * Wrap event handlers
   * @private
   */
  wrapEventHandlers(component) {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(component));
    
    methods.forEach(method => {
      if (method.startsWith('handle') || method.startsWith('on')) {
        const original = component[method];
        if (typeof original === 'function') {
          component[method] = (...args) => {
            try {
              return original.apply(component, args);
            } catch (error) {
              this.handleEventError(component, method, error);
            }
          };
        }
      }
    });
  }

  /**
   * Handle render error
   * @private
   */
  handleRenderError(component, error) {
    const componentError = new ComponentError(
      component.constructor.name,
      'render',
      'Component failed to render',
      error
    );
    
    const result = ErrorHandler.handleError(componentError, {
      component: component.constructor.name
    });
    
    this.onError(result.error);
    
    // Return fallback UI
    return this.createFallbackElement(component, result);
  }

  /**
   * Handle init error
   * @private
   */
  handleInitError(component, error) {
    const componentError = new ComponentError(
      component.constructor.name,
      'init',
      'Component failed to initialize',
      error
    );
    
    const result = ErrorHandler.handleError(componentError, {
      component: component.constructor.name
    });
    
    this.onError(result.error);
    
    // Set fallback element on component
    component.element = this.createFallbackElement(component, result);
  }

  /**
   * Handle event error
   * @private
   */
  handleEventError(component, method, error) {
    const uiError = new UIError(
      `Error in ${method}`,
      component.constructor.name,
      method,
      error
    );
    
    const result = ErrorHandler.handleError(uiError, {
      component: component.constructor.name,
      method
    });
    
    this.onError(result.error);
    
    // Show inline error if possible
    this.showInlineError(component, result);
  }

  /**
   * Create fallback element
   * @private
   */
  createFallbackElement(component, errorResult) {
    const fallback = DOMUtils.createElement('div', {
      class: 'deepweb-error-boundary',
      'data-component': component.constructor.name
    });
    
    // Apply styles
    Object.assign(fallback.style, {
      padding: '20px',
      background: '#fee',
      border: '1px solid #fcc',
      borderRadius: '8px',
      textAlign: 'center',
      color: '#c00'
    });
    
    // Add content
    const content = this.fallbackUI(errorResult);
    if (typeof content === 'string') {
      fallback.innerHTML = DOMUtils.sanitizeText(content);
    } else {
      fallback.appendChild(content);
    }
    
    // Add reset button
    const resetBtn = DOMUtils.createElement('button', {
      class: 'deepweb-error-reset'
    }, {
      textContent: 'Try Again',
      style: {
        marginTop: '10px',
        padding: '5px 10px',
        background: '#fff',
        border: '1px solid #ccc',
        borderRadius: '4px',
        cursor: 'pointer'
      }
    });
    
    resetBtn.addEventListener('click', () => {
      this.recoverComponent(component);
    });
    
    fallback.appendChild(resetBtn);
    
    return fallback;
  }

  /**
   * Default fallback UI
   * @private
   */
  defaultFallbackUI(errorResult) {
    const container = DOMUtils.createElement('div');
    
    const title = DOMUtils.createElement('div', {}, {
      textContent: '⚠️ Something went wrong',
      style: {
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '10px'
      }
    });
    
    const message = DOMUtils.createElement('div', {}, {
      textContent: errorResult.userMessage,
      style: {
        fontSize: '14px',
        marginBottom: '10px'
      }
    });
    
    container.appendChild(title);
    container.appendChild(message);
    
    // Add suggestions if available
    if (errorResult.suggestions && errorResult.suggestions.length > 0) {
      const suggestionsList = DOMUtils.createElement('ul', {}, {
        style: {
          textAlign: 'left',
          fontSize: '12px',
          margin: '10px 0'
        }
      });
      
      errorResult.suggestions.forEach(suggestion => {
        const li = DOMUtils.createElement('li', {}, {
          textContent: suggestion
        });
        suggestionsList.appendChild(li);
      });
      
      container.appendChild(suggestionsList);
    }
    
    return container;
  }

  /**
   * Show inline error
   * @private
   */
  showInlineError(component, errorResult) {
    if (!component.element) return;
    
    // Create error toast
    const toast = DOMUtils.createElement('div', {
      class: 'deepweb-error-toast'
    }, {
      textContent: errorResult.userMessage,
      style: {
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: '#f44336',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '4px',
        fontSize: '14px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: '1000',
        maxWidth: '300px'
      }
    });
    
    component.element.appendChild(toast);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 5000);
  }

  /**
   * Recover component
   * @private
   */
  async recoverComponent(component) {
    try {
      // Re-initialize component
      if (component.init) {
        await component.init();
      } else if (component.render) {
        const newElement = await component.render();
        if (component.element && component.element.parentNode) {
          component.element.parentNode.replaceChild(newElement, component.element);
          component.element = newElement;
        }
      }
      
      // Notify recovery
      if (this.resetHandlers.has(component)) {
        this.resetHandlers.get(component)();
      }
      
    } catch (error) {
      console.error('[ErrorBoundary] Recovery failed:', error);
      // Recovery failed, show permanent error
      this.handleRenderError(component, error);
    }
  }

  /**
   * Set reset handler for component
   * @param {Object} component - Component
   * @param {Function} handler - Reset handler
   */
  onReset(component, handler) {
    this.resetHandlers.set(component, handler);
  }

  /**
   * Create error boundary for a component tree
   * @static
   */
  static create(rootComponent, options = {}) {
    const boundary = new ErrorBoundary(options);
    
    // Recursively wrap all components
    function wrapTree(component) {
      boundary.wrap(component);
      
      if (component.children) {
        component.children.forEach(child => wrapTree(child));
      }
    }
    
    wrapTree(rootComponent);
    
    return boundary;
  }
}