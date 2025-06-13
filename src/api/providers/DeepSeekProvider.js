/**
 * DeepSeek API Provider
 * Implements DeepSeek-specific API functionality
 */

import BaseProvider from './BaseProvider.js';
import { ApiError, ValidationError } from '../../errors/index.js';
import { getConfig } from '../../config/index.js';

export default class DeepSeekProvider extends BaseProvider {
  constructor() {
    const config = getConfig('api.providers.deepseek');
    super(config);
    
    this.models = config.models;
    this.endpoint = config.endpoint;
  }

  /**
   * Send chat completion request
   * @param {Array} messages - Chat messages
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Response
   */
  async chat(messages, options = {}) {
    const model = options.model || getConfig('defaults.model');
    
    // Validate model
    if (!this.models[model]) {
      throw new ValidationError(
        'Invalid model specified',
        'model',
        model,
        { validModels: Object.keys(this.models) }
      );
    }
    
    const modelConfig = this.models[model];
    
    // Prepare request body
    const requestBody = {
      model: model,
      messages: this.prepareMessages(messages),
      temperature: options.temperature ?? modelConfig.temperature,
      max_tokens: options.maxTokens ?? modelConfig.maxTokens,
      top_p: options.topP ?? 0.95,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream: false
    };
    
    // Make request
    const response = await this.makeRequest(this.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${options.apiKey}`,
        'X-Request-ID': this.generateRequestId()
      },
      body: JSON.stringify(requestBody)
    });
    
    // Parse response
    const data = await this.parseResponse(response);
    
    // Add cost calculation
    if (data.usage) {
      data.cost = this.calculateCost(data.usage, model);
    }
    
    return data;
  }

  /**
   * Send streaming chat completion request
   * @param {Array} messages - Chat messages
   * @param {Object} options - Request options
   * @returns {AsyncGenerator} Response stream
   */
  async *stream(messages, options = {}) {
    const model = options.model || getConfig('defaults.model');
    const requestId = this.generateRequestId();
    
    // Validate model
    if (!this.models[model]) {
      throw new ValidationError(
        'Invalid model specified',
        'model',
        model,
        { validModels: Object.keys(this.models) }
      );
    }
    
    const modelConfig = this.models[model];
    
    // Prepare request body
    const requestBody = {
      model: model,
      messages: this.prepareMessages(messages),
      temperature: options.temperature ?? modelConfig.temperature,
      max_tokens: options.maxTokens ?? modelConfig.maxTokens,
      top_p: options.topP ?? 0.95,
      frequency_penalty: options.frequencyPenalty ?? 0,
      presence_penalty: options.presencePenalty ?? 0,
      stream: true
    };
    
    // Create abort controller for cancellation
    const controller = new AbortController();
    this.activeRequests.set(requestId, controller);
    
    let response;
    let reader;
    
    try {
      // Make streaming request
      response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${options.apiKey}`,
          'X-Request-ID': requestId,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.error?.message || `API error: ${response.status}`,
          response.status,
          errorData
        );
      }
      
      // Initialize stream reader
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let totalUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
      let accumulatedContent = '';
      let reconnectAttempts = 0;
      const maxReconnectAttempts = 3;
      
      // Process stream
      while (true) {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            // Stream ended unexpectedly
            if (accumulatedContent && !totalUsage.total_tokens) {
              // Try to reconnect if we haven't received usage data
              if (reconnectAttempts < maxReconnectAttempts) {
                reconnectAttempts++;
                yield {
                  type: 'reconnecting',
                  attempt: reconnectAttempts
                };
                
                // Wait before reconnecting
                await this.delay(1000 * reconnectAttempts);
                
                // Attempt reconnection
                const reconnectResponse = await this.reconnectStream(
                  requestBody, 
                  options.apiKey, 
                  requestId,
                  accumulatedContent
                );
                
                if (reconnectResponse) {
                  response = reconnectResponse;
                  reader = response.body.getReader();
                  continue;
                }
              }
            }
            break;
          }
          
          // Decode chunk
          buffer += decoder.decode(value, { stream: true });
          
          // Process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            // Skip empty lines
            if (!trimmedLine) continue;
            
            // Process SSE data
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6).trim();
              
              // Check for stream completion
              if (data === '[DONE]') {
                yield {
                  type: 'done',
                  usage: totalUsage,
                  cost: this.calculateCost(totalUsage, model),
                  content: accumulatedContent
                };
                return;
              }
              
              // Parse JSON data
              try {
                const parsed = JSON.parse(data);
                
                // Handle content delta
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  accumulatedContent += content;
                  
                  yield {
                    type: 'content',
                    content: content,
                    accumulated: accumulatedContent
                  };
                }
                
                // Handle finish reason
                if (parsed.choices?.[0]?.finish_reason) {
                  yield {
                    type: 'finish',
                    reason: parsed.choices[0].finish_reason
                  };
                }
                
                // Update usage data
                if (parsed.usage) {
                  totalUsage = parsed.usage;
                }
                
                // Handle errors in stream
                if (parsed.error) {
                  throw new ApiError(
                    parsed.error.message || 'Stream error',
                    parsed.error.code || 500,
                    parsed.error
                  );
                }
                
              } catch (e) {
                if (e instanceof ApiError) {
                  throw e;
                }
                
                // Log parsing errors but continue stream
                console.warn('[DeepSeekProvider] Failed to parse stream data:', {
                  error: e.message,
                  data: data.substring(0, 100)
                });
                
                // Yield error event but continue
                yield {
                  type: 'error',
                  error: 'Failed to parse stream data',
                  recoverable: true
                };
              }
            } else if (trimmedLine.startsWith('event: ')) {
              // Handle SSE events
              const event = trimmedLine.slice(7).trim();
              yield {
                type: 'event',
                event: event
              };
            } else if (trimmedLine.startsWith('retry: ')) {
              // Handle SSE retry directive
              const retryMs = parseInt(trimmedLine.slice(7).trim(), 10);
              if (!isNaN(retryMs)) {
                yield {
                  type: 'retry',
                  delay: retryMs
                };
              }
            }
          }
          
          // Reset reconnect counter on successful data
          if (accumulatedContent.length > 0) {
            reconnectAttempts = 0;
          }
          
        } catch (error) {
          if (error.name === 'AbortError') {
            yield {
              type: 'cancelled',
              content: accumulatedContent
            };
            return;
          }
          
          // Network error - attempt reconnection
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            yield {
              type: 'error',
              error: error.message,
              recoverable: true,
              reconnecting: true,
              attempt: reconnectAttempts
            };
            
            await this.delay(1000 * reconnectAttempts);
            continue;
          }
          
          // Unrecoverable error
          throw error;
        }
      }
      
      // Handle incomplete stream
      if (accumulatedContent && !totalUsage.total_tokens) {
        // Estimate tokens for incomplete response
        const estimatedTokens = Math.ceil(accumulatedContent.length / 4);
        totalUsage = {
          prompt_tokens: estimatedTokens,
          completion_tokens: estimatedTokens,
          total_tokens: estimatedTokens * 2
        };
      }
      
      // Final yield if stream ended without [DONE]
      if (accumulatedContent) {
        yield {
          type: 'done',
          usage: totalUsage,
          cost: this.calculateCost(totalUsage, model),
          content: accumulatedContent,
          incomplete: true
        };
      }
      
    } catch (error) {
      // Cleanup on error
      this.activeRequests.delete(requestId);
      
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        `Stream error: ${error.message}`,
        500,
        { originalError: error.message }
      );
      
    } finally {
      // Cleanup
      if (reader) {
        try {
          await reader.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
      }
      this.activeRequests.delete(requestId);
    }
  }
  
  /**
   * Attempt to reconnect a broken stream
   * @private
   * @param {Object} requestBody - Original request body
   * @param {string} apiKey - API key
   * @param {string} requestId - Request ID
   * @param {string} previousContent - Content received so far
   * @returns {Promise<Response|null>} New response or null
   */
  async reconnectStream(requestBody, apiKey, requestId, previousContent) {
    try {
      // Modify request to continue from where it left off
      const modifiedBody = {
        ...requestBody,
        messages: [
          ...requestBody.messages,
          {
            role: 'assistant',
            content: previousContent
          },
          {
            role: 'user',
            content: 'Continue from where you left off.'
          }
        ]
      };
      
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-Request-ID': `${requestId}-reconnect`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(modifiedBody)
      });
      
      if (response.ok) {
        return response;
      }
      
      return null;
    } catch (error) {
      console.error('[DeepSeekProvider] Reconnection failed:', error);
      return null;
    }
  }

  /**
   * Validate API key format
   * @param {string} key - API key to validate
   * @returns {boolean} Is valid
   */
  validateApiKey(key) {
    const validation = getConfig('security.apiKeyValidation');
    const pattern = new RegExp(validation.pattern);
    
    return key && 
           key.length >= validation.minLength && 
           key.length <= validation.maxLength &&
           pattern.test(key);
  }

  /**
   * Calculate request cost
   * @param {Object} usage - Token usage
   * @param {string} model - Model used
   * @returns {number} Cost in dollars
   */
  calculateCost(usage, model) {
    if (!usage || !usage.total_tokens) return 0;
    
    const modelConfig = this.models[model];
    if (!modelConfig || !modelConfig.pricing) return 0;
    
    const inputCost = (usage.prompt_tokens / 1000) * modelConfig.pricing.input;
    const outputCost = (usage.completion_tokens / 1000) * modelConfig.pricing.output;
    
    return Number((inputCost + outputCost).toFixed(6));
  }

  /**
   * Prepare messages for API
   * @protected
   * @param {Array} messages - Raw messages
   * @returns {Array} Prepared messages
   */
  prepareMessages(messages) {
    return messages.map(msg => {
      // Ensure valid role
      const validRoles = ['system', 'user', 'assistant'];
      const role = validRoles.includes(msg.role) ? msg.role : 'user';
      
      // Ensure content is string
      const content = String(msg.content || '');
      
      return { role, content };
    }).filter(msg => msg.content.length > 0);
  }

  /**
   * Validate response structure
   * @protected
   * @param {Object} data - Response data
   * @throws {ApiError} If response is invalid
   */
  validateResponse(data) {
    super.validateResponse(data);
    
    if (!data.choices || !Array.isArray(data.choices)) {
      throw new ApiError(
        'Invalid response: missing choices array',
        500,
        { response: data }
      );
    }
    
    if (data.choices.length === 0) {
      throw new ApiError(
        'Invalid response: empty choices array',
        500,
        { response: data }
      );
    }
    
    const choice = data.choices[0];
    if (!choice.message || !choice.message.content) {
      throw new ApiError(
        'Invalid response: missing message content',
        500,
        { response: data }
      );
    }
  }

  /**
   * Get provider capabilities
   * @returns {Object} Provider capabilities
   */
  getCapabilities() {
    return {
      streaming: true,
      models: Object.keys(this.models),
      maxTokens: 32000,
      features: [
        'chat',
        'code-generation',
        'reasoning',
        'function-calling'
      ]
    };
  }

  /**
   * Get model information
   * @param {string} modelId - Model ID
   * @returns {Object|null} Model info
   */
  getModelInfo(modelId) {
    return this.models[modelId] || null;
  }

  /**
   * List available models
   * @returns {Array} Model list
   */
  listModels() {
    return Object.entries(this.models).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
      maxTokens: config.maxTokens,
      pricing: config.pricing
    }));
  }

  /**
   * Estimate cost for messages
   * @param {Array} messages - Messages to estimate
   * @param {string} model - Model to use
   * @returns {Object} Cost estimate
   */
  estimateCost(messages, model) {
    const modelConfig = this.models[model];
    if (!modelConfig || !modelConfig.pricing) {
      return { min: 0, max: 0, estimated: 0 };
    }
    
    // Rough token estimation (4 chars ≈ 1 token)
    const messageText = messages.map(m => m.content).join(' ');
    const estimatedPromptTokens = Math.ceil(messageText.length / 4);
    const estimatedCompletionTokens = modelConfig.maxTokens / 2; // Assume half max
    
    const promptCost = (estimatedPromptTokens / 1000) * modelConfig.pricing.input;
    const minCompletionCost = (100 / 1000) * modelConfig.pricing.output; // Min 100 tokens
    const maxCompletionCost = (modelConfig.maxTokens / 1000) * modelConfig.pricing.output;
    const estimatedCompletionCost = (estimatedCompletionTokens / 1000) * modelConfig.pricing.output;
    
    return {
      min: Number((promptCost + minCompletionCost).toFixed(6)),
      max: Number((promptCost + maxCompletionCost).toFixed(6)),
      estimated: Number((promptCost + estimatedCompletionCost).toFixed(6)),
      breakdown: {
        promptTokens: estimatedPromptTokens,
        promptCost: Number(promptCost.toFixed(6)),
        completionTokensMin: 100,
        completionTokensMax: modelConfig.maxTokens,
        completionTokensEstimated: estimatedCompletionTokens
      }
    };
  }
}