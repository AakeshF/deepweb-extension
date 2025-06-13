/**
 * Conversation Bridge
 * Provides conversation management functionality to content scripts
 * by communicating with the background script
 */

export class ConversationBridge {
  async getAllConversations() {
    const response = await browser.runtime.sendMessage({
      type: 'conversation_get_all'
    });
    return response.conversations || [];
  }

  async getConversation(conversationId) {
    const response = await browser.runtime.sendMessage({
      type: 'conversation_get',
      conversationId
    });
    return response.conversation;
  }

  async getCurrentConversation() {
    const response = await browser.runtime.sendMessage({
      type: 'conversation_get_current'
    });
    return response.conversation;
  }

  async createConversation(data) {
    const response = await browser.runtime.sendMessage({
      type: 'conversation_create',
      data
    });
    return response.conversation;
  }

  async updateConversation(conversationId, updates) {
    const response = await browser.runtime.sendMessage({
      type: 'conversation_update',
      conversationId,
      updates
    });
    return response.conversation;
  }

  async deleteConversation(conversationId) {
    const response = await browser.runtime.sendMessage({
      type: 'conversation_delete',
      conversationId
    });
    return response.success;
  }

  async setCurrentConversation(conversationId) {
    const response = await browser.runtime.sendMessage({
      type: 'conversation_set_current',
      conversationId
    });
    return response.success;
  }
}

export class MessageBridge {
  async getMessages(conversationId) {
    const response = await browser.runtime.sendMessage({
      type: 'messages_get',
      conversationId
    });
    return response.messages || [];
  }

  async addMessage(messageData) {
    const response = await browser.runtime.sendMessage({
      type: 'message_add',
      messageData
    });
    return response.messageId;
  }

  async clearMessages(conversationId) {
    const response = await browser.runtime.sendMessage({
      type: 'messages_clear',
      conversationId
    });
    return response.success;
  }
}