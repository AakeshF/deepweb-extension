/**
 * CrossPageContext - Manages context continuation across multiple pages
 * Enables coherent AI conversations spanning different web pages
 */

export class CrossPageContext {
  constructor() {
    // Context storage
    this.pageContexts = new Map(); // Page-specific contexts
    this.sessionContext = {
      id: this.generateSessionId(),
      startTime: new Date().toISOString(),
      pages: [],
      commonTopics: new Set(),
      journey: []
    };
    
    // Similarity detection
    this.similarityThreshold = 0.6;
    this.domainGroups = new Map(); // Group pages by domain
    this.topicClusters = new Map(); // Group pages by topic
    
    // Research session management
    this.researchSessions = new Map();
    this.activeSession = null;
    
    // Context continuation settings
    this.maxContextAge = 30 * 60 * 1000; // 30 minutes
    this.maxContextSize = 10 * 1024; // 10KB per page
    this.maxPagesInContext = 5;
  }

  /**
   * Add a new page to cross-page context
   * @param {Object} pageData - Page information and content
   * @returns {Object} Page context with relationships
   */
  async addPage(pageData) {
    const pageContext = {
      id: this.generatePageId(),
      url: pageData.url,
      domain: new URL(pageData.url).hostname,
      title: pageData.title,
      timestamp: new Date().toISOString(),
      content: await this.processPageContent(pageData.content),
      topics: await this.extractPageTopics(pageData),
      summary: await this.generatePageSummary(pageData),
      connections: []
    };
    
    // Store page context
    this.pageContexts.set(pageContext.id, pageContext);
    this.sessionContext.pages.push(pageContext.id);
    
    // Update domain groups
    this.updateDomainGroups(pageContext);
    
    // Find connections to other pages
    pageContext.connections = await this.findPageConnections(pageContext);
    
    // Update topic clusters
    await this.updateTopicClusters(pageContext);
    
    // Update session journey
    this.updateJourney(pageContext);
    
    // Check for research session
    await this.checkResearchSession(pageContext);
    
    // Clean old contexts
    this.cleanOldContexts();
    
    return {
      pageContext,
      relatedPages: this.getRelatedPages(pageContext.id),
      sessionInfo: this.getSessionInfo()
    };
  }

  /**
   * Get context for current page including related pages
   * @param {string} currentPageId - Current page ID
   * @param {Object} options - Context options
   * @returns {Object} Combined context
   */
  async getContext(currentPageId, options = {}) {
    const {
      includeRelated = true,
      maxRelatedPages = 3,
      includeSummaries = true,
      includeJourney = true
    } = options;
    
    const context = {
      current: null,
      related: [],
      journey: [],
      session: null,
      synthesis: null
    };
    
    // Get current page context
    const currentPage = this.pageContexts.get(currentPageId);
    if (!currentPage) {
      throw new Error('Current page not found in context');
    }
    
    context.current = {
      url: currentPage.url,
      title: currentPage.title,
      summary: currentPage.summary,
      topics: Array.from(currentPage.topics),
      timestamp: currentPage.timestamp
    };
    
    // Get related pages
    if (includeRelated) {
      const relatedPages = this.getRelatedPages(currentPageId)
        .slice(0, maxRelatedPages);
      
      context.related = relatedPages.map(({ page, relationship }) => ({
        url: page.url,
        title: page.title,
        summary: includeSummaries ? page.summary : null,
        relationship,
        similarity: this.calculateSimilarity(currentPage, page)
      }));
    }
    
    // Get journey context
    if (includeJourney) {
      context.journey = this.getJourneyContext(currentPageId);
    }
    
    // Get research session if active
    if (this.activeSession) {
      context.session = this.getSessionContext(this.activeSession);
    }
    
    // Generate synthesis
    context.synthesis = await this.generateSynthesis(context);
    
    return context;
  }

  /**
   * Start a research session
   * @param {Object} sessionData - Session configuration
   * @returns {string} Session ID
   */
  startResearchSession(sessionData) {
    const sessionId = this.generateSessionId();
    
    const session = {
      id: sessionId,
      name: sessionData.name || 'Research Session',
      goal: sessionData.goal || '',
      startTime: new Date().toISOString(),
      pages: [],
      findings: [],
      questions: [],
      status: 'active'
    };
    
    this.researchSessions.set(sessionId, session);
    this.activeSession = sessionId;
    
    return sessionId;
  }

  /**
   * Add finding to research session
   * @param {Object} finding - Research finding
   */
  addFinding(finding) {
    if (!this.activeSession) return;
    
    const session = this.researchSessions.get(this.activeSession);
    if (!session) return;
    
    session.findings.push({
      ...finding,
      pageId: this.sessionContext.pages[this.sessionContext.pages.length - 1],
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Process page content for context
   * @param {Object} content - Raw page content
   * @returns {Object} Processed content
   */
  async processPageContent(content) {
    // Extract key information
    const processed = {
      mainContent: this.extractMainContent(content),
      keyPoints: await this.extractKeyPoints(content),
      entities: await this.extractEntities(content),
      links: this.extractLinks(content),
      metadata: content.metadata || {}
    };
    
    // Compress if needed
    if (JSON.stringify(processed).length > this.maxContextSize) {
      processed.mainContent = this.compressContent(processed.mainContent);
    }
    
    return processed;
  }

  /**
   * Extract topics from page
   * @param {Object} pageData
   * @returns {Set} Topics
   */
  async extractPageTopics(pageData) {
    const topics = new Set();
    
    // Extract from title
    const titleWords = pageData.title.toLowerCase().split(/\W+/)
      .filter(word => word.length > 4);
    titleWords.forEach(word => topics.add(word));
    
    // Extract from content
    if (pageData.content?.text) {
      const contentWords = pageData.content.text.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 4);
      
      // Word frequency analysis
      const wordFreq = {};
      contentWords.forEach(word => {
        wordFreq[word] = (wordFreq[word] || 0) + 1;
      });
      
      // Add top words as topics
      Object.entries(wordFreq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([word]) => topics.add(word));
    }
    
    // Add to common topics
    topics.forEach(topic => {
      if (this.sessionContext.commonTopics.has(topic)) {
        // Topic appears in multiple pages
        topics.add(topic);
      }
      this.sessionContext.commonTopics.add(topic);
    });
    
    return topics;
  }

  /**
   * Find connections between pages
   * @param {Object} pageContext
   * @returns {Array} Connections
   */
  async findPageConnections(pageContext) {
    const connections = [];
    
    // Check each existing page
    for (const [pageId, otherPage] of this.pageContexts) {
      if (pageId === pageContext.id) continue;
      
      // Domain connection
      if (otherPage.domain === pageContext.domain) {
        connections.push({
          pageId: pageId,
          type: 'same-domain',
          strength: 0.8
        });
      }
      
      // Topic similarity
      const topicSimilarity = this.calculateTopicSimilarity(
        pageContext.topics,
        otherPage.topics
      );
      
      if (topicSimilarity > this.similarityThreshold) {
        connections.push({
          pageId: pageId,
          type: 'similar-topic',
          strength: topicSimilarity
        });
      }
      
      // Link connection
      if (this.hasLinkConnection(pageContext, otherPage)) {
        connections.push({
          pageId: pageId,
          type: 'linked',
          strength: 1.0
        });
      }
      
      // Temporal connection (visited close in time)
      const timeDiff = Math.abs(
        new Date(pageContext.timestamp) - new Date(otherPage.timestamp)
      );
      if (timeDiff < 5 * 60 * 1000) { // 5 minutes
        connections.push({
          pageId: pageId,
          type: 'temporal',
          strength: 1 - timeDiff / (5 * 60 * 1000)
        });
      }
    }
    
    // Sort by strength and deduplicate
    return this.consolidateConnections(connections);
  }

  /**
   * Update domain groups
   * @param {Object} pageContext
   */
  updateDomainGroups(pageContext) {
    const domain = pageContext.domain;
    
    if (!this.domainGroups.has(domain)) {
      this.domainGroups.set(domain, []);
    }
    
    this.domainGroups.get(domain).push(pageContext.id);
  }

  /**
   * Update topic clusters
   * @param {Object} pageContext
   */
  async updateTopicClusters(pageContext) {
    // Find best matching cluster
    let bestCluster = null;
    let bestSimilarity = 0;
    
    for (const [clusterId, cluster] of this.topicClusters) {
      const similarity = this.calculateTopicSimilarity(
        pageContext.topics,
        cluster.topics
      );
      
      if (similarity > bestSimilarity && similarity > this.similarityThreshold) {
        bestCluster = clusterId;
        bestSimilarity = similarity;
      }
    }
    
    if (bestCluster) {
      // Add to existing cluster
      const cluster = this.topicClusters.get(bestCluster);
      cluster.pages.push(pageContext.id);
      
      // Update cluster topics
      pageContext.topics.forEach(topic => cluster.topics.add(topic));
    } else {
      // Create new cluster
      const clusterId = this.generateClusterId();
      this.topicClusters.set(clusterId, {
        id: clusterId,
        topics: new Set(pageContext.topics),
        pages: [pageContext.id],
        created: new Date().toISOString()
      });
    }
  }

  /**
   * Update journey tracking
   * @param {Object} pageContext
   */
  updateJourney(pageContext) {
    const journeyStep = {
      pageId: pageContext.id,
      url: pageContext.url,
      title: pageContext.title,
      timestamp: pageContext.timestamp,
      topics: Array.from(pageContext.topics).slice(0, 3),
      action: this.detectUserAction(pageContext)
    };
    
    this.sessionContext.journey.push(journeyStep);
    
    // Keep journey size manageable
    if (this.sessionContext.journey.length > 20) {
      this.sessionContext.journey.shift();
    }
  }

  /**
   * Check if this is part of a research session
   * @param {Object} pageContext
   */
  async checkResearchSession(pageContext) {
    if (!this.activeSession) {
      // Check if we should start a session
      const shouldStartSession = await this.shouldStartResearchSession(pageContext);
      if (shouldStartSession) {
        this.startResearchSession({
          name: `Research: ${Array.from(pageContext.topics)[0]}`,
          goal: 'Exploring related topics'
        });
      }
    }
    
    if (this.activeSession) {
      const session = this.researchSessions.get(this.activeSession);
      session.pages.push(pageContext.id);
      
      // Add any questions found in content
      const questions = this.extractQuestions(pageContext.content);
      session.questions.push(...questions);
    }
  }

  /**
   * Get related pages for a given page
   * @param {string} pageId
   * @returns {Array} Related pages with relationships
   */
  getRelatedPages(pageId) {
    const page = this.pageContexts.get(pageId);
    if (!page) return [];
    
    const related = [];
    
    // Get connected pages
    page.connections.forEach(connection => {
      const connectedPage = this.pageContexts.get(connection.pageId);
      if (connectedPage) {
        related.push({
          page: connectedPage,
          relationship: connection.type,
          strength: connection.strength
        });
      }
    });
    
    // Get pages from same domain
    const domainPages = this.domainGroups.get(page.domain) || [];
    domainPages.forEach(otherPageId => {
      if (otherPageId !== pageId && !related.find(r => r.page.id === otherPageId)) {
        const otherPage = this.pageContexts.get(otherPageId);
        if (otherPage) {
          related.push({
            page: otherPage,
            relationship: 'same-domain',
            strength: 0.5
          });
        }
      }
    });
    
    // Sort by strength
    return related.sort((a, b) => b.strength - a.strength);
  }

  /**
   * Get journey context
   * @param {string} currentPageId
   * @returns {Object} Journey information
   */
  getJourneyContext(currentPageId) {
    const currentIndex = this.sessionContext.journey
      .findIndex(step => step.pageId === currentPageId);
    
    return {
      steps: this.sessionContext.journey,
      currentIndex,
      previous: currentIndex > 0 ? 
        this.sessionContext.journey[currentIndex - 1] : null,
      pattern: this.detectJourneyPattern()
    };
  }

  /**
   * Generate synthesis of context
   * @param {Object} context
   * @returns {Object} Synthesis
   */
  async generateSynthesis(context) {
    const synthesis = {
      summary: '',
      themes: [],
      insights: [],
      suggestions: []
    };
    
    // Identify common themes
    const allTopics = new Set();
    if (context.current) {
      context.current.topics.forEach(t => allTopics.add(t));
    }
    context.related.forEach(page => {
      if (page.summary) {
        // Extract topics from summaries
        const words = page.summary.toLowerCase().split(/\W+/);
        words.forEach(w => {
          if (w.length > 4) allTopics.add(w);
        });
      }
    });
    
    synthesis.themes = Array.from(allTopics).slice(0, 5);
    
    // Generate insights
    if (context.related.length > 2) {
      synthesis.insights.push('Multiple related pages found in this research session');
    }
    
    if (context.journey && context.journey.pattern) {
      synthesis.insights.push(`Detected ${context.journey.pattern} browsing pattern`);
    }
    
    // Generate suggestions
    if (context.session) {
      synthesis.suggestions.push('Continue exploring related topics');
      if (context.session.questions.length > 0) {
        synthesis.suggestions.push('Address unanswered questions from research');
      }
    }
    
    // Create summary
    synthesis.summary = `Exploring ${synthesis.themes.join(', ')} across ${context.related.length + 1} pages`;
    
    return synthesis;
  }

  /**
   * Helper methods
   */
  
  calculateSimilarity(page1, page2) {
    // Topic similarity
    const topicSim = this.calculateTopicSimilarity(page1.topics, page2.topics);
    
    // Domain similarity
    const domainSim = page1.domain === page2.domain ? 1.0 : 0.0;
    
    // Temporal similarity
    const timeDiff = Math.abs(
      new Date(page1.timestamp) - new Date(page2.timestamp)
    );
    const temporalSim = Math.max(0, 1 - timeDiff / (60 * 60 * 1000)); // 1 hour
    
    // Weighted combination
    return topicSim * 0.5 + domainSim * 0.3 + temporalSim * 0.2;
  }

  calculateTopicSimilarity(topics1, topics2) {
    const set1 = topics1 instanceof Set ? topics1 : new Set(topics1);
    const set2 = topics2 instanceof Set ? topics2 : new Set(topics2);
    
    if (set1.size === 0 || set2.size === 0) return 0;
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  hasLinkConnection(page1, page2) {
    // Check if page1 links to page2
    if (page1.content?.links) {
      return page1.content.links.some(link => 
        link.href === page2.url || link.href.includes(page2.domain)
      );
    }
    return false;
  }

  consolidateConnections(connections) {
    // Group by pageId and take strongest connection
    const consolidated = {};
    
    connections.forEach(conn => {
      if (!consolidated[conn.pageId] || 
          consolidated[conn.pageId].strength < conn.strength) {
        consolidated[conn.pageId] = conn;
      }
    });
    
    return Object.values(consolidated);
  }

  detectUserAction(pageContext) {
    const url = pageContext.url.toLowerCase();
    const title = pageContext.title.toLowerCase();
    
    // Common action patterns
    if (url.includes('search') || title.includes('search')) return 'search';
    if (url.includes('article') || url.includes('blog')) return 'read';
    if (url.includes('product') || url.includes('item')) return 'browse';
    if (url.includes('docs') || url.includes('documentation')) return 'reference';
    if (url.includes('compare') || title.includes('vs')) return 'compare';
    
    return 'explore';
  }

  shouldStartResearchSession(pageContext) {
    // Check if user is researching (multiple related pages in short time)
    const recentPages = Array.from(this.pageContexts.values())
      .filter(p => {
        const age = Date.now() - new Date(p.timestamp).getTime();
        return age < 10 * 60 * 1000; // 10 minutes
      });
    
    if (recentPages.length < 3) return false;
    
    // Check topic similarity
    const avgSimilarity = recentPages.reduce((sum, page) => {
      return sum + this.calculateTopicSimilarity(pageContext.topics, page.topics);
    }, 0) / recentPages.length;
    
    return avgSimilarity > 0.5;
  }

  extractQuestions(content) {
    const questions = [];
    
    if (content.mainContent) {
      const questionMatches = content.mainContent.match(/[^.!?]+\?/g) || [];
      questions.push(...questionMatches.map(q => q.trim()));
    }
    
    return questions;
  }

  detectJourneyPattern() {
    if (this.sessionContext.journey.length < 3) return null;
    
    const actions = this.sessionContext.journey.map(step => step.action);
    
    // Check for patterns
    if (actions.filter(a => a === 'search').length > 2) return 'exploratory-search';
    if (actions.filter(a => a === 'read').length > 3) return 'deep-reading';
    if (actions.filter(a => a === 'compare').length > 1) return 'comparison-shopping';
    if (actions.filter(a => a === 'reference').length > 2) return 'technical-research';
    
    return 'general-browsing';
  }

  getSessionContext(sessionId) {
    const session = this.researchSessions.get(sessionId);
    if (!session) return null;
    
    return {
      name: session.name,
      goal: session.goal,
      duration: Date.now() - new Date(session.startTime).getTime(),
      pageCount: session.pages.length,
      findings: session.findings.length,
      questions: session.questions
    };
  }

  getSessionInfo() {
    return {
      id: this.sessionContext.id,
      duration: Date.now() - new Date(this.sessionContext.startTime).getTime(),
      pageCount: this.sessionContext.pages.length,
      topicCount: this.sessionContext.commonTopics.size,
      hasActiveResearch: !!this.activeSession
    };
  }

  extractMainContent(content) {
    // Extract main textual content
    return (content.text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 1000); // Limit size
  }

  async extractKeyPoints(content) {
    // Simple key point extraction
    const text = content.text || '';
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    // Find sentences with important indicators
    const keyPoints = sentences
      .filter(s => {
        const lower = s.toLowerCase();
        return lower.includes('important') ||
               lower.includes('key') ||
               lower.includes('main') ||
               lower.includes('summary') ||
               lower.includes('conclusion');
      })
      .slice(0, 3);
    
    return keyPoints;
  }

  async extractEntities(content) {
    // Simple entity extraction
    const entities = [];
    const text = content.text || '';
    
    // Extract URLs
    const urls = text.match(/https?:\/\/[^\s]+/g) || [];
    entities.push(...urls.map(url => ({ type: 'url', value: url })));
    
    // Extract capitalized phrases (potential proper nouns)
    const properNouns = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*/g) || [];
    entities.push(...properNouns
      .slice(0, 10)
      .map(noun => ({ type: 'name', value: noun })));
    
    return entities;
  }

  extractLinks(content) {
    // Extract links from content
    return (content.links || []).map(link => ({
      href: link.href,
      text: link.text,
      type: this.classifyLink(link)
    }));
  }

  classifyLink(link) {
    const href = link.href.toLowerCase();
    const text = (link.text || '').toLowerCase();
    
    if (href.includes('wikipedia')) return 'reference';
    if (href.includes('github')) return 'code';
    if (href.includes('arxiv')) return 'research';
    if (text.includes('next') || text.includes('continue')) return 'navigation';
    if (text.includes('source') || text.includes('reference')) return 'citation';
    
    return 'general';
  }

  compressContent(content) {
    // Simple content compression - take first and last parts
    const words = content.split(/\s+/);
    if (words.length <= 200) return content;
    
    const firstPart = words.slice(0, 100).join(' ');
    const lastPart = words.slice(-50).join(' ');
    
    return `${firstPart} [...] ${lastPart}`;
  }

  cleanOldContexts() {
    const now = Date.now();
    const oldestAllowed = now - this.maxContextAge;
    
    // Remove old pages
    for (const [pageId, page] of this.pageContexts) {
      if (new Date(page.timestamp).getTime() < oldestAllowed) {
        this.pageContexts.delete(pageId);
        
        // Remove from session
        const index = this.sessionContext.pages.indexOf(pageId);
        if (index > -1) {
          this.sessionContext.pages.splice(index, 1);
        }
        
        // Remove from domain groups
        const domainPages = this.domainGroups.get(page.domain);
        if (domainPages) {
          const domainIndex = domainPages.indexOf(pageId);
          if (domainIndex > -1) {
            domainPages.splice(domainIndex, 1);
          }
        }
      }
    }
    
    // Clean empty domain groups
    for (const [domain, pages] of this.domainGroups) {
      if (pages.length === 0) {
        this.domainGroups.delete(domain);
      }
    }
    
    // Keep only recent journey steps
    if (this.sessionContext.journey.length > 20) {
      this.sessionContext.journey = this.sessionContext.journey.slice(-20);
    }
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generatePageId() {
    return `page_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  generateClusterId() {
    return `cluster_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export cross-page context
   * @returns {Object} Exportable context
   */
  exportContext() {
    return {
      version: '1.0',
      exported: new Date().toISOString(),
      sessionContext: this.sessionContext,
      pageContexts: Array.from(this.pageContexts.entries()),
      domainGroups: Array.from(this.domainGroups.entries()),
      topicClusters: Array.from(this.topicClusters.entries()).map(([id, cluster]) => [
        id,
        {
          ...cluster,
          topics: Array.from(cluster.topics)
        }
      ]),
      researchSessions: Array.from(this.researchSessions.entries())
    };
  }

  /**
   * Import cross-page context
   * @param {Object} data
   */
  importContext(data) {
    if (data.version !== '1.0') {
      throw new Error('Incompatible context version');
    }
    
    this.sessionContext = data.sessionContext;
    this.pageContexts = new Map(data.pageContexts);
    this.domainGroups = new Map(data.domainGroups);
    
    // Convert topic arrays back to Sets
    this.topicClusters = new Map(data.topicClusters.map(([id, cluster]) => [
      id,
      {
        ...cluster,
        topics: new Set(cluster.topics)
      }
    ]));
    
    this.researchSessions = new Map(data.researchSessions);
  }

  /**
   * Clear all context
   */
  clearContext() {
    this.pageContexts.clear();
    this.domainGroups.clear();
    this.topicClusters.clear();
    this.researchSessions.clear();
    
    this.sessionContext = {
      id: this.generateSessionId(),
      startTime: new Date().toISOString(),
      pages: [],
      commonTopics: new Set(),
      journey: []
    };
    
    this.activeSession = null;
  }
}