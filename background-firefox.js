// Firefox Background Script for DeepWeb Extension
// Uses browser namespace and Manifest V2 compatible APIs

console.log('[DeepWeb Background] Starting Firefox version...');

// Load configuration
const CONFIG = {
  api: {
    endpoint: 'https://api.deepseek.com/v1/chat/completions',
    timeout: 30000
  },
  rateLimit: {
    minInterval: 10000 // 10 seconds
  },
  content: {
    previewLength: 500,
    maxMessageLength: 1000
  }
};

// Export/Import managers (simplified versions for background script)
const exportManager = {
  progress: new Map(),
  
  getProgress(exportId) {
    return this.progress.get(exportId) || null;
  },
  
  setProgress(exportId, data) {
    this.progress.set(exportId, data);
    // Clean up after 5 minutes
    setTimeout(() => this.progress.delete(exportId), 300000);
  }
};

const importManager = {
  progress: new Map(),
  
  getProgress(importId) {
    return this.progress.get(importId) || null;
  },
  
  setProgress(importId, data) {
    this.progress.set(importId, data);
    // Clean up after 5 minutes
    setTimeout(() => this.progress.delete(importId), 300000);
  }
};

// Enhanced rate limiter with request tracking
const rateLimiter = {
  requests: [],
  
  canMakeRequest() {
    const now = Date.now();
    // Clean old requests (older than 1 hour)
    this.requests = this.requests.filter(time => now - time < 3600000);
    
    // Check rate limit
    const recentRequest = this.requests.find(time => now - time < CONFIG.rateLimit.minInterval);
    if (recentRequest) {
      return false;
    }
    
    // Add this request
    this.requests.push(now);
    return true;
  },
  
  getTimeUntilNextRequest() {
    const now = Date.now();
    const lastRequest = Math.max(...this.requests, 0);
    const timePassed = now - lastRequest;
    const timeRemaining = CONFIG.rateLimit.minInterval - timePassed;
    return Math.max(0, Math.ceil(timeRemaining / 1000));
  }
};

// Validation functions
function validateApiKey(key) {
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  // DeepSeek API keys are typically 51 characters starting with 'sk-'
  return trimmed.length >= 20 && 
         trimmed.length <= 200 &&
         /^sk-[a-zA-Z0-9]+$/.test(trimmed);
}

function sanitizeMessage(message) {
  if (!message || typeof message !== 'string') return '';
  // Remove any potential script tags or HTML
  return message.replace(/<[^>]*>/g, '').trim();
}

// Simple conversation storage using browser.storage
const conversationStorage = {
  async getAllConversations() {
    const data = await browser.storage.local.get('conversations');
    return data.conversations || [];
  },
  
  async saveConversations(conversations) {
    await browser.storage.local.set({ conversations });
  },
  
  async getCurrentConversationId() {
    const data = await browser.storage.local.get('currentConversationId');
    return data.currentConversationId;
  },
  
  async setCurrentConversationId(id) {
    await browser.storage.local.set({ currentConversationId: id });
  },
  
  async getMessages(conversationId) {
    const data = await browser.storage.local.get(`messages_${conversationId}`);
    return data[`messages_${conversationId}`] || [];
  },
  
  async saveMessages(conversationId, messages) {
    await browser.storage.local.set({ [`messages_${conversationId}`]: messages });
  },
  
  generateId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },
  
  generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
};

// Handle messages from content script
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[DeepWeb Background] Received message:', request.type);
  
  if (request.type === 'chat_request') {
    // Handle async properly in Firefox
    handleChatRequest(request, sender).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Conversation management handlers
  if (request.type.startsWith('conversation_') || 
      request.type.startsWith('message') ||
      request.type === 'update_message' ||
      request.type === 'delete_message' ||
      request.type === 'search_messages' ||
      request.type === 'get_message_stats') {
    handleStorageRequest(request).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  // Export/Import handlers
  if (request.type === 'export_data') {
    handleExportRequest(request).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'import_data') {
    handleImportRequest(request).then(response => {
      sendResponse(response);
    }).catch(error => {
      sendResponse({ error: error.message });
    });
    
    return true; // Keep channel open for async response
  }
  
  if (request.type === 'get_export_progress') {
    const progress = exportManager.getProgress(request.exportId);
    sendResponse({ progress });
    return false;
  }
  
  if (request.type === 'get_import_progress') {
    const progress = importManager.getProgress(request.importId);
    sendResponse({ progress });
    return false;
  }
  
  return false;
});

// Handle port connections for streaming
const activeStreams = new Map();

browser.runtime.onConnect.addListener((port) => {
  console.log('[DeepWeb Background] Port connected:', port.name);
  
  if (port.name === 'streaming') {
    port.onMessage.addListener(async (message) => {
      if (message.type === 'start_stream') {
        try {
          await handleStreamingRequest(port, message);
        } catch (error) {
          port.postMessage({
            type: 'error',
            error: error.message
          });
        }
      } else if (message.type === 'cancel_stream') {
        const streamId = message.streamId;
        const controller = activeStreams.get(streamId);
        if (controller) {
          controller.abort();
          activeStreams.delete(streamId);
        }
      }
    });
    
    port.onDisconnect.addListener(() => {
      console.log('[DeepWeb Background] Port disconnected');
      // Clean up any active streams for this port
      for (const [streamId, controller] of activeStreams) {
        if (streamId.startsWith(port.sender.tab.id + '_')) {
          controller.abort();
          activeStreams.delete(streamId);
        }
      }
    });
  }
});

// Handle storage requests
async function handleStorageRequest(request) {
  try {
    switch (request.type) {
      // Conversation operations
      case 'conversation_get_all':
        const conversations = await conversationStorage.getAllConversations();
        return { conversations };
        
      case 'conversation_get':
        const allConvs = await conversationStorage.getAllConversations();
        const conversation = allConvs.find(c => c.id === request.conversationId);
        return { conversation };
        
      case 'conversation_get_current':
        const currentId = await conversationStorage.getCurrentConversationId();
        if (!currentId) return { conversation: null };
        const convs = await conversationStorage.getAllConversations();
        return { conversation: convs.find(c => c.id === currentId) };
        
      case 'conversation_create':
        const newConv = {
          id: conversationStorage.generateId(),
          title: request.data.title || 'New Chat',
          model: request.data.model || 'deepseek-chat',
          createdAt: new Date().toISOString(),
          lastMessageAt: new Date().toISOString(),
          totalCost: 0
        };
        const existingConvs = await conversationStorage.getAllConversations();
        await conversationStorage.saveConversations([newConv, ...existingConvs]);
        await conversationStorage.setCurrentConversationId(newConv.id);
        return { conversation: newConv };
        
      case 'conversation_update':
        const convsToUpdate = await conversationStorage.getAllConversations();
        const index = convsToUpdate.findIndex(c => c.id === request.conversationId);
        if (index !== -1) {
          convsToUpdate[index] = { ...convsToUpdate[index], ...request.updates };
          await conversationStorage.saveConversations(convsToUpdate);
        }
        return { conversation: convsToUpdate[index] };
        
      case 'conversation_delete':
        const convsToFilter = await conversationStorage.getAllConversations();
        const filtered = convsToFilter.filter(c => c.id !== request.conversationId);
        await conversationStorage.saveConversations(filtered);
        // Also delete messages
        await browser.storage.local.remove(`messages_${request.conversationId}`);
        return { success: true };
        
      case 'conversation_set_current':
        await conversationStorage.setCurrentConversationId(request.conversationId);
        return { success: true };
        
      // Message operations
      case 'messages_get':
        const messages = await conversationStorage.getMessages(request.conversationId);
        return { messages };
        
      case 'message_add':
        const existingMessages = await conversationStorage.getMessages(request.messageData.conversationId);
        const newMessage = {
          id: conversationStorage.generateMessageId(),
          ...request.messageData,
          timestamp: new Date().toISOString()
        };
        await conversationStorage.saveMessages(
          request.messageData.conversationId,
          [...existingMessages, newMessage]
        );
        return { messageId: newMessage.id };
        
      case 'messages_clear':
        await conversationStorage.saveMessages(request.conversationId, []);
        return { success: true };
        
      // Update message content
      case 'update_message':
        const messagesForUpdate = await conversationStorage.getMessages(request.conversationId);
        const messageIndex = messagesForUpdate.findIndex(m => m.id === request.messageId);
        if (messageIndex !== -1) {
          messagesForUpdate[messageIndex] = {
            ...messagesForUpdate[messageIndex],
            content: request.content,
            updatedAt: new Date().toISOString()
          };
          await conversationStorage.saveMessages(request.conversationId, messagesForUpdate);
          return { success: true, message: messagesForUpdate[messageIndex] };
        }
        return { success: false, error: 'Message not found' };
        
      // Delete a message
      case 'delete_message':
        const messagesForDelete = await conversationStorage.getMessages(request.conversationId);
        const filteredMessages = messagesForDelete.filter(m => m.id !== request.messageId);
        if (filteredMessages.length !== messagesForDelete.length) {
          await conversationStorage.saveMessages(request.conversationId, filteredMessages);
          return { success: true };
        }
        return { success: false, error: 'Message not found' };
        
      // Search messages within a conversation
      case 'search_messages':
        const messagesForSearch = await conversationStorage.getMessages(request.conversationId);
        const searchQuery = (request.query || '').toLowerCase().trim();
        
        if (!searchQuery) {
          return { messages: messagesForSearch };
        }
        
        const searchResults = messagesForSearch.filter(message => {
          const contentMatch = message.content.toLowerCase().includes(searchQuery);
          const roleMatch = message.role.toLowerCase().includes(searchQuery);
          return contentMatch || roleMatch;
        });
        
        return { messages: searchResults };
        
      // Get message statistics for a conversation
      case 'get_message_stats':
        const messagesForStats = await conversationStorage.getMessages(request.conversationId);
        
        const stats = {
          totalMessages: messagesForStats.length,
          userMessages: messagesForStats.filter(m => m.role === 'user').length,
          assistantMessages: messagesForStats.filter(m => m.role === 'assistant').length,
          systemMessages: messagesForStats.filter(m => m.role === 'system').length,
          totalCharacters: messagesForStats.reduce((sum, m) => sum + (m.content?.length || 0), 0),
          averageMessageLength: messagesForStats.length > 0 
            ? Math.round(messagesForStats.reduce((sum, m) => sum + (m.content?.length || 0), 0) / messagesForStats.length)
            : 0,
          firstMessageTime: messagesForStats.length > 0 ? messagesForStats[0].timestamp : null,
          lastMessageTime: messagesForStats.length > 0 ? messagesForStats[messagesForStats.length - 1].timestamp : null
        };
        
        // Calculate messages per day if we have date range
        if (stats.firstMessageTime && stats.lastMessageTime) {
          const firstDate = new Date(stats.firstMessageTime);
          const lastDate = new Date(stats.lastMessageTime);
          const daysDiff = Math.max(1, Math.ceil((lastDate - firstDate) / (1000 * 60 * 60 * 24)));
          stats.messagesPerDay = Math.round((stats.totalMessages / daysDiff) * 10) / 10;
        }
        
        return { stats };
        
      default:
        throw new Error(`Unknown storage request type: ${request.type}`);
    }
  } catch (error) {
    console.error('[DeepWeb Background] Storage error:', error);
    throw error;
  }
}

async function handleExportRequest(request) {
  try {
    console.log('[DeepWeb Background] Processing export request...');
    
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const options = request.options || {};
    
    // Set initial progress
    exportManager.setProgress(exportId, {
      status: 'preparing',
      progress: 0,
      total: 0
    });
    
    // Get conversations based on scope
    let conversations = [];
    
    switch (options.scope) {
      case 'current':
        if (!options.conversationId) {
          throw new Error('Conversation ID required for current export');
        }
        const allConvs = await conversationStorage.getAllConversations();
        const currentConv = allConvs.find(c => c.id === options.conversationId);
        if (currentConv) {
          conversations = [currentConv];
        }
        break;
        
      case 'dateRange':
        const startDate = new Date(options.startDate).getTime();
        const endDate = new Date(options.endDate).getTime();
        const dateRangeConvs = await conversationStorage.getAllConversations();
        conversations = dateRangeConvs.filter(c => 
          c.createdAt >= startDate && c.createdAt <= endDate
        );
        break;
        
      case 'all':
      default:
        conversations = await conversationStorage.getAllConversations();
        break;
    }
    
    exportManager.setProgress(exportId, {
      status: 'processing',
      progress: 10,
      total: conversations.length
    });
    
    // Build export data
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      exportId,
      metadata: {
        format: options.format || 'json',
        totalConversations: conversations.length,
        options: options
      },
      conversations: []
    };
    
    // Process each conversation
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      const messages = await conversationStorage.getMessages(conv.id);
      
      const processedConv = {
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt || conv.createdAt,
        metadata: options.includeMetadata ? conv.metadata || {} : {},
        messages: messages.map(msg => ({
          id: msg.id,
          role: msg.role,
          content: options.anonymize ? anonymizeContent(msg.content) : msg.content,
          timestamp: msg.timestamp,
          metadata: options.includeMetadata ? msg.metadata || {} : {}
        }))
      };
      
      if (options.includeTimestamps) {
        processedConv.createdAtFormatted = new Date(conv.createdAt).toISOString();
        processedConv.updatedAtFormatted = new Date(conv.updatedAt || conv.createdAt).toISOString();
      }
      
      exportData.conversations.push(processedConv);
      
      // Update progress
      exportManager.setProgress(exportId, {
        status: 'processing',
        progress: 10 + Math.round((i + 1) / conversations.length * 80),
        total: conversations.length,
        processed: i + 1
      });
    }
    
    // Add statistics if requested
    if (options.includeStatistics && options.format !== 'csv') {
      let totalMessages = 0;
      let totalCharacters = 0;
      
      exportData.conversations.forEach(conv => {
        totalMessages += conv.messages.length;
        conv.messages.forEach(msg => {
          totalCharacters += msg.content.length;
        });
      });
      
      exportData.statistics = {
        totalMessages,
        totalCharacters,
        avgMessagesPerConversation: Math.round(totalMessages / exportData.conversations.length),
        avgCharactersPerMessage: Math.round(totalCharacters / totalMessages)
      };
    }
    
    // Convert to requested format
    let fileData;
    let mimeType;
    let extension;
    
    switch (options.format) {
      case 'markdown':
        fileData = convertToMarkdown(exportData, options);
        mimeType = 'text/markdown';
        extension = 'md';
        break;
        
      case 'html':
        fileData = convertToHTML(exportData, options);
        mimeType = 'text/html';
        extension = 'html';
        break;
        
      case 'csv':
        fileData = convertToCSV(exportData, options);
        mimeType = 'text/csv';
        extension = 'csv';
        break;
        
      case 'json':
      default:
        fileData = options.prettyPrint !== false 
          ? JSON.stringify(exportData, null, 2)
          : JSON.stringify(exportData);
        mimeType = 'application/json';
        extension = 'json';
        break;
    }
    
    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const scope = options.scope === 'single' ? 'conversation' : 'conversations';
    const filename = `deepweb_${scope}_${timestamp}.${extension}`;
    
    // Update final progress
    exportManager.setProgress(exportId, {
      status: 'completed',
      progress: 100
    });
    
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
    console.error('[DeepWeb Background] Export error:', error);
    throw error;
  }
}

async function handleImportRequest(request) {
  try {
    console.log('[DeepWeb Background] Processing import request...');
    
    const importId = `import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const { data, options = {} } = request;
    
    // Set initial progress
    importManager.setProgress(importId, {
      status: 'validating',
      progress: 0,
      total: 0,
      processed: 0,
      succeeded: 0,
      failed: 0,
      errors: []
    });
    
    // Parse data
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }
    
    // Extract conversations
    const conversations = parsedData.conversations || 
                         (Array.isArray(parsedData) ? parsedData : [parsedData]);
    
    if (conversations.length === 0) {
      throw new Error('No conversations found in import data');
    }
    
    importManager.setProgress(importId, {
      status: 'processing',
      progress: 10,
      total: conversations.length
    });
    
    // Get existing conversations for duplicate checking
    const existingConversations = await conversationStorage.getAllConversations();
    const existingIds = new Set(existingConversations.map(c => c.id));
    const existingTitles = new Map(existingConversations.map(c => [c.title, c]));
    
    let succeeded = 0;
    let failed = 0;
    let skipped = 0;
    const errors = [];
    
    // Process each conversation
    for (let i = 0; i < conversations.length; i++) {
      const conv = conversations[i];
      
      try {
        // Validate conversation
        if (!conv.title || !conv.messages || !Array.isArray(conv.messages)) {
          throw new Error('Invalid conversation structure');
        }
        
        // Handle duplicates
        let shouldImport = true;
        let newId = conv.id;
        
        if (options.duplicateStrategy === 'skip' && existingIds.has(conv.id)) {
          shouldImport = false;
          skipped++;
        } else if (options.duplicateStrategy === 'rename') {
          if (existingIds.has(conv.id) || existingTitles.has(conv.title)) {
            conv.title = `${conv.title} (Imported ${new Date().toLocaleDateString()})`;
            newId = conversationStorage.generateId();
          }
        } else if (options.duplicateStrategy === 'replace') {
          // Will overwrite existing
          newId = conv.id || conversationStorage.generateId();
        } else {
          // Default: generate new ID if duplicate
          if (existingIds.has(conv.id)) {
            newId = conversationStorage.generateId();
          }
        }
        
        if (shouldImport) {
          // Create conversation object
          const importedConv = {
            id: newId,
            title: conv.title,
            createdAt: conv.createdAt || Date.now(),
            updatedAt: conv.updatedAt || conv.createdAt || Date.now(),
            metadata: conv.metadata || {},
            messageCount: conv.messages.length
          };
          
          // Save conversation
          const allConvs = await conversationStorage.getAllConversations();
          const existingIndex = allConvs.findIndex(c => c.id === newId);
          
          if (existingIndex >= 0) {
            allConvs[existingIndex] = importedConv;
          } else {
            allConvs.push(importedConv);
          }
          
          await conversationStorage.saveConversations(allConvs);
          
          // Import messages
          const importedMessages = conv.messages.map(msg => ({
            id: msg.id || conversationStorage.generateMessageId(),
            role: msg.role || 'user',
            content: msg.content || '',
            timestamp: msg.timestamp || Date.now(),
            metadata: msg.metadata || {}
          }));
          
          await conversationStorage.saveMessages(newId, importedMessages);
          
          succeeded++;
        }
        
      } catch (error) {
        failed++;
        errors.push({
          conversationId: conv.id || `index_${i}`,
          error: error.message
        });
      }
      
      // Update progress
      importManager.setProgress(importId, {
        status: 'processing',
        progress: 10 + Math.round((i + 1) / conversations.length * 80),
        total: conversations.length,
        processed: i + 1,
        succeeded,
        failed,
        skipped,
        errors
      });
    }
    
    // Final progress
    importManager.setProgress(importId, {
      status: 'completed',
      progress: 100,
      total: conversations.length,
      processed: conversations.length,
      succeeded,
      failed,
      skipped,
      errors
    });
    
    return {
      success: true,
      importId,
      summary: {
        total: conversations.length,
        succeeded,
        failed,
        skipped,
        errors
      }
    };
    
  } catch (error) {
    console.error('[DeepWeb Background] Import error:', error);
    throw error;
  }
}

// Helper functions for export formatting
function anonymizeContent(content) {
  // Replace email addresses
  content = content.replace(/[\w.-]+@[\w.-]+\.\w+/g, '[EMAIL]');
  // Replace phone numbers
  content = content.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  // Replace URLs
  content = content.replace(/https?:\/\/[^\s]+/g, '[URL]');
  return content;
}

function convertToMarkdown(data, options) {
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
    
    for (const msg of conv.messages) {
      markdown += `### ${msg.role.toUpperCase()}\n`;
      if (options.includeTimestamps) {
        markdown += `*${new Date(msg.timestamp).toISOString()}*\n\n`;
      }
      markdown += `${msg.content}\n\n`;
    }
    
    markdown += `---\n\n`;
  }
  
  return markdown;
}

function convertToHTML(data, options) {
  const escapeHtml = (text) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  };
  
  let html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>DeepWeb Conversation Export</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; background-color: #f5f5f5; }
        .conversation { background: white; border-radius: 8px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .message { margin: 15px 0; padding: 10px; border-radius: 5px; }
        .message.user { background-color: #e3f2fd; margin-left: 20px; }
        .message.assistant { background-color: #f5f5f5; margin-right: 20px; }
        .role { font-weight: bold; color: #666; font-size: 0.9em; }
        .timestamp { font-size: 0.8em; color: #999; }
        h1, h2 { color: #333; }
    </style>
</head>
<body>
    <h1>DeepWeb Conversation Export</h1>
    <p><strong>Exported:</strong> ${data.exportedAt}</p>
    <p><strong>Total Conversations:</strong> ${data.metadata.totalConversations}</p>
`;
  
  for (const conv of data.conversations) {
    html += `<div class="conversation"><h2>${escapeHtml(conv.title)}</h2>`;
    
    if (options.includeTimestamps) {
      html += `<p class="timestamp">Created: ${conv.createdAtFormatted}</p>`;
    }
    
    for (const msg of conv.messages) {
      html += `<div class="message ${msg.role}">`;
      html += `<div class="role">${msg.role.toUpperCase()}</div>`;
      if (options.includeTimestamps) {
        html += `<div class="timestamp">${new Date(msg.timestamp).toISOString()}</div>`;
      }
      html += `<div>${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div></div>`;
    }
    
    html += `</div>`;
  }
  
  html += `</body></html>`;
  return html;
}

function convertToCSV(data, options) {
  const escapeCSV = (text) => {
    if (text.includes('"') || text.includes(',') || text.includes('\n')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  
  const headers = ['Conversation ID', 'Conversation Title', 'Message ID', 'Role', 'Content', 'Timestamp'];
  const rows = [headers.join(',')];
  
  for (const conv of data.conversations) {
    for (const msg of conv.messages) {
      const row = [
        conv.id,
        escapeCSV(conv.title),
        msg.id,
        msg.role,
        escapeCSV(msg.content),
        options.includeTimestamps ? new Date(msg.timestamp).toISOString() : msg.timestamp
      ];
      rows.push(row.join(','));
    }
  }
  
  return rows.join('\n');
}

async function handleChatRequest(request, sender) {
  try {
    console.log('[DeepWeb Background] Processing chat request...');
    
    // Check rate limit
    if (!rateLimiter.canMakeRequest()) {
      const waitTime = rateLimiter.getTimeUntilNextRequest();
      return { 
        error: `Rate limit exceeded. Please wait ${waitTime} seconds before making another request.` 
      };
    }
    
    // Validate and sanitize request
    if (!request.message || typeof request.message !== 'string') {
      return { error: 'Invalid message format' };
    }
    
    const sanitizedMessage = sanitizeMessage(request.message);
    if (!sanitizedMessage) {
      return { error: 'Message cannot be empty' };
    }
    
    if (sanitizedMessage.length > CONFIG.content.maxMessageLength) {
      return { error: `Message too long (max ${CONFIG.content.maxMessageLength} characters)` };
    }
    
    // Get and validate API key
    const settings = await browser.storage.sync.get(['apiKeys']);
    const apiKey = settings.apiKeys?.deepseek;
    
    if (!apiKey) {
      return { 
        error: 'API key not configured. Please set up your DeepSeek API key in the extension settings.' 
      };
    }
    
    // Validate API key format
    if (!validateApiKey(apiKey)) {
      return {
        error: 'Invalid API key format. Please check your DeepSeek API key.'
      };
    }
    
    // Use the selected model
    const model = request.model || 'deepseek-chat';
    console.log('[DeepWeb Background] Using model:', model);
    
    // Prepare enhanced context from ContextManager
    const context = {
      url: request.context?.url || '',
      title: request.context?.title || '',
      content: request.context?.pageContent || request.context?.content || '',
      contentType: request.context?.contentType || 'unknown',
      relevanceScore: request.context?.relevanceScore || 0,
      tokenEstimate: request.context?.tokenEstimate || 0,
      metadata: request.context?.metadata || {},
      // Enhanced context features
      memory: request.context?.memory || {},
      crossPage: request.context?.crossPage || {},
      contextSummary: request.context?.contextSummary || '',
      relevantSections: request.context?.relevantSections || []
    };
    
    // Get conversation context if provided
    const conversationId = request.conversationId;
    let conversationContext = [];
    if (conversationId) {
      const messages = await conversationStorage.getMessages(conversationId);
      // Include last few messages for context (limit to prevent token overflow)
      conversationContext = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    }
    
    // Make API request with parameters
    console.log('[DeepWeb Background] Making API request...');
    const response = await makeAPIRequest({
      apiKey,
      message: sanitizedMessage,
      context,
      model,
      conversationContext,
      parameters: request.parameters || {}
    });
    
    console.log('[DeepWeb Background] API response received');
    
    return {
      success: true,
      content: response.content,
      cost: response.cost || 0
    };
    
  } catch (error) {
    console.error('[DeepWeb Background] Error:', error);
    return {
      success: false,
      error: error.message || 'Failed to process request'
    };
  }
}

async function makeAPIRequest({ apiKey, message, context, model, conversationContext = [], parameters = {} }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CONFIG.api.timeout);
  
  try {
    console.log('[DeepWeb Background] Sending to DeepSeek API...');
    
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: parameters.systemPrompt || `You are a helpful AI assistant integrated into Firefox. Help users understand and interact with web pages. Provide clear, concise answers.
Content Type: ${context.contentType || 'unknown'}
Relevance Score: ${context.relevanceScore || 'N/A'}`
          },
          ...conversationContext,
          {
            role: 'user',
            content: conversationContext.length > 0 ? message : context.content ? 
              `${context.content}

User Question: ${message}` : 
              `Page URL: ${context.url}
Page Title: ${context.title}

User Question: ${message}`
          }
        ],
        max_tokens: parameters.maxTokens || 1000,
        temperature: parameters.temperature !== undefined ? parameters.temperature : 0.7,
        top_p: parameters.topP !== undefined ? parameters.topP : 0.95,
        frequency_penalty: parameters.frequencyPenalty || 0,
        presence_penalty: parameters.presencePenalty || 0,
        stop: parameters.stopSequences && parameters.stopSequences.length > 0 ? parameters.stopSequences : undefined,
        stream: false
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[DeepWeb Background] API error response:', errorText);
      
      try {
        const errorData = JSON.parse(errorText);
        throw new Error(errorData.error?.message || `API error: ${response.status}`);
      } catch {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }
    }
    
    const data = await response.json();
    console.log('[DeepWeb Background] API success');
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('Invalid API response format');
    }
    
    // Calculate rough cost
    const tokens = data.usage?.total_tokens || 1000;
    let costPerToken = 0.00014; // Default DeepSeek Chat pricing
    
    if (model === 'deepseek-reasoner') {
      costPerToken = 0.00055;
    }
    
    const cost = (tokens / 1000) * costPerToken;
    
    return {
      content: data.choices[0].message.content,
      cost: cost
    };
    
  } catch (error) {
    clearTimeout(timeout);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds');
    }
    
    throw error;
  }
}

async function handleStreamingRequest(port, request) {
  try {
    console.log('[DeepWeb Background] Processing streaming request...');
    
    const streamId = `${port.sender.tab.id}_${Date.now()}`;
    
    // Check rate limit
    if (!rateLimiter.canMakeRequest()) {
      const waitTime = rateLimiter.getTimeUntilNextRequest();
      port.postMessage({
        type: 'error',
        error: `Rate limit exceeded. Please wait ${waitTime} seconds before making another request.`
      });
      return;
    }
    
    // Validate and sanitize request
    if (!request.message || typeof request.message !== 'string') {
      port.postMessage({
        type: 'error',
        error: 'Invalid message format'
      });
      return;
    }
    
    const sanitizedMessage = sanitizeMessage(request.message);
    if (!sanitizedMessage) {
      port.postMessage({
        type: 'error',
        error: 'Message cannot be empty'
      });
      return;
    }
    
    if (sanitizedMessage.length > CONFIG.content.maxMessageLength) {
      port.postMessage({
        type: 'error',
        error: `Message too long (max ${CONFIG.content.maxMessageLength} characters)`
      });
      return;
    }
    
    // Get and validate API key
    const settings = await browser.storage.sync.get(['apiKeys']);
    const apiKey = settings.apiKeys?.deepseek;
    
    if (!apiKey) {
      port.postMessage({
        type: 'error',
        error: 'API key not configured. Please set up your DeepSeek API key in the extension settings.'
      });
      return;
    }
    
    // Validate API key format
    if (!validateApiKey(apiKey)) {
      port.postMessage({
        type: 'error',
        error: 'Invalid API key format. Please check your DeepSeek API key.'
      });
      return;
    }
    
    // Use the selected model
    const model = request.model || 'deepseek-chat';
    console.log('[DeepWeb Background] Using model:', model);
    
    // Prepare enhanced context from ContextManager
    const context = {
      url: request.context?.url || '',
      title: request.context?.title || '',
      content: request.context?.pageContent || request.context?.content || '',
      contentType: request.context?.contentType || 'unknown',
      relevanceScore: request.context?.relevanceScore || 0,
      tokenEstimate: request.context?.tokenEstimate || 0,
      metadata: request.context?.metadata || {},
      // Enhanced context features
      memory: request.context?.memory || {},
      crossPage: request.context?.crossPage || {},
      contextSummary: request.context?.contextSummary || '',
      relevantSections: request.context?.relevantSections || []
    };
    
    // Get conversation context if provided
    const conversationId = request.conversationId;
    let conversationContext = [];
    if (conversationId) {
      const messages = await conversationStorage.getMessages(conversationId);
      // Include last few messages for context (limit to prevent token overflow)
      conversationContext = messages.slice(-6).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
    }
    
    // Create abort controller
    const controller = new AbortController();
    activeStreams.set(streamId, controller);
    
    // Send stream started message
    port.postMessage({
      type: 'stream_started',
      streamId: streamId
    });
    
    // Make streaming API request
    console.log('[DeepWeb Background] Making streaming API request...');
    
    try {
      const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: request.parameters?.systemPrompt || buildSystemPrompt(context)
            },
            ...conversationContext,
            {
              role: 'user',
              content: buildUserMessage(sanitizedMessage, context, conversationContext)
            }
          ],
          max_tokens: request.parameters?.maxTokens || 1000,
          temperature: request.parameters?.temperature !== undefined ? request.parameters.temperature : 0.7,
          top_p: request.parameters?.topP !== undefined ? request.parameters.topP : 0.95,
          frequency_penalty: request.parameters?.frequencyPenalty || 0,
          presence_penalty: request.parameters?.presencePenalty || 0,
          stop: request.parameters?.stopSequences && request.parameters.stopSequences.length > 0 ? request.parameters.stopSequences : undefined,
          stream: true
        }),
        signal: controller.signal
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DeepWeb Background] API error response:', errorText);
        
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.error?.message || `API error: ${response.status}`);
        } catch {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
      }
      
      // Process stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let accumulatedContent = '';
      let totalUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0
      };
      
      while (true) {
        try {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (!trimmedLine) continue;
            
            if (trimmedLine.startsWith('data: ')) {
              const data = trimmedLine.slice(6).trim();
              
              if (data === '[DONE]') {
                // Calculate cost
                let costPerToken = 0.00014; // Default DeepSeek Chat pricing
                if (model === 'deepseek-reasoner') {
                  costPerToken = 0.00055;
                }
                const cost = (totalUsage.total_tokens / 1000) * costPerToken;
                
                port.postMessage({
                  type: 'stream_done',
                  content: accumulatedContent,
                  usage: totalUsage,
                  cost: cost
                });
                
                activeStreams.delete(streamId);
                return;
              }
              
              try {
                const parsed = JSON.parse(data);
                
                if (parsed.choices?.[0]?.delta?.content) {
                  const content = parsed.choices[0].delta.content;
                  accumulatedContent += content;
                  
                  port.postMessage({
                    type: 'stream_content',
                    content: content
                  });
                }
                
                if (parsed.usage) {
                  totalUsage = parsed.usage;
                }
                
              } catch (e) {
                console.warn('[DeepWeb Background] Failed to parse stream data:', e);
              }
            }
          }
        } catch (error) {
          if (error.name === 'AbortError') {
            port.postMessage({
              type: 'stream_cancelled'
            });
            break;
          }
          throw error;
        }
      }
      
    } catch (error) {
      console.error('[DeepWeb Background] Stream error:', error);
      port.postMessage({
        type: 'error',
        error: error.message
      });
    } finally {
      activeStreams.delete(streamId);
    }
    
  } catch (error) {
    console.error('[DeepWeb Background] Streaming request error:', error);
    port.postMessage({
      type: 'error',
      error: error.message || 'Failed to process streaming request'
    });
  }
}

// Browser action click handler (Firefox uses browserAction)
browser.browserAction.onClicked.addListener((tab) => {
  browser.tabs.sendMessage(tab.id, { type: 'toggle_chat' });
});

// Context menu
browser.contextMenus.create({
  id: "ask-deepweb",
  title: "Ask DeepWeb AI about '%s'",
  contexts: ["selection"]
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "ask-deepweb" && info.selectionText) {
    browser.tabs.sendMessage(tab.id, {
      type: "process_selection",
      text: info.selectionText
    });
  }
});

// Commands
browser.commands.onCommand.addListener((command) => {
  if (command === "toggle-chat") {
    browser.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        browser.tabs.sendMessage(tabs[0].id, { type: 'toggle_chat' });
      }
    });
  }
});

// Installation handler
browser.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[DeepWeb] Extension installed successfully');
    // Open welcome page or settings
    browser.runtime.openOptionsPage();
  }
});

// Cleanup on unload (Chrome only - not supported in Firefox)
// Note: runtime.onSuspend is not supported in Firefox 78+
// This is safe to remove as Firefox handles cleanup automatically

// Helper functions for enhanced context
function buildSystemPrompt(context) {
  let prompt = `You are a helpful AI assistant integrated into Firefox. Help users understand and interact with web pages. Provide clear, concise answers.`;
  
  // Add context summary if available
  if (context.contextSummary) {
    prompt += `\n\nSession Context: ${context.contextSummary}`;
  }
  
  // Add content type and metadata
  prompt += `\nContent Type: ${context.contentType || 'unknown'}`;
  
  // Add memory insights if available
  if (context.memory?.knownEntities?.length > 0) {
    prompt += `\n\nKnown Entities:`;
    context.memory.knownEntities.slice(0, 5).forEach(entity => {
      prompt += `\n- ${entity.type}: ${entity.value}`;
    });
  }
  
  if (context.memory?.establishedFacts?.length > 0) {
    prompt += `\n\nEstablished Facts:`;
    context.memory.establishedFacts.slice(0, 5).forEach(fact => {
      prompt += `\n- ${fact.fact}`;
    });
  }
  
  if (context.memory?.userPreferences?.length > 0) {
    prompt += `\n\nUser Preferences:`;
    context.memory.userPreferences.slice(0, 3).forEach(pref => {
      prompt += `\n- ${pref.type}: ${pref.value}`;
    });
  }
  
  // Add cross-page context if available
  if (context.crossPage?.related?.length > 0) {
    prompt += `\n\nRelated Pages:`;
    context.crossPage.related.slice(0, 3).forEach(page => {
      prompt += `\n- ${page.title} (${page.relationship})`;
    });
  }
  
  if (context.crossPage?.synthesis?.themes?.length > 0) {
    prompt += `\n\nCurrent Themes: ${context.crossPage.synthesis.themes.join(', ')}`;
  }
  
  return prompt;
}

function buildUserMessage(message, context, conversationContext) {
  // If we have conversation context, just send the message
  if (conversationContext.length > 0) {
    return message;
  }
  
  // Otherwise, build message with page context
  let userMessage = '';
  
  // Add relevant sections if available
  if (context.relevantSections?.length > 0) {
    userMessage += `Page Content:\n${context.relevantSections.join('\n\n')}\n\n`;
  } else if (context.content) {
    userMessage += `${context.content}\n\n`;
  }
  
  // Add page metadata
  if (!userMessage && (context.url || context.title)) {
    userMessage += `Page URL: ${context.url}\nPage Title: ${context.title}\n\n`;
  }
  
  userMessage += `User Question: ${message}`;
  
  return userMessage;
}

console.log('[DeepWeb Background] Firefox background script ready with enhanced context support');