/**
 * Context Extractor Integration
 * Provides smart context extraction for the content script
 */

import { SmartContextExtractor } from '../../src/intelligence/context/SmartContextExtractor.js';

// Create singleton instance
const extractor = new SmartContextExtractor();

/**
 * Extract context for chat requests
 * @param {Object} options - Extraction options
 * @returns {Object} Extracted context
 */
export async function extractChatContext(options = {}) {
  const {
    userQuery = '',
    model = 'deepseek-chat',
    includeMetadata = true,
    maxLength = 4000
  } = options;
  
  try {
    // Extract smart context
    const result = await extractor.extractContext({
      document: window.document,
      userQuery,
      model,
      useCache: true,
      includeMetadata,
      maxLength
    });
    
    return {
      url: window.location.href,
      title: document.title,
      content: result.context,
      contentType: result.contentType,
      relevanceScore: result.relevanceScore,
      tokenEstimate: result.tokenEstimate,
      metadata: includeMetadata ? result.metadata : undefined
    };
  } catch (error) {
    console.error('Context extraction error:', error);
    
    // Fallback to simple extraction
    return {
      url: window.location.href,
      title: document.title,
      content: document.body.innerText.substring(0, 500),
      contentType: 'fallback',
      error: error.message
    };
  }
}

/**
 * Extract context for selected text
 * @param {Selection} selection - Text selection
 * @param {Object} options - Extraction options
 * @returns {Object} Extracted context
 */
export async function extractSelectionContext(selection, options = {}) {
  if (!selection || selection.toString().trim() === '') {
    throw new Error('No text selected');
  }
  
  try {
    const result = await extractor.extractSelectionContext(selection, {
      ...options,
      userQuery: options.userQuery || selection.toString()
    });
    
    return {
      url: window.location.href,
      title: document.title,
      selectedText: selection.toString(),
      content: result.context,
      contentType: result.contentType,
      selectionContext: result.selection,
      metadata: result.metadata
    };
  } catch (error) {
    console.error('Selection context extraction error:', error);
    
    // Fallback
    return {
      url: window.location.href,
      title: document.title,
      selectedText: selection.toString(),
      content: selection.toString(),
      contentType: 'selection-fallback',
      error: error.message
    };
  }
}

/**
 * Get context extraction metrics
 * @returns {Object} Metrics
 */
export function getContextMetrics() {
  return extractor.getMetrics();
}

/**
 * Clear context cache
 */
export function clearContextCache() {
  extractor.clearCache();
}

// Export the extractor instance for advanced usage
export { extractor };