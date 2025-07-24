/**
 * ContextOptimizer - Optimizes extracted content for AI model consumption
 * Handles context window management, relevance scoring, and content prioritization
 */

export class ContextOptimizer {
  constructor() {
    this.modelLimits = {
      'deepseek-chat': {
        contextWindow: 32768,
        optimalSize: 4000,
        costPerToken: 0.00014
      },
      'deepseek-reasoner': {
        contextWindow: 32768,
        optimalSize: 8000,
        costPerToken: 0.00055
      }
    };
    
    this.relevanceWeights = {
      mainContent: 0.4,
      metadata: 0.1,
      keyPoints: 0.2,
      userQuery: 0.3
    };
  }

  /**
   * Optimize content for AI model consumption
   * @param {Object} analyzedContent - Content from ContentAnalyzer
   * @param {string} userQuery - User's query/prompt
   * @param {string} model - AI model being used
   * @returns {Object} Optimized context
   */
  async optimize(analyzedContent, userQuery, model = 'deepseek-chat') {
    const modelConfig = this.modelLimits[model] || this.modelLimits['deepseek-chat'];
    
    try {
      // Calculate relevance scores
      const relevanceScores = this.calculateRelevance(analyzedContent, userQuery);
      
      // Prioritize content based on relevance
      const prioritizedContent = this.prioritizeContent(analyzedContent, relevanceScores);
      
      // Optimize for context window
      const optimizedContext = this.fitToContextWindow(
        prioritizedContent, 
        modelConfig.optimalSize
      );
      
      // Generate structured context
      const structuredContext = this.generateStructuredContext(
        optimizedContext,
        analyzedContent.metadata,
        userQuery
      );
      
      // Calculate token estimate
      const tokenEstimate = this.estimateTokens(structuredContext);
      
      return {
        context: structuredContext,
        tokenEstimate,
        costEstimate: tokenEstimate * modelConfig.costPerToken,
        relevanceScore: relevanceScores.overall,
        contentType: analyzedContent.contentType,
        optimization: {
          originalLength: analyzedContent.mainContent.text.length,
          optimizedLength: structuredContext.length,
          compressionRatio: structuredContext.length / analyzedContent.mainContent.text.length
        }
      };
    } catch (error) {
      console.error('Context optimization error:', error);
      return this.getFallbackContext(analyzedContent, userQuery);
    }
  }

  /**
   * Calculate relevance scores for different content parts
   * @param {Object} content - Analyzed content
   * @param {string} query - User query
   * @returns {Object} Relevance scores
   */
  calculateRelevance(content, query) {
    const scores = {
      overall: 0,
      sections: []
    };
    
    if (!query) {
      scores.overall = 0.5; // Default relevance
      return scores;
    }
    
    const queryTokens = this.tokenize(query.toLowerCase());
    
    // Score main content
    if (content.mainContent && content.mainContent.elements) {
      content.mainContent.elements.forEach((element, index) => {
        const elementScore = this.scoreElement(element, queryTokens);
        scores.sections.push({
          index,
          type: element.type,
          score: elementScore
        });
      });
    }
    
    // Score metadata relevance
    const metadataScore = this.scoreMetadata(content.metadata, queryTokens);
    
    // Score key points
    const keyPointsScore = this.scoreKeyPoints(content.keyInfo, queryTokens);
    
    // Calculate overall score
    scores.overall = (
      scores.sections.reduce((sum, s) => sum + s.score, 0) / (scores.sections.length || 1) * this.relevanceWeights.mainContent +
      metadataScore * this.relevanceWeights.metadata +
      keyPointsScore * this.relevanceWeights.keyPoints
    );
    
    return scores;
  }

  /**
   * Score individual content element
   * @param {Object} element - Content element
   * @param {Array} queryTokens - Tokenized query
   * @returns {number} Relevance score
   */
  scoreElement(element, queryTokens) {
    let score = 0;
    const text = (element.text || element.content || '').toLowerCase();
    const elementTokens = this.tokenize(text);
    
    // Direct token matches
    queryTokens.forEach(queryToken => {
      if (elementTokens.includes(queryToken)) {
        score += 1;
      }
      // Partial matches
      elementTokens.forEach(elementToken => {
        if (elementToken.includes(queryToken) || queryToken.includes(elementToken)) {
          score += 0.5;
        }
      });
    });
    
    // Boost for certain element types
    if (element.type === 'heading') score *= 1.5;
    if (element.type === 'code' && queryTokens.some(t => ['code', 'function', 'implement'].includes(t))) {
      score *= 2;
    }
    
    // Normalize by length
    score = score / Math.max(queryTokens.length, 1);
    
    return Math.min(score, 1);
  }

  /**
   * Score metadata relevance
   * @param {Object} metadata - Page metadata
   * @param {Array} queryTokens - Tokenized query
   * @returns {number} Relevance score
   */
  scoreMetadata(metadata, queryTokens) {
    let score = 0;
    
    const checkField = (field) => {
      if (!field) return 0;
      const fieldTokens = this.tokenize(field.toLowerCase());
      return queryTokens.filter(qt => fieldTokens.includes(qt)).length / queryTokens.length;
    };
    
    score += checkField(metadata.title) * 2; // Title is more important
    score += checkField(metadata.description);
    score += checkField(metadata.keywords?.join(' '));
    
    return Math.min(score / 4, 1);
  }

  /**
   * Score key points relevance
   * @param {Object} keyInfo - Key information
   * @param {Array} queryTokens - Tokenized query
   * @returns {number} Relevance score
   */
  scoreKeyPoints(keyInfo, queryTokens) {
    if (!keyInfo || !keyInfo.keyPoints) return 0;
    
    let totalScore = 0;
    keyInfo.keyPoints.forEach(point => {
      const pointTokens = this.tokenize(point.toLowerCase());
      const matches = queryTokens.filter(qt => pointTokens.includes(qt)).length;
      totalScore += matches / queryTokens.length;
    });
    
    return Math.min(totalScore / keyInfo.keyPoints.length, 1);
  }

  /**
   * Prioritize content based on relevance scores
   * @param {Object} content - Analyzed content
   * @param {Object} scores - Relevance scores
   * @returns {Object} Prioritized content
   */
  prioritizeContent(content, scores) {
    const prioritized = {
      elements: [],
      metadata: content.metadata,
      keyInfo: content.keyInfo
    };
    
    // Sort sections by relevance
    const sortedSections = scores.sections
      .sort((a, b) => b.score - a.score)
      .filter(s => s.score > 0.1); // Filter out low relevance
    
    // Include high-relevance sections
    sortedSections.forEach(section => {
      if (content.mainContent.elements[section.index]) {
        prioritized.elements.push({
          ...content.mainContent.elements[section.index],
          relevanceScore: section.score
        });
      }
    });
    
    // Include some context around highly relevant sections
    this.addContextualElements(prioritized, content, sortedSections);
    
    return prioritized;
  }

  /**
   * Add contextual elements around relevant sections
   * @param {Object} prioritized - Prioritized content object
   * @param {Object} content - Original content
   * @param {Array} relevantSections - Relevant section indices
   */
  addContextualElements(prioritized, content, relevantSections) {
    const addedIndices = new Set(relevantSections.map(s => s.index));
    
    relevantSections.forEach(section => {
      // Add previous element if it's a heading
      const prevIndex = section.index - 1;
      if (prevIndex >= 0 && !addedIndices.has(prevIndex)) {
        const prevElement = content.mainContent.elements[prevIndex];
        if (prevElement && prevElement.type === 'heading') {
          prioritized.elements.push({
            ...prevElement,
            relevanceScore: section.score * 0.7
          });
          addedIndices.add(prevIndex);
        }
      }
    });
    
    // Sort by original order
    prioritized.elements.sort((a, b) => {
      const aIndex = content.mainContent.elements.indexOf(a);
      const bIndex = content.mainContent.elements.indexOf(b);
      return aIndex - bIndex;
    });
  }

  /**
   * Fit content to context window size
   * @param {Object} content - Prioritized content
   * @param {number} targetSize - Target size in characters
   * @returns {Object} Fitted content
   */
  fitToContextWindow(content, targetSize) {
    const fitted = {
      elements: [],
      summary: '',
      keyPoints: content.keyInfo?.keyPoints || []
    };
    
    let currentSize = 0;
    const maxSize = targetSize * 0.9; // Leave some buffer
    
    // Always include summary if available
    if (content.keyInfo?.summary) {
      fitted.summary = content.keyInfo.summary;
      currentSize += fitted.summary.length;
    }
    
    // Add elements by priority
    for (const element of content.elements) {
      const elementText = element.text || element.content || '';
      if (currentSize + elementText.length <= maxSize) {
        fitted.elements.push(element);
        currentSize += elementText.length;
      } else {
        // Try to add truncated version
        const remainingSpace = maxSize - currentSize;
        if (remainingSpace > 100) {
          fitted.elements.push({
            ...element,
            text: elementText.slice(0, remainingSpace - 10) + '...',
            truncated: true
          });
        }
        break;
      }
    }
    
    return fitted;
  }

  /**
   * Generate structured context for AI model
   * @param {Object} optimizedContent - Optimized content
   * @param {Object} metadata - Page metadata
   * @param {string} userQuery - User query
   * @returns {string} Structured context
   */
  generateStructuredContext(optimizedContent, metadata, userQuery) {
    const parts = [];
    
    // Add metadata header
    parts.push(`[Page Context]`);
    parts.push(`Title: ${metadata.title}`);
    parts.push(`URL: ${metadata.url}`);
    if (metadata.description) {
      parts.push(`Description: ${metadata.description}`);
    }
    parts.push('');
    
    // Add summary if available
    if (optimizedContent.summary) {
      parts.push(`[Summary]`);
      parts.push(optimizedContent.summary);
      parts.push('');
    }
    
    // Add key points if available
    if (optimizedContent.keyPoints?.length > 0) {
      parts.push(`[Key Points]`);
      optimizedContent.keyPoints.forEach((point, i) => {
        parts.push(`${i + 1}. ${point}`);
      });
      parts.push('');
    }
    
    // Add main content
    if (optimizedContent.elements?.length > 0) {
      parts.push(`[Content]`);
      optimizedContent.elements.forEach(element => {
        if (element.type === 'heading') {
          parts.push(`\n## ${element.text}\n`);
        } else if (element.type === 'paragraph') {
          parts.push(element.text);
          parts.push('');
        } else if (element.type === 'code') {
          parts.push(`\`\`\`${element.language || ''}`);
          parts.push(element.content);
          parts.push('```');
          parts.push('');
        } else if (element.type === 'ul' || element.type === 'ol') {
          element.items?.forEach(item => {
            parts.push(`• ${item}`);
          });
          parts.push('');
        } else if (element.type === 'table') {
          parts.push('[Table data omitted for brevity]');
          parts.push('');
        }
      });
    }
    
    return parts.join('\n').trim();
  }

  /**
   * Tokenize text into words
   * @param {string} text - Text to tokenize
   * @returns {Array} Tokens
   */
  tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 2);
  }

  /**
   * Estimate token count for text
   * @param {string} text - Text to estimate
   * @returns {number} Estimated token count
   */
  estimateTokens(text) {
    // Rough estimation: ~4 characters per token on average
    return Math.ceil(text.length / 4);
  }

  /**
   * Get fallback context for error cases
   * @param {Object} content - Analyzed content
   * @param {string} query - User query
   * @returns {Object} Fallback context
   */
  getFallbackContext(content, query) {
    const fallbackText = content.mainContent?.text?.slice(0, 1000) || 
                        'Unable to extract meaningful content from this page.';
    
    return {
      context: `[Page: ${content.metadata?.title || 'Unknown'}]\n\n${fallbackText}`,
      tokenEstimate: this.estimateTokens(fallbackText),
      costEstimate: 0,
      relevanceScore: 0,
      contentType: 'unknown',
      optimization: {
        originalLength: content.mainContent?.text?.length || 0,
        optimizedLength: fallbackText.length,
        compressionRatio: 1
      }
    };
  }
}