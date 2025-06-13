/**
 * API Client
 * Main interface for API interactions with provider abstraction
 */

import DeepSeekProvider from './providers/DeepSeekProvider.js';
import { ApiError, ValidationError } from '../errors/index.js';
import { getConfig } from '../config/index.js';

class APIClient {
  constructor() {
    this.providers = new Map();
    this.defaultProvider = 'deepseek';
    this.interceptors = {
      request: [],
      response: []
    };
    
    // Initialize providers
    this.initializeProviders();
  }

  /**
   * Initialize API providers
   * @private
   */
  initializeProviders() {
    // Add DeepSeek provider
    this.addProvider('deepseek', new DeepSeekProvider());
    
    // Future providers can be added here
    // this.addProvider('openai', new OpenAIProvider());
    // this.addProvider('anthropic', new AnthropicProvider());
  }

  /**
   * Add a provider
   * @param {string} name - Provider name
   * @param {BaseProvider} provider - Provider instance
   */
  addProvider(name, provider) {
    this.providers.set(name, provider);
  }

  /**
   * Get provider by name
   * @param {string} name - Provider name
   * @returns {BaseProvider} Provider instance
   * @throws {ValidationError} If provider not found
   */
  getProvider(name = this.defaultProvider) {
    const provider = this.providers.get(name);
    
    if (!provider) {
      throw new ValidationError(
        'Invalid provider specified',
        'provider',
        name,
        { validProviders: Array.from(this.providers.keys()) }
      );
    }
    
    return provider;
  }

  /**
   * Send chat request
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} Response
   */
  async chat({ messages, apiKey, model, provider, ...options }) {
    // Get provider
    const apiProvider = this.getProvider(provider);
    
    // Validate API key
    if (!apiProvider.validateApiKey(apiKey)) {
      throw new ValidationError(
        'Invalid API key format',
        'apiKey',
        apiKey?.substring(0, 10) + '...'
      );
    }
    
    // Apply request interceptors
    let processedRequest = { messages, apiKey, model, ...options };
    for (const interceptor of this.interceptors.request) {
      processedRequest = await interceptor(processedRequest);
    }
    
    try {
      // Make request
      const response = await apiProvider.chat(
        processedRequest.messages,
        {
          apiKey: processedRequest.apiKey,
          model: processedRequest.model,
          ...processedRequest
        }
      );
      
      // Apply response interceptors
      let processedResponse = response;
      for (const interceptor of this.interceptors.response) {
        processedResponse = await interceptor(processedResponse, processedRequest);
      }
      
      return processedResponse;
      
    } catch (error) {
      // Allow interceptors to handle errors
      for (const interceptor of this.interceptors.response) {
        if (interceptor.onError) {
          const handled = await interceptor.onError(error, processedRequest);
          if (handled) return handled;
        }
      }
      
      throw error;
    }
  }

  /**
   * Send streaming chat request
   * @param {Object} params - Request parameters
   * @returns {AsyncGenerator} Response stream
   */
  async *stream({ messages, apiKey, model, provider, ...options }) {
    // Get provider
    const apiProvider = this.getProvider(provider);
    
    // Validate API key
    if (!apiProvider.validateApiKey(apiKey)) {
      throw new ValidationError(
        'Invalid API key format',
        'apiKey',
        apiKey?.substring(0, 10) + '...'
      );
    }
    
    // Check if provider supports streaming
    const capabilities = apiProvider.getCapabilities();
    if (!capabilities.streaming) {
      throw new ApiError(
        'Provider does not support streaming',
        501,
        { provider, capabilities }
      );
    }
    
    // Apply request interceptors
    let processedRequest = { messages, apiKey, model, ...options };
    for (const interceptor of this.interceptors.request) {
      processedRequest = await interceptor(processedRequest);
    }
    
    try {
      // Stream response
      const stream = apiProvider.stream(
        processedRequest.messages,
        {
          apiKey: processedRequest.apiKey,
          model: processedRequest.model,
          ...processedRequest
        }
      );
      
      // Process stream with interceptors
      for await (const chunk of stream) {
        let processedChunk = chunk;
        
        for (const interceptor of this.interceptors.response) {
          if (interceptor.onStream) {
            processedChunk = await interceptor.onStream(processedChunk, processedRequest);
          }
        }
        
        yield processedChunk;
      }
      
    } catch (error) {
      // Allow interceptors to handle errors
      for (const interceptor of this.interceptors.response) {
        if (interceptor.onError) {
          const handled = await interceptor.onError(error, processedRequest);
          if (handled) yield handled;
        }
      }
      
      throw error;
    }
  }

  /**
   * Add request interceptor
   * @param {Function} interceptor - Interceptor function
   * @returns {Function} Remove function
   */
  addRequestInterceptor(interceptor) {
    this.interceptors.request.push(interceptor);
    
    return () => {
      const index = this.interceptors.request.indexOf(interceptor);
      if (index !== -1) {
        this.interceptors.request.splice(index, 1);
      }
    };
  }

  /**
   * Add response interceptor
   * @param {Function|Object} interceptor - Interceptor function or object
   * @returns {Function} Remove function
   */
  addResponseInterceptor(interceptor) {
    this.interceptors.response.push(interceptor);
    
    return () => {
      const index = this.interceptors.response.indexOf(interceptor);
      if (index !== -1) {
        this.interceptors.response.splice(index, 1);
      }
    };
  }

  /**
   * Validate API key
   * @param {string} apiKey - API key
   * @param {string} provider - Provider name
   * @returns {boolean} Is valid
   */
  validateApiKey(apiKey, provider = this.defaultProvider) {
    const apiProvider = this.getProvider(provider);
    return apiProvider.validateApiKey(apiKey);
  }

  /**
   * Calculate cost
   * @param {Object} usage - Token usage
   * @param {string} model - Model used
   * @param {string} provider - Provider name
   * @returns {number} Cost in dollars
   */
  calculateCost(usage, model, provider = this.defaultProvider) {
    const apiProvider = this.getProvider(provider);
    return apiProvider.calculateCost(usage, model);
  }

  /**
   * Estimate cost
   * @param {Array} messages - Messages
   * @param {string} model - Model to use
   * @param {string} provider - Provider name
   * @returns {Object} Cost estimate
   */
  estimateCost(messages, model, provider = this.defaultProvider) {
    const apiProvider = this.getProvider(provider);
    
    if (apiProvider.estimateCost) {
      return apiProvider.estimateCost(messages, model);
    }
    
    // Default estimation
    return {
      min: 0,
      max: 0.10,
      estimated: 0.01
    };
  }

  /**
   * List available providers
   * @returns {Array} Provider list
   */
  listProviders() {
    return Array.from(this.providers.entries()).map(([name, provider]) => ({
      name,
      capabilities: provider.getCapabilities(),
      models: provider.listModels ? provider.listModels() : []
    }));
  }

  /**
   * List available models
   * @param {string} provider - Provider name
   * @returns {Array} Model list
   */
  listModels(provider = this.defaultProvider) {
    const apiProvider = this.getProvider(provider);
    
    if (apiProvider.listModels) {
      return apiProvider.listModels();
    }
    
    const capabilities = apiProvider.getCapabilities();
    return capabilities.models || [];
  }

  /**
   * Get model info
   * @param {string} model - Model ID
   * @param {string} provider - Provider name
   * @returns {Object|null} Model info
   */
  getModelInfo(model, provider = this.defaultProvider) {
    const apiProvider = this.getProvider(provider);
    
    if (apiProvider.getModelInfo) {
      return apiProvider.getModelInfo(model);
    }
    
    return null;
  }

  /**
   * Health check
   * @param {string} provider - Provider name
   * @returns {Promise<Object>} Health status
   */
  async healthCheck(provider = this.defaultProvider) {
    const apiProvider = this.getProvider(provider);
    
    try {
      const isHealthy = await apiProvider.healthCheck();
      
      return {
        provider,
        status: isHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        provider,
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Cancel all requests
   * @param {string} provider - Provider name (optional)
   */
  cancelAllRequests(provider) {
    if (provider) {
      const apiProvider = this.providers.get(provider);
      if (apiProvider) {
        apiProvider.cancelAllRequests();
      }
    } else {
      // Cancel all providers
      for (const apiProvider of this.providers.values()) {
        apiProvider.cancelAllRequests();
      }
    }
  }
}

// Export singleton instance
export default new APIClient();