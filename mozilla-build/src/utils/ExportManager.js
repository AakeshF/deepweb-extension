/**
 * Export Manager
 * Handles exporting conversations in multiple formats with various options
 */

import { handleError } from '../errors/index.js';
import ConversationManager from '../storage/conversations/ConversationManager.js';
import MessageManager from '../storage/messages/MessageManager.js';

export default class ExportManager {
  constructor() {
    this.conversationManager = new ConversationManager();
    this.messageManager = new MessageManager();
    
    // Configuration
    this.config = {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      compressionLevel: 6,
      chunkSize: 1024 * 1024, // 1MB chunks for large exports
      supportedFormats: ['json', 'markdown', 'html', 'csv'],
      defaultOptions: {
        includeMetadata: true,
        includeTimestamps: true,
        includeStatistics: true,
        anonymize: false,
        compress: false,
        prettyPrint: true
      }
    };
    
    // Progress tracking
    this.exportProgress = new Map();
  }

  /**
   * Initialize the export manager
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      await this.conversationManager.initialize();
      await this.messageManager.initialize();
      console.log('[ExportManager] Initialized successfully');
    } catch (error) {
      handleError(error, { component: 'ExportManager', method: 'initialize' });
      throw error;
    }
  }

  /**
   * Export conversations
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result with file data
   */
  async export(options = {}) {
    const exportId = this.generateExportId();
    
    try {
      // Initialize progress tracking
      this.exportProgress.set(exportId, {
        status: 'preparing',
        progress: 0,
        total: 0,
        processedConversations: 0,
        processedMessages: 0
      });
      
      // Merge with default options
      const exportOptions = {
        ...this.config.defaultOptions,
        ...options
      };
      
      // Validate format
      if (!this.config.supportedFormats.includes(exportOptions.format)) {
        throw new Error(`Unsupported format: ${exportOptions.format}`);
      }
      
      // Get conversations to export
      const conversations = await this.getConversationsToExport(exportOptions);
      this.updateProgress(exportId, { total: conversations.length, status: 'processing' });
      
      // Build export data
      const exportData = {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        exportId,
        metadata: {
          format: exportOptions.format,
          totalConversations: conversations.length,
          options: exportOptions,
          extension: {
            name: 'DeepWeb',
            version: '1.0.0'
          }
        },
        conversations: []
      };
      
      // Process conversations
      for (let i = 0; i < conversations.length; i++) {
        const conversation = conversations[i];
        const processedConv = await this.processConversation(
          conversation, 
          exportOptions, 
          exportId
        );
        
        exportData.conversations.push(processedConv);
        
        this.updateProgress(exportId, {
          processedConversations: i + 1,
          progress: Math.round(((i + 1) / conversations.length) * 100)
        });
      }
      
      // Add statistics if requested
      if (exportOptions.includeStatistics) {
        exportData.statistics = await this.generateStatistics(exportData);
      }
      
      // Convert to requested format
      let fileData;
      let mimeType;
      let extension;
      
      switch (exportOptions.format) {
        case 'json':
          fileData = this.convertToJSON(exportData, exportOptions);
          mimeType = 'application/json';
          extension = 'json';
          break;
          
        case 'markdown':
          fileData = this.convertToMarkdown(exportData, exportOptions);
          mimeType = 'text/markdown';
          extension = 'md';
          break;
          
        case 'html':
          fileData = this.convertToHTML(exportData, exportOptions);
          mimeType = 'text/html';
          extension = 'html';
          break;
          
        case 'csv':
          fileData = this.convertToCSV(exportData, exportOptions);
          mimeType = 'text/csv';
          extension = 'csv';
          break;
      }
      
      // Compress if requested
      if (exportOptions.compress) {
        fileData = await this.compressData(fileData);
        extension += '.gz';
        mimeType = 'application/gzip';
      }
      
      // Generate filename
      const filename = this.generateFilename(exportOptions, extension);
      
      // Update progress
      this.updateProgress(exportId, { status: 'completed', progress: 100 });
      
      return {
        success: true,
        exportId,
        filename,
        mimeType,
        data: fileData,
        size: fileData.length,
        metadata: exportData.metadata
      };
      
    } catch (error) {
      this.updateProgress(exportId, { status: 'failed', error: error.message });
      handleError(error, { 
        component: 'ExportManager', 
        method: 'export',
        options 
      });
      throw error;
    } finally {
      // Clean up progress tracking after a delay
      setTimeout(() => this.exportProgress.delete(exportId), 60000);
    }
  }

  /**
   * Get export progress
   * @param {string} exportId - Export ID
   * @returns {Object} Progress information
   */
  getProgress(exportId) {
    return this.exportProgress.get(exportId) || null;
  }

  /**
   * Export single conversation
   * @param {string} conversationId - Conversation ID
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportSingle(conversationId, options = {}) {
    return this.export({
      ...options,
      scope: 'single',
      conversationId
    });
  }

  /**
   * Export all conversations
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportAll(options = {}) {
    return this.export({
      ...options,
      scope: 'all'
    });
  }

  /**
   * Export conversations by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   */
  async exportDateRange(startDate, endDate, options = {}) {
    return this.export({
      ...options,
      scope: 'dateRange',
      startDate: startDate.getTime(),
      endDate: endDate.getTime()
    });
  }

  // Private methods

  /**
   * Get conversations to export based on options
   * @private
   */
  async getConversationsToExport(options) {
    const { scope = 'all', conversationId, startDate, endDate } = options;
    
    switch (scope) {
      case 'single':
        if (!conversationId) {
          throw new Error('Conversation ID required for single export');
        }
        const conversation = await this.conversationManager.get(conversationId);
        if (!conversation) {
          throw new Error(`Conversation not found: ${conversationId}`);
        }
        return [conversation];
        
      case 'dateRange':
        if (!startDate || !endDate) {
          throw new Error('Start and end dates required for date range export');
        }
        const allConversations = await this.conversationManager.list({ 
          pageSize: 1000,
          includeArchived: true 
        });
        return allConversations.items.filter(conv => 
          conv.createdAt >= startDate && conv.createdAt <= endDate
        );
        
      case 'all':
      default:
        const result = await this.conversationManager.list({ 
          pageSize: 1000,
          includeArchived: true 
        });
        return result.items;
    }
  }

  /**
   * Process single conversation for export
   * @private
   */
  async processConversation(conversation, options, exportId) {
    const processed = {
      id: conversation.id,
      title: conversation.title,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt
    };
    
    // Include metadata if requested
    if (options.includeMetadata) {
      processed.metadata = options.anonymize 
        ? this.anonymizeMetadata(conversation.metadata)
        : conversation.metadata;
    }
    
    // Include timestamps in readable format if requested
    if (options.includeTimestamps) {
      processed.createdAtFormatted = new Date(conversation.createdAt).toISOString();
      processed.updatedAtFormatted = new Date(conversation.updatedAt).toISOString();
    }
    
    // Get messages
    const messages = await this.messageManager.list(conversation.id, {
      pageSize: 1000,
      includeSystem: true
    });
    
    processed.messages = messages.items.map(msg => 
      this.processMessage(msg, options)
    );
    
    // Update progress
    const progress = this.exportProgress.get(exportId);
    if (progress) {
      progress.processedMessages += messages.items.length;
      this.exportProgress.set(exportId, progress);
    }
    
    return processed;
  }

  /**
   * Process single message for export
   * @private
   */
  processMessage(message, options) {
    const processed = {
      id: message.id,
      role: message.role,
      content: options.anonymize ? this.anonymizeContent(message.content) : message.content,
      timestamp: message.timestamp
    };
    
    if (options.includeMetadata) {
      processed.metadata = options.anonymize
        ? this.anonymizeMetadata(message.metadata)
        : message.metadata;
    }
    
    if (options.includeTimestamps) {
      processed.timestampFormatted = new Date(message.timestamp).toISOString();
    }
    
    return processed;
  }

  /**
   * Convert to JSON format
   * @private
   */
  convertToJSON(data, options) {
    const jsonString = options.prettyPrint 
      ? JSON.stringify(data, null, 2)
      : JSON.stringify(data);
    
    return jsonString;
  }

  /**
   * Convert to Markdown format
   * @private
   */
  convertToMarkdown(data, options) {
    let markdown = `# DeepWeb Conversation Export\n\n`;
    markdown += `**Exported:** ${data.exportedAt}\n`;
    markdown += `**Total Conversations:** ${data.metadata.totalConversations}\n\n`;
    
    if (data.statistics && options.includeStatistics) {
      markdown += `## Statistics\n\n`;
      markdown += `- Total Messages: ${data.statistics.totalMessages}\n`;
      markdown += `- Average Messages per Conversation: ${data.statistics.avgMessagesPerConversation}\n`;
      markdown += `- Total Characters: ${data.statistics.totalCharacters}\n\n`;
    }
    
    markdown += `---\n\n`;
    
    for (const conv of data.conversations) {
      markdown += `## ${conv.title}\n\n`;
      
      if (options.includeTimestamps) {
        markdown += `*Created: ${conv.createdAtFormatted}*\n`;
        markdown += `*Updated: ${conv.updatedAtFormatted}*\n\n`;
      }
      
      if (options.includeMetadata && conv.metadata?.url) {
        markdown += `**URL:** ${conv.metadata.url}\n\n`;
      }
      
      for (const msg of conv.messages) {
        markdown += `### ${msg.role.toUpperCase()}\n`;
        
        if (options.includeTimestamps) {
          markdown += `*${msg.timestampFormatted}*\n\n`;
        }
        
        markdown += `${msg.content}\n\n`;
      }
      
      markdown += `---\n\n`;
    }
    
    return markdown;
  }

  /**
   * Convert to HTML format
   * @private
   */
  convertToHTML(data, options) {
    let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepWeb Conversation Export</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .conversation {
            background: white;
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .message {
            margin: 15px 0;
            padding: 10px;
            border-radius: 5px;
        }
        .message.user {
            background-color: #e3f2fd;
            margin-left: 20px;
        }
        .message.assistant {
            background-color: #f5f5f5;
            margin-right: 20px;
        }
        .message.system {
            background-color: #fff3cd;
            font-style: italic;
        }
        .role {
            font-weight: bold;
            color: #666;
            font-size: 0.9em;
        }
        .timestamp {
            font-size: 0.8em;
            color: #999;
        }
        .metadata {
            font-size: 0.9em;
            color: #666;
            margin-top: 5px;
        }
        h1, h2 {
            color: #333;
        }
        .statistics {
            background: #e8f5e9;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
    </style>
</head>
<body>
    <h1>DeepWeb Conversation Export</h1>
    <p><strong>Exported:</strong> ${data.exportedAt}</p>
    <p><strong>Total Conversations:</strong> ${data.metadata.totalConversations}</p>
`;
    
    if (data.statistics && options.includeStatistics) {
      html += `
    <div class="statistics">
        <h2>Statistics</h2>
        <ul>
            <li>Total Messages: ${data.statistics.totalMessages}</li>
            <li>Average Messages per Conversation: ${data.statistics.avgMessagesPerConversation}</li>
            <li>Total Characters: ${data.statistics.totalCharacters}</li>
        </ul>
    </div>
`;
    }
    
    for (const conv of data.conversations) {
      html += `
    <div class="conversation">
        <h2>${this.escapeHtml(conv.title)}</h2>
`;
      
      if (options.includeTimestamps) {
        html += `        <p class="timestamp">Created: ${conv.createdAtFormatted}</p>\n`;
        html += `        <p class="timestamp">Updated: ${conv.updatedAtFormatted}</p>\n`;
      }
      
      if (options.includeMetadata && conv.metadata?.url) {
        html += `        <p class="metadata">URL: <a href="${this.escapeHtml(conv.metadata.url)}">${this.escapeHtml(conv.metadata.url)}</a></p>\n`;
      }
      
      for (const msg of conv.messages) {
        html += `
        <div class="message ${msg.role}">
            <div class="role">${msg.role.toUpperCase()}</div>
`;
        
        if (options.includeTimestamps) {
          html += `            <div class="timestamp">${msg.timestampFormatted}</div>\n`;
        }
        
        html += `            <div class="content">${this.escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>\n`;
        html += `        </div>\n`;
      }
      
      html += `    </div>\n`;
    }
    
    html += `
</body>
</html>`;
    
    return html;
  }

  /**
   * Convert to CSV format
   * @private
   */
  convertToCSV(data, options) {
    const headers = ['Conversation ID', 'Conversation Title', 'Message ID', 'Role', 'Content', 'Timestamp'];
    
    if (options.includeMetadata) {
      headers.push('Model', 'URL');
    }
    
    const rows = [headers];
    
    for (const conv of data.conversations) {
      for (const msg of conv.messages) {
        const row = [
          conv.id,
          this.escapeCSV(conv.title),
          msg.id,
          msg.role,
          this.escapeCSV(msg.content),
          options.includeTimestamps ? msg.timestampFormatted : msg.timestamp
        ];
        
        if (options.includeMetadata) {
          row.push(
            msg.metadata?.model || '',
            conv.metadata?.url || ''
          );
        }
        
        rows.push(row);
      }
    }
    
    return rows.map(row => row.join(',')).join('\n');
  }

  /**
   * Generate export statistics
   * @private
   */
  async generateStatistics(data) {
    let totalMessages = 0;
    let totalCharacters = 0;
    const roleCount = { user: 0, assistant: 0, system: 0 };
    const modelUsage = {};
    
    for (const conv of data.conversations) {
      totalMessages += conv.messages.length;
      
      for (const msg of conv.messages) {
        totalCharacters += msg.content.length;
        roleCount[msg.role] = (roleCount[msg.role] || 0) + 1;
        
        if (msg.metadata?.model) {
          modelUsage[msg.metadata.model] = (modelUsage[msg.metadata.model] || 0) + 1;
        }
      }
    }
    
    return {
      totalMessages,
      totalCharacters,
      avgMessagesPerConversation: Math.round(totalMessages / data.conversations.length),
      avgCharactersPerMessage: Math.round(totalCharacters / totalMessages),
      messagesByRole: roleCount,
      modelUsage
    };
  }

  /**
   * Anonymize content
   * @private
   */
  anonymizeContent(content) {
    // Replace email addresses
    content = content.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
    
    // Replace phone numbers
    content = content.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
    
    // Replace URLs
    content = content.replace(/https?:\/\/[^\s]+/g, '[URL]');
    
    // Replace potential names (simple heuristic)
    content = content.replace(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g, '[NAME]');
    
    return content;
  }

  /**
   * Anonymize metadata
   * @private
   */
  anonymizeMetadata(metadata) {
    if (!metadata) return {};
    
    const anonymized = { ...metadata };
    
    if (anonymized.url) {
      anonymized.url = '[ANONYMIZED_URL]';
    }
    
    if (anonymized.domain) {
      anonymized.domain = '[ANONYMIZED_DOMAIN]';
    }
    
    return anonymized;
  }

  /**
   * Compress data
   * @private
   */
  async compressData(data) {
    // Convert string to Uint8Array
    const encoder = new TextEncoder();
    const inputArray = encoder.encode(data);
    
    // Use CompressionStream API if available
    if (typeof CompressionStream !== 'undefined') {
      const stream = new CompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(inputArray);
      writer.close();
      
      const compressedChunks = [];
      const reader = stream.readable.getReader();
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        compressedChunks.push(value);
      }
      
      // Combine chunks
      const totalLength = compressedChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const result = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of compressedChunks) {
        result.set(chunk, offset);
        offset += chunk.length;
      }
      
      return result;
    }
    
    // Fallback: return uncompressed data
    console.warn('[ExportManager] CompressionStream not available, returning uncompressed data');
    return inputArray;
  }

  /**
   * Generate export ID
   * @private
   */
  generateExportId() {
    return `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate filename
   * @private
   */
  generateFilename(options, extension) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const scope = options.scope === 'single' ? 'conversation' : 'conversations';
    return `deepweb_${scope}_${timestamp}.${extension}`;
  }

  /**
   * Update progress
   * @private
   */
  updateProgress(exportId, updates) {
    const current = this.exportProgress.get(exportId);
    if (current) {
      this.exportProgress.set(exportId, { ...current, ...updates });
    }
  }

  /**
   * Escape HTML
   * @private
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }

  /**
   * Escape CSV
   * @private
   */
  escapeCSV(text) {
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }
}