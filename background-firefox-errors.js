/**
 * Firefox Background Script with Error Handling
 * Comprehensive error handling implementation
 */

import { ConfigManager, getConfig } from './src/config/index.js';
import ErrorHandler, { 
  ApiError, 
  NetworkError, 
  TimeoutError, 
  ValidationError,
  SecurityError,
  ApiKeySecurityError 
} from './src/errors/index.js';

// Initialize configuration and error handling
Promise.all([
  ConfigManager.initialize(),
  setupErrorHandling()
]).then(() => {
  console.log('[DeepWeb] Background script initialized');
}).catch(error => {
  console.error('[DeepWeb] Initialization failed:', error);
});

// Setup error handling
async function setupErrorHandling() {
  // Subscribe to errors
  ErrorHandler.onError((error) => {
    console.log('[DeepWeb] Error logged:', error.code, error.severity);
    
    // Send critical errors to popup for user notification
    if (error.severity === 'critical' || error.severity === 'high') {
      browser.runtime.sendMessage({
        type: 'error_notification',
        error: error.toJSON()
      }).catch(() => {
        // Popup might not be open
      });
    }
  });
}

// Storage for chat histories and state
const chatHistories = new Map();
const userState = new Map();

/**
 * Validate API key with proper error handling
 * @param {string} apiKey - API key to validate
 * @throws {ValidationError} If API key is invalid
 */
function validateApiKey(apiKey) {
  if (!apiKey) {
    throw new ValidationError(
      'API key is required',
      'apiKey',
      '',
      { required: true }
    );
  }
  
  const validation = getConfig('security.apiKeyValidation');
  const pattern = new RegExp(validation.pattern);
  
  if (apiKey.length < validation.minLength || apiKey.length > validation.maxLength) {
    throw new ValidationError(
      'API key length is invalid',
      'apiKey',
      apiKey,
      { 
        minLength: validation.minLength,
        maxLength: validation.maxLength 
      }
    );
  }
  
  if (!pattern.test(apiKey)) {
    throw new ValidationError(
      'API key format is invalid',
      'apiKey',
      apiKey,
      { pattern: validation.pattern }
    );
  }
  
  // Check for exposed API key patterns
  if (apiKey.includes(' ') || apiKey.includes('\n')) {
    throw new ApiKeySecurityError(
      'API key contains invalid characters',
      'validation'
    );
  }
}

/**
 * Sanitize message content with error handling
 * @param {string} message - Message to sanitize
 * @returns {string} Sanitized message
 * @throws {ValidationError} If message is invalid
 */
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') {
    throw new ValidationError(
      'Message must be a non-empty string',
      'message',
      message,
      { required: true, type: 'string' }
    );
  }
  
  const security = getConfig('security.contentSecurity');
  let sanitized = message.trim();
  
  // Check for potential security issues
  if (/<script|<iframe|javascript:|data:/i.test(sanitized)) {
    throw new SecurityError(
      'Message contains potentially unsafe content',
      'XSS_ATTEMPT',
      'message_sanitization',
      { content: sanitized.substring(0, 100) }
    );
  }
  
  if (security.sanitizeHtml) {
    // Remove HTML tags
    const originalLength = sanitized.length;
    sanitized = sanitized.replace(/<[^>]*>/g, '');
    
    if (originalLength !== sanitized.length) {
      console.warn('[DeepWeb] HTML tags removed from message');
    }
  }
  
  // Check length
  if (sanitized.length > security.maxInputLength) {
    throw new ValidationError(
      'Message exceeds maximum length',
      'message',
      sanitized,
      { maxLength: security.maxInputLength }
    );
  }
  
  if (sanitized.length === 0) {
    throw new ValidationError(
      'Message cannot be empty after sanitization',
      'message',
      message,
      { required: true }
    );
  }
  
  return sanitized;
}

/**
 * Check rate limit with detailed error information
 * @param {string} userId - User/tab ID
 * @throws {ApiError} If rate limited
 */
function checkRateLimit(userId) {
  const rateLimit = getConfig('api.rateLimit');
  const now = Date.now();
  const state = userState.get(userId) || { 
    lastRequest: 0, 
    requestCount: 0, 
    hourlyReset: now,
    violations: 0 
  };
  
  // Check interval limit
  const timeSinceLastRequest = now - state.lastRequest;
  if (timeSinceLastRequest < rateLimit.interval) {
    state.violations++;
    userState.set(userId, state);
    
    const error = new ApiError(
      'Too many requests. Please wait before sending another message.',
      429,
      {
        retryAfter: Math.ceil((rateLimit.interval - timeSinceLastRequest) / 1000),
        violations: state.violations
      }
    );
    
    throw error;
  }
  
  // Check hourly limit
  if (now - state.hourlyReset > 3600000) {
    // Reset hourly counter
    state.requestCount = 0;
    state.hourlyReset = now;
    state.violations = 0;
  }
  
  if (state.requestCount >= rateLimit.maxPerHour) {
    const error = new ApiError(
      'Hourly request limit exceeded',
      429,
      {
        retryAfter: Math.ceil((3600000 - (now - state.hourlyReset)) / 1000),
        limit: rateLimit.maxPerHour,
        reset: new Date(state.hourlyReset + 3600000).toISOString()
      }
    );
    
    throw error;
  }
}

/**
 * Make API request with comprehensive error handling
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} API response
 * @throws {ApiError|NetworkError|TimeoutError} On request failure
 */
async function makeAPIRequest({ messages, apiKey, model = 'deepseek-chat', stream = false }) {
  const provider = getConfig('api.providers.deepseek');
  const modelConfig = provider.models[model];
  
  if (!modelConfig) {
    throw new ValidationError(
      'Invalid model selected',
      'model',
      model,
      { validModels: Object.keys(provider.models) }
    );
  }
  
  const retryConfig = getConfig('api.retries');
  let lastError = null;
  
  for (let attempt = 0; attempt <= retryConfig.max; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(), 
        getConfig('api.timeout')
      );
      
      const response = await fetch(provider.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          temperature: modelConfig.temperature,
          max_tokens: modelConfig.maxTokens,
          stream: stream
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (!response.ok) {
        const responseData = await response.json().catch(() => ({}));
        throw new ApiError(
          responseData.error?.message || `API error: ${response.status}`,
          response.status,
          {
            ...responseData,
            endpoint: provider.endpoint,
            model: model
          }
        );
      }
      
      const data = await response.json();
      
      // Validate response
      if (!data.choices || data.choices.length === 0) {
        throw new ApiError(
          'No response generated',
          500,
          { response: data }
        );
      }
      
      // Calculate cost
      if (data.usage) {
        data.cost = calculateCost(data.usage, model);
      }
      
      return data;
      
    } catch (error) {
      lastError = error;
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        lastError = new TimeoutError(
          'Request timed out',
          getConfig('api.timeout')
        );
      } else if (error instanceof TypeError && error.message.includes('fetch')) {
        lastError = new NetworkError(
          'Network request failed',
          error
        );
      } else if (!(error instanceof ApiError)) {
        // Wrap unknown errors
        lastError = new ApiError(
          error.message || 'Unknown API error',
          0,
          { originalError: error.toString() }
        );
      }
      
      console.error(`[DeepWeb] API request attempt ${attempt + 1} failed:`, lastError);
      
      // Check if we should retry
      if (attempt < retryConfig.max && lastError.recoverable) {
        const delay = retryConfig.delay * Math.pow(retryConfig.backoff, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        break;
      }
    }
  }
  
  throw lastError;
}

/**
 * Calculate API cost
 * @param {Object} usage - Token usage information
 * @param {string} model - Model used
 * @returns {number} Cost in dollars
 */
function calculateCost(usage, model) {
  if (!usage || !usage.total_tokens) return 0;
  
  const modelConfig = getConfig(`api.providers.deepseek.models.${model}`);
  if (!modelConfig || !modelConfig.pricing) return 0;
  
  const inputCost = (usage.prompt_tokens / 1000) * modelConfig.pricing.input;
  const outputCost = (usage.completion_tokens / 1000) * modelConfig.pricing.output;
  
  return inputCost + outputCost;
}

/**
 * Handle chat request with comprehensive error handling
 * @param {Object} message - Message from content script
 * @param {Object} sender - Sender information
 * @returns {Promise<Object>} Response
 */
async function handleChatRequest(message, sender) {
  const tabId = sender.tab?.id || 'unknown';
  const userId = `tab-${tabId}`;
  
  try {
    // Get API key
    const { apiKey } = await browser.storage.local.get('apiKey');
    
    // Validate API key
    validateApiKey(apiKey);
    
    // Check rate limit
    checkRateLimit(userId);
    
    // Sanitize and validate message
    const userMessage = sanitizeMessage(message.message);
    
    // Validate model
    const model = message.model || getConfig('defaults.model');
    if (!getConfig(`api.providers.deepseek.models.${model}`)) {
      throw new ValidationError(
        'Invalid model selected',
        'model',
        model
      );
    }
    
    // Get or create chat history
    let chatHistory = chatHistories.get(userId) || [];
    
    // Prepare context
    const context = message.context || {};
    const contextMessage = `You are a helpful AI assistant integrated into a Firefox browser extension. The user is currently on: ${context.url || 'unknown page'}`;
    
    // Build messages array
    const messages = [
      { role: 'system', content: contextMessage }
    ];
    
    // Add chat history (limit to last 10 messages for context)
    const historyLimit = 10;
    const recentHistory = chatHistory.slice(-historyLimit);
    messages.push(...recentHistory);
    
    // Add current message
    messages.push({ role: 'user', content: userMessage });
    
    // Make API request
    const response = await makeAPIRequest({
      messages,
      apiKey,
      model,
      stream: getConfig('features.streaming.enabled')
    });
    
    const assistantMessage = response.choices[0].message.content;
    
    // Update chat history
    chatHistory.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: assistantMessage }
    );
    
    // Limit history size
    const maxHistory = getConfig('features.conversations.maxHistory');
    if (chatHistory.length > maxHistory * 2) {
      chatHistory = chatHistory.slice(-maxHistory * 2);
    }
    
    chatHistories.set(userId, chatHistory);
    
    // Update rate limit state
    const state = userState.get(userId) || { 
      lastRequest: 0, 
      requestCount: 0, 
      hourlyReset: Date.now() 
    };
    state.lastRequest = Date.now();
    state.requestCount++;
    userState.set(userId, state);
    
    return {
      content: assistantMessage,
      usage: response.usage,
      cost: response.cost,
      model: response.model
    };
    
  } catch (error) {
    // Handle errors through ErrorHandler
    const result = ErrorHandler.handleError(error, {
      userId,
      tabId,
      action: 'chat_request'
    });
    
    return {
      error: result.userMessage,
      errorCode: result.error.code,
      suggestions: result.suggestions,
      recoverable: result.error.recoverable,
      retryAfter: error.responseData?.retryAfter
    };
  }
}

// Message handler
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('[DeepWeb] Received message:', message.type);
  
  if (message.type === 'chat_request') {
    handleChatRequest(message, sender)
      .then(sendResponse)
      .catch(error => {
        console.error('[DeepWeb] Message handler error:', error);
        sendResponse({ 
          error: 'Failed to process request',
          errorCode: 'HANDLER_ERROR'
        });
      });
    return true; // Will respond asynchronously
  }
  
  if (message.type === 'get_error_log') {
    const log = ErrorHandler.getErrorLog(message.filters || {});
    sendResponse({ log });
    return false;
  }
  
  if (message.type === 'clear_error_log') {
    ErrorHandler.clearLog();
    sendResponse({ success: true });
    return false;
  }
  
  return false;
});

// Browser action handler
browser.browserAction.onClicked.addListener((tab) => {
  console.log('[DeepWeb] Browser action clicked');
  browser.tabs.sendMessage(tab.id, { type: 'toggle_chat' })
    .catch(error => {
      console.log('[DeepWeb] Could not send message to tab:', error);
    });
});

// Context menu setup
browser.contextMenus.create({
  id: 'deepweb-ask',
  title: 'Ask DeepWeb AI about "%s"',
  contexts: ['selection']
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'deepweb-ask' && info.selectionText) {
    browser.tabs.sendMessage(tab.id, {
      type: 'process_selection',
      text: info.selectionText
    }).catch(error => {
      console.log('[DeepWeb] Could not send selection to tab:', error);
    });
  }
});

// Command handler
browser.commands.onCommand.addListener((command) => {
  console.log('[DeepWeb] Command received:', command);
  
  if (command === 'toggle-chat') {
    browser.tabs.query({ active: true, currentWindow: true })
      .then(tabs => {
        if (tabs[0]) {
          return browser.tabs.sendMessage(tabs[0].id, { type: 'toggle_chat' });
        }
      })
      .catch(error => {
        console.log('[DeepWeb] Command error:', error);
      });
  }
});

// Clean up old data periodically
setInterval(() => {
  const maxAge = getConfig('storage.autoCleanup.maxAge');
  const now = Date.now();
  
  // Clean up old user states
  for (const [userId, state] of userState.entries()) {
    if (now - state.lastRequest > maxAge) {
      userState.delete(userId);
      chatHistories.delete(userId);
    }
  }
  
  // Clean up old error logs
  const oldErrors = ErrorHandler.getErrorLog({
    since: new Date(now - maxAge).toISOString()
  });
  
  if (oldErrors.length === 0) {
    ErrorHandler.clearLog();
  }
}, 3600000); // Run every hour

console.log('[DeepWeb] Firefox background script loaded with error handling');