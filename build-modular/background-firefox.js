// Firefox Background Script for DeepWeb Extension
// Uses browser namespace and Manifest V2 compatible APIs

console.log('[DeepWeb Background] Starting Firefox version...');

// Load configuration
const CONFIG = {
  api: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    timeout: 30000
  },
  rateLimit: {
    minInterval: 10000 // 10 seconds
  },
  content: {
    previewLength: 500,
    maxMessageLength: 1000
  }
};

// Enhanced rate limiter with request tracking
const rateLimiter = {
  requests: [],
  
  canMakeRequest() {
    const now = Date.now();
    // Clean old requests (older than 1 hour)
    this.requests = this.requests.filter(time => now - time < 3600000);
    
    // Check rate limit
    const recentRequest = this.requests.find(time => now - time < CONFIG.rateLimit.minInterval);
    if (recentRequest) {
      return false;
    }
    
    // Add this request
    this.requests.push(now);
    return true;
  },
  
  getTimeUntilNextRequest() {
    const now = Date.now();
    const lastRequest = Math.max(...this.requests, 0);
    const timePassed = now - lastRequest;
    const timeRemaining = CONFIG.rateLimit.minInterval - timePassed;
    return Math.max(0, Math.ceil(timeRemaining / 1000));
  }
};

// Validation functions
function validateApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  // DeepSeek API keys are typically 51 characters starting with 'sk-'
  return trimmed.length >= 20 && 
         trimmed.length <= 200 &&
         /^sk-[a-zA-Z0-9]+$/.test(trimmed);
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return '';
  // Remove any potential script tags or HTML
  return message.replace(/<[^>]*>/g, '').trim();
}

// Handle messages from content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[DeepWeb Background] Received message:', request.type);
  
  if (request.type === 'chat_request') {
    // Handle async properly in Firefox
    handleChatRequest(request, sender).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  return false;
});

async function handleChatRequest(request, sender) {
  try {
    console.log('[DeepWeb Background] Processing chat request...');
    
    // Check rate limit
    if (!rateLimiter.canMakeRequest()) {
      const waitTime = rateLimiter.getTimeUntilNextRequest();
      return { 
        error: `Rate limit exceeded. Please wait ${waitTime} seconds before making another request.` 
      };
    }
    
    // Validate and sanitize request
    if (!request.message || typeof request.message !== 'string') {
      return { error: 'Invalid message format' };
    }
    
    const sanitizedMessage = sanitizeMessage(request.message);
    if (!sanitizedMessage) {
      return { error: 'Message cannot be empty' };
    }
    
    if (sanitizedMessage.length > CONFIG.content.maxMessageLength) {
      return { error: `Message too long (max ${CONFIG.content.maxMessageLength} characters)` };
    }
    
    // Get and validate API key
    const settings = await browser.storage.sync.get(['apiKeys']);
    const apiKey = settings.apiKeys?.deepseek;
    
    if (!apiKey) {
      return { 
        error: 'API key not configured. Please set up your DeepSeek API key in the extension settings.' 
      };
    }
    
    // Validate API key format
    if (!validateApiKey(apiKey)) {
      return {
        error: 'Invalid API key format. Please check your DeepSeek API key.'
      };
    }
    
    // Use the selected model
    const model = request.model || 'deepseek-chat';
    console.log('[DeepWeb Background] Using model:', model);
    
    // Prepare context
    const context = {
      url: request.context?.url || '',
      title: request.context?.title || '',
      content: (request.context?.content || '').substring(0, 500)
    };
    
    // Make API request
    console.log('[DeepWeb Background] Making API request...');
    const response = await makeAPIRequest({
      apiKey,
      message: sanitizedMessage,
      context,
      model
    });
    
    console.log('[DeepWeb Background] API response received');
    
    return {
      success: true,
      content: response.content,
      cost: response.cost || 0
    };
    
  } catch (error) {
    console.error('[DeepWeb Background] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process request'
    };
  }
}

async function makeAPIRequest({ apiKey, message, context, model }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.api.timeout);
  
  try {
    console.log('[DeepWeb Background] Sending to DeepSeek API...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful AI assistant integrated into Firefox. Help users understand and interact with web pages. Provide clear, concise answers.'
          },
          {
            role: 'user',
            content: `Page URL: ${context.url}
Page Title: ${context.title}
Page Content Preview: ${context.content}

User Question: ${message}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
        stream: false
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepWeb Background] API error response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      } catch {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log('[DeepWeb Background] API success');
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }
    
    // Calculate rough cost
    const tokens = data.usage?.total_tokens || 1000;
    let costPerToken = 0.00014; // Default DeepSeek Chat pricing
    
    if (model === 'deepseek-reasoner') {
      costPerToken = 0.00055;
    }
    
    const cost = (tokens / 1000) * costPerToken;
    
    return {
      content: data.choices[0].message.content,
      cost: cost
    };
    
  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds');
    }
    
    throw error;
  }
}

// Browser action click handler (Firefox uses browserAction)
browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { type: 'toggle_chat' });
});

// Context menu
browser.contextMenus.create({
  id: "ask-deepweb",
  title: "Ask DeepWeb AI about '%s'",
  contexts: ["selection"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ask-deepweb" && info.selectionText) {
    browser.tabs.sendMessage(tab.id, {
      type: "process_selection",
      text: info.selectionText
    });
  }
});

// Commands
browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-chat") {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id, { type: 'toggle_chat' });
      }
    });
  }
});

// Installation handler
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[DeepWeb] Extension installed successfully');
    // Open welcome page or settings
    browser.runtime.openOptionsPage();
  }
});

// Cleanup on unload
browser.runtime.onSuspend.addListener(() => {
  console.log('[DeepWeb Background] Cleaning up resources...');
  // Clear any pending timers or requests
  rateLimiter.requests = [];
});

console.log('[DeepWeb Background] Firefox background script ready');