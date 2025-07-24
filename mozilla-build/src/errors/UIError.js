/**
 * UI Error Class
 * Handles user interface and component errors
 */

import { DeepWebError } from './DeepWebError.js';

export class UIError extends DeepWebError {
  constructor(message, component, action, originalError = null) {
    super(message, 'UI_ERROR', 'medium', true, {
      component,
      action,
      originalError: originalError?.message
    });
    
    this.component = component;
    this.action = action;
    this.originalError = originalError;
  }

  getUserMessage() {
    const messages = {
      'ChatContainer:render': 'Failed to load chat interface',
      'MessageList:addMessage': 'Failed to display message',
      'InputArea:send': 'Failed to send message',
      'Template:load': 'Failed to load interface template',
      'Component:initialize': 'Failed to initialize component'
    };
    
    const key = `${this.component}:${this.action}`;
    return messages[key] || 'An interface error occurred. Please refresh the page.';
  }

  getRecoverySuggestions() {
    return [
      'Refresh the page to reload the interface',
      'Clear your browser cache',
      'Disable other extensions that might conflict',
      'Report the issue if it persists'
    ];
  }

  getCategory() {
    return 'ui';
  }
}

/**
 * Render Error Class
 */
export class RenderError extends UIError {
  constructor(component, message = 'Failed to render component', originalError = null) {
    super(message, component, 'render', originalError);
    
    this.code = 'RENDER_ERROR';
    this.severity = 'high';
  }

  getUserMessage() {
    return `Failed to display ${this.component}. The interface may not work correctly.`;
  }
}

/**
 * Component Lifecycle Error Class
 */
export class ComponentError extends UIError {
  constructor(component, lifecycle, message, originalError = null) {
    super(message, component, lifecycle, originalError);
    
    this.code = 'COMPONENT_ERROR';
    this.severity = lifecycle === 'mount' ? 'high' : 'medium';
  }

  getUserMessage() {
    const messages = {
      mount: `Failed to load ${this.component}`,
      update: `Failed to update ${this.component}`,
      unmount: `Failed to cleanup ${this.component}`
    };
    
    return messages[this.action] || super.getUserMessage();
  }
}

/**
 * Template Error Class
 */
export class TemplateError extends UIError {
  constructor(templateName, message = 'Failed to load template', originalError = null) {
    super(message, 'TemplateLoader', `load:${templateName}`, originalError);
    
    this.code = 'TEMPLATE_ERROR';
    this.templateName = templateName;
    this.severity = 'high';
  }

  getUserMessage() {
    return 'Failed to load interface elements. Please refresh the page.';
  }

  getRecoverySuggestions() {
    return [
      'Refresh the page',
      'Check if the extension was updated correctly',
      'Reinstall the extension if needed'
    ];
  }
}