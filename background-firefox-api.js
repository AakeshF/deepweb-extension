/**
 * Firefox Background Script with Refactored API Layer
 * Uses the new modular API client architecture
 */

import { ConfigManager, getConfig } from './src/config/index.js';
import ErrorHandler from './src/errors/index.js';
import { APIClient, LoggingInterceptor, CacheInterceptor } from './src/api/index.js';

// Initialize services
async function initialize() {
  try {
    // Initialize configuration
    await ConfigManager.initialize();
    console.log('[DeepWeb] Configuration initialized');
    
    // Setup API interceptors
    setupAPIInterceptors();
    
    // Setup error handling
    setupErrorHandling();
    
    console.log('[DeepWeb] Background script initialized');
  } catch (error) {
    console.error('[DeepWeb] Initialization failed:', error);
  }
}

// Setup API interceptors
function setupAPIInterceptors() {
  // Add logging interceptor
  const loggingInterceptor = new LoggingInterceptor({
    enabled: true,
    logLevel: 'info',
    maskSensitive: true
  });
  
  APIClient.addRequestInterceptor(loggingInterceptor.request.bind(loggingInterceptor));
  APIClient.addResponseInterceptor({
    response: loggingInterceptor.response.bind(loggingInterceptor),
    onStream: loggingInterceptor.onStream.bind(loggingInterceptor),
    onError: loggingInterceptor.onError.bind(loggingInterceptor)
  });
  
  // Add cache interceptor
  const cacheInterceptor = new CacheInterceptor({
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 50
  });
  
  APIClient.addRequestInterceptor(cacheInterceptor.request.bind(cacheInterceptor));
  APIClient.addResponseInterceptor({
    response: cacheInterceptor.response.bind(cacheInterceptor),
    onError: cacheInterceptor.onError.bind(cacheInterceptor)
  });
  
  // Periodic cache cleanup
  setInterval(() => {
    const pruned = cacheInterceptor.prune();
    if (pruned > 0) {
      console.log(`[DeepWeb] Pruned ${pruned} expired cache entries`);
    }
  }, 600000); // Every 10 minutes
}

// Setup error handling
function setupErrorHandling() {
  ErrorHandler.onError((error) => {
    // Send critical errors to popup
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
 * Handle chat request with new API client
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
    
    if (!apiKey) {
      throw new Error('API key not configured. Please set your DeepSeek API key in settings.');
    }
    
    // Get or create chat history
    let chatHistory = chatHistories.get(userId) || [];
    
    // Prepare context
    const context = message.context || {};
    const systemMessage = {
      role: 'system',
      content: `You are a helpful AI assistant integrated into a Firefox browser extension. The user is currently on: ${context.url || 'unknown page'}`
    };
    
    // Build messages array
    const messages = [systemMessage];
    
    // Add recent history
    const historyLimit = 10;
    const recentHistory = chatHistory.slice(-historyLimit);
    messages.push(...recentHistory);
    
    // Add current message
    messages.push({ 
      role: 'user', 
      content: message.message 
    });
    
    // Check if streaming is requested
    const useStreaming = message.stream && getConfig('features.streaming.enabled');
    
    if (useStreaming) {
      // Handle streaming response
      return await handleStreamingRequest({
        messages,
        apiKey,
        model: message.model || getConfig('defaults.model'),
        userId,
        tabId
      });
    } else {
      // Handle regular request
      const response = await APIClient.chat({
        messages,
        apiKey,
        model: message.model || getConfig('defaults.model'),
        provider: 'deepseek'
      });
      
      if (!response.choices || response.choices.length === 0) {
        throw new Error('No response generated');
      }
      
      const assistantMessage = response.choices[0].message.content;
      
      // Update chat history
      chatHistory.push(
        { role: 'user', content: message.message },
        { role: 'assistant', content: assistantMessage }
      );
      
      // Limit history size
      const maxHistory = getConfig('features.conversations.maxHistory');
      if (chatHistory.length > maxHistory * 2) {
        chatHistory = chatHistory.slice(-maxHistory * 2);
      }
      
      chatHistories.set(userId, chatHistory);
      
      return {
        content: assistantMessage,
        usage: response.usage,
        cost: response.cost,
        model: response.model,
        cached: response._cached || false
      };
    }
    
  } catch (error) {
    // Handle errors
    const result = ErrorHandler.handleError(error, {
      userId,
      tabId,
      action: 'chat_request'
    });
    
    return {
      error: result.userMessage,
      errorCode: result.error.code,
      suggestions: result.suggestions,
      recoverable: result.error.recoverable
    };
  }
}

/**
 * Handle streaming request
 * @private
 */
async function handleStreamingRequest({ messages, apiKey, model, userId, tabId }) {
  // Create a port for streaming
  const port = browser.tabs.connect(tabId, { name: 'deepweb-stream' });
  
  try {
    let fullContent = '';
    let totalUsage = null;
    let totalCost = 0;
    
    // Stream response
    const stream = APIClient.stream({
      messages,
      apiKey,
      model,
      provider: 'deepseek'
    });
    
    for await (const chunk of stream) {
      if (chunk.type === 'content') {
        fullContent += chunk.content;
        port.postMessage({
          type: 'stream_chunk',
          content: chunk.content
        });
      } else if (chunk.type === 'done') {
        totalUsage = chunk.usage;
        totalCost = chunk.cost;
      }
    }
    
    // Update chat history
    let chatHistory = chatHistories.get(userId) || [];
    chatHistory.push(
      { role: 'user', content: messages[messages.length - 1].content },
      { role: 'assistant', content: fullContent }
    );
    
    // Send completion message
    port.postMessage({
      type: 'stream_complete',
      usage: totalUsage,
      cost: totalCost
    });
    
    return {
      streaming: true,
      message: 'Stream started successfully'
    };
    
  } catch (error) {
    port.postMessage({
      type: 'stream_error',
      error: error.message
    });
    
    throw error;
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
  
  if (message.type === 'get_api_stats') {
    const providers = APIClient.listProviders();
    const stats = {
      providers,
      defaultProvider: 'deepseek',
      capabilities: providers[0]?.capabilities || {}
    };
    sendResponse(stats);
    return false;
  }
  
  if (message.type === 'estimate_cost') {
    try {
      const estimate = APIClient.estimateCost(
        message.messages,
        message.model,
        message.provider
      );
      sendResponse({ estimate });
    } catch (error) {
      sendResponse({ 
        error: error.message,
        estimate: { min: 0, max: 0, estimated: 0 }
      });
    }
    return false;
  }
  
  if (message.type === 'health_check') {
    APIClient.healthCheck(message.provider)
      .then(status => sendResponse({ status }))
      .catch(error => sendResponse({ 
        status: { 
          status: 'error', 
          error: error.message 
        } 
      }));
    return true;
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
  
  // Clean up old chat histories
  let cleaned = 0;
  for (const [userId, history] of chatHistories.entries()) {
    // Check if chat is stale (no recent activity)
    const lastActivity = userState.get(userId)?.lastRequest || 0;
    if (now - lastActivity > maxAge) {
      chatHistories.delete(userId);
      userState.delete(userId);
      cleaned++;
    }
  }
  
  if (cleaned > 0) {
    console.log(`[DeepWeb] Cleaned up ${cleaned} stale chat histories`);
  }
}, 3600000); // Every hour

// Initialize on startup
initialize();

console.log('[DeepWeb] Firefox background script loaded with refactored API layer');