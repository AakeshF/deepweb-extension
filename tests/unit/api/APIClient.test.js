/**
 * APIClient Test Suite
 */

import APIClient from '../../../src/api/APIClient.js';
import DeepSeekProvider from '../../../src/api/providers/DeepSeekProvider.js';
import { ApiError, ValidationError } from '../../../src/errors/index.js';

// Mock fetch
global.fetch = jest.fn();

// Mock config
jest.mock('../../../src/config/index.js', () => ({
  getConfig: jest.fn((path) => {
    const config = {
      'api.providers.deepseek': {
        endpoint: 'https://api.deepseek.com/v1/chat/completions',
        models: {
          'deepseek-chat': {
            name: 'DeepSeek Chat',
            temperature: 0.7,
            maxTokens: 4000,
            pricing: { input: 0.0001, output: 0.0002 }
          }
        }
      },
      'api.timeout': 30000,
      'api.retries': { max: 3, delay: 1000, backoff: 2 },
      'api.rateLimit': { interval: 10000, maxPerHour: 100 },
      'defaults.model': 'deepseek-chat',
      'security.apiKeyValidation': {
        pattern: '^sk-[a-zA-Z0-9]+$',
        minLength: 20,
        maxLength: 200
      }
    };
    return path.split('.').reduce((obj, key) => obj?.[key], config);
  })
}));

describe('APIClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    fetch.mockReset();
  });

  describe('provider management', () => {
    it('should initialize with DeepSeek provider', () => {
      const providers = APIClient.listProviders();
      expect(providers).toHaveLength(1);
      expect(providers[0].name).toBe('deepseek');
    });

    it('should get provider by name', () => {
      const provider = APIClient.getProvider('deepseek');
      expect(provider).toBeInstanceOf(DeepSeekProvider);
    });

    it('should throw error for invalid provider', () => {
      expect(() => {
        APIClient.getProvider('invalid');
      }).toThrow(ValidationError);
    });
  });

  describe('chat method', () => {
    beforeEach(() => {
      // Mock successful response
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: { content: 'Test response' }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      });
    });

    it('should send chat request', async () => {
      const response = await APIClient.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        apiKey: 'sk-test123456789012345678',
        model: 'deepseek-chat'
      });

      expect(response.choices[0].message.content).toBe('Test response');
      expect(response.cost).toBeDefined();
      expect(fetch).toHaveBeenCalledWith(
        'https://api.deepseek.com/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test123456789012345678'
          })
        })
      );
    });

    it('should validate API key', async () => {
      await expect(APIClient.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        apiKey: 'invalid-key',
        model: 'deepseek-chat'
      })).rejects.toThrow(ValidationError);
    });

    it('should handle API errors', async () => {
      fetch.mockResolvedValue({
        ok: false,
        status: 401,
        json: async () => ({
          error: { message: 'Invalid API key' }
        })
      });

      await expect(APIClient.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        apiKey: 'sk-test123456789012345678',
        model: 'deepseek-chat'
      })).rejects.toThrow(ApiError);
    });
  });

  describe('interceptors', () => {
    it('should apply request interceptors', async () => {
      const interceptor = jest.fn((request) => ({
        ...request,
        intercepted: true
      }));

      const remove = APIClient.addRequestInterceptor(interceptor);

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test' } }]
        })
      });

      await APIClient.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        apiKey: 'sk-test123456789012345678'
      });

      expect(interceptor).toHaveBeenCalled();
      
      // Test removal
      remove();
      interceptor.mockClear();
      
      await APIClient.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        apiKey: 'sk-test123456789012345678'
      });
      
      expect(interceptor).not.toHaveBeenCalled();
    });

    it('should apply response interceptors', async () => {
      const interceptor = jest.fn((response) => ({
        ...response,
        intercepted: true
      }));

      APIClient.addResponseInterceptor(interceptor);

      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'Test' } }]
        })
      });

      const response = await APIClient.chat({
        messages: [{ role: 'user', content: 'Hello' }],
        apiKey: 'sk-test123456789012345678'
      });

      expect(interceptor).toHaveBeenCalled();
      expect(response.intercepted).toBe(true);
    });
  });

  describe('utility methods', () => {
    it('should validate API key', () => {
      expect(APIClient.validateApiKey('sk-test123456789012345678')).toBe(true);
      expect(APIClient.validateApiKey('invalid')).toBe(false);
      expect(APIClient.validateApiKey('')).toBe(false);
    });

    it('should calculate cost', () => {
      const usage = {
        prompt_tokens: 1000,
        completion_tokens: 2000,
        total_tokens: 3000
      };

      const cost = APIClient.calculateCost(usage, 'deepseek-chat');
      expect(cost).toBe(0.0005); // (1000/1000 * 0.0001) + (2000/1000 * 0.0002)
    });

    it('should estimate cost', () => {
      const messages = [
        { role: 'user', content: 'This is a test message' }
      ];

      const estimate = APIClient.estimateCost(messages, 'deepseek-chat');
      expect(estimate.min).toBeGreaterThan(0);
      expect(estimate.max).toBeGreaterThan(estimate.min);
      expect(estimate.estimated).toBeGreaterThan(0);
    });

    it('should list models', () => {
      const models = APIClient.listModels('deepseek');
      expect(models).toContain('deepseek-chat');
    });

    it('should get model info', () => {
      const info = APIClient.getModelInfo('deepseek-chat', 'deepseek');
      expect(info.name).toBe('DeepSeek Chat');
      expect(info.temperature).toBe(0.7);
    });
  });

  describe('health check', () => {
    it('should return healthy status', async () => {
      fetch.mockResolvedValue({
        ok: true,
        json: async () => ({})
      });

      const status = await APIClient.healthCheck('deepseek');
      expect(status.status).toBe('healthy');
      expect(status.provider).toBe('deepseek');
    });

    it('should return error status on failure', async () => {
      fetch.mockRejectedValue(new Error('Network error'));

      const status = await APIClient.healthCheck('deepseek');
      expect(status.status).toBe('error');
      expect(status.error).toBe('Network error');
    });
  });

  describe('request cancellation', () => {
    it('should cancel all requests', () => {
      const provider = APIClient.getProvider('deepseek');
      provider.cancelAllRequests = jest.fn();

      APIClient.cancelAllRequests('deepseek');
      expect(provider.cancelAllRequests).toHaveBeenCalled();
    });

    it('should cancel all providers requests', () => {
      const provider = APIClient.getProvider('deepseek');
      provider.cancelAllRequests = jest.fn();

      APIClient.cancelAllRequests();
      expect(provider.cancelAllRequests).toHaveBeenCalled();
    });
  });
});