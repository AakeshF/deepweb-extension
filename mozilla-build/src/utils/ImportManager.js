/**
 * Import Manager
 * Handles importing conversations from various formats with validation and migration
 */

import { handleError, ValidationError } from '../errors/index.js';
import ConversationManager from '../storage/conversations/ConversationManager.js';
import MessageManager from '../storage/messages/MessageManager.js';

export default class ImportManager {
  constructor() {
    this.conversationManager = new ConversationManager();
    this.messageManager = new MessageManager();
    
    // Configuration
    this.config = {
      maxFileSize: 100 * 1024 * 1024, // 100MB
      batchSize: 50, // Process conversations in batches
      supportedFormats: ['json'],
      validationRules: {
        minConversationFields: ['id', 'title', 'messages'],
        minMessageFields: ['role', 'content'],
        validRoles: ['user', 'assistant', 'system'],
        maxTitleLength: 200,
        maxMessageLength: 100000
      }
    };
    
    // Import progress tracking
    this.importProgress = new Map();
    
    // Duplicate handling strategies
    this.duplicateStrategies = {
      skip: 'skip',
      replace: 'replace',
      merge: 'merge',
      rename: 'rename'
    };
  }

  /**
   * Initialize the import manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.conversationManager.initialize();
      await this.messageManager.initialize();
      console.log('[ImportManager] Initialized successfully');
    } catch (error) {
      handleError(error, { component: 'ImportManager', method: 'initialize' });
      throw error;
    }
  }

  /**
   * Import conversations from file data
   * @param {Object} options - Import options
   * @returns {Promise<Object>} Import result
   */
  async import(options = {}) {
    const importId = this.generateImportId();
    
    try {
      // Initialize progress tracking
      this.importProgress.set(importId, {
        status: 'validating',
        progress: 0,
        total: 0,
        processed: 0,
        succeeded: 0,
        failed: 0,
        skipped: 0,
        errors: []
      });
      
      const {
        data,
        format = 'json',
        duplicateStrategy = 'skip',
        validateData = true,
        migrateData = true
      } = options;
      
      // Validate file size
      if (data.length > this.config.maxFileSize) {
        throw new ValidationError(`File too large: ${Math.round(data.length / 1024 / 1024)}MB (max ${this.config.maxFileSize / 1024 / 1024}MB)`);
      }
      
      // Parse data based on format
      let parsedData;
      switch (format) {
        case 'json':
          parsedData = await this.parseJSON(data);
          break;
        default:
          throw new ValidationError(`Unsupported format: ${format}`);
      }
      
      // Validate data structure
      if (validateData) {
        await this.validateImportData(parsedData, importId);
      }
      
      // Migrate data if needed
      if (migrateData) {
        parsedData = await this.migrateData(parsedData);
      }
      
      // Get conversations from data
      const conversations = this.extractConversations(parsedData);
      this.updateProgress(importId, { 
        total: conversations.length, 
        status: 'processing' 
      });
      
      // Process in batches
      const results = await this.processBatches(
        conversations, 
        duplicateStrategy, 
        importId
      );
      
      // Generate summary
      const summary = this.generateImportSummary(results, importId);
      
      // Update final progress
      this.updateProgress(importId, { 
        status: 'completed',
        progress: 100,
        summary
      });
      
      return {
        success: true,
        importId,
        summary,
        details: results
      };
      
    } catch (error) {
      this.updateProgress(importId, { 
        status: 'failed', 
        error: error.message 
      });
      
      handleError(error, { 
        component: 'ImportManager', 
        method: 'import',
        options 
      });
      throw error;
    } finally {
      // Clean up progress tracking after a delay
      setTimeout(() => this.importProgress.delete(importId), 60000);
    }
  }

  /**
   * Get import progress
   * @param {string} importId - Import ID
   * @returns {Object} Progress information
   */
  getProgress(importId) {
    return this.importProgress.get(importId) || null;
  }

  /**
   * Validate import file before processing
   * @param {any} data - File data to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateFile(data) {
    try {
      const parsed = await this.parseJSON(data);
      const validation = await this.validateImportData(parsed);
      
      return {
        valid: validation.valid,
        errors: validation.errors,
        warnings: validation.warnings,
        stats: {
          conversations: validation.conversationCount,
          messages: validation.messageCount,
          estimatedSize: validation.estimatedSize
        }
      };
    } catch (error) {
      return {
        valid: false,
        errors: [error.message],
        warnings: [],
        stats: null
      };
    }
  }

  // Private methods

  /**
   * Parse JSON data
   * @private
   */
  async parseJSON(data) {
    try {
      // Handle different input types
      let jsonString;
      
      if (typeof data === 'string') {
        jsonString = data;
      } else if (data instanceof ArrayBuffer) {
        const decoder = new TextDecoder();
        jsonString = decoder.decode(data);
      } else if (data instanceof Uint8Array) {
        const decoder = new TextDecoder();
        jsonString = decoder.decode(data);
      } else {
        throw new Error('Invalid data type');
      }
      
      // Check if compressed (gzip magic number)
      if (jsonString.charCodeAt(0) === 0x1f && jsonString.charCodeAt(1) === 0x8b) {
        jsonString = await this.decompressData(data);
      }
      
      return JSON.parse(jsonString);
    } catch (error) {
      throw new ValidationError(`Failed to parse JSON: ${error.message}`);
    }
  }

  /**
   * Validate import data structure
   * @private
   */
  async validateImportData(data, importId) {
    const validation = {
      valid: true,
      errors: [],
      warnings: [],
      conversationCount: 0,
      messageCount: 0,
      estimatedSize: 0
    };
    
    try {
      // Check for required fields
      if (!data || typeof data !== 'object') {
        throw new ValidationError('Invalid data structure');
      }
      
      // Extract conversations
      const conversations = this.extractConversations(data);
      validation.conversationCount = conversations.length;
      
      if (conversations.length === 0) {
        throw new ValidationError('No conversations found in import data');
      }
      
      // Validate each conversation
      for (let i = 0; i < conversations.length; i++) {
        const conv = conversations[i];
        
        try {
          this.validateConversation(conv);
          validation.messageCount += conv.messages?.length || 0;
          validation.estimatedSize += JSON.stringify(conv).length;
        } catch (error) {
          validation.errors.push(`Conversation ${i + 1}: ${error.message}`);
          validation.valid = false;
        }
        
        // Update progress
        if (importId) {
          this.updateProgress(importId, {
            progress: Math.round((i / conversations.length) * 50) // 50% for validation
          });
        }
      }
      
      // Add warnings for large imports
      if (validation.conversationCount > 100) {
        validation.warnings.push(`Large import: ${validation.conversationCount} conversations may take some time`);
      }
      
      if (validation.estimatedSize > 10 * 1024 * 1024) {
        validation.warnings.push(`Large data size: ${Math.round(validation.estimatedSize / 1024 / 1024)}MB`);
      }
      
      return validation;
      
    } catch (error) {
      validation.valid = false;
      validation.errors.push(error.message);
      return validation;
    }
  }

  /**
   * Validate single conversation
   * @private
   */
  validateConversation(conversation) {
    // Check required fields
    for (const field of this.config.validationRules.minConversationFields) {
      if (!(field in conversation)) {
        throw new ValidationError(`Missing required field: ${field}`);
      }
    }
    
    // Validate title
    if (typeof conversation.title !== 'string' || conversation.title.trim().length === 0) {
      throw new ValidationError('Invalid conversation title');
    }
    
    if (conversation.title.length > this.config.validationRules.maxTitleLength) {
      throw new ValidationError(`Title too long: ${conversation.title.length} characters`);
    }
    
    // Validate messages
    if (!Array.isArray(conversation.messages)) {
      throw new ValidationError('Messages must be an array');
    }
    
    if (conversation.messages.length === 0) {
      throw new ValidationError('Conversation must have at least one message');
    }
    
    // Validate each message
    conversation.messages.forEach((msg, index) => {
      this.validateMessage(msg, index);
    });
  }

  /**
   * Validate single message
   * @private
   */
  validateMessage(message, index) {
    // Check required fields
    for (const field of this.config.validationRules.minMessageFields) {
      if (!(field in message)) {
        throw new ValidationError(`Message ${index + 1}: Missing required field: ${field}`);
      }
    }
    
    // Validate role
    if (!this.config.validationRules.validRoles.includes(message.role)) {
      throw new ValidationError(`Message ${index + 1}: Invalid role: ${message.role}`);
    }
    
    // Validate content
    if (typeof message.content !== 'string') {
      throw new ValidationError(`Message ${index + 1}: Content must be a string`);
    }
    
    if (message.content.length > this.config.validationRules.maxMessageLength) {
      throw new ValidationError(`Message ${index + 1}: Content too long: ${message.content.length} characters`);
    }
  }

  /**
   * Extract conversations from import data
   * @private
   */
  extractConversations(data) {
    // Handle different data structures
    if (Array.isArray(data)) {
      return data;
    }
    
    if (data.conversations && Array.isArray(data.conversations)) {
      return data.conversations;
    }
    
    if (data.data && Array.isArray(data.data)) {
      return data.data;
    }
    
    // Single conversation
    if (data.id && data.messages) {
      return [data];
    }
    
    return [];
  }

  /**
   * Migrate data to current format
   * @private
   */
  async migrateData(data) {
    // Detect version
    const version = data.version || '1.0';
    
    // Apply migrations based on version
    if (version === '1.0') {
      return this.migrateV1ToV2(data);
    }
    
    return data;
  }

  /**
   * Migrate v1 data to v2 format
   * @private
   */
  migrateV1ToV2(data) {
    const migrated = { ...data, version: '2.0' };
    
    // Update conversation structure
    if (migrated.conversations) {
      migrated.conversations = migrated.conversations.map(conv => ({
        ...conv,
        metadata: conv.metadata || {
          url: conv.url,
          domain: conv.domain,
          tags: conv.tags || []
        },
        state: conv.state || {
          archived: conv.archived || false,
          isActive: true
        }
      }));
    }
    
    return migrated;
  }

  /**
   * Process conversations in batches
   * @private
   */
  async processBatches(conversations, duplicateStrategy, importId) {
    const results = [];
    const batches = this.createBatches(conversations, this.config.batchSize);
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const batchResults = await this.processBatch(batch, duplicateStrategy, importId);
      results.push(...batchResults);
      
      // Update progress
      const processed = Math.min(conversations.length, (i + 1) * this.config.batchSize);
      this.updateProgress(importId, {
        processed,
        progress: 50 + Math.round((processed / conversations.length) * 50) // 50-100% for processing
      });
    }
    
    return results;
  }

  /**
   * Process single batch of conversations
   * @private
   */
  async processBatch(batch, duplicateStrategy, importId) {
    const results = [];
    
    for (const conversation of batch) {
      try {
        const result = await this.importConversation(conversation, duplicateStrategy);
        results.push({
          originalId: conversation.id,
          newId: result.id,
          status: 'success',
          action: result.action
        });
        
        // Update progress
        const progress = this.importProgress.get(importId);
        if (progress) {
          progress.succeeded++;
          this.importProgress.set(importId, progress);
        }
        
      } catch (error) {
        results.push({
          originalId: conversation.id,
          status: 'failed',
          error: error.message
        });
        
        // Update progress
        const progress = this.importProgress.get(importId);
        if (progress) {
          progress.failed++;
          progress.errors.push({
            conversationId: conversation.id,
            error: error.message
          });
          this.importProgress.set(importId, progress);
        }
      }
    }
    
    return results;
  }

  /**
   * Import single conversation
   * @private
   */
  async importConversation(conversation, duplicateStrategy) {
    // Check for duplicates
    const duplicate = await this.findDuplicate(conversation);
    
    if (duplicate) {
      switch (duplicateStrategy) {
        case 'skip':
          return { id: duplicate.id, action: 'skipped' };
          
        case 'replace':
          await this.conversationManager.delete(duplicate.id);
          break;
          
        case 'merge':
          return await this.mergeConversations(duplicate, conversation);
          
        case 'rename':
          conversation.title = `${conversation.title} (Imported ${new Date().toLocaleDateString()})`;
          break;
      }
    }
    
    // Create new conversation
    const newConversation = await this.conversationManager.create({
      title: conversation.title,
      url: conversation.metadata?.url || conversation.url,
      metadata: conversation.metadata || {},
      state: conversation.state || {}
    });
    
    // Import messages
    for (const message of conversation.messages) {
      await this.messageManager.add(newConversation.id, {
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        state: message.state || {},
        timestamp: message.timestamp || Date.now()
      });
    }
    
    return { 
      id: newConversation.id, 
      action: duplicate ? duplicateStrategy : 'created' 
    };
  }

  /**
   * Find duplicate conversation
   * @private
   */
  async findDuplicate(conversation) {
    // First check by original ID
    if (conversation.id) {
      const existing = await this.conversationManager.get(conversation.id);
      if (existing) return existing;
    }
    
    // Check by title and creation time
    const candidates = await this.conversationManager.search(conversation.title, {
      limit: 10,
      includeArchived: true
    });
    
    for (const candidate of candidates) {
      // Consider it duplicate if title matches and created within 1 hour
      if (candidate.title === conversation.title &&
          Math.abs(candidate.createdAt - (conversation.createdAt || 0)) < 3600000) {
        return candidate;
      }
    }
    
    return null;
  }

  /**
   * Merge conversations
   * @private
   */
  async mergeConversations(existing, imported) {
    // Get existing messages
    const existingMessages = await this.messageManager.list(existing.id, {
      pageSize: 1000
    });
    
    // Find new messages to add
    const existingContents = new Set(
      existingMessages.items.map(m => `${m.role}:${m.content}`)
    );
    
    const newMessages = imported.messages.filter(m => 
      !existingContents.has(`${m.role}:${m.content}`)
    );
    
    // Add new messages
    for (const message of newMessages) {
      await this.messageManager.add(existing.id, {
        role: message.role,
        content: message.content,
        metadata: message.metadata || {},
        state: message.state || {},
        timestamp: message.timestamp || Date.now()
      });
    }
    
    // Update conversation metadata if needed
    if (imported.updatedAt > existing.updatedAt) {
      await this.conversationManager.update(existing.id, {
        metadata: { ...existing.metadata, ...imported.metadata }
      });
    }
    
    return { id: existing.id, action: 'merged' };
  }

  /**
   * Generate import summary
   * @private
   */
  generateImportSummary(results, importId) {
    const progress = this.importProgress.get(importId);
    
    const summary = {
      total: results.length,
      succeeded: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length,
      actions: {
        created: results.filter(r => r.action === 'created').length,
        skipped: results.filter(r => r.action === 'skipped').length,
        replaced: results.filter(r => r.action === 'replaced').length,
        merged: results.filter(r => r.action === 'merged').length,
        renamed: results.filter(r => r.action === 'renamed').length
      }
    };
    
    if (progress) {
      summary.errors = progress.errors;
    }
    
    return summary;
  }

  /**
   * Create batches
   * @private
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Decompress data
   * @private
   */
  async decompressData(data) {
    // Use DecompressionStream API if available
    if (typeof DecompressionStream !== 'undefined') {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(data);
      writer.close();
      
      const chunks = [];
      const reader = stream.readable.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      // Combine chunks and decode
      const decoder = new TextDecoder();
      return chunks.map(chunk => decoder.decode(chunk)).join('');
    }
    
    throw new Error('Cannot decompress data: DecompressionStream not available');
  }

  /**
   * Generate import ID
   * @private
   */
  generateImportId() {
    return `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update progress
   * @private
   */
  updateProgress(importId, updates) {
    const current = this.importProgress.get(importId);
    if (current) {
      this.importProgress.set(importId, { ...current, ...updates });
    }
  }
}