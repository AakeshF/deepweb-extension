/**
 * Configuration Schema
 * Defines the structure and validation rules for configuration
 */

export const CONFIG_SCHEMA = {
  version: {
    type: 'string',
    required: true,
    pattern: /^\d+\.\d+\.\d+$/
  },
  
  api: {
    type: 'object',
    required: true,
    properties: {
      providers: {
        type: 'object',
        required: true,
        properties: {
          deepseek: {
            type: 'object',
            required: true,
            properties: {
              endpoint: {
                type: 'string',
                required: true,
                pattern: /^https?:\/\/.+$/
              },
              models: {
                type: 'object',
                required: true,
                additionalProperties: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', required: true },
                    description: { type: 'string', required: true },
                    maxTokens: { type: 'number', min: 1, max: 32000 },
                    temperature: { type: 'number', min: 0, max: 2 },
                    pricing: {
                      type: 'object',
                      properties: {
                        input: { type: 'number', min: 0 },
                        output: { type: 'number', min: 0 }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      },
      timeout: {
        type: 'number',
        required: true,
        min: 5000,
        max: 300000
      },
      retries: {
        type: 'object',
        properties: {
          max: { type: 'number', min: 0, max: 10 },
          delay: { type: 'number', min: 100, max: 10000 },
          backoff: { type: 'number', min: 1, max: 5 }
        }
      },
      rateLimit: {
        type: 'object',
        properties: {
          interval: { type: 'number', min: 0 },
          maxPerHour: { type: 'number', min: 1 },
          maxPerDay: { type: 'number', min: 1 }
        }
      }
    }
  },
  
  ui: {
    type: 'object',
    properties: {
      themes: {
        type: 'object',
        additionalProperties: {
          type: 'object',
          properties: {
            name: { type: 'string', required: true },
            colors: {
              type: 'object',
              required: true,
              properties: {
                primary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                secondary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                background: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                surface: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                text: {
                  type: 'object',
                  properties: {
                    primary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                    secondary: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                    disabled: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ }
                  }
                },
                border: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                error: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                warning: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                success: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ },
                info: { type: 'string', pattern: /^#[0-9a-fA-F]{6}$/ }
              }
            }
          }
        }
      },
      layouts: {
        type: 'object',
        additionalProperties: {
          type: 'object'
        }
      },
      animations: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          duration: { type: 'number', min: 0, max: 1000 },
          easing: { type: 'string', enum: ['linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out'] }
        }
      },
      fontSize: {
        type: 'object',
        properties: {
          small: { type: 'number', min: 10, max: 16 },
          medium: { type: 'number', min: 12, max: 20 },
          large: { type: 'number', min: 14, max: 24 }
        }
      }
    }
  },
  
  security: {
    type: 'object',
    properties: {
      apiKeyValidation: {
        type: 'object',
        properties: {
          minLength: { type: 'number', min: 1 },
          maxLength: { type: 'number', min: 1 },
          pattern: { type: 'string' },
          required: { type: 'boolean' }
        }
      },
      contentSecurity: {
        type: 'object',
        properties: {
          maxInputLength: { type: 'number', min: 1 },
          maxContextLength: { type: 'number', min: 1 },
          sanitizeHtml: { type: 'boolean' },
          allowedTags: { type: 'array', items: { type: 'string' } }
        }
      },
      rateLimiting: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          strictMode: { type: 'boolean' },
          penalties: {
            type: 'object',
            properties: {
              warning: { type: 'number', min: 1 },
              blockDuration: { type: 'number', min: 0 }
            }
          }
        }
      }
    }
  },
  
  features: {
    type: 'object',
    properties: {
      streaming: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          chunkSize: { type: 'number', min: 128, max: 8192 },
          bufferSize: { type: 'number', min: 1024, max: 32768 }
        }
      },
      conversations: {
        type: 'object',
        properties: {
          maxHistory: { type: 'number', min: 1, max: 10000 },
          autoSave: { type: 'boolean' },
          syncAcrossTabs: { type: 'boolean' },
          persistence: { type: 'string', enum: ['memory', 'localStorage', 'indexedDB'] }
        }
      },
      export: {
        type: 'object',
        properties: {
          formats: { type: 'array', items: { type: 'string' } },
          includeMetadata: { type: 'boolean' },
          compression: { type: 'boolean' }
        }
      },
      contextExtraction: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          smartMode: { type: 'boolean' },
          maxLength: { type: 'number', min: 100, max: 10000 },
          includeMetadata: { type: 'boolean' }
        }
      },
      templates: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          allowCustom: { type: 'boolean' },
          maxCustomTemplates: { type: 'number', min: 0, max: 1000 }
        }
      }
    }
  },
  
  content: {
    type: 'object',
    properties: {
      previewLength: { type: 'number', min: 50, max: 2000 },
      maxMessageLength: { type: 'number', min: 1, max: 10000 },
      maxContextLength: { type: 'number', min: 100, max: 20000 },
      truncateIndicator: { type: 'string' },
      messageFormatting: {
        type: 'object',
        properties: {
          markdown: { type: 'boolean' },
          syntaxHighlighting: { type: 'boolean' },
          mathRendering: { type: 'boolean' }
        }
      }
    }
  },
  
  storage: {
    type: 'object',
    properties: {
      quotaWarningThreshold: { type: 'number', min: 0, max: 1 },
      autoCleanup: {
        type: 'object',
        properties: {
          enabled: { type: 'boolean' },
          maxAge: { type: 'number', min: 0 },
          maxConversations: { type: 'number', min: 1 }
        }
      }
    }
  },
  
  telemetry: {
    type: 'object',
    properties: {
      enabled: { type: 'boolean' },
      anonymous: { type: 'boolean' },
      events: { type: 'array', items: { type: 'string' } }
    }
  },
  
  defaults: {
    type: 'object',
    properties: {
      model: { type: 'string' },
      theme: { type: 'string' },
      layout: { type: 'string' },
      language: { type: 'string' },
      shortcuts: {
        type: 'object',
        additionalProperties: { type: 'string' }
      }
    }
  },
  
  experimental: {
    type: 'object',
    additionalProperties: { type: 'boolean' }
  }
};