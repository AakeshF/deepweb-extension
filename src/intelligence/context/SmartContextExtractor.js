/**
 * SmartContextExtractor - Main orchestrator for intelligent context extraction
 * Coordinates content analysis and optimization for AI consumption
 */

import { ContentAnalyzer } from './ContentAnalyzer.js';
import { ContextOptimizer } from './ContextOptimizer.js';

export class SmartContextExtractor {
  constructor() {
    this.analyzer = new ContentAnalyzer();
    this.optimizer = new ContextOptimizer();
    
    // Cache for performance
    this.cache = new Map();
    this.cacheMaxSize = 50;
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
    
    // Performance metrics
    this.metrics = {
      totalExtractions: 0,
      cacheHits: 0,
      averageTime: 0,
      errors: 0
    };
  }

  /**
   * Extract smart context from the current page
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted and optimized context
   */
  async extractContext(options = {}) {
    const {
      document = window.document,
      userQuery = '',
      model = 'deepseek-chat',
      useCache = true,
      includeMetadata = true,
      includeImages = false,
      maxLength = null
    } = options;
    
    const startTime = performance.now();
    this.metrics.totalExtractions++;
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey(document.location.href, userQuery, model);
      if (useCache && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          this.metrics.cacheHits++;
          return {
            ...cached.data,
            fromCache: true
          };
        }
      }
      
      // Analyze content
      const analyzedContent = await this.analyzer.analyze(document);
      
      // Optimize for AI model
      const optimizedContext = await this.optimizer.optimize(
        analyzedContent,
        userQuery,
        model
      );
      
      // Apply additional options
      let finalContext = this.applyOptions(optimizedContext, {
        includeMetadata,
        includeImages,
        maxLength
      });
      
      // Add extraction metadata
      finalContext.extraction = {
        timestamp: new Date().toISOString(),
        duration: performance.now() - startTime,
        method: 'smart',
        options
      };
      
      // Update cache
      if (useCache) {
        this.updateCache(cacheKey, finalContext);
      }
      
      // Update metrics
      this.updateMetrics(performance.now() - startTime);
      
      return finalContext;
      
    } catch (error) {
      console.error('Smart context extraction error:', error);
      this.metrics.errors++;
      
      // Fallback to basic extraction
      return this.getFallbackContext(document, userQuery, model);
    }
  }

  /**
   * Extract context for specific element
   * @param {Element} element - DOM element to extract from
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted context
   */
  async extractElementContext(element, options = {}) {
    if (!element) {
      throw new Error('Element is required for extraction');
    }
    
    // Create a temporary document with just this element
    const tempDoc = document.implementation.createHTMLDocument();
    tempDoc.body.appendChild(element.cloneNode(true));
    
    return this.extractContext({
      ...options,
      document: tempDoc
    });
  }

  /**
   * Extract context for selection
   * @param {Selection} selection - Text selection
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted context
   */
  async extractSelectionContext(selection, options = {}) {
    if (!selection || selection.toString().trim() === '') {
      throw new Error('Valid selection is required');
    }
    
    const selectedText = selection.toString();
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Get the parent element
    const parentElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container;
    
    // Extract context from parent element
    const elementContext = await this.extractElementContext(parentElement, options);
    
    // Enhance with selection-specific info
    elementContext.selection = {
      text: selectedText,
      context: this.getSelectionContext(selection),
      position: {
        start: range.startOffset,
        end: range.endOffset
      }
    };
    
    return elementContext;
  }

  /**
   * Get surrounding context for a selection
   * @param {Selection} selection - Text selection
   * @returns {Object} Selection context
   */
  getSelectionContext(selection) {
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const text = container.textContent || '';
    
    // Get text before and after selection
    const before = text.substring(
      Math.max(0, range.startOffset - 100),
      range.startOffset
    );
    const after = text.substring(
      range.endOffset,
      Math.min(text.length, range.endOffset + 100)
    );
    
    return {
      before: before.trim(),
      after: after.trim(),
      fullText: text.trim()
    };
  }

  /**
   * Apply additional options to context
   * @param {Object} context - Optimized context
   * @param {Object} options - Options to apply
   * @returns {Object} Modified context
   */
  applyOptions(context, options) {
    let modifiedContext = { ...context };
    
    // Remove metadata if not needed
    if (!options.includeMetadata) {
      delete modifiedContext.metadata;
    }
    
    // Add images if requested
    if (options.includeImages && context.images?.length > 0) {
      modifiedContext.images = context.images.slice(0, 5).map(img => ({
        url: img.src,
        alt: img.alt,
        relevance: this.calculateImageRelevance(img, context.userQuery)
      }));
    }
    
    // Apply max length constraint
    if (options.maxLength && modifiedContext.context.length > options.maxLength) {
      modifiedContext.context = modifiedContext.context.slice(0, options.maxLength - 10) + '...';
      modifiedContext.truncated = true;
    }
    
    return modifiedContext;
  }

  /**
   * Calculate image relevance to query
   * @param {Object} image - Image data
   * @param {string} query - User query
   * @returns {number} Relevance score
   */
  calculateImageRelevance(image, query) {
    if (!query || !image.alt) return 0.5;
    
    const queryTokens = query.toLowerCase().split(/\s+/);
    const altTokens = image.alt.toLowerCase().split(/\s+/);
    
    const matches = queryTokens.filter(qt => 
      altTokens.some(at => at.includes(qt) || qt.includes(at))
    );
    
    return matches.length / queryTokens.length;
  }

  /**
   * Get cache key for content
   * @param {string} url - Page URL
   * @param {string} query - User query
   * @param {string} model - AI model
   * @returns {string} Cache key
   */
  getCacheKey(url, query, model) {
    return `${url}::${query}::${model}`;
  }

  /**
   * Update cache with new data
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  updateCache(key, data) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.cacheMaxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Update performance metrics
   * @param {number} duration - Extraction duration
   */
  updateMetrics(duration) {
    const totalTime = this.metrics.averageTime * (this.metrics.totalExtractions - 1) + duration;
    this.metrics.averageTime = totalTime / this.metrics.totalExtractions;
  }

  /**
   * Get fallback context for errors
   * @param {Document} document - Document object
   * @param {string} query - User query
   * @param {string} model - AI model
   * @returns {Object} Fallback context
   */
  getFallbackContext(document, query, model) {
    const basicText = document.body.textContent.slice(0, 500);
    
    return {
      context: `[Page: ${document.title}]\n\n${basicText}...`,
      tokenEstimate: Math.ceil(basicText.length / 4),
      costEstimate: 0,
      relevanceScore: 0,
      contentType: 'fallback',
      extraction: {
        timestamp: new Date().toISOString(),
        method: 'fallback',
        error: true
      }
    };
  }

  /**
   * Get extraction metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.cacheHits / this.metrics.totalExtractions
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      totalExtractions: 0,
      cacheHits: 0,
      averageTime: 0,
      errors: 0
    };
  }
}