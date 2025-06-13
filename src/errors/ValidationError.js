/**
 * Validation Error Class
 * Handles input validation and configuration errors
 */

import { DeepWebError } from './DeepWebError.js';

export class ValidationError extends DeepWebError {
  constructor(message, field, value, constraints = {}) {
    super(message, 'VALIDATION_ERROR', 'low', true, {
      field,
      value,
      constraints
    });
    
    this.field = field;
    this.value = value;
    this.constraints = constraints;
  }

  getUserMessage() {
    const fieldMessages = {
      apiKey: 'Invalid API key format',
      message: 'Invalid message',
      url: 'Invalid URL',
      model: 'Invalid model selection',
      timeout: 'Invalid timeout value',
      maxTokens: 'Invalid max tokens value'
    };
    
    const baseMessage = fieldMessages[this.field] || 'Invalid input';
    
    // Add constraint-specific messages
    if (this.constraints.minLength && this.value.length < this.constraints.minLength) {
      return `${baseMessage}. Must be at least ${this.constraints.minLength} characters.`;
    }
    
    if (this.constraints.maxLength && this.value.length > this.constraints.maxLength) {
      return `${baseMessage}. Must be no more than ${this.constraints.maxLength} characters.`;
    }
    
    if (this.constraints.pattern && !new RegExp(this.constraints.pattern).test(this.value)) {
      return `${baseMessage}. Invalid format.`;
    }
    
    if (this.constraints.min !== undefined && this.value < this.constraints.min) {
      return `${baseMessage}. Must be at least ${this.constraints.min}.`;
    }
    
    if (this.constraints.max !== undefined && this.value > this.constraints.max) {
      return `${baseMessage}. Must be no more than ${this.constraints.max}.`;
    }
    
    return baseMessage;
  }

  getRecoverySuggestions() {
    const suggestions = [];
    
    if (this.field === 'apiKey') {
      suggestions.push(
        'API key should start with "sk-"',
        'Check for extra spaces or special characters',
        'Ensure you copied the complete API key'
      );
    } else if (this.field === 'message') {
      if (this.constraints.maxLength) {
        suggestions.push(`Keep your message under ${this.constraints.maxLength} characters`);
      }
      suggestions.push('Remove any special formatting or HTML');
    } else if (this.field === 'url') {
      suggestions.push(
        'URL should start with http:// or https://',
        'Check for typos in the domain name'
      );
    }
    
    return suggestions.length > 0 ? suggestions : ['Please check your input and try again'];
  }

  getCategory() {
    return 'validation';
  }
}

/**
 * Configuration Error Class
 */
export class ConfigurationError extends ValidationError {
  constructor(message, configPath, value, expectedType) {
    super(message, configPath, value, { expectedType });
    
    this.code = 'CONFIGURATION_ERROR';
    this.severity = 'medium';
  }

  getUserMessage() {
    return `Configuration error: ${this.field} has invalid value. Expected ${this.constraints.expectedType}.`;
  }

  getRecoverySuggestions() {
    return [
      'Reset settings to defaults in the extension options',
      'Check if the configuration file was modified',
      'Reinstall the extension if the issue persists'
    ];
  }
}

/**
 * Input Sanitization Error Class
 */
export class SanitizationError extends ValidationError {
  constructor(message, field, originalValue, sanitizedValue) {
    super(message, field, originalValue, {
      sanitizedValue,
      removed: originalValue.length - sanitizedValue.length
    });
    
    this.code = 'SANITIZATION_ERROR';
    this.severity = 'low';
  }

  getUserMessage() {
    return 'Your input contained potentially unsafe content that was removed.';
  }

  getRecoverySuggestions() {
    return [
      'Avoid using HTML tags or scripts in your messages',
      'Use plain text for best results',
      'Special characters may be removed for security'
    ];
  }
}