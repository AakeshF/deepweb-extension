/**
 * Messages Module
 * Handles message management functionality
 */

// Export main MessageManager
export { default as MessageManager } from './MessageManager.js';

// Re-export commonly used methods from MessageManager
import MessageManager from './MessageManager.js';

const manager = new MessageManager();

export const addMessage = (conversationId, data) => manager.add(conversationId, data);
export const getMessage = (id) => manager.get(id);
export const listMessages = (conversationId, options) => manager.list(conversationId, options);
export const updateMessageContent = (id, content) => manager.updateContent(id, content);
export const deleteMessage = (id) => manager.delete(id);
export const searchMessages = (conversationId, query, options) => manager.search(conversationId, query, options);
export const getMessageStatistics = (id, isConversation) => manager.getStatistics(id, isConversation);
export const bulkDeleteMessages = (ids) => manager.bulkDelete(ids);
export const exportMessages = (conversationId, options) => manager.export(conversationId, options);
export const updateMessageState = (id, state) => manager.updateState(id, state);
export const markMessageAsRead = (id) => manager.markAsRead(id);
export const toggleMessagePin = (id) => manager.togglePin(id);
export const createStreamingMessage = (conversationId, streamData) => manager.createStreamingMessage(conversationId, streamData);