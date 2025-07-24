/**
 * Security Manager
 * Central security module that coordinates all security features
 */

import { DOMSecurity } from './DOMSecurity.js';
import { SecureMarkdownRenderer } from './SecureMarkdownRenderer.js';
import { APIKeySecurity } from './APIKeySecurity.js';
import { CSPConfig } from './CSPConfig.js';

export class SecurityManager {
  constructor() {
    this.domSecurity = DOMSecurity;
    this.markdownRenderer = new SecureMarkdownRenderer();
    this.apiKeySecurity = new APIKeySecurity();
    this.cspConfig = CSPConfig;
    
    // Initialize security features
    this.initialize();
  }

  /**
   * Initialize security features
   */
  async initialize() {
    // Apply CSP
    this.cspConfig.applyCSP();
    
    // Setup CSP violation reporting
    this.cspConfig.setupCSPReporting((violation) => {
      console.error('CSP Violation:', violation);
      // Could send to monitoring service
    });
    
    // Initialize API key security
    await this.apiKeySecurity.initializeSalt();
    
    // Migrate old unencrypted keys
    await this.apiKeySecurity.migrateUnencryptedKeys();
    
    // Setup secure event listeners
    this.setupSecureListeners();
  }

  /**
   * Setup secure event listeners
   */
  setupSecureListeners() {
    // Prevent right-click on sensitive elements
    document.addEventListener('contextmenu', (e) => {
      if (e.target.matches('[data-sensitive]')) {
        e.preventDefault();
      }
    });
    
    // Prevent text selection on sensitive elements
    document.addEventListener('selectstart', (e) => {
      if (e.target.matches('[data-sensitive]')) {
        e.preventDefault();
      }
    });
  }

  /**
   * Sanitize user input
   * @param {string} input - User input
   * @param {Object} options - Sanitization options
   * @returns {string} Sanitized input
   */
  sanitizeInput(input, options = {}) {
    if (typeof input !== 'string') {
      return '';
    }
    
    let sanitized = input;
    
    // Remove HTML tags by default
    if (options.allowHTML !== true) {
      sanitized = this.domSecurity.escapeHTML(sanitized);
    } else {
      // If HTML is allowed, sanitize it
      sanitized = this.domSecurity.sanitizeHTML(sanitized);
    }
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Apply length limit
    if (options.maxLength && sanitized.length > options.maxLength) {
      sanitized = sanitized.substring(0, options.maxLength);
    }
    
    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');
    
    // Additional filters based on input type
    if (options.type === 'email') {
      sanitized = this.sanitizeEmail(sanitized);
    } else if (options.type === 'url') {
      sanitized = this.sanitizeURL(sanitized);
    } else if (options.type === 'alphanumeric') {
      sanitized = sanitized.replace(/[^a-zA-Z0-9]/g, '');
    }
    
    return sanitized;
  }

  /**
   * Sanitize email input
   * @param {string} email - Email input
   * @returns {string} Sanitized email
   */
  sanitizeEmail(email) {
    // Basic email sanitization
    return email.toLowerCase()
      .replace(/[^a-z0-9@._+-]/g, '')
      .substring(0, 254); // Max email length
  }

  /**
   * Sanitize URL input
   * @param {string} url - URL input
   * @returns {string} Sanitized URL
   */
  sanitizeURL(url) {
    return this.cspConfig.sanitizeExternalURL(url) || '';
  }

  /**
   * Validate request parameters
   * @param {Object} params - Request parameters
   * @returns {boolean} Whether parameters are valid
   */
  validateRequestParams(params) {
    // Check for required fields
    if (!params || typeof params !== 'object') {
      return false;
    }
    
    // Validate specific parameters
    if (params.message !== undefined) {
      if (typeof params.message !== 'string' || params.message.length > 10000) {
        return false;
      }
    }
    
    if (params.model !== undefined) {
      const allowedModels = ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'];
      if (!allowedModels.includes(params.model)) {
        return false;
      }
    }
    
    if (params.conversationId !== undefined) {
      if (typeof params.conversationId !== 'string' || 
          !/^[a-zA-Z0-9_-]+$/.test(params.conversationId)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create secure storage key
   * @param {string} key - Storage key
   * @returns {string} Secure storage key
   */
  createStorageKey(key) {
    // Prefix keys to avoid conflicts
    return `deepweb_${key}`;
  }

  /**
   * Secure storage set
   * @param {string} key - Storage key
   * @param {any} value - Value to store
   * @returns {Promise<void>}
   */
  async secureStorageSet(key, value) {
    const secureKey = this.createStorageKey(key);
    
    // Encrypt sensitive data
    if (this.isSensitiveKey(key)) {
      const encrypted = await this.encryptData(JSON.stringify(value));
      await browser.storage.local.set({ [secureKey]: encrypted });
    } else {
      await browser.storage.local.set({ [secureKey]: value });
    }
  }

  /**
   * Secure storage get
   * @param {string} key - Storage key
   * @returns {Promise<any>} Stored value
   */
  async secureStorageGet(key) {
    const secureKey = this.createStorageKey(key);
    const result = await browser.storage.local.get(secureKey);
    
    if (!result[secureKey]) {
      return null;
    }
    
    // Decrypt sensitive data
    if (this.isSensitiveKey(key)) {
      const decrypted = await this.decryptData(result[secureKey]);
      return JSON.parse(decrypted);
    }
    
    return result[secureKey];
  }

  /**
   * Check if key contains sensitive data
   * @param {string} key - Storage key
   * @returns {boolean} Whether key is sensitive
   */
  isSensitiveKey(key) {
    const sensitiveKeys = [
      'apikey', 'password', 'token', 'secret',
      'credential', 'auth', 'private'
    ];
    
    const lowerKey = key.toLowerCase();
    return sensitiveKeys.some(sensitive => lowerKey.includes(sensitive));
  }

  /**
   * Encrypt data
   * @param {string} data - Data to encrypt
   * @returns {Promise<string>} Encrypted data
   */
  async encryptData(data) {
    // Use the same encryption as API keys
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    
    const key = await this.apiKeySecurity.deriveKey(this.apiKeySecurity.salt);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      dataBuffer
    );
    
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode.apply(null, combined));
  }

  /**
   * Decrypt data
   * @param {string} encryptedData - Encrypted data
   * @returns {Promise<string>} Decrypted data
   */
  async decryptData(encryptedData) {
    const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const encrypted = combined.slice(12);
    
    const key = await this.apiKeySecurity.deriveKey(this.apiKeySecurity.salt);
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      encrypted
    );
    
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  }

  /**
   * Generate secure random ID
   * @param {string} prefix - ID prefix
   * @returns {string} Secure ID
   */
  generateSecureId(prefix = 'id') {
    return this.domSecurity.generateId(prefix);
  }

  /**
   * Validate file upload
   * @param {File} file - File to validate
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validateFileUpload(file, options = {}) {
    const result = {
      valid: true,
      errors: []
    };
    
    // Check file size
    const maxSize = options.maxSize || 10 * 1024 * 1024; // 10MB default
    if (file.size > maxSize) {
      result.valid = false;
      result.errors.push(`File size exceeds limit of ${maxSize} bytes`);
    }
    
    // Check file type
    if (options.allowedTypes) {
      const fileType = file.type.toLowerCase();
      if (!options.allowedTypes.includes(fileType)) {
        result.valid = false;
        result.errors.push(`File type ${fileType} not allowed`);
      }
    }
    
    // Check file extension
    if (options.allowedExtensions) {
      const extension = file.name.split('.').pop().toLowerCase();
      if (!options.allowedExtensions.includes(extension)) {
        result.valid = false;
        result.errors.push(`File extension .${extension} not allowed`);
      }
    }
    
    // Check filename
    if (!/^[\w\-. ]+$/.test(file.name)) {
      result.valid = false;
      result.errors.push('Filename contains invalid characters');
    }
    
    return result;
  }

  /**
   * Create secure headers for requests
   * @param {Object} headers - Initial headers
   * @returns {Object} Secure headers
   */
  createSecureHeaders(headers = {}) {
    return {
      ...headers,
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'no-referrer',
      'X-Request-ID': this.generateSecureId('req')
    };
  }

  /**
   * Log security event
   * @param {string} type - Event type
   * @param {Object} details - Event details
   */
  logSecurityEvent(type, details) {
    const event = {
      type,
      details,
      timestamp: new Date().toISOString(),
      id: this.generateSecureId('event')
    };
    
    // Store in local log (could be sent to monitoring service)
    console.log('[Security Event]', event);
  }
}