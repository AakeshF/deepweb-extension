/**
 * Security Error Class
 * Handles security-related errors and violations
 */

import { DeepWebError } from './DeepWebError.js';

export class SecurityError extends DeepWebError {
  constructor(message, violationType, attemptedAction, details = {}) {
    super(message, 'SECURITY_ERROR', 'critical', false, {
      violationType,
      attemptedAction,
      ...details
    });
    
    this.violationType = violationType;
    this.attemptedAction = attemptedAction;
  }

  getUserMessage() {
    const messages = {
      XSS_ATTEMPT: 'Security warning: Potentially unsafe content detected',
      INVALID_ORIGIN: 'Security warning: Request from unauthorized source',
      CSP_VIOLATION: 'Content security policy violation',
      INJECTION_ATTEMPT: 'Security warning: Code injection attempt blocked',
      UNAUTHORIZED_ACCESS: 'Access denied: Insufficient permissions',
      API_KEY_EXPOSED: 'Security warning: API key may be exposed'
    };
    
    return messages[this.violationType] || 'Security violation detected. Action blocked for safety.';
  }

  getRecoverySuggestions() {
    const suggestions = {
      XSS_ATTEMPT: [
        'Remove any HTML or script tags from your input',
        'Use plain text only',
        'Avoid copying content from untrusted sources'
      ],
      INVALID_ORIGIN: [
        'Ensure you\'re using the extension from a valid webpage',
        'Refresh the page and try again',
        'Check if the site is blocking extensions'
      ],
      API_KEY_EXPOSED: [
        'Never share your API key publicly',
        'Regenerate your API key immediately',
        'Check where you may have exposed the key'
      ]
    };
    
    return suggestions[this.violationType] || ['Contact support if you believe this is an error'];
  }

  shouldReport() {
    // Always report security errors
    return true;
  }

  getCategory() {
    return 'security';
  }
}

/**
 * Cross-Site Scripting (XSS) Error Class
 */
export class XSSError extends SecurityError {
  constructor(content, context) {
    super(
      'Cross-site scripting attempt detected',
      'XSS_ATTEMPT',
      'content_injection',
      { content: content.substring(0, 100), context }
    );
  }
}

/**
 * Content Security Policy Error Class
 */
export class CSPError extends SecurityError {
  constructor(directive, violatedDirective, blockedURI) {
    super(
      'Content Security Policy violation',
      'CSP_VIOLATION',
      'resource_load',
      { directive, violatedDirective, blockedURI }
    );
  }

  getUserMessage() {
    return 'A resource was blocked by security policy. Some features may not work correctly.';
  }
}

/**
 * API Key Security Error Class
 */
export class ApiKeySecurityError extends SecurityError {
  constructor(reason, context) {
    super(
      'API key security violation',
      'API_KEY_EXPOSED',
      'api_key_usage',
      { reason, context }
    );
  }

  getRecoverySuggestions() {
    return [
      'Generate a new API key immediately',
      'Never include API keys in messages or URLs',
      'Use the secure settings page to manage your API key',
      'Enable two-factor authentication on your DeepSeek account'
    ];
  }
}