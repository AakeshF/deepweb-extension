/**
 * Message Manager
 * Handles all message-related operations including CRUD, search, and state management
 */

import Database from '../database/Database.js';
import { ValidationError, handleError } from '../../errors/index.js';

export default class MessageManager {
  constructor() {
    this.db = new Database();
    this.storeName = 'messages';
    this.conversationsStoreName = 'conversations';
    
    // Configuration
    this.config = {
      maxMessageLength: 100000, // ~25k tokens
      maxMessagesPerConversation: 1000,
      defaultPageSize: 50,
      streamBufferSize: 100,
      bulkOperationBatchSize: 100
    };
    
    // Message state tracking
    this.messageStates = new Map(); // messageId -> state
    this.streamingMessages = new Map(); // messageId -> stream data
    
    // Cache for frequently accessed messages
    this.cache = new Map();
    this.cacheMaxSize = 100;
  }

  /**
   * Initialize the message manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.db.initialize();
      console.log('[MessageManager] Initialized successfully');
    } catch (error) {
      handleError(error, { component: 'MessageManager', method: 'initialize' });
      throw error;
    }
  }

  /**
   * Add message to conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} data - Message data
   * @returns {Promise<Object>} Created message
   */
  async add(conversationId, data) {
    try {
      // Validate conversation exists
      const conversation = await this.db.get(this.conversationsStoreName, conversationId);
      if (!conversation) {
        throw new ValidationError(`Conversation not found: ${conversationId}`);
      }
      
      // Check message limit
      const messageCount = await this.getConversationMessageCount(conversationId);
      if (messageCount >= this.config.maxMessagesPerConversation) {
        throw new ValidationError(`Message limit reached for conversation: ${conversationId}`);
      }
      
      // Validate message data
      this.validateMessageData(data);
      
      // Generate message object
      const message = {
        id: this.generateId(),
        conversationId,
        role: data.role || 'user',
        content: data.content,
        timestamp: Date.now(),
        tokens: data.tokens || this.estimateTokens(data.content),
        cost: data.cost || 0,
        metadata: {
          model: data.model || null,
          temperature: data.temperature || null,
          maxTokens: data.maxTokens || null,
          ...data.metadata
        },
        state: {
          read: false,
          pinned: false,
          edited: false,
          editedAt: null,
          ...data.state
        },
        attachments: data.attachments || [],
        references: data.references || []
      };
      
      // Save to database
      await this.db.add(this.storeName, message);
      
      // Update conversation
      await this.updateConversationLastMessage(conversationId, message);
      
      // Update cache
      this.updateCache(message.id, message);
      
      // Update message state
      this.messageStates.set(message.id, message.state);
      
      console.log('[MessageManager] Added message:', message.id);
      return message;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'add',
        conversationId,
        data 
      });
      throw error;
    }
  }

  /**
   * Get message by ID
   * @param {string} id - Message ID
   * @returns {Promise<Object|null>} Message or null
   */
  async get(id) {
    try {
      // Check cache first
      if (this.cache.has(id)) {
        return this.cache.get(id);
      }
      
      // Get from database
      const message = await this.db.get(this.storeName, id);
      
      if (message) {
        // Update cache
        this.updateCache(id, message);
        
        // Update state tracking
        this.messageStates.set(id, message.state);
      }
      
      return message;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'get',
        id 
      });
      throw error;
    }
  }

  /**
   * List messages for conversation with pagination
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async list(conversationId, options = {}) {
    try {
      const {
        page = 1,
        pageSize = this.config.defaultPageSize,
        sortOrder = 'asc',
        includeSystem = true,
        pinnedFirst = true
      } = options;
      
      // Get all messages for conversation
      let messages = await this.db.getAll(this.storeName, {
        index: 'by_conversation',
        range: { start: conversationId, end: conversationId },
        direction: sortOrder === 'desc' ? 'prev' : 'next'
      });
      
      // Apply filters
      messages = messages.filter(msg => {
        // Filter system messages
        if (!includeSystem && msg.role === 'system') return false;
        return true;
      });
      
      // Sort pinned messages first if requested
      if (pinnedFirst) {
        messages.sort((a, b) => {
          if (a.state.pinned && !b.state.pinned) return -1;
          if (!a.state.pinned && b.state.pinned) return 1;
          return sortOrder === 'desc' ? b.timestamp - a.timestamp : a.timestamp - b.timestamp;
        });
      }
      
      // Calculate pagination
      const total = messages.length;
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      // Get page data
      const items = messages.slice(start, end);
      
      // Update cache for accessed messages
      items.forEach(msg => this.updateCache(msg.id, msg));
      
      return {
        items,
        pagination: {
          page,
          pageSize,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'list',
        conversationId,
        options 
      });
      throw error;
    }
  }

  /**
   * Update message content
   * @param {string} id - Message ID
   * @param {string} content - New content
   * @returns {Promise<Object>} Updated message
   */
  async updateContent(id, content) {
    try {
      // Get existing message
      const message = await this.get(id);
      if (!message) {
        throw new ValidationError(`Message not found: ${id}`);
      }
      
      // Validate new content
      if (!content || content.trim().length === 0) {
        throw new ValidationError('Message content cannot be empty');
      }
      
      if (content.length > this.config.maxMessageLength) {
        throw new ValidationError(`Message too long: ${content.length} characters`);
      }
      
      // Update message
      const updated = {
        ...message,
        content,
        tokens: this.estimateTokens(content),
        state: {
          ...message.state,
          edited: true,
          editedAt: Date.now()
        }
      };
      
      // Save to database
      await this.db.put(this.storeName, updated);
      
      // Update cache
      this.updateCache(id, updated);
      
      // Update state tracking
      this.messageStates.set(id, updated.state);
      
      console.log('[MessageManager] Updated message content:', id);
      return updated;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'updateContent',
        id,
        content 
      });
      throw error;
    }
  }

  /**
   * Delete message
   * @param {string} id - Message ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      // Get message
      const message = await this.get(id);
      if (!message) {
        throw new ValidationError(`Message not found: ${id}`);
      }
      
      // Delete from database
      await this.db.delete(this.storeName, id);
      
      // Remove from cache
      this.cache.delete(id);
      
      // Remove from state tracking
      this.messageStates.delete(id);
      this.streamingMessages.delete(id);
      
      // Update conversation if this was the last message
      await this.updateConversationAfterDelete(message.conversationId);
      
      console.log('[MessageManager] Deleted message:', id);
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'delete',
        id 
      });
      throw error;
    }
  }

  /**
   * Search messages within conversation
   * @param {string} conversationId - Conversation ID
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching messages
   */
  async search(conversationId, query, options = {}) {
    try {
      if (!query || query.trim().length === 0) {
        throw new ValidationError('Search query cannot be empty');
      }
      
      const {
        limit = 50,
        role = null,
        includeSystem = false
      } = options;
      
      const queryLower = query.toLowerCase();
      const messages = await this.db.getAll(this.storeName, {
        index: 'by_conversation',
        range: { start: conversationId, end: conversationId }
      });
      
      const results = [];
      
      for (const message of messages) {
        // Filter by role if specified
        if (role && message.role !== role) continue;
        
        // Skip system messages if not included
        if (!includeSystem && message.role === 'system') continue;
        
        // Check content match
        if (message.content && message.content.toLowerCase().includes(queryLower)) {
          results.push({
            ...message,
            matchContext: this.extractMatchContext(message.content, query)
          });
          
          if (results.length >= limit) break;
        }
      }
      
      return results;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'search',
        conversationId,
        query,
        options 
      });
      throw error;
    }
  }

  /**
   * Get message statistics
   * @param {string} id - Message ID or conversation ID
   * @param {boolean} isConversation - Whether ID is for conversation
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(id, isConversation = false) {
    try {
      let messages;
      
      if (isConversation) {
        messages = await this.db.getAll(this.storeName, {
          index: 'by_conversation',
          range: { start: id, end: id }
        });
      } else {
        const message = await this.get(id);
        if (!message) {
          throw new ValidationError(`Message not found: ${id}`);
        }
        messages = [message];
      }
      
      const stats = {
        count: messages.length,
        totalTokens: 0,
        totalCost: 0,
        avgTokensPerMessage: 0,
        byRole: { user: 0, assistant: 0, system: 0 },
        byModel: {},
        timeRange: {
          start: null,
          end: null,
          duration: 0
        }
      };
      
      for (const msg of messages) {
        // Count by role
        stats.byRole[msg.role] = (stats.byRole[msg.role] || 0) + 1;
        
        // Count by model
        if (msg.metadata.model) {
          stats.byModel[msg.metadata.model] = 
            (stats.byModel[msg.metadata.model] || 0) + 1;
        }
        
        // Sum tokens and cost
        stats.totalTokens += msg.tokens || 0;
        stats.totalCost += msg.cost || 0;
        
        // Track time range
        if (!stats.timeRange.start || msg.timestamp < stats.timeRange.start) {
          stats.timeRange.start = msg.timestamp;
        }
        if (!stats.timeRange.end || msg.timestamp > stats.timeRange.end) {
          stats.timeRange.end = msg.timestamp;
        }
      }
      
      // Calculate averages and duration
      if (messages.length > 0) {
        stats.avgTokensPerMessage = stats.totalTokens / messages.length;
        stats.timeRange.duration = stats.timeRange.end - stats.timeRange.start;
      }
      
      return stats;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'getStatistics',
        id,
        isConversation 
      });
      throw error;
    }
  }

  /**
   * Bulk delete messages
   * @param {Array<string>} ids - Message IDs
   * @returns {Promise<number>} Number of deleted messages
   */
  async bulkDelete(ids) {
    try {
      if (!Array.isArray(ids) || ids.length === 0) {
        throw new ValidationError('No message IDs provided');
      }
      
      let deleted = 0;
      const batches = this.createBatches(ids, this.config.bulkOperationBatchSize);
      const affectedConversations = new Set();
      
      for (const batch of batches) {
        // Get messages to track affected conversations
        for (const id of batch) {
          const message = await this.get(id);
          if (message) {
            affectedConversations.add(message.conversationId);
          }
        }
        
        // Delete batch
        await this.db.deleteMany(this.storeName, batch);
        
        // Clean up cache and state
        batch.forEach(id => {
          this.cache.delete(id);
          this.messageStates.delete(id);
          this.streamingMessages.delete(id);
        });
        
        deleted += batch.length;
      }
      
      // Update affected conversations
      for (const conversationId of affectedConversations) {
        await this.updateConversationAfterDelete(conversationId);
      }
      
      console.log('[MessageManager] Bulk deleted messages:', deleted);
      return deleted;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'bulkDelete',
        ids 
      });
      throw error;
    }
  }

  /**
   * Export messages
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  async export(conversationId, options = {}) {
    try {
      const {
        format = 'json',
        includeMetadata = true,
        includeState = false
      } = options;
      
      const messages = await this.db.getAll(this.storeName, {
        index: 'by_conversation',
        range: { start: conversationId, end: conversationId },
        direction: 'next'
      });
      
      const exportData = {
        conversationId,
        exportedAt: Date.now(),
        messageCount: messages.length,
        messages: messages.map(msg => {
          const exported = {
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp
          };
          
          if (includeMetadata) {
            exported.metadata = msg.metadata;
            exported.tokens = msg.tokens;
            exported.cost = msg.cost;
          }
          
          if (includeState) {
            exported.state = msg.state;
          }
          
          return exported;
        })
      };
      
      if (format === 'markdown') {
        return this.convertToMarkdown(exportData);
      } else if (format === 'csv') {
        return this.convertToCSV(exportData);
      }
      
      return exportData;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'export',
        conversationId,
        options 
      });
      throw error;
    }
  }

  /**
   * Update message state
   * @param {string} id - Message ID
   * @param {Object} state - State updates
   * @returns {Promise<Object>} Updated message
   */
  async updateState(id, state) {
    try {
      const message = await this.get(id);
      if (!message) {
        throw new ValidationError(`Message not found: ${id}`);
      }
      
      // Update message state
      const updated = {
        ...message,
        state: {
          ...message.state,
          ...state
        }
      };
      
      // Save to database
      await this.db.put(this.storeName, updated);
      
      // Update cache
      this.updateCache(id, updated);
      
      // Update state tracking
      this.messageStates.set(id, updated.state);
      
      return updated;
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'updateState',
        id,
        state 
      });
      throw error;
    }
  }

  /**
   * Mark message as read
   * @param {string} id - Message ID
   * @returns {Promise<Object>} Updated message
   */
  async markAsRead(id) {
    return this.updateState(id, { read: true });
  }

  /**
   * Toggle message pin status
   * @param {string} id - Message ID
   * @returns {Promise<Object>} Updated message
   */
  async togglePin(id) {
    const message = await this.get(id);
    if (!message) {
      throw new ValidationError(`Message not found: ${id}`);
    }
    
    return this.updateState(id, { pinned: !message.state.pinned });
  }

  /**
   * Handle streaming message updates
   * @param {string} conversationId - Conversation ID
   * @param {Object} streamData - Stream data
   * @returns {Promise<Object>} Stream handler
   */
  async createStreamingMessage(conversationId, streamData) {
    try {
      // Create initial message
      const message = await this.add(conversationId, {
        role: streamData.role || 'assistant',
        content: '',
        metadata: {
          model: streamData.model,
          streaming: true,
          ...streamData.metadata
        },
        state: {
          streaming: true,
          streamStartedAt: Date.now()
        }
      });
      
      // Set up streaming state
      this.streamingMessages.set(message.id, {
        buffer: [],
        tokenCount: 0,
        lastUpdate: Date.now()
      });
      
      // Return stream handler
      return {
        messageId: message.id,
        
        // Append content to streaming message
        append: async (content) => {
          const streamState = this.streamingMessages.get(message.id);
          if (!streamState) return;
          
          streamState.buffer.push(content);
          streamState.lastUpdate = Date.now();
          
          // Update message if buffer is full or timeout
          if (streamState.buffer.length >= this.config.streamBufferSize ||
              Date.now() - streamState.lastUpdate > 1000) {
            await this.flushStreamBuffer(message.id);
          }
        },
        
        // Complete streaming
        complete: async () => {
          await this.flushStreamBuffer(message.id);
          
          // Update message state
          const finalMessage = await this.updateState(message.id, {
            streaming: false,
            streamCompletedAt: Date.now()
          });
          
          // Clean up streaming state
          this.streamingMessages.delete(message.id);
          
          return finalMessage;
        },
        
        // Cancel streaming
        cancel: async () => {
          await this.flushStreamBuffer(message.id);
          
          // Mark as cancelled
          const cancelledMessage = await this.updateState(message.id, {
            streaming: false,
            streamCancelledAt: Date.now(),
            cancelled: true
          });
          
          // Clean up streaming state
          this.streamingMessages.delete(message.id);
          
          return cancelledMessage;
        }
      };
      
    } catch (error) {
      handleError(error, { 
        component: 'MessageManager', 
        method: 'createStreamingMessage',
        conversationId,
        streamData 
      });
      throw error;
    }
  }

  // Helper Methods

  /**
   * Generate unique ID
   * @private
   * @returns {string} Unique ID
   */
  generateId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate message data
   * @private
   * @param {Object} data - Data to validate
   */
  validateMessageData(data) {
    if (!data.content || data.content.trim().length === 0) {
      throw new ValidationError('Message content cannot be empty');
    }
    
    if (data.content.length > this.config.maxMessageLength) {
      throw new ValidationError(`Message too long: ${data.content.length} characters`);
    }
    
    const validRoles = ['user', 'assistant', 'system'];
    if (data.role && !validRoles.includes(data.role)) {
      throw new ValidationError(`Invalid role: ${data.role}`);
    }
    
    if (data.attachments && !Array.isArray(data.attachments)) {
      throw new ValidationError('Attachments must be an array');
    }
  }

  /**
   * Estimate token count
   * @private
   * @param {string} content - Message content
   * @returns {number} Estimated tokens
   */
  estimateTokens(content) {
    // Simple estimation: ~4 characters per token
    return Math.ceil(content.length / 4);
  }

  /**
   * Update cache
   * @private
   * @param {string} id - Message ID
   * @param {Object} message - Message data
   */
  updateCache(id, message) {
    // Implement LRU cache
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(id, message);
  }

  /**
   * Get conversation message count
   * @private
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<number>} Message count
   */
  async getConversationMessageCount(conversationId) {
    return await this.db.count(this.storeName, {
      index: 'by_conversation',
      range: { start: conversationId, end: conversationId }
    });
  }

  /**
   * Update conversation last message
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {Object} message - Message data
   */
  async updateConversationLastMessage(conversationId, message) {
    try {
      const conversation = await this.db.get(this.conversationsStoreName, conversationId);
      if (conversation) {
        conversation.lastMessage = {
          id: message.id,
          role: message.role,
          content: message.content.substring(0, 100),
          timestamp: message.timestamp
        };
        conversation.messageCount = (conversation.messageCount || 0) + 1;
        conversation.updatedAt = Date.now();
        
        await this.db.put(this.conversationsStoreName, conversation);
      }
    } catch (error) {
      console.error('[MessageManager] Failed to update conversation:', error);
    }
  }

  /**
   * Update conversation after message delete
   * @private
   * @param {string} conversationId - Conversation ID
   */
  async updateConversationAfterDelete(conversationId) {
    try {
      const conversation = await this.db.get(this.conversationsStoreName, conversationId);
      if (!conversation) return;
      
      // Get remaining messages
      const messages = await this.db.getAll(this.storeName, {
        index: 'by_conversation',
        range: { start: conversationId, end: conversationId },
        direction: 'prev',
        limit: 1
      });
      
      // Update conversation
      if (messages.length > 0) {
        const lastMessage = messages[0];
        conversation.lastMessage = {
          id: lastMessage.id,
          role: lastMessage.role,
          content: lastMessage.content.substring(0, 100),
          timestamp: lastMessage.timestamp
        };
      } else {
        conversation.lastMessage = null;
      }
      
      conversation.messageCount = await this.getConversationMessageCount(conversationId);
      conversation.updatedAt = Date.now();
      
      await this.db.put(this.conversationsStoreName, conversation);
    } catch (error) {
      console.error('[MessageManager] Failed to update conversation after delete:', error);
    }
  }

  /**
   * Extract match context
   * @private
   * @param {string} content - Full content
   * @param {string} query - Search query
   * @returns {string} Context snippet
   */
  extractMatchContext(content, query) {
    const index = content.toLowerCase().indexOf(query.toLowerCase());
    if (index === -1) return '';
    
    const contextLength = 100;
    const start = Math.max(0, index - contextLength);
    const end = Math.min(content.length, index + query.length + contextLength);
    
    let context = content.substring(start, end);
    
    if (start > 0) context = '...' + context;
    if (end < content.length) context = context + '...';
    
    return context;
  }

  /**
   * Create batches for bulk operations
   * @private
   * @param {Array} items - Items to batch
   * @param {number} batchSize - Batch size
   * @returns {Array<Array>} Batches
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Flush stream buffer
   * @private
   * @param {string} messageId - Message ID
   */
  async flushStreamBuffer(messageId) {
    const streamState = this.streamingMessages.get(messageId);
    if (!streamState || streamState.buffer.length === 0) return;
    
    // Get current message
    const message = await this.get(messageId);
    if (!message) return;
    
    // Append buffer content
    const additionalContent = streamState.buffer.join('');
    const newContent = message.content + additionalContent;
    
    // Update message
    await this.db.put(this.storeName, {
      ...message,
      content: newContent,
      tokens: this.estimateTokens(newContent)
    });
    
    // Clear buffer
    streamState.buffer = [];
    streamState.tokenCount = this.estimateTokens(newContent);
  }

  /**
   * Convert to markdown format
   * @private
   * @param {Object} data - Export data
   * @returns {string} Markdown content
   */
  convertToMarkdown(data) {
    let markdown = `# Conversation Messages\n\n`;
    markdown += `**Exported:** ${new Date(data.exportedAt).toLocaleString()}\n`;
    markdown += `**Message Count:** ${data.messageCount}\n\n`;
    markdown += '---\n\n';
    
    for (const msg of data.messages) {
      markdown += `### ${msg.role.toUpperCase()}\n`;
      markdown += `*${new Date(msg.timestamp).toLocaleString()}*\n\n`;
      markdown += `${msg.content}\n\n`;
      
      if (msg.metadata?.model) {
        markdown += `*Model: ${msg.metadata.model}`;
        if (msg.tokens) markdown += ` | Tokens: ${msg.tokens}`;
        if (msg.cost) markdown += ` | Cost: $${msg.cost.toFixed(4)}`;
        markdown += '*\n\n';
      }
      
      markdown += '---\n\n';
    }
    
    return markdown;
  }

  /**
   * Convert to CSV format
   * @private
   * @param {Object} data - Export data
   * @returns {string} CSV content
   */
  convertToCSV(data) {
    const headers = ['Timestamp', 'Role', 'Content', 'Model', 'Tokens', 'Cost'];
    const rows = [headers.join(',')];
    
    for (const msg of data.messages) {
      const row = [
        new Date(msg.timestamp).toISOString(),
        msg.role,
        `"${msg.content.replace(/"/g, '""')}"`,
        msg.metadata?.model || '',
        msg.tokens || 0,
        msg.cost || 0
      ];
      rows.push(row.join(','));
    }
    
    return rows.join('\n');
  }
}