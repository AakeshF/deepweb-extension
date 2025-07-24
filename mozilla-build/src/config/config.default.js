/**
 * Default Configuration
 * Complete default settings for the extension
 */

export const DEFAULT_CONFIG = {
  version: '1.0.0',
  
  api: {
    providers: {
      deepseek: {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        models: {
          'deepseek-chat': {
            name: 'DeepSeek Chat',
            description: 'General purpose conversations',
            maxTokens: 4000,
            temperature: 0.7,
            pricing: {
              input: 0.0001,  // per 1K tokens
              output: 0.0002   // per 1K tokens
            }
          },
          'deepseek-coder': {
            name: 'DeepSeek Coder',
            description: 'Programming and code analysis',
            maxTokens: 8000,
            temperature: 0.3,
            pricing: {
              input: 0.0001,
              output: 0.0002
            }
          },
          'deepseek-reasoner': {
            name: 'DeepSeek Reasoner',
            description: 'Complex reasoning and analysis',
            maxTokens: 4000,
            temperature: 0.5,
            pricing: {
              input: 0.0005,
              output: 0.001
            }
          }
        }
      }
    },
    timeout: 30000,      // 30 seconds
    retries: {
      max: 3,
      delay: 1000,       // Initial delay
      backoff: 2         // Exponential backoff multiplier
    },
    rateLimit: {
      interval: 10000,   // 10 seconds between requests
      maxPerHour: 100,
      maxPerDay: 1000
    }
  },
  
  ui: {
    themes: {
      light: {
        name: 'Light',
        colors: {
          primary: '#667eea',
          secondary: '#764ba2',
          background: '#ffffff',
          surface: '#f8f9fa',
          text: {
            primary: '#333333',
            secondary: '#666666',
            disabled: '#999999'
          },
          border: '#e0e0e0',
          error: '#c62828',
          warning: '#f57c00',
          success: '#2e7d32',
          info: '#1976d2'
        }
      },
      dark: {
        name: 'Dark',
        colors: {
          primary: '#818cf8',
          secondary: '#a78bfa',
          background: '#1a1a1a',
          surface: '#2d2d2d',
          text: {
            primary: '#ffffff',
            secondary: '#b3b3b3',
            disabled: '#666666'
          },
          border: '#404040',
          error: '#ef4444',
          warning: '#f59e0b',
          success: '#10b981',
          info: '#3b82f6'
        }
      }
    },
    layouts: {
      corner: {
        position: 'bottom-right',
        offset: { x: 20, y: 20 },
        width: 380,
        maxWidth: 'calc(100vw - 40px)',
        maxHeight: 600
      },
      sidebar: {
        side: 'right',
        width: 400,
        height: '100%'
      },
      floating: {
        draggable: true,
        resizable: true,
        minWidth: 300,
        minHeight: 400,
        defaultWidth: 380,
        defaultHeight: 600
      }
    },
    animations: {
      enabled: true,
      duration: 200,
      easing: 'ease-out'
    },
    fontSize: {
      small: 12,
      medium: 14,
      large: 16
    }
  },
  
  security: {
    apiKeyValidation: {
      minLength: 20,
      maxLength: 200,
      pattern: '^sk-[a-zA-Z0-9]+$',
      required: true
    },
    contentSecurity: {
      maxInputLength: 1000,
      maxContextLength: 2000,
      sanitizeHtml: true,
      allowedTags: []
    },
    rateLimiting: {
      enabled: true,
      strictMode: false,
      penalties: {
        warning: 3,      // Warnings before block
        blockDuration: 3600000  // 1 hour block
      }
    }
  },
  
  features: {
    streaming: {
      enabled: true,
      chunkSize: 1024,
      bufferSize: 4096
    },
    conversations: {
      maxHistory: 100,
      autoSave: true,
      syncAcrossTabs: true,
      persistence: 'indexedDB'
    },
    export: {
      formats: ['json', 'markdown', 'html', 'csv', 'pdf'],
      includeMetadata: true,
      compression: true
    },
    contextExtraction: {
      enabled: true,
      smartMode: true,
      maxLength: 2000,
      includeMetadata: true
    },
    templates: {
      enabled: true,
      allowCustom: true,
      maxCustomTemplates: 50
    }
  },
  
  content: {
    previewLength: 500,
    maxMessageLength: 1000,
    maxContextLength: 2000,
    truncateIndicator: '...',
    messageFormatting: {
      markdown: true,
      syntaxHighlighting: true,
      mathRendering: false
    }
  },
  
  storage: {
    quotaWarningThreshold: 0.8,  // Warn at 80% usage
    autoCleanup: {
      enabled: true,
      maxAge: 2592000000,  // 30 days in milliseconds
      maxConversations: 1000
    }
  },
  
  telemetry: {
    enabled: false,
    anonymous: true,
    events: ['errors', 'performance']
  },
  
  defaults: {
    model: 'deepseek-chat',
    theme: 'light',
    layout: 'corner',
    language: 'en',
    shortcuts: {
      toggle: 'Ctrl+Shift+Y',
      newChat: 'Ctrl+Shift+N',
      clearChat: 'Ctrl+Shift+C'
    }
  },
  
  experimental: {
    voiceInput: false,
    voiceOutput: false,
    autoSuggest: false,
    smartReplies: false
  }
};