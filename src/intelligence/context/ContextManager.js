/**
 * ContextManager - Orchestrates all context management systems
 * Integrates ContextBuilder, ConversationMemory, and CrossPageContext
 */

import { ContextBuilder } from './ContextBuilder.js';
import { ConversationMemory } from './ConversationMemory.js';
import { CrossPageContext } from './CrossPageContext.js';
import { SmartContextExtractor } from './SmartContextExtractor.js';

export class ContextManager {
  constructor() {
    // Initialize subsystems
    this.contextBuilder = new ContextBuilder();
    this.conversationMemory = new ConversationMemory();
    this.crossPageContext = new CrossPageContext();
    this.smartExtractor = new SmartContextExtractor();
    
    // Configuration
    this.config = {
      enableMemory: true,
      enableCrossPage: true,
      autoResearchMode: true,
      privacyMode: false
    };
    
    // Current state
    this.currentPageId = null;
    this.currentConversation = null;
    
    // Performance metrics
    this.metrics = {
      contextBuilds: 0,
      averageBuildTime: 0,
      memoryQueries: 0,
      crossPageLinks: 0
    };
  }

  /**
   * Initialize context for a new page
   * @param {Object} pageData - Page information
   * @returns {Object} Initial context
   */
  async initializePage(pageData) {
    const startTime = performance.now();
    
    try {
      // Extract smart context from page
      const extractedContext = await this.smartExtractor.extractContext({
        document: pageData.document,
        url: pageData.url,
        title: pageData.title,
        options: {
          includeMetadata: true,
          analyzeSemantic: true
        }
      });
      
      // Add to context builder
      const pageContext = await this.contextBuilder.addPage({
        url: pageData.url,
        title: pageData.title,
        content: extractedContext.content,
        contentType: extractedContext.metadata.contentType,
        metadata: extractedContext.metadata
      });
      
      // Add to cross-page context if enabled
      if (this.config.enableCrossPage) {
        const crossPageResult = await this.crossPageContext.addPage({
          url: pageData.url,
          title: pageData.title,
          content: extractedContext.content
        });
        
        this.currentPageId = crossPageResult.pageContext.id;
      }
      
      // Build initial context
      const context = await this.buildContext({
        includeMemory: this.config.enableMemory,
        includeCrossPage: this.config.enableCrossPage
      });
      
      // Update metrics
      this.updateMetrics('initialize', performance.now() - startTime);
      
      return {
        pageContext,
        extractedContent: extractedContext,
        fullContext: context,
        suggestions: await this.generateSuggestions(context)
      };
      
    } catch (error) {
      console.error('Context initialization error:', error);
      return {
        error: error.message,
        fallbackContext: this.getFallbackContext(pageData)
      };
    }
  }

  /**
   * Process a new conversation message
   * @param {Object} message - Message data
   * @returns {Object} Updated context
   */
  async processMessage(message) {
    const startTime = performance.now();
    
    try {
      // Add to current conversation
      if (!this.currentConversation) {
        this.currentConversation = {
          id: this.generateConversationId(),
          messages: [],
          startTime: new Date().toISOString()
        };
      }
      
      this.currentConversation.messages.push(message);
      
      // Process with conversation memory if enabled
      if (this.config.enableMemory) {
        const memoryExtraction = await this.conversationMemory.processConversation(
          this.currentConversation
        );
        
        // Query memory for relevant information
        if (message.role === 'user') {
          const memoryResults = await this.conversationMemory.query(
            message.content,
            { limit: 5 }
          );
          
          // Add memory context to response
          message.memoryContext = memoryResults;
          this.metrics.memoryQueries++;
        }
      }
      
      // Update context builder
      await this.contextBuilder.addConversation(this.currentConversation);
      
      // Build updated context
      const context = await this.buildContext({
        query: message.content,
        includeMemory: true,
        includeCrossPage: true
      });
      
      // Check for research mode triggers
      if (this.config.autoResearchMode && message.role === 'user') {
        await this.checkResearchModeTriggers(message.content);
      }
      
      // Update metrics
      this.updateMetrics('message', performance.now() - startTime);
      
      return {
        context,
        memoryInsights: message.memoryContext,
        researchMode: !!this.crossPageContext.activeSession
      };
      
    } catch (error) {
      console.error('Message processing error:', error);
      return {
        error: error.message,
        context: await this.buildContext()
      };
    }
  }

  /**
   * Build comprehensive context
   * @param {Object} options - Context building options
   * @returns {Object} Comprehensive context
   */
  async buildContext(options = {}) {
    const {
      query = '',
      targetModel = 'deepseek-chat',
      includeMemory = this.config.enableMemory,
      includeCrossPage = this.config.enableCrossPage,
      maxTokens = null
    } = options;
    
    const startTime = performance.now();
    
    // Get base context from context builder
    const baseContext = await this.contextBuilder.buildContext({
      includePages: true,
      includeConversations: true,
      includeMemory: includeMemory,
      targetModel,
      query,
      maxTokens
    });
    
    // Enhance with memory insights
    if (includeMemory) {
      const memoryContext = await this.conversationMemory.getContext();
      baseContext.memory = {
        ...baseContext.memory,
        insights: memoryContext
      };
    }
    
    // Enhance with cross-page context
    if (includeCrossPage && this.currentPageId) {
      try {
        const crossPageContext = await this.crossPageContext.getContext(
          this.currentPageId,
          {
            includeRelated: true,
            maxRelatedPages: 3
          }
        );
        
        baseContext.crossPage = crossPageContext;
        this.metrics.crossPageLinks = crossPageContext.related.length;
      } catch (error) {
        console.warn('Cross-page context error:', error);
      }
    }
    
    // Add privacy filtering if enabled
    if (this.config.privacyMode) {
      this.applyPrivacyFiltering(baseContext);
    }
    
    // Generate context summary
    baseContext.summary = this.generateContextSummary(baseContext);
    
    // Update metrics
    this.metrics.contextBuilds++;
    const buildTime = performance.now() - startTime;
    this.metrics.averageBuildTime = 
      (this.metrics.averageBuildTime * (this.metrics.contextBuilds - 1) + buildTime) / 
      this.metrics.contextBuilds;
    
    return baseContext;
  }

  /**
   * Start a research session
   * @param {Object} sessionConfig - Research session configuration
   * @returns {string} Session ID
   */
  startResearchSession(sessionConfig) {
    if (!this.config.enableCrossPage) {
      throw new Error('Cross-page context must be enabled for research sessions');
    }
    
    const sessionId = this.crossPageContext.startResearchSession(sessionConfig);
    
    // Notify other components
    this.contextBuilder.addTimelineEvent({
      type: 'research_session_start',
      sessionId,
      config: sessionConfig
    });
    
    return sessionId;
  }

  /**
   * Add a research finding
   * @param {Object} finding - Research finding
   */
  addResearchFinding(finding) {
    this.crossPageContext.addFinding(finding);
    
    // Also store in conversation memory for long-term retention
    if (this.config.enableMemory) {
      this.conversationMemory.facts.set(
        `finding_${Date.now()}`,
        {
          subject: 'Research Finding',
          predicate: 'discovered',
          object: finding.content,
          confidence: 0.9,
          source: 'research_session',
          timestamp: new Date().toISOString()
        }
      );
    }
  }

  /**
   * Get context suggestions
   * @param {Object} context - Current context
   * @returns {Array} Suggestions
   */
  async generateSuggestions(context) {
    const suggestions = [];
    
    // Memory-based suggestions
    if (context.memory?.insights?.topTopics?.length > 0) {
      suggestions.push({
        type: 'topic',
        content: `Continue exploring ${context.memory.insights.topTopics[0]}`,
        confidence: 0.8
      });
    }
    
    // Cross-page suggestions
    if (context.crossPage?.synthesis?.suggestions) {
      suggestions.push(...context.crossPage.synthesis.suggestions.map(s => ({
        type: 'navigation',
        content: s,
        confidence: 0.7
      })));
    }
    
    // Pattern-based suggestions
    if (context.meta?.userIntent === 'question' && context.memory?.insights?.establishedFacts) {
      suggestions.push({
        type: 'answer',
        content: 'I can provide information based on previous conversations',
        confidence: 0.9
      });
    }
    
    // Research mode suggestions
    if (this.crossPageContext.activeSession) {
      const session = this.crossPageContext.researchSessions.get(
        this.crossPageContext.activeSession
      );
      
      if (session?.questions?.length > 0) {
        suggestions.push({
          type: 'research',
          content: `Address question: ${session.questions[0]}`,
          confidence: 0.85
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Check if research mode should be triggered
   * @param {string} query - User query
   */
  async checkResearchModeTriggers(query) {
    const queryLower = query.toLowerCase();
    
    // Research intent patterns
    const researchPatterns = [
      /research\s+(?:on|about|into)/i,
      /find\s+(?:information|details|more)\s+(?:on|about)/i,
      /compare\s+(?:between|different)/i,
      /what\s+(?:is|are)\s+the\s+(?:differences|similarities)/i,
      /learn\s+(?:more\s+)?about/i,
      /investigate/i,
      /explore/i
    ];
    
    const hasResearchIntent = researchPatterns.some(pattern => pattern.test(query));
    
    if (hasResearchIntent && !this.crossPageContext.activeSession) {
      // Extract research topic
      const topic = this.extractResearchTopic(query);
      
      this.startResearchSession({
        name: `Research: ${topic}`,
        goal: query,
        autoDetected: true
      });
    }
  }

  /**
   * Extract research topic from query
   * @param {string} query
   * @returns {string} Topic
   */
  extractResearchTopic(query) {
    // Remove common research phrases
    let topic = query
      .replace(/research\s+(?:on|about|into)\s*/i, '')
      .replace(/find\s+(?:information|details|more)\s+(?:on|about)\s*/i, '')
      .replace(/learn\s+(?:more\s+)?about\s*/i, '')
      .replace(/what\s+(?:is|are)\s*/i, '')
      .trim();
    
    // Take first few words as topic
    const words = topic.split(/\s+/);
    return words.slice(0, 3).join(' ');
  }

  /**
   * Apply privacy filtering to context
   * @param {Object} context
   */
  applyPrivacyFiltering(context) {
    // Remove sensitive patterns
    const sensitivePatterns = [
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b\d{16}\b/g, // Credit card
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g // Phone
    ];
    
    const filterText = (text) => {
      if (!text) return text;
      let filtered = text;
      sensitivePatterns.forEach(pattern => {
        filtered = filtered.replace(pattern, '[REDACTED]');
      });
      return filtered;
    };
    
    // Apply filtering recursively
    const filterObject = (obj) => {
      if (typeof obj === 'string') {
        return filterText(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(filterObject);
      }
      if (typeof obj === 'object' && obj !== null) {
        const filtered = {};
        for (const [key, value] of Object.entries(obj)) {
          filtered[key] = filterObject(value);
        }
        return filtered;
      }
      return obj;
    };
    
    // Filter specific context sections
    if (context.current?.relevantSections) {
      context.current.relevantSections = context.current.relevantSections.map(filterText);
    }
    
    if (context.history?.conversations) {
      context.history.conversations = filterObject(context.history.conversations);
    }
  }

  /**
   * Generate context summary
   * @param {Object} context
   * @returns {string} Summary
   */
  generateContextSummary(context) {
    const parts = [];
    
    // Current page info
    if (context.current?.title) {
      parts.push(`Currently on: ${context.current.title}`);
    }
    
    // Session info
    if (context.meta?.sessionDuration) {
      const duration = Math.round(context.meta.sessionDuration / 60);
      parts.push(`Session: ${duration} minutes, ${context.meta.pageCount} pages`);
    }
    
    // Memory insights
    if (context.memory?.insights?.knownEntities?.length > 0) {
      parts.push(`Tracking ${context.memory.insights.knownEntities.length} entities`);
    }
    
    // Cross-page info
    if (context.crossPage?.related?.length > 0) {
      parts.push(`${context.crossPage.related.length} related pages found`);
    }
    
    // Research mode
    if (this.crossPageContext.activeSession) {
      parts.push('Research mode active');
    }
    
    return parts.join(' | ');
  }

  /**
   * Configuration methods
   */
  
  enableMemory(enabled = true) {
    this.config.enableMemory = enabled;
  }

  enableCrossPage(enabled = true) {
    this.config.enableCrossPage = enabled;
  }

  enableAutoResearch(enabled = true) {
    this.config.autoResearchMode = enabled;
  }

  enablePrivacyMode(enabled = true) {
    this.config.privacyMode = enabled;
  }

  /**
   * Utility methods
   */
  
  updateMetrics(operation, duration) {
    // Track specific operation times
    if (!this.metrics[`${operation}Times`]) {
      this.metrics[`${operation}Times`] = [];
    }
    
    this.metrics[`${operation}Times`].push(duration);
    
    // Keep only recent times
    if (this.metrics[`${operation}Times`].length > 100) {
      this.metrics[`${operation}Times`].shift();
    }
  }

  getFallbackContext(pageData) {
    return {
      current: {
        url: pageData.url,
        title: pageData.title,
        summary: 'Context extraction failed, using basic information'
      },
      memory: {},
      crossPage: {}
    };
  }

  generateConversationId() {
    return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export all context data
   * @returns {Object} All context data
   */
  exportAllContext() {
    return {
      version: '1.0',
      exported: new Date().toISOString(),
      contextBuilder: this.contextBuilder.exportContext(),
      conversationMemory: this.conversationMemory.exportMemory(),
      crossPageContext: this.crossPageContext.exportContext(),
      config: this.config,
      metrics: this.metrics
    };
  }

  /**
   * Import context data
   * @param {Object} data - Context data to import
   */
  importAllContext(data) {
    if (data.version !== '1.0') {
      throw new Error('Incompatible context version');
    }
    
    this.contextBuilder.importContext(data.contextBuilder);
    this.conversationMemory.importMemory(data.conversationMemory);
    this.crossPageContext.importContext(data.crossPageContext);
    this.config = data.config;
    this.metrics = data.metrics;
  }

  /**
   * Clear all context
   */
  clearAllContext() {
    this.contextBuilder.clearContext();
    this.conversationMemory.clearMemory();
    this.crossPageContext.clearContext();
    
    this.currentPageId = null;
    this.currentConversation = null;
    
    // Reset metrics
    this.metrics = {
      contextBuilds: 0,
      averageBuildTime: 0,
      memoryQueries: 0,
      crossPageLinks: 0
    };
  }

  /**
   * Get current metrics
   * @returns {Object} Metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      contextBuilder: this.contextBuilder.getMetrics(),
      memory: this.conversationMemory.stats,
      crossPage: {
        pageCount: this.crossPageContext.pageContexts.size,
        clusterCount: this.crossPageContext.topicClusters.size,
        activeResearch: !!this.crossPageContext.activeSession
      }
    };
  }
}