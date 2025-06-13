/**
 * Firefox Background Script with Unified Configuration
 * Handles API requests, context menus, and extension functionality
 */

import { ConfigManager, getConfig } from './src/config/index.js';

// Initialize configuration on startup
ConfigManager.initialize().then(() => {
  console.log('[DeepWeb] Configuration initialized');
}).catch(error => {
  console.error('[DeepWeb] Configuration initialization failed:', error);
});

// Storage for chat histories and state
const chatHistories = new Map();
const userState = new Map();

/**
 * Validate API key
 * @param {string} apiKey - API key to validate
 * @returns {boolean} - Whether the API key is valid
 */
function validateApiKey(apiKey) {
  if (!apiKey) return false;
  
  const validation = getConfig('security.apiKeyValidation');
  const pattern = new RegExp(validation.pattern);
  
  return apiKey.length >= validation.minLength && 
         apiKey.length <= validation.maxLength &&
         pattern.test(apiKey);
}

/**
 * Sanitize message content
 * @param {string} message - Message to sanitize
 * @returns {string} - Sanitized message
 */
function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return '';
  
  const security = getConfig('security.contentSecurity');
  let sanitized = message.trim();
  
  if (security.sanitizeHtml) {
    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }
  
  // Limit length
  if (sanitized.length > security.maxInputLength) {
    sanitized = sanitized.substring(0, security.maxInputLength);
  }
  
  return sanitized;
}

/**
 * Check rate limit for user
 * @param {string} userId - User/tab ID
 * @returns {Object} - Rate limit status
 */
function checkRateLimit(userId) {
  const rateLimit = getConfig('api.rateLimit');
  const now = Date.now();
  const state = userState.get(userId) || { lastRequest: 0, requestCount: 0, hourlyReset: now };
  
  // Check interval limit
  if (now - state.lastRequest < rateLimit.interval) {
    return {
      allowed: false,
      waitTime: rateLimit.interval - (now - state.lastRequest),
      reason: 'Too many requests. Please wait before sending another message.'
    };
  }
  
  // Check hourly limit
  if (now - state.hourlyReset > 3600000) {
    // Reset hourly counter
    state.requestCount = 0;
    state.hourlyReset = now;
  }
  
  if (state.requestCount >= rateLimit.maxPerHour) {
    return {
      allowed: false,
      waitTime: 3600000 - (now - state.hourlyReset),
      reason: 'Hourly limit reached. Please try again later.'
    };
  }
  
  return { allowed: true };
}

/**
 * Update rate limit state
 * @param {string} userId - User/tab ID
 */
function updateRateLimit(userId) {
  const now = Date.now();
  const state = userState.get(userId) || { lastRequest: 0, requestCount: 0, hourlyReset: now };
  
  state.lastRequest = now;
  state.requestCount++;
  userState.set(userId, state);
}

/**
 * Calculate API cost
 * @param {Object} usage - Token usage information
 * @param {string} model - Model used
 * @returns {number} - Cost in dollars
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
 * Make API request to DeepSeek
 * @param {Object} params - Request parameters
 * @returns {Promise<Object>} - API response
 */
async function makeAPIRequest({ messages, apiKey, model = 'deepseek-chat', stream = false }) {
  const provider = getConfig('api.providers.deepseek');
  const modelConfig = provider.models[model] || provider.models['deepseek-chat'];
  const retryConfig = getConfig('api.retries');
  
  let lastError = null;
  
  for (let attempt = 0; attempt <= retryConfig.max; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getConfig('api.timeout'));
      
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
        const error = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Calculate cost
      if (data.usage) {
        data.cost = calculateCost(data.usage, model);
      }
      
      return data;
      
    } catch (error) {
      lastError = error;
      console.error(`[DeepWeb] API request attempt ${attempt + 1} failed:`, error);
      
      if (attempt < retryConfig.max) {
        // Exponential backoff
        const delay = retryConfig.delay * Math.pow(retryConfig.backoff, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('API request failed after all retries');
}

/**
 * Handle chat request from content script
 * @param {Object} message - Message from content script
 * @param {Object} sender - Sender information
 * @returns {Promise<Object>} - Response
 */
async function handleChatRequest(message, sender) {
  const tabId = sender.tab?.id || 'unknown';
  const userId = `tab-${tabId}`;
  
  try {
    // Get API key
    const { apiKey } = await browser.storage.local.get('apiKey');
    if (!apiKey) {
      return { error: 'Please set your DeepSeek API key in the extension settings.' };
    }
    
    if (!validateApiKey(apiKey)) {
      return { error: 'Invalid API key format. Please check your settings.' };
    }
    
    // Check rate limit
    const rateLimitStatus = checkRateLimit(userId);
    if (!rateLimitStatus.allowed) {
      return { 
        error: rateLimitStatus.reason,
        retryAfter: rateLimitStatus.waitTime
      };
    }
    
    // Sanitize and validate message
    const userMessage = sanitizeMessage(message.message);
    if (!userMessage) {
      return { error: 'Message cannot be empty.' };
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
      model: message.model || getConfig('defaults.model'),
      stream: getConfig('features.streaming.enabled')
    });
    
    if (!response.choices || response.choices.length === 0) {
      throw new Error('No response generated');
    }
    
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
    
    // Update rate limit
    updateRateLimit(userId);
    
    return {
      content: assistantMessage,
      usage: response.usage,
      cost: response.cost,
      model: response.model
    };
    
  } catch (error) {
    console.error('[DeepWeb] Chat request error:', error);
    
    // Provide user-friendly error messages
    if (error.message.includes('401')) {
      return { error: 'Invalid API key. Please check your settings.' };
    } else if (error.message.includes('429')) {
      return { error: 'API rate limit exceeded. Please try again later.' };
    } else if (error.message.includes('AbortError')) {
      return { error: 'Request timed out. Please try again.' };
    } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
      return { error: 'Network error. Please check your connection.' };
    }
    
    return { error: error.message || 'An unexpected error occurred.' };
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
        sendResponse({ error: 'Failed to process request' });
      });
    return true; // Will respond asynchronously
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
}, 3600000); // Run every hour

// Listen for configuration changes
ConfigManager.onChange('api', (newValue, oldValue) => {
  console.log('[DeepWeb] API configuration changed');
});

ConfigManager.onChange('security', (newValue, oldValue) => {
  console.log('[DeepWeb] Security configuration changed');
});

console.log('[DeepWeb] Firefox background script loaded with unified configuration');