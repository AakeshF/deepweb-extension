/**
 * API Module
 * Main entry point for API functionality
 */

// Export main API client
export { default as APIClient } from './APIClient.js';

// Export providers
export { default as BaseProvider } from './providers/BaseProvider.js';
export { default as DeepSeekProvider } from './providers/DeepSeekProvider.js';

// Export interceptors
export * from './interceptors/index.js';

// Re-export commonly used functions from APIClient
import APIClient from './APIClient.js';

export const chat = (params) => APIClient.chat(params);
export const stream = (params) => APIClient.stream(params);
export const validateApiKey = (key, provider) => APIClient.validateApiKey(key, provider);
export const calculateCost = (usage, model, provider) => APIClient.calculateCost(usage, model, provider);
export const estimateCost = (messages, model, provider) => APIClient.estimateCost(messages, model, provider);
export const listProviders = () => APIClient.listProviders();
export const listModels = (provider) => APIClient.listModels(provider);
export const healthCheck = (provider) => APIClient.healthCheck(provider);