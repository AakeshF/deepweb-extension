/**
 * DOM Utility Functions
 * Safe DOM manipulation without innerHTML
 */

export const DOMUtils = {
  /**
   * Create element with attributes and properties
   * @param {string} tag - Element tag name
   * @param {Object} attributes - Element attributes
   * @param {Object} properties - Element properties
   * @returns {HTMLElement}
   */
  createElement(tag, attributes = {}, properties = {}) {
    const element = document.createElement(tag);
    
    // Set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, value);
      }
    });
    
    // Set properties
    Object.entries(properties).forEach(([key, value]) => {
      if (key === 'textContent' || key === 'innerText') {
        element.textContent = value;
      } else if (key === 'style' && typeof value === 'object') {
        Object.assign(element.style, value);
      } else {
        element[key] = value;
      }
    });
    
    return element;
  },

  /**
   * Safely set text content
   * @param {HTMLElement} element - Target element
   * @param {string} text - Text content
   */
  setTextContent(element, text) {
    if (element) {
      element.textContent = text;
    }
  },

  /**
   * Add multiple event listeners at once
   * @param {HTMLElement} element - Target element
   * @param {Object} events - Event listeners object
   */
  addEventListeners(element, events) {
    Object.entries(events).forEach(([event, handler]) => {
      element.addEventListener(event, handler);
    });
  },

  /**
   * Remove multiple event listeners at once
   * @param {HTMLElement} element - Target element
   * @param {Object} events - Event listeners object
   */
  removeEventListeners(element, events) {
    Object.entries(events).forEach(([event, handler]) => {
      element.removeEventListener(event, handler);
    });
  },

  /**
   * Query selector with null check
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (default: document)
   * @returns {HTMLElement|null}
   */
  $(selector, parent = document) {
    return parent.querySelector(selector);
  },

  /**
   * Query selector all with array conversion
   * @param {string} selector - CSS selector
   * @param {HTMLElement} parent - Parent element (default: document)
   * @returns {Array<HTMLElement>}
   */
  $$(selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
  },

  /**
   * Append multiple children at once
   * @param {HTMLElement} parent - Parent element
   * @param {Array<HTMLElement|DocumentFragment>} children - Children to append
   */
  appendChildren(parent, children) {
    const fragment = document.createDocumentFragment();
    children.forEach(child => {
      if (child) {
        fragment.appendChild(child);
      }
    });
    parent.appendChild(fragment);
  },

  /**
   * Replace element with new element
   * @param {HTMLElement} oldElement - Element to replace
   * @param {HTMLElement} newElement - New element
   */
  replaceElement(oldElement, newElement) {
    if (oldElement && oldElement.parentNode) {
      oldElement.parentNode.replaceChild(newElement, oldElement);
    }
  },

  /**
   * Toggle class with optional force parameter
   * @param {HTMLElement} element - Target element
   * @param {string} className - Class name
   * @param {boolean} force - Force add/remove
   */
  toggleClass(element, className, force) {
    if (element) {
      element.classList.toggle(className, force);
    }
  },

  /**
   * Check if element is visible in viewport
   * @param {HTMLElement} element - Target element
   * @returns {boolean}
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * Sanitize user input for safe display
   * @param {string} input - User input
   * @returns {string} - Sanitized input
   */
  sanitizeText(input) {
    const div = document.createElement('div');
    div.textContent = input;
    return div.innerHTML;
  },

  /**
   * Debounce function
   * @param {Function} func - Function to debounce
   * @param {number} wait - Wait time in milliseconds
   * @returns {Function} - Debounced function
   */
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
};

export default DOMUtils;