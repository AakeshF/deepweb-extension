// Configuration file for DeepWeb Firefox Extension
const DEEPWEB_CONFIG = {
  // API Settings
  api: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    timeout: 30000, // 30 seconds
    maxRetries: 3
  },
  
  // Rate Limiting
  rateLimit: {
    minInterval: 10000, // 10 seconds between requests
    maxRequestsPerHour: 100
  },
  
  // UI Settings
  ui: {
    width: 380,
    maxHeight: 600,
    minHeight: 200,
    position: {
      bottom: 20,
      right: 20
    }
  },
  
  // Content Processing
  content: {
    previewLength: 500,
    maxContextLength: 2000,
    maxMessageLength: 1000
  },
  
  // Model Settings
  models: {
    'deepseek-chat': {
      name: 'DeepSeek Chat',
      description: 'General Purpose',
      maxTokens: 1000,
      temperature: 0.7,
      costPerThousandTokens: 0.00014
    },
    'deepseek-coder': {
      name: 'DeepSeek Coder',
      description: 'Programming',
      maxTokens: 1500,
      temperature: 0.3,
      costPerThousandTokens: 0.00014
    },
    'deepseek-reasoner': {
      name: 'DeepSeek Reasoner',
      description: 'Complex Analysis',
      maxTokens: 2000,
      temperature: 0.5,
      costPerThousandTokens: 0.00055
    }
  },
  
  // Security Settings
  security: {
    apiKeyMinLength: 20,
    apiKeyMaxLength: 200,
    allowedOrigins: ['https://api.deepseek.com'],
    maxStorageSize: 5 * 1024 * 1024 // 5MB
  },
  
  // Default Settings
  defaults: {
    model: 'deepseek-chat',
    theme: 'light',
    fontSize: 'medium',
    layout: 'corner',
    streamResponses: true,
    streamingEnabled: true
  }
};

// Validation functions
const DEEPWEB_VALIDATORS = {
  apiKey: (key) => {
    if (!key || typeof key !== 'string') return false;
    const trimmed = key.trim();
    return trimmed.length >= DEEPWEB_CONFIG.security.apiKeyMinLength && 
           trimmed.length <= DEEPWEB_CONFIG.security.apiKeyMaxLength &&
           /^[a-zA-Z0-9\-_]+$/.test(trimmed);
  },
  
  message: (msg) => {
    if (!msg || typeof msg !== 'string') return false;
    return msg.trim().length > 0 && msg.length <= DEEPWEB_CONFIG.content.maxMessageLength;
  },
  
  url: (url) => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DEEPWEB_CONFIG, DEEPWEB_VALIDATORS };
}