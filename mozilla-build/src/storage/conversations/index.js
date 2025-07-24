/**
 * Conversations Module
 * Handles conversation management functionality
 */

// Export main ConversationManager
export { default as ConversationManager } from './ConversationManager.js';

// Re-export commonly used methods from ConversationManager
import ConversationManager from './ConversationManager.js';

const manager = new ConversationManager();

export const createConversation = (metadata) => manager.createConversation(metadata);
export const getConversation = (id) => manager.getConversation(id);
export const listConversations = (options) => manager.listConversations(options);
export const updateConversation = (id, updates) => manager.updateConversation(id, updates);
export const deleteConversation = (id) => manager.deleteConversation(id);
export const addMessage = (conversationId, message) => manager.addMessage(conversationId, message);
export const getMessages = (conversationId, options) => manager.getMessages(conversationId, options);
export const searchConversations = (query) => manager.searchConversations(query);
export const exportConversation = (id, format) => manager.exportConversation(id, format);