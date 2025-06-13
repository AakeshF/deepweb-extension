/**
 * Event Manager
 * Centralized event handling with proper cleanup
 */

class EventManager {
  constructor() {
    this.listeners = new Map();
    this.delegatedListeners = new Map();
  }

  /**
   * Add event listener with tracking
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  on(element, event, handler, options = {}) {
    if (!element || !event || !handler) return;

    const key = this._getKey(element, event);
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }

    const wrappedHandler = (e) => {
      try {
        handler(e);
      } catch (error) {
        console.error('[DeepWeb] Event handler error:', error);
      }
    };

    this.listeners.get(key).add({ handler, wrappedHandler, options });
    element.addEventListener(event, wrappedHandler, options);
  }

  /**
   * Remove event listener
   * @param {HTMLElement} element - Target element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  off(element, event, handler) {
    if (!element || !event) return;

    const key = this._getKey(element, event);
    const listeners = this.listeners.get(key);

    if (listeners) {
      const listener = Array.from(listeners).find(l => l.handler === handler);
      if (listener) {
        element.removeEventListener(event, listener.wrappedHandler, listener.options);
        listeners.delete(listener);
        
        if (listeners.size === 0) {
          this.listeners.delete(key);
        }
      }
    }
  }

  /**
   * Add delegated event listener
   * @param {HTMLElement} parent - Parent element
   * @param {string} selector - Child selector
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  delegate(parent, selector, event, handler) {
    if (!parent || !selector || !event || !handler) return;

    const key = `${event}:${selector}`;
    
    if (!this.delegatedListeners.has(parent)) {
      this.delegatedListeners.set(parent, new Map());
    }

    const parentListeners = this.delegatedListeners.get(parent);
    
    if (!parentListeners.has(key)) {
      const delegatedHandler = (e) => {
        const target = e.target.closest(selector);
        if (target && parent.contains(target)) {
          handler.call(target, e);
        }
      };

      parentListeners.set(key, { handler: delegatedHandler, selector, event });
      parent.addEventListener(event, delegatedHandler, true);
    }
  }

  /**
   * Remove delegated event listener
   * @param {HTMLElement} parent - Parent element
   * @param {string} selector - Child selector
   * @param {string} event - Event type
   */
  undelegate(parent, selector, event) {
    if (!parent || !selector || !event) return;

    const parentListeners = this.delegatedListeners.get(parent);
    if (!parentListeners) return;

    const key = `${event}:${selector}`;
    const listener = parentListeners.get(key);

    if (listener) {
      parent.removeEventListener(event, listener.handler, true);
      parentListeners.delete(key);

      if (parentListeners.size === 0) {
        this.delegatedListeners.delete(parent);
      }
    }
  }

  /**
   * Emit custom event
   * @param {HTMLElement} element - Target element
   * @param {string} eventName - Event name
   * @param {*} detail - Event detail
   */
  emit(element, eventName, detail = null) {
    const event = new CustomEvent(eventName, {
      detail,
      bubbles: true,
      cancelable: true
    });
    element.dispatchEvent(event);
  }

  /**
   * Remove all listeners for an element
   * @param {HTMLElement} element - Target element
   */
  removeAll(element) {
    // Remove direct listeners
    for (const [key, listeners] of this.listeners.entries()) {
      if (key.startsWith(element.toString())) {
        listeners.forEach(listener => {
          const [elem, event] = this._parseKey(key);
          elem.removeEventListener(event, listener.wrappedHandler, listener.options);
        });
        this.listeners.delete(key);
      }
    }

    // Remove delegated listeners
    if (this.delegatedListeners.has(element)) {
      const parentListeners = this.delegatedListeners.get(element);
      parentListeners.forEach((listener, key) => {
        element.removeEventListener(listener.event, listener.handler, true);
      });
      this.delegatedListeners.delete(element);
    }
  }

  /**
   * Clean up all event listeners
   */
  destroy() {
    // Remove all direct listeners
    for (const [key, listeners] of this.listeners.entries()) {
      const [element, event] = this._parseKey(key);
      listeners.forEach(listener => {
        element.removeEventListener(event, listener.wrappedHandler, listener.options);
      });
    }
    this.listeners.clear();

    // Remove all delegated listeners
    for (const [parent, parentListeners] of this.delegatedListeners.entries()) {
      parentListeners.forEach((listener) => {
        parent.removeEventListener(listener.event, listener.handler, true);
      });
    }
    this.delegatedListeners.clear();
  }

  /**
   * Generate unique key for element/event combination
   * @private
   */
  _getKey(element, event) {
    return `${element.toString()}:${event}`;
  }

  /**
   * Parse key back to element and event
   * @private
   */
  _parseKey(key) {
    const parts = key.split(':');
    return [parts[0], parts[1]];
  }
}

// Export singleton instance
export default new EventManager();