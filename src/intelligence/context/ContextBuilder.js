/**
 * ContextBuilder - Builds sophisticated context for AI conversations
 * Manages context across pages, conversations, and sessions
 */

export class ContextBuilder {
  constructor() {
    this.sessionContext = {
      pages: [],
      conversations: [],
      timeline: [],
      relationships: new Map()
    };
    
    this.currentPage = null;
    this.maxPages = 10;
    this.maxConversations = 50;
    this.maxTimelineEvents = 100;
    
    // Context optimization settings
    this.tokenLimits = {
      'deepseek-chat': 16000,
      'deepseek-reasoner': 32000
    };
    
    // Memory management
    this.memoryThreshold = 50 * 1024 * 1024; // 50MB
    this.lastCleanup = Date.now();
    this.cleanupInterval = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Add a page to the session context
   * @param {Object} pageData - Page information
   */
  async addPage(pageData) {
    const pageContext = {
      id: this.generateId(),
      url: pageData.url,
      title: pageData.title,
      content: await this.processContent(pageData.content),
      metadata: this.extractMetadata(pageData),
      interactions: [],
      timestamp: new Date().toISOString(),
      relevanceScore: 1.0
    };
    
    // Add to pages array (FIFO with max limit)
    this.sessionContext.pages.push(pageContext);
    if (this.sessionContext.pages.length > this.maxPages) {
      this.sessionContext.pages.shift();
    }
    
    // Update current page
    this.currentPage = pageContext;
    
    // Add timeline event
    this.addTimelineEvent({
      type: 'page_visit',
      pageId: pageContext.id,
      url: pageContext.url,
      title: pageContext.title
    });
    
    // Update relationships
    this.updateRelationships(pageContext);
    
    // Cleanup if needed
    await this.performCleanupIfNeeded();
    
    return pageContext;
  }

  /**
   * Add a conversation to the context
   * @param {Object} conversation - Conversation data
   */
  async addConversation(conversation) {
    const conversationContext = {
      id: conversation.id || this.generateId(),
      pageId: this.currentPage?.id,
      messages: conversation.messages || [],
      context: conversation.context || {},
      memory: await this.extractMemory(conversation),
      preferences: this.detectPreferences(conversation),
      timestamp: new Date().toISOString()
    };
    
    // Add to conversations
    this.sessionContext.conversations.push(conversationContext);
    if (this.sessionContext.conversations.length > this.maxConversations) {
      this.sessionContext.conversations.shift();
    }
    
    // Update current page interactions
    if (this.currentPage) {
      this.currentPage.interactions.push({
        type: 'conversation',
        conversationId: conversationContext.id,
        timestamp: conversationContext.timestamp
      });
    }
    
    // Add timeline event
    this.addTimelineEvent({
      type: 'conversation',
      conversationId: conversationContext.id,
      pageId: this.currentPage?.id,
      messageCount: conversationContext.messages.length
    });
    
    return conversationContext;
  }

  /**
   * Build optimized context for AI model
   * @param {Object} options - Context building options
   * @returns {Object} Optimized context
   */
  async buildContext(options = {}) {
    const {
      includePages = true,
      includeConversations = true,
      includeMemory = true,
      targetModel = 'deepseek-chat',
      query = '',
      maxTokens = null
    } = options;
    
    const tokenLimit = maxTokens || this.tokenLimits[targetModel] || 8000;
    const context = {
      current: {},
      history: {},
      memory: {},
      relationships: {},
      meta: {}
    };
    
    // Current page context
    if (includePages && this.currentPage) {
      context.current = await this.optimizePageContext(
        this.currentPage, 
        query, 
        tokenLimit * 0.4
      );
    }
    
    // Historical context
    if (includePages) {
      const relevantPages = await this.selectRelevantPages(query, 3);
      context.history.pages = await this.optimizeMultiPageContext(
        relevantPages,
        query,
        tokenLimit * 0.2
      );
    }
    
    // Conversation history
    if (includeConversations) {
      const relevantConversations = await this.selectRelevantConversations(query, 5);
      context.history.conversations = await this.optimizeConversationContext(
        relevantConversations,
        query,
        tokenLimit * 0.2
      );
    }
    
    // Memory and learning
    if (includeMemory) {
      context.memory = await this.buildMemoryContext(query, tokenLimit * 0.1);
    }
    
    // Relationships and connections
    context.relationships = this.buildRelationshipContext(query);
    
    // Metadata
    context.meta = {
      sessionDuration: this.getSessionDuration(),
      pageCount: this.sessionContext.pages.length,
      conversationCount: this.sessionContext.conversations.length,
      primaryTopic: await this.detectPrimaryTopic(),
      userIntent: await this.detectUserIntent(query)
    };
    
    return context;
  }

  /**
   * Process and optimize content
   * @param {Object} content - Raw content
   * @returns {Object} Processed content
   */
  async processContent(content) {
    return {
      text: this.cleanText(content.text || ''),
      summary: content.summary || await this.generateSummary(content.text),
      entities: content.entities || await this.extractEntities(content.text),
      topics: content.topics || await this.extractTopics(content.text),
      structure: content.structure || {},
      metadata: content.metadata || {}
    };
  }

  /**
   * Extract metadata from page data
   * @param {Object} pageData
   * @returns {Object} Metadata
   */
  extractMetadata(pageData) {
    return {
      domain: new URL(pageData.url).hostname,
      type: pageData.contentType || 'webpage',
      language: pageData.language || 'en',
      author: pageData.author || null,
      publishDate: pageData.publishDate || null,
      tags: pageData.tags || [],
      category: pageData.category || null
    };
  }

  /**
   * Extract memory items from conversation
   * @param {Object} conversation
   * @returns {Array} Memory items
   */
  async extractMemory(conversation) {
    const memory = [];
    
    // Extract facts
    const facts = await this.extractFacts(conversation.messages);
    memory.push(...facts.map(fact => ({
      type: 'fact',
      content: fact,
      confidence: 0.8
    })));
    
    // Extract preferences
    const preferences = await this.extractPreferences(conversation.messages);
    memory.push(...preferences.map(pref => ({
      type: 'preference',
      content: pref,
      confidence: 0.7
    })));
    
    // Extract questions
    const questions = this.extractQuestions(conversation.messages);
    memory.push(...questions.map(q => ({
      type: 'question',
      content: q,
      answered: this.isQuestionAnswered(q, conversation.messages)
    })));
    
    return memory;
  }

  /**
   * Select relevant pages based on query
   * @param {string} query
   * @param {number} limit
   * @returns {Array} Relevant pages
   */
  async selectRelevantPages(query, limit = 3) {
    if (!query) {
      return this.sessionContext.pages.slice(-limit);
    }
    
    // Score pages by relevance
    const scoredPages = await Promise.all(
      this.sessionContext.pages.map(async page => ({
        page,
        score: await this.calculateRelevance(page, query)
      }))
    );
    
    // Sort by relevance and recency
    return scoredPages
      .sort((a, b) => {
        const scoreWeight = 0.7;
        const recencyWeight = 0.3;
        
        const aRecency = new Date(a.page.timestamp).getTime();
        const bRecency = new Date(b.page.timestamp).getTime();
        const maxRecency = Math.max(aRecency, bRecency);
        
        const aTotal = a.score * scoreWeight + (aRecency / maxRecency) * recencyWeight;
        const bTotal = b.score * scoreWeight + (bRecency / maxRecency) * recencyWeight;
        
        return bTotal - aTotal;
      })
      .slice(0, limit)
      .map(item => item.page);
  }

  /**
   * Select relevant conversations
   * @param {string} query
   * @param {number} limit
   * @returns {Array} Relevant conversations
   */
  async selectRelevantConversations(query, limit = 5) {
    if (!query) {
      return this.sessionContext.conversations.slice(-limit);
    }
    
    // Score conversations
    const scored = await Promise.all(
      this.sessionContext.conversations.map(async conv => ({
        conversation: conv,
        score: await this.calculateConversationRelevance(conv, query)
      }))
    );
    
    return scored
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(item => item.conversation);
  }

  /**
   * Optimize page context for token limit
   * @param {Object} page
   * @param {string} query
   * @param {number} tokenLimit
   * @returns {Object} Optimized context
   */
  async optimizePageContext(page, query, tokenLimit) {
    const context = {
      url: page.url,
      title: page.title,
      summary: page.content.summary,
      relevantSections: []
    };
    
    // Select most relevant content sections
    if (query && page.content.text) {
      const sections = this.splitIntoSections(page.content.text);
      const scoredSections = await Promise.all(
        sections.map(async section => ({
          text: section,
          score: await this.calculateTextRelevance(section, query)
        }))
      );
      
      // Add sections until token limit
      let currentTokens = this.estimateTokens(JSON.stringify(context));
      
      scoredSections
        .sort((a, b) => b.score - a.score)
        .forEach(section => {
          const sectionTokens = this.estimateTokens(section.text);
          if (currentTokens + sectionTokens <= tokenLimit) {
            context.relevantSections.push(section.text);
            currentTokens += sectionTokens;
          }
        });
    }
    
    // Add entities and topics if space allows
    const currentTokens = this.estimateTokens(JSON.stringify(context));
    if (currentTokens < tokenLimit * 0.8) {
      context.entities = page.content.entities?.slice(0, 10);
      context.topics = page.content.topics?.slice(0, 5);
    }
    
    return context;
  }

  /**
   * Build memory context
   * @param {string} query
   * @param {number} tokenLimit
   * @returns {Object} Memory context
   */
  async buildMemoryContext(query, tokenLimit) {
    const memory = {
      facts: [],
      preferences: [],
      patterns: []
    };
    
    // Collect all memory items
    const allMemory = [];
    this.sessionContext.conversations.forEach(conv => {
      if (conv.memory) {
        allMemory.push(...conv.memory);
      }
    });
    
    // Group by type
    const grouped = allMemory.reduce((acc, item) => {
      const type = item.type || 'other';
      if (!acc[type]) acc[type] = [];
      acc[type].push(item);
      return acc;
    }, {});
    
    // Select most relevant/recent items
    if (grouped.fact) {
      memory.facts = grouped.fact
        .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
        .slice(0, 10)
        .map(f => f.content);
    }
    
    if (grouped.preference) {
      memory.preferences = grouped.preference
        .slice(0, 5)
        .map(p => p.content);
    }
    
    // Detect patterns
    memory.patterns = this.detectPatterns(allMemory);
    
    return memory;
  }

  /**
   * Update relationships between pages
   * @param {Object} pageContext
   */
  updateRelationships(pageContext) {
    // Find related pages by domain
    const domain = pageContext.metadata.domain;
    const relatedByDomain = this.sessionContext.pages
      .filter(p => p.metadata.domain === domain && p.id !== pageContext.id)
      .map(p => p.id);
    
    if (relatedByDomain.length > 0) {
      this.sessionContext.relationships.set(
        `domain_${pageContext.id}`,
        {
          type: 'same_domain',
          source: pageContext.id,
          targets: relatedByDomain
        }
      );
    }
    
    // Find related by topics
    if (pageContext.content.topics?.length > 0) {
      const relatedByTopic = this.sessionContext.pages
        .filter(p => {
          if (p.id === pageContext.id || !p.content.topics) return false;
          return p.content.topics.some(t => 
            pageContext.content.topics.includes(t)
          );
        })
        .map(p => p.id);
      
      if (relatedByTopic.length > 0) {
        this.sessionContext.relationships.set(
          `topic_${pageContext.id}`,
          {
            type: 'shared_topics',
            source: pageContext.id,
            targets: relatedByTopic
          }
        );
      }
    }
  }

  /**
   * Add timeline event
   * @param {Object} event
   */
  addTimelineEvent(event) {
    this.sessionContext.timeline.push({
      ...event,
      timestamp: new Date().toISOString()
    });
    
    if (this.sessionContext.timeline.length > this.maxTimelineEvents) {
      this.sessionContext.timeline.shift();
    }
  }

  /**
   * Perform cleanup if needed
   */
  async performCleanupIfNeeded() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }
    
    const memoryUsage = await this.estimateMemoryUsage();
    if (memoryUsage > this.memoryThreshold) {
      // Remove oldest pages
      const toRemove = Math.floor(this.sessionContext.pages.length * 0.3);
      this.sessionContext.pages = this.sessionContext.pages.slice(toRemove);
      
      // Remove old conversations
      const cutoffTime = new Date(now - 30 * 60 * 1000); // 30 minutes
      this.sessionContext.conversations = this.sessionContext.conversations
        .filter(c => new Date(c.timestamp) > cutoffTime);
      
      // Clean relationships
      this.cleanupRelationships();
      
      this.lastCleanup = now;
    }
  }

  /**
   * Helper methods
   */
  
  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
  }

  async generateSummary(text) {
    // Simple extractive summary
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    const importantSentences = sentences
      .filter(s => s.length > 30 && s.length < 200)
      .slice(0, 3);
    return importantSentences.join(' ');
  }

  async extractEntities(text) {
    // Simple entity extraction (would use NLP library in production)
    const entities = [];
    
    // URLs
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    entities.push(...urls.map(u => ({ type: 'url', value: u })));
    
    // Emails
    const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g) || [];
    entities.push(...emails.map(e => ({ type: 'email', value: e })));
    
    // Numbers
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g) || [];
    entities.push(...numbers.slice(0, 10).map(n => ({ type: 'number', value: n })));
    
    return entities;
  }

  async extractTopics(text) {
    // Simple keyword extraction
    const words = text.toLowerCase().split(/\W+/);
    const wordFreq = {};
    
    words.forEach(word => {
      if (word.length > 4) {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      }
    });
    
    return Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  async calculateRelevance(page, query) {
    if (!query) return 0;
    
    const queryLower = query.toLowerCase();
    const pageText = `${page.title} ${page.content.summary} ${page.content.text}`.toLowerCase();
    
    // Simple relevance scoring
    let score = 0;
    
    // Title match
    if (page.title.toLowerCase().includes(queryLower)) {
      score += 0.4;
    }
    
    // Content match
    const queryWords = queryLower.split(/\W+/);
    const matchedWords = queryWords.filter(word => pageText.includes(word));
    score += (matchedWords.length / queryWords.length) * 0.3;
    
    // Topic match
    if (page.content.topics) {
      const topicMatch = page.content.topics.some(t => 
        queryLower.includes(t) || t.includes(queryLower)
      );
      if (topicMatch) score += 0.2;
    }
    
    // Entity match
    if (page.content.entities) {
      const entityMatch = page.content.entities.some(e => 
        queryLower.includes(e.value.toLowerCase())
      );
      if (entityMatch) score += 0.1;
    }
    
    return Math.min(score, 1);
  }

  async calculateConversationRelevance(conversation, query) {
    const queryLower = query.toLowerCase();
    let score = 0;
    
    // Check messages
    const messageText = conversation.messages
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase();
    
    const queryWords = queryLower.split(/\W+/);
    const matchedWords = queryWords.filter(word => messageText.includes(word));
    score += (matchedWords.length / queryWords.length) * 0.5;
    
    // Check memory
    if (conversation.memory) {
      const memoryMatch = conversation.memory.some(m => 
        m.content.toLowerCase().includes(queryLower)
      );
      if (memoryMatch) score += 0.3;
    }
    
    // Recency bonus
    const age = Date.now() - new Date(conversation.timestamp).getTime();
    const recencyScore = Math.max(0, 1 - age / (24 * 60 * 60 * 1000)); // 24 hours
    score += recencyScore * 0.2;
    
    return Math.min(score, 1);
  }

  splitIntoSections(text) {
    // Split by paragraphs or reasonable chunks
    const paragraphs = text.split(/\n\n+/);
    const sections = [];
    let currentSection = '';
    
    paragraphs.forEach(para => {
      if (currentSection.length + para.length < 500) {
        currentSection += para + '\n\n';
      } else {
        if (currentSection) sections.push(currentSection.trim());
        currentSection = para;
      }
    });
    
    if (currentSection) sections.push(currentSection.trim());
    return sections;
  }

  async calculateTextRelevance(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\W+/);
    
    const matchedWords = queryWords.filter(word => textLower.includes(word));
    return matchedWords.length / queryWords.length;
  }

  estimateTokens(text) {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  detectPatterns(memoryItems) {
    const patterns = [];
    
    // Frequency patterns
    const frequencies = {};
    memoryItems.forEach(item => {
      const key = `${item.type}_${item.content}`;
      frequencies[key] = (frequencies[key] || 0) + 1;
    });
    
    Object.entries(frequencies)
      .filter(([_, count]) => count > 2)
      .forEach(([key, count]) => {
        patterns.push({
          type: 'frequency',
          pattern: key,
          count
        });
      });
    
    return patterns.slice(0, 5);
  }

  getSessionDuration() {
    if (this.sessionContext.timeline.length === 0) return 0;
    
    const first = new Date(this.sessionContext.timeline[0].timestamp);
    const last = new Date(this.sessionContext.timeline[this.sessionContext.timeline.length - 1].timestamp);
    
    return Math.round((last - first) / 1000); // seconds
  }

  async detectPrimaryTopic() {
    // Aggregate all topics
    const allTopics = {};
    
    this.sessionContext.pages.forEach(page => {
      if (page.content.topics) {
        page.content.topics.forEach(topic => {
          allTopics[topic] = (allTopics[topic] || 0) + 1;
        });
      }
    });
    
    // Find most common
    const sorted = Object.entries(allTopics)
      .sort((a, b) => b[1] - a[1]);
    
    return sorted[0]?.[0] || null;
  }

  async detectUserIntent(query) {
    const queryLower = query.toLowerCase();
    
    // Simple intent detection
    if (queryLower.includes('how') || queryLower.includes('what')) {
      return 'question';
    }
    if (queryLower.includes('explain') || queryLower.includes('tell me about')) {
      return 'explanation';
    }
    if (queryLower.includes('summarize') || queryLower.includes('summary')) {
      return 'summarization';
    }
    if (queryLower.includes('help') || queryLower.includes('assist')) {
      return 'assistance';
    }
    
    return 'general';
  }

  async estimateMemoryUsage() {
    // Rough estimate of memory usage
    const jsonSize = JSON.stringify(this.sessionContext).length;
    return jsonSize * 2; // Unicode characters use ~2 bytes
  }

  cleanupRelationships() {
    // Remove relationships for pages that no longer exist
    const pageIds = new Set(this.sessionContext.pages.map(p => p.id));
    
    for (const [key, relationship] of this.sessionContext.relationships) {
      if (!pageIds.has(relationship.source)) {
        this.sessionContext.relationships.delete(key);
      }
    }
  }

  extractFacts(messages) {
    // Simple fact extraction from messages
    const facts = [];
    const factPatterns = [
      /^(?:The|A|An)\s+(.+?)\s+(?:is|are|was|were)\s+(.+?)$/i,
      /^(.+?)\s+(?:has|have|had)\s+(.+?)$/i
    ];
    
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.content) {
        const sentences = msg.content.match(/[^.!?]+[.!?]+/g) || [];
        sentences.forEach(sentence => {
          factPatterns.forEach(pattern => {
            const match = sentence.match(pattern);
            if (match) {
              facts.push(sentence.trim());
            }
          });
        });
      }
    });
    
    return facts.slice(0, 10);
  }

  extractPreferences(messages) {
    // Extract user preferences from messages
    const preferences = [];
    const prefPatterns = [
      /I (?:prefer|like|want|need)\s+(.+)/i,
      /(?:Please|Could you|Can you)\s+(.+)/i
    ];
    
    messages.forEach(msg => {
      if (msg.role === 'user' && msg.content) {
        prefPatterns.forEach(pattern => {
          const match = msg.content.match(pattern);
          if (match) {
            preferences.push(match[1].trim());
          }
        });
      }
    });
    
    return [...new Set(preferences)].slice(0, 5);
  }

  extractQuestions(messages) {
    const questions = [];
    
    messages.forEach(msg => {
      if (msg.content && msg.content.includes('?')) {
        const sentences = msg.content.match(/[^.!?]+\?/g) || [];
        questions.push(...sentences.map(q => q.trim()));
      }
    });
    
    return questions;
  }

  isQuestionAnswered(question, messages) {
    // Simple check if question was answered
    const questionIndex = messages.findIndex(m => 
      m.content && m.content.includes(question)
    );
    
    if (questionIndex === -1) return false;
    
    // Check if there's an assistant response after the question
    const subsequentMessages = messages.slice(questionIndex + 1);
    return subsequentMessages.some(m => m.role === 'assistant');
  }

  detectPreferences(conversation) {
    // Analyze conversation for user preferences
    const preferences = {
      responseLength: 'normal',
      technicalLevel: 'medium',
      tone: 'neutral'
    };
    
    const userMessages = conversation.messages
      .filter(m => m.role === 'user')
      .map(m => m.content || '')
      .join(' ')
      .toLowerCase();
    
    // Response length preference
    if (userMessages.includes('brief') || userMessages.includes('short')) {
      preferences.responseLength = 'brief';
    } else if (userMessages.includes('detailed') || userMessages.includes('comprehensive')) {
      preferences.responseLength = 'detailed';
    }
    
    // Technical level
    if (userMessages.includes('simple') || userMessages.includes('eli5')) {
      preferences.technicalLevel = 'simple';
    } else if (userMessages.includes('technical') || userMessages.includes('advanced')) {
      preferences.technicalLevel = 'advanced';
    }
    
    // Tone preference
    if (userMessages.includes('formal')) {
      preferences.tone = 'formal';
    } else if (userMessages.includes('casual') || userMessages.includes('friendly')) {
      preferences.tone = 'casual';
    }
    
    return preferences;
  }

  buildRelationshipContext(query) {
    const relationships = [];
    
    // Get relevant relationships
    for (const [key, rel] of this.sessionContext.relationships) {
      if (relationships.length >= 5) break;
      
      // Include relationships for current page
      if (this.currentPage && rel.source === this.currentPage.id) {
        relationships.push({
          type: rel.type,
          targets: rel.targets.slice(0, 3)
        });
      }
    }
    
    return relationships;
  }

  /**
   * Export session context for backup
   * @returns {Object} Exportable context
   */
  exportContext() {
    return {
      version: '1.0',
      exported: new Date().toISOString(),
      sessionContext: this.sessionContext,
      settings: {
        maxPages: this.maxPages,
        maxConversations: this.maxConversations,
        tokenLimits: this.tokenLimits
      }
    };
  }

  /**
   * Import session context
   * @param {Object} data - Imported context data
   */
  importContext(data) {
    if (data.version !== '1.0') {
      throw new Error('Incompatible context version');
    }
    
    this.sessionContext = data.sessionContext;
    if (data.settings) {
      this.maxPages = data.settings.maxPages || this.maxPages;
      this.maxConversations = data.settings.maxConversations || this.maxConversations;
      this.tokenLimits = data.settings.tokenLimits || this.tokenLimits;
    }
  }

  /**
   * Clear all context
   */
  clearContext() {
    this.sessionContext = {
      pages: [],
      conversations: [],
      timeline: [],
      relationships: new Map()
    };
    this.currentPage = null;
    this.lastCleanup = Date.now();
  }
}