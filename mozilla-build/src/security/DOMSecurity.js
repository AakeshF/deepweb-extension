/**
 * DOM Security Module
 * Provides secure DOM manipulation methods to prevent XSS attacks
 */

export class DOMSecurity {
  /**
   * Safely set text content of an element
   * @param {Element} element - Target element
   * @param {string} text - Text content to set
   */
  static setTextContent(element, text) {
    if (!element || typeof text !== 'string') {
      throw new Error('Invalid element or text');
    }
    element.textContent = text;
  }

  /**
   * Safely create element with text content
   * @param {string} tagName - HTML tag name
   * @param {string} text - Text content
   * @param {Object} attributes - Optional attributes
   * @returns {Element} Created element
   */
  static createElement(tagName, text = '', attributes = {}) {
    const element = document.createElement(tagName);
    if (text) {
      element.textContent = text;
    }
    
    // Safely set attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (this.isSafeAttribute(key, value)) {
        element.setAttribute(key, value);
      }
    });
    
    return element;
  }

  /**
   * Safely append HTML content using template element
   * @param {Element} parent - Parent element
   * @param {string} html - HTML content
   * @param {boolean} sanitize - Whether to sanitize HTML
   */
  static appendHTML(parent, html, sanitize = true) {
    if (!parent || typeof html !== 'string') {
      throw new Error('Invalid parent element or HTML');
    }

    const sanitizedHTML = sanitize ? this.sanitizeHTML(html) : html;
    const template = document.createElement('template');
    // Safe to use innerHTML here as content is either sanitized or explicitly trusted
    // Template element provides additional sandboxing
    template.innerHTML = sanitizedHTML;
    
    // Clone and append nodes
    const fragment = template.content.cloneNode(true);
    parent.appendChild(fragment);
  }

  /**
   * Sanitize HTML content to prevent XSS
   * @param {string} html - HTML to sanitize
   * @returns {string} Sanitized HTML
   */
  static sanitizeHTML(html) {
    // Create a temporary container
    const temp = document.createElement('div');
    temp.textContent = html;
    const textOnly = temp.innerHTML;
    
    // Allow only safe tags and attributes
    const allowedTags = [
      'p', 'br', 'strong', 'em', 'u', 'i', 'b',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'span', 'div', 'a', 'img'
    ];
    
    const allowedAttributes = {
      'a': ['href', 'title', 'target', 'rel'],
      'img': ['src', 'alt', 'width', 'height'],
      'code': ['class'],
      'pre': ['class'],
      'span': ['class'],
      'div': ['class']
    };
    
    // Parse HTML safely
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Walk through all elements and remove unsafe ones
    const walker = document.createTreeWalker(
      doc.body,
      NodeFilter.SHOW_ELEMENT,
      null,
      false
    );
    
    const nodesToRemove = [];
    let node;
    
    while (node = walker.nextNode()) {
      const tagName = node.tagName.toLowerCase();
      
      // Remove disallowed tags
      if (!allowedTags.includes(tagName)) {
        nodesToRemove.push(node);
        continue;
      }
      
      // Remove disallowed attributes
      const attrs = Array.from(node.attributes);
      attrs.forEach(attr => {
        const attrName = attr.name.toLowerCase();
        const allowed = allowedAttributes[tagName] || [];
        
        if (!allowed.includes(attrName)) {
          node.removeAttribute(attr.name);
        } else {
          // Sanitize attribute values
          const sanitizedValue = this.sanitizeAttribute(attrName, attr.value);
          if (sanitizedValue !== attr.value) {
            node.setAttribute(attrName, sanitizedValue);
          }
        }
      });
      
      // Remove inline event handlers
      attrs.forEach(attr => {
        if (attr.name.startsWith('on')) {
          node.removeAttribute(attr.name);
        }
      });
    }
    
    // Remove unsafe nodes
    nodesToRemove.forEach(node => {
      node.parentNode?.removeChild(node);
    });
    
    return doc.body.innerHTML;
  }

  /**
   * Sanitize attribute value
   * @param {string} attrName - Attribute name
   * @param {string} value - Attribute value
   * @returns {string} Sanitized value
   */
  static sanitizeAttribute(attrName, value) {
    switch (attrName) {
      case 'href':
        // Only allow safe protocols
        if (!/^(https?:|mailto:|#)/.test(value)) {
          return '#';
        }
        break;
      case 'src':
        // Only allow safe protocols for images
        if (!/^(https?:|data:image\/(png|jpg|jpeg|gif|webp|svg\+xml);base64,)/.test(value)) {
          return '';
        }
        break;
      case 'target':
        // Only allow safe target values
        if (!['_blank', '_self', '_parent', '_top'].includes(value)) {
          return '_self';
        }
        break;
      case 'rel':
        // Ensure noopener noreferrer for external links
        if (!value.includes('noopener')) {
          value += ' noopener noreferrer';
        }
        break;
    }
    return value;
  }

  /**
   * Check if attribute is safe
   * @param {string} name - Attribute name
   * @param {string} value - Attribute value
   * @returns {boolean} Whether attribute is safe
   */
  static isSafeAttribute(name, value) {
    // Reject event handlers
    if (name.startsWith('on')) {
      return false;
    }
    
    // Reject javascript: protocol
    if (typeof value === 'string' && value.includes('javascript:')) {
      return false;
    }
    
    return true;
  }

  /**
   * Escape HTML entities
   * @param {string} text - Text to escape
   * @returns {string} Escaped text
   */
  static escapeHTML(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    
    return text.replace(/[&<>"'/]/g, char => map[char]);
  }

  /**
   * Create safe event listener
   * @param {Element} element - Target element
   * @param {string} event - Event name
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  static addEventListener(element, event, handler, options = {}) {
    if (!element || typeof handler !== 'function') {
      throw new Error('Invalid element or handler');
    }
    
    // Wrap handler for safety
    const safeHandler = (e) => {
      try {
        handler(e);
      } catch (error) {
        console.error('Event handler error:', error);
      }
    };
    
    element.addEventListener(event, safeHandler, options);
    
    // Return cleanup function
    return () => {
      element.removeEventListener(event, safeHandler, options);
    };
  }

  /**
   * Safely update element class
   * @param {Element} element - Target element
   * @param {string} className - Class name
   * @param {boolean} add - Whether to add or remove
   */
  static updateClass(element, className, add = true) {
    if (!element || typeof className !== 'string') {
      throw new Error('Invalid element or class name');
    }
    
    // Validate class name (alphanumeric, dash, underscore only)
    if (!/^[a-zA-Z0-9_-]+$/.test(className)) {
      throw new Error('Invalid class name format');
    }
    
    if (add) {
      element.classList.add(className);
    } else {
      element.classList.remove(className);
    }
  }

  /**
   * Create DocumentFragment from safe HTML
   * @param {string} html - HTML content
   * @returns {DocumentFragment} Document fragment
   */
  static createFragment(html) {
    const sanitized = this.sanitizeHTML(html);
    const template = document.createElement('template');
    // Safe to use innerHTML here as content has been sanitized
    // Template element provides additional sandboxing
    template.innerHTML = sanitized;
    return template.content;
  }

  /**
   * Safely set data attribute
   * @param {Element} element - Target element
   * @param {string} name - Data attribute name
   * @param {string} value - Data attribute value
   */
  static setDataAttribute(element, name, value) {
    if (!element || typeof name !== 'string') {
      throw new Error('Invalid element or attribute name');
    }
    
    // Validate attribute name
    if (!/^[a-zA-Z][a-zA-Z0-9-]*$/.test(name)) {
      throw new Error('Invalid data attribute name');
    }
    
    element.dataset[name] = String(value);
  }

  /**
   * Generate secure random ID
   * @param {string} prefix - Optional prefix
   * @returns {string} Secure random ID
   */
  static generateId(prefix = 'deepweb') {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    const hex = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${prefix}-${hex}`;
  }
}