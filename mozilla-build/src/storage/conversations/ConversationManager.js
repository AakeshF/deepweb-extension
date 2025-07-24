/**
 * Conversation Manager
 * Handles all conversation-related operations including CRUD, search, and state management
 */

import Database from '../database/Database.js';
import { ValidationError, handleError } from '../../errors/index.js';

export default class ConversationManager {
  constructor() {
    this.db = new Database();
    this.storeName = 'conversations';
    this.messagesStoreName = 'messages';
    
    // Configuration
    this.config = {
      maxConversations: 1000,
      maxTitleLength: 200,
      defaultPageSize: 20,
      archiveAfterDays: 30,
      cleanupBatchSize: 50
    };
    
    // Cache for frequently accessed conversations
    this.cache = new Map();
    this.cacheMaxSize = 50;
  }

  /**
   * Initialize the conversation manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.db.initialize();
      console.log('[ConversationManager] Initialized successfully');
    } catch (error) {
      handleError(error, { component: 'ConversationManager', method: 'initialize' });
      throw error;
    }
  }

  /**
   * Create a new conversation
   * @param {Object} data - Conversation data
   * @returns {Promise<Object>} Created conversation
   */
  async create(data) {
    try {
      // Validate input
      this.validateConversationData(data);
      
      // Check conversation limit
      const count = await this.getCount();
      if (count >= this.config.maxConversations) {
        await this.cleanupOldConversations();
      }
      
      // Generate conversation object
      const conversation = {
        id: this.generateId(),
        title: data.title || 'New Conversation',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        messageCount: 0,
        lastMessage: null,
        archived: false,
        metadata: {
          url: data.url || null,
          domain: data.url ? new URL(data.url).hostname : null,
          tags: data.tags || [],
          ...data.metadata
        },
        state: {
          isActive: true,
          lastAccessedAt: Date.now(),
          ...data.state
        }
      };
      
      // Save to database
      await this.db.add(this.storeName, conversation);
      
      // Update cache
      this.updateCache(conversation.id, conversation);
      
      console.log('[ConversationManager] Created conversation:', conversation.id);
      return conversation;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'create',
        data 
      });
      throw error;
    }
  }

  /**
   * Get conversation by ID
   * @param {string} id - Conversation ID
   * @returns {Promise<Object|null>} Conversation or null
   */
  async get(id) {
    try {
      // Check cache first
      if (this.cache.has(id)) {
        return this.cache.get(id);
      }
      
      // Get from database
      const conversation = await this.db.get(this.storeName, id);
      
      if (conversation) {
        // Update cache
        this.updateCache(id, conversation);
        
        // Update last accessed time
        await this.updateAccessTime(id);
      }
      
      return conversation;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'get',
        id 
      });
      throw error;
    }
  }

  /**
   * List conversations with pagination and sorting
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Paginated results
   */
  async list(options = {}) {
    try {
      const {
        page = 1,
        pageSize = this.config.defaultPageSize,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
        archived = false,
        search = null
      } = options;
      
      // Build query options
      const queryOptions = {
        index: sortBy === 'updatedAt' ? 'by_date' : 
               sortBy === 'title' ? 'by_title' : 
               sortBy === 'url' ? 'by_url' : null,
        direction: sortOrder === 'desc' ? 'prev' : 'next'
      };
      
      // Get all conversations
      let conversations = await this.db.getAll(this.storeName, queryOptions);
      
      // Apply filters
      conversations = conversations.filter(conv => {
        // Filter by archived status
        if (conv.archived !== archived) return false;
        
        // Apply search filter
        if (search) {
          const searchLower = search.toLowerCase();
          const titleMatch = conv.title.toLowerCase().includes(searchLower);
          const urlMatch = conv.metadata.url && 
                          conv.metadata.url.toLowerCase().includes(searchLower);
          if (!titleMatch && !urlMatch) return false;
        }
        
        return true;
      });
      
      // Calculate pagination
      const total = conversations.length;
      const totalPages = Math.ceil(total / pageSize);
      const start = (page - 1) * pageSize;
      const end = start + pageSize;
      
      // Get page data
      const items = conversations.slice(start, end);
      
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
        component: 'ConversationManager', 
        method: 'list',
        options 
      });
      throw error;
    }
  }

  /**
   * Update conversation
   * @param {string} id - Conversation ID
   * @param {Object} updates - Updates to apply
   * @returns {Promise<Object>} Updated conversation
   */
  async update(id, updates) {
    try {
      // Get existing conversation
      const conversation = await this.get(id);
      if (!conversation) {
        throw new ValidationError(`Conversation not found: ${id}`);
      }
      
      // Validate updates
      if (updates.title && updates.title.length > this.config.maxTitleLength) {
        throw new ValidationError(`Title too long: ${updates.title.length} characters`);
      }
      
      // Apply updates
      const updated = {
        ...conversation,
        ...updates,
        updatedAt: Date.now(),
        metadata: {
          ...conversation.metadata,
          ...(updates.metadata || {})
        },
        state: {
          ...conversation.state,
          ...(updates.state || {})
        }
      };
      
      // Save to database
      await this.db.put(this.storeName, updated);
      
      // Update cache
      this.updateCache(id, updated);
      
      console.log('[ConversationManager] Updated conversation:', id);
      return updated;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'update',
        id,
        updates 
      });
      throw error;
    }
  }

  /**
   * Delete conversation and all associated messages
   * @param {string} id - Conversation ID
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      // Get conversation
      const conversation = await this.get(id);
      if (!conversation) {
        throw new ValidationError(`Conversation not found: ${id}`);
      }
      
      // Delete all associated messages
      await this.deleteConversationMessages(id);
      
      // Delete conversation
      await this.db.delete(this.storeName, id);
      
      // Remove from cache
      this.cache.delete(id);
      
      console.log('[ConversationManager] Deleted conversation:', id);
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'delete',
        id 
      });
      throw error;
    }
  }

  /**
   * Archive or unarchive conversation
   * @param {string} id - Conversation ID
   * @param {boolean} archived - Archive status
   * @returns {Promise<Object>} Updated conversation
   */
  async archive(id, archived = true) {
    try {
      return await this.update(id, { archived });
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'archive',
        id,
        archived 
      });
      throw error;
    }
  }

  /**
   * Search conversations by title or content
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Array>} Matching conversations
   */
  async search(query, options = {}) {
    try {
      if (!query || query.trim().length === 0) {
        throw new ValidationError('Search query cannot be empty');
      }
      
      const {
        limit = 50,
        includeArchived = false,
        searchContent = true
      } = options;
      
      const queryLower = query.toLowerCase();
      const conversations = await this.db.getAll(this.storeName);
      const results = [];
      
      for (const conversation of conversations) {
        // Skip archived if not included
        if (!includeArchived && conversation.archived) continue;
        
        // Check title match
        const titleMatch = conversation.title.toLowerCase().includes(queryLower);
        
        // Check URL match
        const urlMatch = conversation.metadata.url && 
                        conversation.metadata.url.toLowerCase().includes(queryLower);
        
        // Check tag match
        const tagMatch = conversation.metadata.tags && 
                        conversation.metadata.tags.some(tag => 
                          tag.toLowerCase().includes(queryLower)
                        );
        
        let contentMatch = false;
        
        // Search in message content if enabled
        if (searchContent && !titleMatch && !urlMatch && !tagMatch) {
          const messages = await this.getConversationMessages(conversation.id, { limit: 10 });
          contentMatch = messages.some(msg => 
            msg.content && msg.content.toLowerCase().includes(queryLower)
          );
        }
        
        if (titleMatch || urlMatch || tagMatch || contentMatch) {
          results.push({
            ...conversation,
            matchType: titleMatch ? 'title' : 
                      urlMatch ? 'url' : 
                      tagMatch ? 'tag' : 
                      contentMatch ? 'content' : 'unknown'
          });
          
          if (results.length >= limit) break;
        }
      }
      
      return results;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'search',
        query,
        options 
      });
      throw error;
    }
  }

  /**
   * Get conversation statistics
   * @param {string} id - Conversation ID
   * @returns {Promise<Object>} Statistics
   */
  async getStatistics(id) {
    try {
      const conversation = await this.get(id);
      if (!conversation) {
        throw new ValidationError(`Conversation not found: ${id}`);
      }
      
      // Get message statistics
      const messages = await this.getConversationMessages(id);
      const messageStats = this.calculateMessageStats(messages);
      
      return {
        conversationId: id,
        createdAt: conversation.createdAt,
        updatedAt: conversation.updatedAt,
        duration: conversation.updatedAt - conversation.createdAt,
        messageCount: messages.length,
        messageStats,
        metadata: conversation.metadata,
        state: conversation.state
      };
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'getStatistics',
        id 
      });
      throw error;
    }
  }

  /**
   * Get global statistics
   * @returns {Promise<Object>} Global statistics
   */
  async getGlobalStatistics() {
    try {
      const conversations = await this.db.getAll(this.storeName);
      const now = Date.now();
      
      const stats = {
        total: conversations.length,
        active: 0,
        archived: 0,
        recent: 0,
        byDomain: {},
        avgMessageCount: 0,
        avgDuration: 0,
        storageSize: await this.db.getSize()
      };
      
      let totalMessages = 0;
      let totalDuration = 0;
      
      for (const conv of conversations) {
        // Count by status
        if (conv.archived) {
          stats.archived++;
        } else {
          stats.active++;
        }
        
        // Count recent (last 7 days)
        if (now - conv.updatedAt < 7 * 24 * 60 * 60 * 1000) {
          stats.recent++;
        }
        
        // Count by domain
        if (conv.metadata.domain) {
          stats.byDomain[conv.metadata.domain] = 
            (stats.byDomain[conv.metadata.domain] || 0) + 1;
        }
        
        // Accumulate for averages
        totalMessages += conv.messageCount || 0;
        totalDuration += (conv.updatedAt - conv.createdAt);
      }
      
      // Calculate averages
      if (conversations.length > 0) {
        stats.avgMessageCount = totalMessages / conversations.length;
        stats.avgDuration = totalDuration / conversations.length;
      }
      
      return stats;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'getGlobalStatistics' 
      });
      throw error;
    }
  }

  /**
   * Cleanup old conversations
   * @returns {Promise<number>} Number of conversations cleaned up
   */
  async cleanupOldConversations() {
    try {
      const cutoffDate = Date.now() - (this.config.archiveAfterDays * 24 * 60 * 60 * 1000);
      const conversations = await this.db.getAll(this.storeName);
      
      let cleaned = 0;
      const toDelete = [];
      
      for (const conv of conversations) {
        // Delete archived conversations older than cutoff
        if (conv.archived && conv.updatedAt < cutoffDate) {
          toDelete.push(conv.id);
          cleaned++;
          
          if (toDelete.length >= this.config.cleanupBatchSize) {
            await this.deleteBatch(toDelete);
            toDelete.length = 0;
          }
        }
      }
      
      // Delete remaining batch
      if (toDelete.length > 0) {
        await this.deleteBatch(toDelete);
      }
      
      console.log('[ConversationManager] Cleaned up conversations:', cleaned);
      return cleaned;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'cleanupOldConversations' 
      });
      throw error;
    }
  }

  /**
   * Export conversation
   * @param {string} id - Conversation ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Exported data
   */
  async export(id, options = {}) {
    try {
      const conversation = await this.get(id);
      if (!conversation) {
        throw new ValidationError(`Conversation not found: ${id}`);
      }
      
      const { includeMessages = true, format = 'json' } = options;
      
      const exportData = {
        conversation,
        exportedAt: Date.now(),
        version: '1.0'
      };
      
      if (includeMessages) {
        exportData.messages = await this.getConversationMessages(id);
      }
      
      if (format === 'markdown') {
        return this.convertToMarkdown(exportData);
      }
      
      return exportData;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'export',
        id,
        options 
      });
      throw error;
    }
  }

  /**
   * Import conversation
   * @param {Object} data - Import data
   * @returns {Promise<Object>} Imported conversation
   */
  async import(data) {
    try {
      if (!data.conversation) {
        throw new ValidationError('Invalid import data: missing conversation');
      }
      
      // Create new conversation with imported data
      const conversation = await this.create({
        title: data.conversation.title,
        url: data.conversation.metadata?.url,
        metadata: data.conversation.metadata,
        state: data.conversation.state
      });
      
      // Import messages if included
      if (data.messages && Array.isArray(data.messages)) {
        for (const message of data.messages) {
          await this.addMessage(conversation.id, {
            ...message,
            conversationId: conversation.id
          });
        }
      }
      
      return conversation;
      
    } catch (error) {
      handleError(error, { 
        component: 'ConversationManager', 
        method: 'import',
        data 
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
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate conversation data
   * @private
   * @param {Object} data - Data to validate
   */
  validateConversationData(data) {
    if (data.title && data.title.length > this.config.maxTitleLength) {
      throw new ValidationError(`Title too long: ${data.title.length} characters`);
    }
    
    if (data.url) {
      try {
        new URL(data.url);
      } catch (e) {
        throw new ValidationError(`Invalid URL: ${data.url}`);
      }
    }
    
    if (data.tags && !Array.isArray(data.tags)) {
      throw new ValidationError('Tags must be an array');
    }
  }

  /**
   * Update cache
   * @private
   * @param {string} id - Conversation ID
   * @param {Object} conversation - Conversation data
   */
  updateCache(id, conversation) {
    // Implement LRU cache
    if (this.cache.size >= this.cacheMaxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(id, conversation);
  }

  /**
   * Update access time
   * @private
   * @param {string} id - Conversation ID
   */
  async updateAccessTime(id) {
    try {
      const conversation = await this.db.get(this.storeName, id);
      if (conversation) {
        conversation.state.lastAccessedAt = Date.now();
        await this.db.put(this.storeName, conversation);
      }
    } catch (error) {
      // Non-critical error, log but don't throw
      console.error('[ConversationManager] Failed to update access time:', error);
    }
  }

  /**
   * Delete conversation messages
   * @private
   * @param {string} conversationId - Conversation ID
   */
  async deleteConversationMessages(conversationId) {
    const messages = await this.db.getAll(this.messagesStoreName, {
      index: 'by_conversation',
      range: { start: conversationId, end: conversationId }
    });
    
    const messageIds = messages.map(msg => msg.id);
    if (messageIds.length > 0) {
      await this.db.deleteMany(this.messagesStoreName, messageIds);
    }
  }

  /**
   * Get conversation messages
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} Messages
   */
  async getConversationMessages(conversationId, options = {}) {
    return await this.db.getAll(this.messagesStoreName, {
      index: 'by_conversation',
      range: { start: conversationId, end: conversationId },
      ...options
    });
  }

  /**
   * Add message to conversation
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {Object} message - Message data
   */
  async addMessage(conversationId, message) {
    await this.db.add(this.messagesStoreName, {
      ...message,
      id: message.id || this.generateId().replace('conv_', 'msg_'),
      conversationId
    });
  }

  /**
   * Calculate message statistics
   * @private
   * @param {Array} messages - Messages array
   * @returns {Object} Statistics
   */
  calculateMessageStats(messages) {
    const stats = {
      total: messages.length,
      byRole: { user: 0, assistant: 0, system: 0 },
      avgLength: 0,
      totalTokens: 0
    };
    
    let totalLength = 0;
    
    for (const msg of messages) {
      stats.byRole[msg.role] = (stats.byRole[msg.role] || 0) + 1;
      totalLength += msg.content?.length || 0;
      stats.totalTokens += msg.tokens || 0;
    }
    
    if (messages.length > 0) {
      stats.avgLength = totalLength / messages.length;
    }
    
    return stats;
  }

  /**
   * Delete batch of conversations
   * @private
   * @param {Array} ids - Conversation IDs
   */
  async deleteBatch(ids) {
    for (const id of ids) {
      await this.delete(id);
    }
  }

  /**
   * Convert to markdown format
   * @private
   * @param {Object} data - Export data
   * @returns {string} Markdown content
   */
  convertToMarkdown(data) {
    let markdown = `# ${data.conversation.title}\n\n`;
    markdown += `**Created:** ${new Date(data.conversation.createdAt).toLocaleString()}\n`;
    markdown += `**Updated:** ${new Date(data.conversation.updatedAt).toLocaleString()}\n`;
    
    if (data.conversation.metadata.url) {
      markdown += `**URL:** ${data.conversation.metadata.url}\n`;
    }
    
    markdown += '\n---\n\n';
    
    if (data.messages) {
      for (const msg of data.messages) {
        markdown += `### ${msg.role.toUpperCase()}\n`;
        markdown += `${msg.content}\n\n`;
      }
    }
    
    return markdown;
  }

  /**
   * Get count of conversations
   * @private
   * @returns {Promise<number>} Count
   */
  async getCount() {
    return await this.db.count(this.storeName);
  }
}