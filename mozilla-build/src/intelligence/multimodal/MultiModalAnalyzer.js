/**
 * MultiModalAnalyzer - Coordinates analysis of multiple content types
 * Integrates image, document, and future media analysis
 */

import { ImageAnalyzer } from './ImageAnalyzer.js';
import { DocumentAnalyzer } from './DocumentAnalyzer.js';
import { VideoAnalyzer } from './VideoAnalyzer.js';
import { AudioAnalyzer } from './AudioAnalyzer.js';

export class MultiModalAnalyzer {
  constructor() {
    this.imageAnalyzer = new ImageAnalyzer();
    this.documentAnalyzer = new DocumentAnalyzer();
    this.videoAnalyzer = new VideoAnalyzer();
    this.audioAnalyzer = new AudioAnalyzer();
    
    // Analysis cache
    this.cache = new Map();
    this.cacheExpiry = 10 * 60 * 1000; // 10 minutes
    
    // Performance metrics
    this.metrics = {
      totalAnalyses: 0,
      cacheHits: 0,
      averageTime: 0,
      errors: 0
    };
  }

  /**
   * Analyze all multi-modal content on the page
   * @param {Document} document - Document to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Combined analysis results
   */
  async analyze(document = window.document, options = {}) {
    const {
      includeImages = true,
      includeDocuments = true,
      includeVideos = true,
      includeAudio = true,
      maxItems = 20,
      useCache = true,
      context = {}
    } = options;
    
    const startTime = performance.now();
    this.metrics.totalAnalyses++;
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey(document.location.href, options);
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
      
      // Perform analyses in parallel
      const analyses = await Promise.all([
        includeImages ? this.imageAnalyzer.analyzeImages(document, {
          maxImages: Math.floor(maxItems * 0.3),
          includeMetadata: true,
          includeContext: true
        }) : null,
        
        includeDocuments ? this.documentAnalyzer.analyzeDocuments(document, {
          maxDocuments: Math.floor(maxItems * 0.2),
          includeMetadata: true
        }) : null,
        
        includeVideos ? this.videoAnalyzer.analyzeVideos(document, {
          maxVideos: Math.floor(maxItems * 0.3),
          includeMetadata: true,
          includeThumbnails: true
        }) : null,
        
        includeAudio ? this.audioAnalyzer.analyzeAudio(document, {
          maxAudio: Math.floor(maxItems * 0.2),
          includeMetadata: true,
          includeTranscripts: true
        }) : null
      ]);
      
      // Combine results
      const [imageAnalysis, documentAnalysis, videoAnalysis, audioAnalysis] = analyses;
      
      // Create combined analysis
      const combinedAnalysis = this.combineAnalyses({
        images: imageAnalysis,
        documents: documentAnalysis,
        videos: videoAnalysis,
        audio: audioAnalysis,
        context
      });
      
      // Generate insights
      const insights = this.generateInsights(combinedAnalysis);
      
      // Prepare for AI context
      const aiContext = this.prepareAIContext(combinedAnalysis, context);
      
      const result = {
        ...combinedAnalysis,
        insights,
        aiContext,
        analysis: {
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
      
      // Update cache
      if (useCache) {
        this.updateCache(cacheKey, result);
      }
      
      // Update metrics
      this.updateMetrics(performance.now() - startTime);
      
      return result;
      
    } catch (error) {
      console.error('Multi-modal analysis error:', error);
      this.metrics.errors++;
      
      return {
        error: error.message,
        images: { images: [], count: { total: 0, analyzed: 0 } },
        documents: { documents: [], count: { total: 0, analyzed: 0 } },
        insights: {},
        analysis: {
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
  }

  /**
   * Analyze specific selection with multi-modal context
   * @param {Selection} selection - Text selection
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  async analyzeSelection(selection, options = {}) {
    if (!selection || selection.toString().trim() === '') {
      throw new Error('Valid selection required');
    }
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    const parentElement = container.nodeType === Node.TEXT_NODE 
      ? container.parentElement 
      : container;
    
    // Find nearby images
    const nearbyImages = this.findNearbyImages(parentElement);
    
    // Find nearby document links
    const nearbyDocuments = this.findNearbyDocuments(parentElement);
    
    // Analyze found items
    const [imageAnalysis, documentAnalysis] = await Promise.all([
      nearbyImages.length > 0 ? this.imageAnalyzer.analyzeImages(document, {
        maxImages: 5,
        targetImage: nearbyImages[0]
      }) : null,
      
      nearbyDocuments.length > 0 ? this.documentAnalyzer.analyzeDocuments(document, {
        maxDocuments: 5,
        targetLink: nearbyDocuments[0]
      }) : null
    ]);
    
    return {
      selection: {
        text: selection.toString(),
        html: this.getSelectionHTML(selection)
      },
      images: imageAnalysis,
      documents: documentAnalysis,
      context: {
        hasNearbyImages: nearbyImages.length > 0,
        hasNearbyDocuments: nearbyDocuments.length > 0
      }
    };
  }

  /**
   * Combine multiple analyses into unified result
   * @param {Object} analyses - Individual analysis results
   * @returns {Object} Combined analysis
   */
  combineAnalyses(analyses) {
    const combined = {
      images: analyses.images || { images: [], count: { total: 0, analyzed: 0 } },
      documents: analyses.documents || { documents: [], count: { total: 0, analyzed: 0 } },
      videos: analyses.videos || { videos: [], count: { total: 0, analyzed: 0 } },
      audio: analyses.audio || { audio: [], count: { total: 0, analyzed: 0 } },
      summary: {
        totalItems: 0,
        byType: {}
      }
    };
    
    // Calculate summary
    if (analyses.images) {
      combined.summary.totalItems += analyses.images.count.analyzed;
      combined.summary.byType.images = analyses.images.count.analyzed;
    }
    
    if (analyses.documents) {
      combined.summary.totalItems += analyses.documents.count.analyzed;
      combined.summary.byType.documents = analyses.documents.count.analyzed;
    }
    
    if (analyses.videos) {
      combined.summary.totalItems += analyses.videos.count.analyzed;
      combined.summary.byType.videos = analyses.videos.count.analyzed;
    }
    
    if (analyses.audio) {
      combined.summary.totalItems += analyses.audio.count.analyzed;
      combined.summary.byType.audio = analyses.audio.count.analyzed;
    }
    
    return combined;
  }

  /**
   * Generate insights from combined analysis
   * @param {Object} analysis - Combined analysis
   * @returns {Object} Insights
   */
  generateInsights(analysis) {
    const insights = {
      contentRichness: this.assessContentRichness(analysis),
      accessibility: this.assessAccessibility(analysis),
      recommendations: [],
      warnings: []
    };
    
    // Content richness insights
    if (insights.contentRichness.score > 0.7) {
      insights.recommendations.push('This page contains rich multimedia content');
    }
    
    // Accessibility insights
    if (insights.accessibility.score < 0.5) {
      insights.warnings.push('Several accessibility issues detected in multimedia content');
      insights.recommendations.push('Consider adding alt text and document descriptions');
    }
    
    // Type-specific insights
    if (analysis.images.count.analyzed > 10) {
      insights.recommendations.push('Image-heavy page - consider lazy loading for performance');
    }
    
    if (analysis.documents.insights?.types?.pdf > 3) {
      insights.recommendations.push('Multiple PDFs found - ensure they are accessible');
    }
    
    if (analysis.videos.count.analyzed > 0) {
      if (analysis.videos.insights?.features?.withCaptions === 0) {
        insights.warnings.push('Videos lack captions for accessibility');
      }
      if (analysis.videos.count.analyzed > 3) {
        insights.recommendations.push('Multiple videos may impact page load time');
      }
    }
    
    if (analysis.audio.count.analyzed > 0) {
      if (analysis.audio.insights?.features?.withTranscripts === 0) {
        insights.warnings.push('Audio content lacks transcripts for accessibility');
      }
    }
    
    return insights;
  }

  /**
   * Assess content richness
   * @param {Object} analysis
   * @returns {Object} Richness assessment
   */
  assessContentRichness(analysis) {
    let score = 0;
    const factors = [];
    
    // Images contribution
    if (analysis.images.count.analyzed > 0) {
      score += Math.min(analysis.images.count.analyzed / 10, 0.3);
      factors.push(`${analysis.images.count.analyzed} images`);
    }
    
    // Documents contribution
    if (analysis.documents.count.analyzed > 0) {
      score += Math.min(analysis.documents.count.analyzed / 5, 0.2);
      factors.push(`${analysis.documents.count.analyzed} documents`);
    }
    
    // Videos contribution
    if (analysis.videos.count.analyzed > 0) {
      score += Math.min(analysis.videos.count.analyzed / 3, 0.25);
      factors.push(`${analysis.videos.count.analyzed} videos`);
    }
    
    // Audio contribution
    if (analysis.audio.count.analyzed > 0) {
      score += Math.min(analysis.audio.count.analyzed / 5, 0.15);
      factors.push(`${analysis.audio.count.analyzed} audio files`);
    }
    
    // Quality factors
    if (analysis.images.insights?.quality?.responsive > 0) {
      score += 0.1;
      factors.push('responsive images');
    }
    
    // Variety bonus
    const types = Object.keys(analysis.summary.byType).length;
    if (types > 2) {
      score += 0.1;
      factors.push('rich media variety');
    }
    
    return {
      score: Math.min(score, 1),
      factors,
      level: score > 0.7 ? 'high' : score > 0.3 ? 'medium' : 'low'
    };
  }

  /**
   * Assess accessibility of multimedia content
   * @param {Object} analysis
   * @returns {Object} Accessibility assessment
   */
  assessAccessibility(analysis) {
    let totalScore = 0;
    let totalItems = 0;
    const issues = [];
    
    // Image accessibility
    if (analysis.images.insights?.accessibility) {
      const imgAccessibility = analysis.images.insights.accessibility;
      if (imgAccessibility.withoutAlt > 0) {
        issues.push(`${imgAccessibility.withoutAlt} images without alt text`);
      }
      if (imgAccessibility.averageScore) {
        totalScore += imgAccessibility.averageScore;
        totalItems++;
      }
    }
    
    // Document accessibility
    if (analysis.documents.insights?.accessibility) {
      const docAccessibility = analysis.documents.insights.accessibility;
      if (docAccessibility.inaccessible > 0) {
        issues.push(`${docAccessibility.inaccessible} potentially inaccessible documents`);
      }
      // Assume 70% score for accessible documents
      totalScore += docAccessibility.accessible > 0 ? 70 : 0;
      totalItems++;
    }
    
    const averageScore = totalItems > 0 ? totalScore / totalItems : 0;
    
    return {
      score: averageScore / 100,
      issues,
      level: averageScore > 80 ? 'good' : averageScore > 50 ? 'fair' : 'poor'
    };
  }

  /**
   * Prepare context for AI models
   * @param {Object} analysis - Combined analysis
   * @param {Object} context - Additional context
   * @returns {Object} AI-ready context
   */
  prepareAIContext(analysis, context = {}) {
    const aiContext = {
      hasMultimedia: analysis.summary.totalItems > 0,
      multimediaTypes: Object.keys(analysis.summary.byType),
      descriptions: []
    };
    
    // Add image descriptions
    if (analysis.images.images) {
      analysis.images.images.slice(0, 5).forEach(img => {
        aiContext.descriptions.push({
          type: 'image',
          description: img.analysis.description,
          alt: img.alt,
          context: img.analysis.context
        });
      });
    }
    
    // Add document descriptions
    if (analysis.documents.documents) {
      analysis.documents.documents.slice(0, 5).forEach(doc => {
        aiContext.descriptions.push({
          type: 'document',
          description: doc.analysis.preview,
          documentType: doc.type,
          context: doc.context
        });
      });
    }
    
    // Add video descriptions
    if (analysis.videos.videos) {
      analysis.videos.videos.slice(0, 3).forEach(video => {
        aiContext.descriptions.push({
          type: 'video',
          description: video.description,
          platform: video.platform?.name,
          duration: video.native?.duration,
          thumbnail: video.thumbnail
        });
      });
    }
    
    // Add audio descriptions
    if (analysis.audio.audio) {
      analysis.audio.audio.slice(0, 3).forEach(audio => {
        aiContext.descriptions.push({
          type: 'audio',
          description: audio.description,
          format: audio.format,
          duration: audio.native?.duration,
          hasTranscript: audio.transcript?.found
        });
      });
    }
    
    // Create summary for AI
    aiContext.summary = this.createAISummary(analysis);
    
    return aiContext;
  }

  /**
   * Create summary for AI consumption
   * @param {Object} analysis
   * @returns {string} Summary
   */
  createAISummary(analysis) {
    const parts = [];
    
    if (analysis.images.count.analyzed > 0) {
      const imageTypes = {};
      analysis.images.images.forEach(img => {
        const type = img.analysis.type;
        imageTypes[type] = (imageTypes[type] || 0) + 1;
      });
      
      const typesSummary = Object.entries(imageTypes)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ');
      
      parts.push(`This page contains ${analysis.images.count.analyzed} images (${typesSummary})`);
    }
    
    if (analysis.documents.count.analyzed > 0) {
      const docTypes = analysis.documents.insights?.types || {};
      const typesSummary = Object.entries(docTypes)
        .map(([type, count]) => `${count} ${type.toUpperCase()}${count > 1 ? 's' : ''}`)
        .join(', ');
      
      parts.push(`${analysis.documents.count.analyzed} downloadable documents (${typesSummary})`);
    }
    
    if (analysis.videos.count.analyzed > 0) {
      const platforms = analysis.videos.platforms || {};
      const platformsSummary = Object.entries(platforms)
        .map(([platform, count]) => `${count} ${platform}`)
        .join(', ');
      
      parts.push(`${analysis.videos.count.analyzed} videos${platformsSummary ? ` (${platformsSummary})` : ''}`);
    }
    
    if (analysis.audio.count.analyzed > 0) {
      const formats = analysis.audio.formats || {};
      const formatsSummary = Object.entries(formats)
        .map(([format, count]) => `${count} ${format}`)
        .join(', ');
      
      parts.push(`${analysis.audio.count.analyzed} audio files${formatsSummary ? ` (${formatsSummary})` : ''}`);
    }
    
    if (parts.length === 0) {
      parts.push('No significant multimedia content found on this page');
    }
    
    return parts.join('. ') + '.';
  }

  /**
   * Find images near an element
   * @param {Element} element
   * @returns {Array} Nearby images
   */
  findNearbyImages(element) {
    const images = [];
    const maxDistance = 3; // Maximum DOM traversal distance
    
    // Check element itself
    if (element.tagName === 'IMG') {
      images.push(element);
    }
    
    // Check descendants
    const descendantImages = element.querySelectorAll('img');
    images.push(...descendantImages);
    
    // Check siblings
    let current = element;
    let distance = 0;
    
    while (current && distance < maxDistance) {
      if (current.previousElementSibling) {
        current = current.previousElementSibling;
        const siblingImages = current.querySelectorAll('img');
        images.push(...siblingImages);
        if (current.tagName === 'IMG') images.push(current);
      }
      distance++;
    }
    
    current = element;
    distance = 0;
    
    while (current && distance < maxDistance) {
      if (current.nextElementSibling) {
        current = current.nextElementSibling;
        const siblingImages = current.querySelectorAll('img');
        images.push(...siblingImages);
        if (current.tagName === 'IMG') images.push(current);
      }
      distance++;
    }
    
    return [...new Set(images)]; // Remove duplicates
  }

  /**
   * Find document links near an element
   * @param {Element} element
   * @returns {Array} Nearby document links
   */
  findNearbyDocuments(element) {
    const links = [];
    const maxDistance = 3;
    
    // Check element itself
    if (element.tagName === 'A' && element.href) {
      const docType = this.documentAnalyzer.identifyDocumentType(element.href);
      if (docType) links.push(element);
    }
    
    // Check descendants
    const descendantLinks = element.querySelectorAll('a[href]');
    descendantLinks.forEach(link => {
      const docType = this.documentAnalyzer.identifyDocumentType(link.href);
      if (docType) links.push(link);
    });
    
    // Check ancestors
    let parent = element.parentElement;
    let distance = 0;
    
    while (parent && distance < maxDistance) {
      const ancestorLinks = parent.querySelectorAll('a[href]');
      ancestorLinks.forEach(link => {
        const docType = this.documentAnalyzer.identifyDocumentType(link.href);
        if (docType) links.push(link);
      });
      parent = parent.parentElement;
      distance++;
    }
    
    return [...new Set(links)];
  }

  /**
   * Get HTML of selection
   * @param {Selection} selection
   * @returns {string} HTML
   */
  getSelectionHTML(selection) {
    const container = document.createElement('div');
    const range = selection.getRangeAt(0);
    container.appendChild(range.cloneContents());
    return container.innerHTML;
  }

  /**
   * Get cache key
   * @param {string} url - Page URL
   * @param {Object} options - Analysis options
   * @returns {string} Cache key
   */
  getCacheKey(url, options) {
    const optionString = JSON.stringify({
      includeImages: options.includeImages,
      includeDocuments: options.includeDocuments,
      maxItems: options.maxItems
    });
    return `${url}::${optionString}`;
  }

  /**
   * Update cache
   * @param {string} key - Cache key
   * @param {Object} data - Data to cache
   */
  updateCache(key, data) {
    // Remove oldest entries if cache is full
    if (this.cache.size >= 50) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Update metrics
   * @param {number} duration - Analysis duration
   */
  updateMetrics(duration) {
    const totalTime = this.metrics.averageTime * (this.metrics.totalAnalyses - 1) + duration;
    this.metrics.averageTime = totalTime / this.metrics.totalAnalyses;
  }

  /**
   * Get metrics
   * @returns {Object} Current metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      cacheHitRate: this.metrics.cacheHits / this.metrics.totalAnalyses
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}