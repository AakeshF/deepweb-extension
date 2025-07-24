/**
 * Content Security Policy Configuration
 * Provides secure CSP headers and configuration
 */

export class CSPConfig {
  /**
   * Get CSP directives for the extension
   * @returns {Object} CSP directives
   */
  static getCSPDirectives() {
    return {
      'default-src': ["'self'"],
      'script-src': ["'self'"],
      'style-src': ["'self'", "'unsafe-inline'"], // Required for dynamic styles
      'img-src': ["'self'", 'data:', 'https:'],
      'font-src': ["'self'"],
      'connect-src': [
        "'self'",
        'https://api.deepseek.com',
        'https://api.openai.com',
        'https://api.anthropic.com'
      ],
      'media-src': ["'none'"],
      'object-src': ["'none'"],
      'frame-src': ["'none'"],
      'worker-src': ["'none'"],
      'form-action': ["'none'"],
      'base-uri': ["'self'"],
      'manifest-src': ["'self'"]
    };
  }

  /**
   * Generate CSP header string
   * @returns {string} CSP header value
   */
  static generateCSPHeader() {
    const directives = this.getCSPDirectives();
    return Object.entries(directives)
      .map(([key, values]) => `${key} ${values.join(' ')}`)
      .join('; ');
  }

  /**
   * Apply CSP to a document
   * @param {Document} doc - Document to apply CSP to
   */
  static applyCSP(doc = document) {
    const meta = doc.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    meta.content = this.generateCSPHeader();
    
    // Insert as first child of head
    const head = doc.head || doc.getElementsByTagName('head')[0];
    if (head && head.firstChild) {
      head.insertBefore(meta, head.firstChild);
    } else {
      head?.appendChild(meta);
    }
  }

  /**
   * Validate URL against CSP
   * @param {string} url - URL to validate
   * @param {string} directive - CSP directive to check
   * @returns {boolean} Whether URL is allowed
   */
  static validateURL(url, directive) {
    const directives = this.getCSPDirectives();
    const allowed = directives[directive] || [];
    
    // Check self
    if (allowed.includes("'self'")) {
      try {
        const urlObj = new URL(url);
        const currentOrigin = window.location.origin;
        if (urlObj.origin === currentOrigin) {
          return true;
        }
      } catch (e) {
        // Invalid URL
        return false;
      }
    }
    
    // Check specific URLs
    for (const allowedUrl of allowed) {
      if (allowedUrl.startsWith('https:') || allowedUrl.startsWith('http:')) {
        if (url.startsWith(allowedUrl)) {
          return true;
        }
      }
    }
    
    // Check data: URLs
    if (allowed.includes('data:') && url.startsWith('data:')) {
      return true;
    }
    
    return false;
  }

  /**
   * Sanitize inline styles to be CSP compliant
   * @param {string} style - Style string
   * @returns {string} Sanitized style
   */
  static sanitizeInlineStyle(style) {
    // Remove javascript: and expression() from styles
    const dangerous = [
      /javascript:/gi,
      /expression\s*\(/gi,
      /-moz-binding/gi,
      /behavior:/gi,
      /@import/gi
    ];
    
    let sanitized = style;
    dangerous.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '');
    });
    
    return sanitized;
  }

  /**
   * Create nonce for inline scripts (if needed)
   * @returns {string} Nonce value
   */
  static createNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  }

  /**
   * Check if resource is allowed by CSP
   * @param {string} resourceType - Type of resource
   * @param {string} url - Resource URL
   * @returns {boolean} Whether resource is allowed
   */
  static isResourceAllowed(resourceType, url) {
    const directiveMap = {
      'script': 'script-src',
      'style': 'style-src',
      'image': 'img-src',
      'font': 'font-src',
      'connect': 'connect-src',
      'media': 'media-src',
      'object': 'object-src',
      'frame': 'frame-src'
    };
    
    const directive = directiveMap[resourceType];
    if (!directive) {
      return false;
    }
    
    return this.validateURL(url, directive);
  }

  /**
   * Get secure fetch options
   * @param {Object} options - Fetch options
   * @returns {Object} Secure fetch options
   */
  static getSecureFetchOptions(options = {}) {
    return {
      ...options,
      mode: 'cors',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: {
        ...options.headers,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    };
  }

  /**
   * Validate and sanitize external URL
   * @param {string} url - URL to validate
   * @returns {string|null} Sanitized URL or null if invalid
   */
  static sanitizeExternalURL(url) {
    try {
      const urlObj = new URL(url);
      
      // Only allow https and http
      if (!['https:', 'http:'].includes(urlObj.protocol)) {
        return null;
      }
      
      // Remove credentials
      urlObj.username = '';
      urlObj.password = '';
      
      // Remove dangerous characters
      const sanitized = urlObj.toString();
      if (sanitized.includes('<') || sanitized.includes('>')) {
        return null;
      }
      
      return sanitized;
    } catch (e) {
      return null;
    }
  }

  /**
   * Create CSP report handler
   * @param {Function} callback - Callback for CSP violations
   */
  static setupCSPReporting(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Callback must be a function');
    }
    
    document.addEventListener('securitypolicyviolation', (e) => {
      const violation = {
        blockedURI: e.blockedURI,
        columnNumber: e.columnNumber,
        disposition: e.disposition,
        documentURI: e.documentURI,
        effectiveDirective: e.effectiveDirective,
        lineNumber: e.lineNumber,
        originalPolicy: e.originalPolicy,
        referrer: e.referrer,
        sample: e.sample,
        sourceFile: e.sourceFile,
        statusCode: e.statusCode,
        violatedDirective: e.violatedDirective,
        timestamp: new Date().toISOString()
      };
      
      callback(violation);
    });
  }
}