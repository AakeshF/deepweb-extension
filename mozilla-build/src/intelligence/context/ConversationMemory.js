/**
 * ConversationMemory - Manages long-term conversation memory and learning
 * Tracks entities, facts, preferences, and patterns across conversations
 */

export class ConversationMemory {
  constructor() {
    // Memory stores
    this.entities = new Map(); // Named entities and their relationships
    this.facts = new Map(); // Extracted facts with confidence scores
    this.preferences = new Map(); // User preferences and patterns
    this.questions = new Map(); // Questions asked and their answers
    this.topics = new Map(); // Topic history and frequency
    
    // Learning parameters
    this.confidenceThreshold = 0.6;
    this.memoryDecay = 0.95; // Decay factor for old memories
    this.maxMemoryItems = 1000;
    
    // Relationship graph
    this.relationships = {
      entities: new Map(), // Entity-to-entity relationships
      topics: new Map(), // Topic-to-topic relationships
      temporal: [] // Time-based relationships
    };
    
    // Performance tracking
    this.stats = {
      totalFacts: 0,
      totalEntities: 0,
      totalPreferences: 0,
      memoryHits: 0,
      learningEvents: 0
    };
  }

  /**
   * Process a conversation and extract memory items
   * @param {Object} conversation - Conversation to process
   * @returns {Object} Extracted memory items
   */
  async processConversation(conversation) {
    const extracted = {
      entities: [],
      facts: [],
      preferences: [],
      questions: [],
      topics: []
    };
    
    // Process each message
    for (const message of conversation.messages) {
      if (message.role === 'user') {
        // Extract from user messages
        extracted.questions.push(...this.extractQuestions(message));
        extracted.preferences.push(...this.extractPreferences(message));
      } else if (message.role === 'assistant') {
        // Extract from assistant messages
        extracted.entities.push(...await this.extractEntities(message));
        extracted.facts.push(...await this.extractFacts(message));
      }
      
      // Extract topics from all messages
      extracted.topics.push(...await this.extractTopics(message));
    }
    
    // Update memory stores
    this.updateMemory(extracted, conversation);
    
    // Update relationships
    this.updateRelationships(extracted);
    
    // Apply decay to old memories
    this.applyMemoryDecay();
    
    // Update statistics
    this.updateStats(extracted);
    
    return extracted;
  }

  /**
   * Extract entities from message
   * @param {Object} message
   * @returns {Array} Entities
   */
  async extractEntities(message) {
    const entities = [];
    const text = message.content || '';
    
    // Pattern-based entity extraction
    const patterns = {
      person: /\b([A-Z][a-z]+ [A-Z][a-z]+)\b/g,
      organization: /\b((?:[A-Z][a-z]+\s*)+(?:Inc|Corp|LLC|Ltd|Company|Organization))\b/g,
      location: /\b(?:in|at|from|to)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b/g,
      date: /\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}[/-]\d{1,2}[/-]\d{1,2})\b/g,
      url: /https?:\/\/[^\s]+/g,
      email: /[\w.-]+@[\w.-]+\.\w+/g
    };
    
    for (const [type, pattern] of Object.entries(patterns)) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        entities.push({
          type,
          value: match[1] || match[0],
          context: this.extractContext(text, match.index, 50),
          confidence: 0.7
        });
      }
    }
    
    // Deduplicate entities
    return this.deduplicateEntities(entities);
  }

  /**
   * Extract facts from message
   * @param {Object} message
   * @returns {Array} Facts
   */
  async extractFacts(message) {
    const facts = [];
    const text = message.content || '';
    
    // Split into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    
    for (const sentence of sentences) {
      // Check if sentence contains factual information
      const factPatterns = [
        /^(?:The|A|An)\s+(.+?)\s+(?:is|are|was|were)\s+(.+)$/i,
        /^(.+?)\s+(?:has|have|had)\s+(.+)$/i,
        /^(.+?)\s+(?:means|refers to|is defined as)\s+(.+)$/i,
        /^(?:According to|Based on)\s+(.+?),\s+(.+)$/i
      ];
      
      for (const pattern of factPatterns) {
        const match = sentence.trim().match(pattern);
        if (match) {
          facts.push({
            subject: match[1].trim(),
            predicate: 'is',
            object: match[2].trim(),
            sentence: sentence.trim(),
            confidence: 0.8,
            source: 'conversation',
            timestamp: new Date().toISOString()
          });
          break;
        }
      }
    }
    
    return facts;
  }

  /**
   * Extract user preferences
   * @param {Object} message
   * @returns {Array} Preferences
   */
  extractPreferences(message) {
    const preferences = [];
    const text = message.content || '';
    
    // Preference patterns
    const patterns = [
      { pattern: /I (?:prefer|like|want|need|love|enjoy)\s+(.+?)(?:\.|$)/gi, type: 'positive' },
      { pattern: /I (?:don't|do not|dislike|hate)\s+(?:prefer|like|want|need)\s+(.+?)(?:\.|$)/gi, type: 'negative' },
      { pattern: /(?:Please|Could you|Can you|Would you)\s+(.+?)(?:\.|$)/gi, type: 'request' },
      { pattern: /(?:Always|Never|Usually|Sometimes)\s+(.+?)(?:\.|$)/gi, type: 'frequency' }
    ];
    
    for (const { pattern, type } of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        preferences.push({
          type,
          value: match[1].trim(),
          confidence: 0.7,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return preferences;
  }

  /**
   * Extract questions from message
   * @param {Object} message
   * @returns {Array} Questions
   */
  extractQuestions(message) {
    const questions = [];
    const text = message.content || '';
    
    // Extract sentences ending with ?
    const questionSentences = text.match(/[^.!?]+\?/g) || [];
    
    for (const question of questionSentences) {
      const cleanQuestion = question.trim();
      
      // Classify question type
      let type = 'general';
      if (/^(?:what|which)/i.test(cleanQuestion)) type = 'what';
      else if (/^(?:how)/i.test(cleanQuestion)) type = 'how';
      else if (/^(?:why)/i.test(cleanQuestion)) type = 'why';
      else if (/^(?:when)/i.test(cleanQuestion)) type = 'when';
      else if (/^(?:where)/i.test(cleanQuestion)) type = 'where';
      else if (/^(?:who)/i.test(cleanQuestion)) type = 'who';
      else if (/^(?:is|are|was|were|do|does|did|can|could|will|would|should)/i.test(cleanQuestion)) type = 'yes/no';
      
      questions.push({
        text: cleanQuestion,
        type,
        timestamp: new Date().toISOString(),
        answered: false
      });
    }
    
    return questions;
  }

  /**
   * Extract topics from message
   * @param {Object} message
   * @returns {Array} Topics
   */
  async extractTopics(message) {
    const topics = [];
    const text = (message.content || '').toLowerCase();
    
    // Simple keyword extraction
    const words = text.split(/\W+/).filter(word => word.length > 4);
    const wordFreq = {};
    
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });
    
    // Get top keywords as topics
    const topWords = Object.entries(wordFreq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word, freq]) => ({
        value: word,
        frequency: freq,
        confidence: Math.min(freq / 10, 1)
      }));
    
    topics.push(...topWords);
    
    // Domain-specific topic detection
    const domainTopics = this.detectDomainTopics(text);
    topics.push(...domainTopics);
    
    return topics;
  }

  /**
   * Update memory stores with extracted items
   * @param {Object} extracted - Extracted memory items
   * @param {Object} conversation - Original conversation
   */
  updateMemory(extracted, conversation) {
    const conversationId = conversation.id || this.generateId();
    
    // Update entities
    extracted.entities.forEach(entity => {
      const key = `${entity.type}:${entity.value}`;
      const existing = this.entities.get(key) || {
        type: entity.type,
        value: entity.value,
        occurrences: [],
        confidence: 0
      };
      
      existing.occurrences.push({
        conversationId,
        context: entity.context,
        timestamp: new Date().toISOString()
      });
      
      existing.confidence = this.updateConfidence(
        existing.confidence,
        entity.confidence,
        existing.occurrences.length
      );
      
      this.entities.set(key, existing);
    });
    
    // Update facts
    extracted.facts.forEach(fact => {
      const key = `${fact.subject}:${fact.predicate}:${fact.object}`;
      const existing = this.facts.get(key) || {
        ...fact,
        occurrences: [],
        confidence: 0
      };
      
      existing.occurrences.push({
        conversationId,
        source: fact.source,
        timestamp: fact.timestamp
      });
      
      existing.confidence = this.updateConfidence(
        existing.confidence,
        fact.confidence,
        existing.occurrences.length
      );
      
      this.facts.set(key, existing);
    });
    
    // Update preferences
    extracted.preferences.forEach(pref => {
      const key = `${pref.type}:${pref.value}`;
      const existing = this.preferences.get(key) || {
        ...pref,
        occurrences: 0,
        lastSeen: null
      };
      
      existing.occurrences++;
      existing.lastSeen = pref.timestamp;
      existing.confidence = Math.min(existing.occurrences * 0.2, 1);
      
      this.preferences.set(key, existing);
    });
    
    // Update questions
    extracted.questions.forEach(question => {
      const key = question.text;
      this.questions.set(key, {
        ...question,
        conversationId
      });
    });
    
    // Update topics
    extracted.topics.forEach(topic => {
      const existing = this.topics.get(topic.value) || {
        value: topic.value,
        totalFrequency: 0,
        occurrences: []
      };
      
      existing.totalFrequency += topic.frequency;
      existing.occurrences.push({
        conversationId,
        frequency: topic.frequency,
        timestamp: new Date().toISOString()
      });
      
      this.topics.set(topic.value, existing);
    });
  }

  /**
   * Update relationships between memory items
   * @param {Object} extracted
   */
  updateRelationships(extracted) {
    // Entity co-occurrence relationships
    const entities = extracted.entities;
    for (let i = 0; i < entities.length; i++) {
      for (let j = i + 1; j < entities.length; j++) {
        const key = `${entities[i].value}:${entities[j].value}`;
        const existing = this.relationships.entities.get(key) || {
          entity1: entities[i],
          entity2: entities[j],
          coOccurrences: 0,
          contexts: []
        };
        
        existing.coOccurrences++;
        existing.contexts.push({
          timestamp: new Date().toISOString()
        });
        
        this.relationships.entities.set(key, existing);
      }
    }
    
    // Topic relationships
    const topics = extracted.topics;
    for (let i = 0; i < topics.length; i++) {
      for (let j = i + 1; j < topics.length; j++) {
        const key = `${topics[i].value}:${topics[j].value}`;
        const existing = this.relationships.topics.get(key) || {
          topic1: topics[i].value,
          topic2: topics[j].value,
          coOccurrences: 0
        };
        
        existing.coOccurrences++;
        this.relationships.topics.set(key, existing);
      }
    }
    
    // Temporal relationships
    this.relationships.temporal.push({
      timestamp: new Date().toISOString(),
      entities: entities.map(e => e.value),
      topics: topics.map(t => t.value),
      facts: extracted.facts.length
    });
    
    // Keep only recent temporal relationships
    if (this.relationships.temporal.length > 100) {
      this.relationships.temporal = this.relationships.temporal.slice(-100);
    }
  }

  /**
   * Query memory for relevant information
   * @param {string} query - Query string
   * @param {Object} options - Query options
   * @returns {Object} Relevant memory items
   */
  async query(query, options = {}) {
    const {
      includeEntities = true,
      includeFacts = true,
      includePreferences = true,
      includeRelationships = true,
      limit = 10
    } = options;
    
    const results = {
      entities: [],
      facts: [],
      preferences: [],
      relationships: [],
      topics: []
    };
    
    const queryLower = query.toLowerCase();
    
    // Search entities
    if (includeEntities) {
      for (const [key, entity] of this.entities) {
        if (entity.confidence < this.confidenceThreshold) continue;
        
        if (entity.value.toLowerCase().includes(queryLower) ||
            queryLower.includes(entity.value.toLowerCase())) {
          results.entities.push({
            ...entity,
            relevance: this.calculateRelevance(entity.value, query)
          });
        }
      }
      
      results.entities.sort((a, b) => b.relevance - a.relevance);
      results.entities = results.entities.slice(0, limit);
    }
    
    // Search facts
    if (includeFacts) {
      for (const [key, fact] of this.facts) {
        if (fact.confidence < this.confidenceThreshold) continue;
        
        const factText = `${fact.subject} ${fact.predicate} ${fact.object}`.toLowerCase();
        if (factText.includes(queryLower) || queryLower.includes(fact.subject.toLowerCase())) {
          results.facts.push({
            ...fact,
            relevance: this.calculateRelevance(factText, query)
          });
        }
      }
      
      results.facts.sort((a, b) => b.relevance - a.relevance);
      results.facts = results.facts.slice(0, limit);
    }
    
    // Search preferences
    if (includePreferences) {
      for (const [key, pref] of this.preferences) {
        if (pref.confidence < this.confidenceThreshold) continue;
        
        if (pref.value.toLowerCase().includes(queryLower)) {
          results.preferences.push(pref);
        }
      }
      
      results.preferences = results.preferences.slice(0, limit);
    }
    
    // Search relationships
    if (includeRelationships) {
      // Find entities in query
      const queryEntities = [];
      for (const [key, entity] of this.entities) {
        if (queryLower.includes(entity.value.toLowerCase())) {
          queryEntities.push(entity.value);
        }
      }
      
      // Find related entities
      for (const [key, rel] of this.relationships.entities) {
        if (queryEntities.includes(rel.entity1.value) || 
            queryEntities.includes(rel.entity2.value)) {
          results.relationships.push(rel);
        }
      }
      
      results.relationships = results.relationships
        .sort((a, b) => b.coOccurrences - a.coOccurrences)
        .slice(0, limit);
    }
    
    // Update stats
    this.stats.memoryHits++;
    
    return results;
  }

  /**
   * Get conversation context based on memory
   * @param {Object} options
   * @returns {Object} Context
   */
  async getContext(options = {}) {
    const context = {
      knownEntities: [],
      establishedFacts: [],
      userPreferences: [],
      topTopics: [],
      relationships: []
    };
    
    // Get high-confidence entities
    context.knownEntities = Array.from(this.entities.values())
      .filter(e => e.confidence >= this.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20)
      .map(e => ({
        type: e.type,
        value: e.value,
        confidence: e.confidence
      }));
    
    // Get established facts
    context.establishedFacts = Array.from(this.facts.values())
      .filter(f => f.confidence >= this.confidenceThreshold)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 15)
      .map(f => ({
        fact: `${f.subject} ${f.predicate} ${f.object}`,
        confidence: f.confidence
      }));
    
    // Get user preferences
    context.userPreferences = Array.from(this.preferences.values())
      .filter(p => p.confidence >= 0.5)
      .sort((a, b) => b.occurrences - a.occurrences)
      .slice(0, 10)
      .map(p => ({
        type: p.type,
        value: p.value,
        strength: p.confidence
      }));
    
    // Get top topics
    context.topTopics = Array.from(this.topics.values())
      .sort((a, b) => b.totalFrequency - a.totalFrequency)
      .slice(0, 10)
      .map(t => t.value);
    
    // Get strong relationships
    context.relationships = Array.from(this.relationships.entities.values())
      .filter(r => r.coOccurrences >= 3)
      .sort((a, b) => b.coOccurrences - a.coOccurrences)
      .slice(0, 10)
      .map(r => ({
        entity1: r.entity1.value,
        entity2: r.entity2.value,
        strength: r.coOccurrences
      }));
    
    return context;
  }

  /**
   * Apply decay to old memories
   */
  applyMemoryDecay() {
    const now = Date.now();
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Decay entity confidence
    for (const [key, entity] of this.entities) {
      const lastOccurrence = entity.occurrences[entity.occurrences.length - 1];
      const age = now - new Date(lastOccurrence.timestamp).getTime();
      const ageDays = age / dayInMs;
      
      if (ageDays > 7) {
        entity.confidence *= Math.pow(this.memoryDecay, ageDays / 7);
        if (entity.confidence < 0.1) {
          this.entities.delete(key);
        }
      }
    }
    
    // Decay fact confidence
    for (const [key, fact] of this.facts) {
      const lastOccurrence = fact.occurrences[fact.occurrences.length - 1];
      const age = now - new Date(lastOccurrence.timestamp).getTime();
      const ageDays = age / dayInMs;
      
      if (ageDays > 7) {
        fact.confidence *= Math.pow(this.memoryDecay, ageDays / 7);
        if (fact.confidence < 0.1) {
          this.facts.delete(key);
        }
      }
    }
    
    // Remove old preferences
    for (const [key, pref] of this.preferences) {
      const age = now - new Date(pref.lastSeen).getTime();
      const ageDays = age / dayInMs;
      
      if (ageDays > 30) {
        this.preferences.delete(key);
      }
    }
  }

  /**
   * Helper methods
   */
  
  extractContext(text, position, windowSize) {
    const start = Math.max(0, position - windowSize);
    const end = Math.min(text.length, position + windowSize);
    return text.substring(start, end).trim();
  }

  deduplicateEntities(entities) {
    const seen = new Set();
    return entities.filter(entity => {
      const key = `${entity.type}:${entity.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  updateConfidence(oldConfidence, newConfidence, occurrences) {
    // Weighted average with occurrence bonus
    const weight = 0.7;
    const occurrenceBonus = Math.min(occurrences * 0.05, 0.3);
    return weight * oldConfidence + (1 - weight) * newConfidence + occurrenceBonus;
  }

  calculateRelevance(text, query) {
    const textLower = text.toLowerCase();
    const queryLower = query.toLowerCase();
    
    // Exact match
    if (textLower === queryLower) return 1.0;
    
    // Contains query
    if (textLower.includes(queryLower)) return 0.8;
    
    // Query contains text
    if (queryLower.includes(textLower)) return 0.6;
    
    // Word overlap
    const textWords = textLower.split(/\W+/);
    const queryWords = queryLower.split(/\W+/);
    const overlap = queryWords.filter(w => textWords.includes(w)).length;
    
    return overlap / queryWords.length;
  }

  detectDomainTopics(text) {
    const topics = [];
    
    // Programming topics
    const programmingKeywords = ['javascript', 'python', 'code', 'function', 'variable', 'api', 'database'];
    const foundProgramming = programmingKeywords.filter(kw => text.includes(kw));
    if (foundProgramming.length > 0) {
      topics.push({
        value: 'programming',
        frequency: foundProgramming.length,
        confidence: 0.8
      });
    }
    
    // Science topics
    const scienceKeywords = ['research', 'study', 'experiment', 'hypothesis', 'theory', 'data'];
    const foundScience = scienceKeywords.filter(kw => text.includes(kw));
    if (foundScience.length > 0) {
      topics.push({
        value: 'science',
        frequency: foundScience.length,
        confidence: 0.7
      });
    }
    
    // Business topics
    const businessKeywords = ['business', 'company', 'market', 'customer', 'revenue', 'strategy'];
    const foundBusiness = businessKeywords.filter(kw => text.includes(kw));
    if (foundBusiness.length > 0) {
      topics.push({
        value: 'business',
        frequency: foundBusiness.length,
        confidence: 0.7
      });
    }
    
    return topics;
  }

  updateStats(extracted) {
    this.stats.totalFacts += extracted.facts.length;
    this.stats.totalEntities += extracted.entities.length;
    this.stats.totalPreferences += extracted.preferences.length;
    this.stats.learningEvents++;
  }

  generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Export memory for backup
   * @returns {Object} Exportable memory
   */
  exportMemory() {
    return {
      version: '1.0',
      exported: new Date().toISOString(),
      entities: Array.from(this.entities.entries()),
      facts: Array.from(this.facts.entries()),
      preferences: Array.from(this.preferences.entries()),
      questions: Array.from(this.questions.entries()),
      topics: Array.from(this.topics.entries()),
      relationships: {
        entities: Array.from(this.relationships.entities.entries()),
        topics: Array.from(this.relationships.topics.entries()),
        temporal: this.relationships.temporal
      },
      stats: this.stats
    };
  }

  /**
   * Import memory from backup
   * @param {Object} data - Memory data
   */
  importMemory(data) {
    if (data.version !== '1.0') {
      throw new Error('Incompatible memory version');
    }
    
    this.entities = new Map(data.entities);
    this.facts = new Map(data.facts);
    this.preferences = new Map(data.preferences);
    this.questions = new Map(data.questions);
    this.topics = new Map(data.topics);
    
    this.relationships = {
      entities: new Map(data.relationships.entities),
      topics: new Map(data.relationships.topics),
      temporal: data.relationships.temporal
    };
    
    this.stats = data.stats;
  }

  /**
   * Clear all memory
   */
  clearMemory() {
    this.entities.clear();
    this.facts.clear();
    this.preferences.clear();
    this.questions.clear();
    this.topics.clear();
    
    this.relationships = {
      entities: new Map(),
      topics: new Map(),
      temporal: []
    };
    
    this.stats = {
      totalFacts: 0,
      totalEntities: 0,
      totalPreferences: 0,
      memoryHits: 0,
      learningEvents: 0
    };
  }
}