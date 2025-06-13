/**
 * Error Message Templates
 * User-friendly error messages with recovery actions
 */

export const ERROR_MESSAGES = {
  // API Errors
  API_UNAUTHORIZED: {
    title: 'Authentication Failed',
    message: 'Your API key is invalid or has expired.',
    icon: '🔐',
    actions: [
      { text: 'Open Settings', action: 'openSettings' },
      { text: 'Get API Key', action: 'openApiKeyPage' }
    ]
  },
  
  API_RATE_LIMITED: {
    title: 'Rate Limit Exceeded',
    message: 'You\'ve made too many requests. Please wait a moment.',
    icon: '⏱️',
    actions: [
      { text: 'Try Again', action: 'retry', delay: 10000 }
    ]
  },
  
  API_SERVER_ERROR: {
    title: 'Server Error',
    message: 'The AI service is experiencing issues. Please try again later.',
    icon: '🚧',
    actions: [
      { text: 'Check Status', action: 'checkStatus' },
      { text: 'Try Again', action: 'retry' }
    ]
  },
  
  // Network Errors
  NETWORK_ERROR: {
    title: 'Connection Failed',
    message: 'Unable to connect to the server. Check your internet connection.',
    icon: '📡',
    actions: [
      { text: 'Retry', action: 'retry' },
      { text: 'Troubleshoot', action: 'troubleshoot' }
    ]
  },
  
  REQUEST_TIMEOUT: {
    title: 'Request Timed Out',
    message: 'The server took too long to respond. Try again with a shorter message.',
    icon: '⏰',
    actions: [
      { text: 'Try Again', action: 'retry' },
      { text: 'Reduce Message', action: 'reduceMessage' }
    ]
  },
  
  // Validation Errors
  VALIDATION_ERROR: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
    icon: '⚠️',
    actions: [
      { text: 'Fix Input', action: 'focusInput' }
    ]
  },
  
  MESSAGE_TOO_LONG: {
    title: 'Message Too Long',
    message: 'Your message exceeds the maximum length.',
    icon: '📏',
    actions: [
      { text: 'Shorten Message', action: 'focusInput' },
      { text: 'Split Message', action: 'splitMessage' }
    ]
  },
  
  // UI Errors
  RENDER_ERROR: {
    title: 'Display Error',
    message: 'Failed to display the interface correctly.',
    icon: '🖼️',
    actions: [
      { text: 'Reload', action: 'reload' },
      { text: 'Report Issue', action: 'reportIssue' }
    ]
  },
  
  COMPONENT_ERROR: {
    title: 'Component Error',
    message: 'A part of the interface failed to load.',
    icon: '🔧',
    actions: [
      { text: 'Try Again', action: 'retry' },
      { text: 'Refresh Page', action: 'refreshPage' }
    ]
  },
  
  // Security Errors
  SECURITY_ERROR: {
    title: 'Security Warning',
    message: 'A security issue was detected and blocked.',
    icon: '🛡️',
    actions: [
      { text: 'Learn More', action: 'learnMore' }
    ]
  },
  
  XSS_ATTEMPT: {
    title: 'Unsafe Content Blocked',
    message: 'Potentially harmful content was detected and removed.',
    icon: '🚫',
    actions: [
      { text: 'Use Plain Text', action: 'usePlainText' }
    ]
  },
  
  // Storage Errors
  STORAGE_QUOTA_EXCEEDED: {
    title: 'Storage Full',
    message: 'The extension has run out of storage space.',
    icon: '💾',
    actions: [
      { text: 'Clear Old Data', action: 'clearOldData' },
      { text: 'Export & Clear', action: 'exportAndClear' }
    ]
  },
  
  // Configuration Errors
  CONFIGURATION_ERROR: {
    title: 'Configuration Error',
    message: 'There\'s a problem with your settings.',
    icon: '⚙️',
    actions: [
      { text: 'Reset Settings', action: 'resetSettings' },
      { text: 'Contact Support', action: 'contactSupport' }
    ]
  },
  
  // Generic Errors
  UNKNOWN_ERROR: {
    title: 'Unexpected Error',
    message: 'Something went wrong. Please try again.',
    icon: '❌',
    actions: [
      { text: 'Try Again', action: 'retry' },
      { text: 'Report Issue', action: 'reportIssue' }
    ]
  }
};

/**
 * Get error message template
 * @param {string} errorCode - Error code
 * @returns {Object} Error message template
 */
export function getErrorMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR;
}

/**
 * Format error for display
 * @param {Error} error - Error object
 * @returns {Object} Formatted error
 */
export function formatErrorForDisplay(error) {
  const template = getErrorMessage(error.code);
  
  return {
    ...template,
    details: error.getUserMessage(),
    suggestions: error.getRecoverySuggestions(),
    severity: error.severity,
    timestamp: error.timestamp
  };
}

/**
 * Create error notification HTML
 * @param {Error} error - Error object
 * @returns {string} HTML string
 */
export function createErrorNotificationHTML(error) {
  const formatted = formatErrorForDisplay(error);
  
  return `
    <div class="deepweb-error-notification deepweb-error-${error.severity}">
      <div class="deepweb-error-header">
        <span class="deepweb-error-icon">${formatted.icon}</span>
        <span class="deepweb-error-title">${formatted.title}</span>
      </div>
      <div class="deepweb-error-body">
        <p class="deepweb-error-message">${formatted.details}</p>
        ${formatted.suggestions.length > 0 ? `
          <ul class="deepweb-error-suggestions">
            ${formatted.suggestions.map(s => `<li>${s}</li>`).join('')}
          </ul>
        ` : ''}
      </div>
      <div class="deepweb-error-actions">
        ${formatted.actions.map(action => `
          <button class="deepweb-error-action" data-action="${action.action}">
            ${action.text}
          </button>
        `).join('')}
      </div>
    </div>
  `;
}