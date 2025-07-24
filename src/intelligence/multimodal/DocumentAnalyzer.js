/**
 * DocumentAnalyzer - Analyzes documents linked from web pages
 * Handles PDFs, Office documents, and other file types
 */

export class DocumentAnalyzer {
  constructor() {
    this.supportedTypes = {
      pdf: {
        extensions: ['pdf'],
        mimeTypes: ['application/pdf'],
        icon: '📄',
        analyzer: 'analyzePDF'
      },
      word: {
        extensions: ['doc', 'docx', 'odt'],
        mimeTypes: [
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.oasis.opendocument.text'
        ],
        icon: '📝',
        analyzer: 'analyzeWord'
      },
      excel: {
        extensions: ['xls', 'xlsx', 'ods', 'csv'],
        mimeTypes: [
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.oasis.opendocument.spreadsheet',
          'text/csv'
        ],
        icon: '📊',
        analyzer: 'analyzeSpreadsheet'
      },
      powerpoint: {
        extensions: ['ppt', 'pptx', 'odp'],
        mimeTypes: [
          'application/vnd.ms-powerpoint',
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
          'application/vnd.oasis.opendocument.presentation'
        ],
        icon: '📽️',
        analyzer: 'analyzePresentation'
      },
      text: {
        extensions: ['txt', 'md', 'rst', 'log'],
        mimeTypes: ['text/plain', 'text/markdown'],
        icon: '📃',
        analyzer: 'analyzeText'
      },
      code: {
        extensions: ['js', 'py', 'java', 'cpp', 'cs', 'rb', 'go', 'rs', 'swift', 'kt'],
        mimeTypes: ['text/javascript', 'text/x-python', 'text/x-java'],
        icon: '💻',
        analyzer: 'analyzeCode'
      },
      archive: {
        extensions: ['zip', 'rar', '7z', 'tar', 'gz'],
        mimeTypes: ['application/zip', 'application/x-rar', 'application/x-7z-compressed'],
        icon: '🗜️',
        analyzer: 'analyzeArchive'
      },
      media: {
        extensions: ['mp3', 'mp4', 'avi', 'mov', 'wav'],
        mimeTypes: ['audio/*', 'video/*'],
        icon: '🎬',
        analyzer: 'analyzeMedia'
      }
    };
    
    this.maxDocumentSize = 50 * 1024 * 1024; // 50MB
    this.analysisTimeout = 30000; // 30 seconds
  }

  /**
   * Analyze documents linked from the current page
   * @param {Document} document - The document to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  async analyzeDocuments(document = window.document, options = {}) {
    const {
      maxDocuments = 20,
      includeMetadata = true,
      downloadContent = false,
      targetLink = null
    } = options;
    
    try {
      // Extract document links
      const documentLinks = this.extractDocumentLinks(document);
      
      // Filter and score links
      const scoredLinks = this.scoreDocumentLinks(documentLinks, {
        targetLink
      });
      
      // Select top documents
      const selectedLinks = scoredLinks
        .sort((a, b) => b.score - a.score)
        .slice(0, maxDocuments);
      
      // Analyze each document
      const analyzedDocuments = await Promise.all(
        selectedLinks.map(link => this.analyzeDocumentLink(link, {
          includeMetadata,
          downloadContent
        }))
      );
      
      // Extract insights
      const insights = this.extractInsights(analyzedDocuments);
      
      return {
        documents: analyzedDocuments,
        count: {
          total: documentLinks.length,
          analyzed: analyzedDocuments.length
        },
        insights,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Document analysis error:', error);
      return {
        error: error.message,
        documents: [],
        count: { total: 0, analyzed: 0 }
      };
    }
  }

  /**
   * Extract all document links from page
   * @param {Document} document
   * @returns {Array} Document links
   */
  extractDocumentLinks(document) {
    const links = [];
    const seenUrls = new Set();
    
    // Get all anchor tags
    const anchors = document.querySelectorAll('a[href]');
    
    anchors.forEach(anchor => {
      const href = anchor.href;
      if (!href || seenUrls.has(href)) return;
      
      const docType = this.identifyDocumentType(href);
      if (!docType) return;
      
      seenUrls.add(href);
      
      links.push({
        element: anchor,
        href: href,
        text: anchor.textContent.trim(),
        title: anchor.title || '',
        type: docType,
        icon: this.supportedTypes[docType].icon,
        context: this.extractLinkContext(anchor),
        metadata: {
          hasIcon: !!anchor.querySelector('img, svg, i'),
          isButton: anchor.classList.contains('button') || 
                   anchor.classList.contains('btn'),
          parent: anchor.parentElement?.tagName.toLowerCase()
        }
      });
    });
    
    // Get embedded documents (iframes)
    const iframes = document.querySelectorAll('iframe[src]');
    iframes.forEach(iframe => {
      const src = iframe.src;
      if (!src || seenUrls.has(src)) return;
      
      const docType = this.identifyDocumentType(src);
      if (docType === 'pdf') {
        seenUrls.add(src);
        links.push({
          element: iframe,
          href: src,
          text: iframe.title || 'Embedded PDF',
          title: iframe.title || '',
          type: 'pdf',
          icon: '📄',
          embedded: true,
          context: this.extractLinkContext(iframe)
        });
      }
    });
    
    return links;
  }

  /**
   * Identify document type from URL
   * @param {string} url
   * @returns {string|null} Document type
   */
  identifyDocumentType(url) {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const extension = pathname.split('.').pop();
      
      for (const [type, config] of Object.entries(this.supportedTypes)) {
        if (config.extensions.includes(extension)) {
          return type;
        }
      }
      
      // Check query parameters for dynamic documents
      const params = urlObj.searchParams;
      if (params.has('export') || params.has('download')) {
        const format = params.get('format') || params.get('type');
        if (format) {
          for (const [type, config] of Object.entries(this.supportedTypes)) {
            if (config.extensions.includes(format.toLowerCase())) {
              return type;
            }
          }
        }
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Score document links by relevance
   * @param {Array} links
   * @param {Object} options
   * @returns {Array} Scored links
   */
  scoreDocumentLinks(links, options = {}) {
    return links.map(link => {
      let score = 0;
      
      // Type preferences
      const typeScores = {
        pdf: 30,
        word: 25,
        excel: 20,
        powerpoint: 20,
        text: 15,
        code: 15,
        archive: 10,
        media: 5
      };
      score += typeScores[link.type] || 0;
      
      // Context score
      if (link.context.heading) score += 10;
      if (link.context.description) score += 5;
      
      // Visibility and prominence
      if (link.metadata.isButton) score += 10;
      if (link.metadata.hasIcon) score += 5;
      
      // Text relevance
      const importantWords = ['download', 'report', 'document', 'guide', 'manual', 
                             'whitepaper', 'datasheet', 'presentation'];
      const linkTextLower = link.text.toLowerCase();
      importantWords.forEach(word => {
        if (linkTextLower.includes(word)) score += 5;
      });
      
      // Embedded documents get bonus
      if (link.embedded) score += 15;
      
      // Target link gets maximum score
      if (options.targetLink && link.element === options.targetLink) {
        score += 100;
      }
      
      return {
        ...link,
        score: Math.max(0, score)
      };
    });
  }

  /**
   * Analyze individual document link
   * @param {Object} link
   * @param {Object} options
   * @returns {Object} Analysis result
   */
  async analyzeDocumentLink(link, options = {}) {
    const analysis = {
      ...link,
      analysis: {
        accessible: true,
        metadata: {},
        preview: '',
        warnings: []
      }
    };
    
    // Check accessibility
    try {
      if (options.includeMetadata && !link.embedded) {
        const metadata = await this.fetchDocumentMetadata(link.href);
        analysis.analysis.metadata = metadata;
        
        // Check file size
        if (metadata.size > this.maxDocumentSize) {
          analysis.analysis.warnings.push(
            `Large file: ${this.formatFileSize(metadata.size)}`
          );
        }
      }
    } catch (error) {
      analysis.analysis.accessible = false;
      analysis.analysis.warnings.push('Unable to access document metadata');
    }
    
    // Generate preview based on type
    analysis.analysis.preview = this.generatePreview(link);
    
    // Add type-specific analysis
    const analyzerMethod = this.supportedTypes[link.type]?.analyzer;
    if (analyzerMethod && this[analyzerMethod]) {
      analysis.analysis.typeSpecific = await this[analyzerMethod](link, options);
    }
    
    return analysis;
  }

  /**
   * Extract context around document link
   * @param {Element} element
   * @returns {Object} Context
   */
  extractLinkContext(element) {
    const context = {};
    
    // Find parent list item
    const listItem = element.closest('li');
    if (listItem) {
      context.listItem = listItem.textContent.trim();
    }
    
    // Find nearby heading
    let current = element;
    while (current && current.previousElementSibling) {
      current = current.previousElementSibling;
      if (/^H[1-6]$/.test(current.tagName)) {
        context.heading = current.textContent.trim();
        break;
      }
    }
    
    // Find parent section
    const section = element.closest('section, article');
    if (section) {
      const sectionHeading = section.querySelector('h1, h2, h3');
      if (sectionHeading) {
        context.section = sectionHeading.textContent.trim();
      }
    }
    
    // Find description (next paragraph or list)
    const nextElement = element.nextElementSibling;
    if (nextElement && (nextElement.tagName === 'P' || nextElement.tagName === 'UL')) {
      context.description = nextElement.textContent.trim().slice(0, 200);
    }
    
    return context;
  }

  /**
   * Fetch document metadata (HEAD request)
   * @param {string} url
   * @returns {Object} Metadata
   */
  async fetchDocumentMetadata(url) {
    try {
      const response = await fetch(url, {
        method: 'HEAD',
        mode: 'cors',
        credentials: 'omit'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const metadata = {
        size: parseInt(response.headers.get('content-length') || '0'),
        type: response.headers.get('content-type') || 'unknown',
        lastModified: response.headers.get('last-modified') || '',
        etag: response.headers.get('etag') || ''
      };
      
      return metadata;
    } catch (error) {
      console.warn('Failed to fetch document metadata:', error);
      return {
        size: 0,
        type: 'unknown',
        error: error.message
      };
    }
  }

  /**
   * Generate preview text for document
   * @param {Object} link
   * @returns {string} Preview
   */
  generatePreview(link) {
    const parts = [];
    
    // Type and icon
    parts.push(`${link.icon} ${this.getTypeLabel(link.type)}`);
    
    // Title/text
    if (link.text) {
      parts.push(`"${link.text}"`);
    }
    
    // Context
    if (link.context.heading) {
      parts.push(`under "${link.context.heading}"`);
    }
    
    // Embedded status
    if (link.embedded) {
      parts.push('(embedded in page)');
    }
    
    return parts.join(' ');
  }

  /**
   * Type-specific analyzers
   */
  async analyzePDF(link, options) {
    return {
      type: 'PDF Document',
      features: ['Searchable text', 'Printable', 'May contain forms'],
      usage: 'Best viewed in PDF reader or browser'
    };
  }

  async analyzeWord(link, options) {
    return {
      type: 'Word Document',
      features: ['Editable text', 'Formatting', 'May contain images'],
      usage: 'Requires word processor to edit'
    };
  }

  async analyzeSpreadsheet(link, options) {
    return {
      type: 'Spreadsheet',
      features: ['Tabular data', 'Calculations', 'Charts possible'],
      usage: 'Best viewed in spreadsheet application'
    };
  }

  async analyzePresentation(link, options) {
    return {
      type: 'Presentation',
      features: ['Slides', 'Visual content', 'May contain animations'],
      usage: 'Best viewed in presentation software'
    };
  }

  async analyzeText(link, options) {
    return {
      type: 'Text Document',
      features: ['Plain text', 'No formatting', 'Universal compatibility'],
      usage: 'Can be opened in any text editor'
    };
  }

  async analyzeCode(link, options) {
    const extension = link.href.split('.').pop().toLowerCase();
    const languages = {
      js: 'JavaScript',
      py: 'Python',
      java: 'Java',
      cpp: 'C++',
      cs: 'C#',
      rb: 'Ruby',
      go: 'Go',
      rs: 'Rust',
      swift: 'Swift',
      kt: 'Kotlin'
    };
    
    return {
      type: 'Source Code',
      language: languages[extension] || 'Unknown',
      features: ['Syntax highlighting recommended', 'Plain text format'],
      usage: 'Best viewed in code editor'
    };
  }

  async analyzeArchive(link, options) {
    return {
      type: 'Archive File',
      features: ['Compressed files', 'Multiple files possible'],
      usage: 'Requires extraction software'
    };
  }

  async analyzeMedia(link, options) {
    const extension = link.href.split('.').pop().toLowerCase();
    const isAudio = ['mp3', 'wav', 'ogg'].includes(extension);
    const isVideo = ['mp4', 'avi', 'mov', 'webm'].includes(extension);
    
    return {
      type: isAudio ? 'Audio File' : isVideo ? 'Video File' : 'Media File',
      features: isAudio ? ['Audio content'] : ['Video content', 'May include audio'],
      usage: 'Requires media player'
    };
  }

  /**
   * Extract insights from analyzed documents
   * @param {Array} documents
   * @returns {Object} Insights
   */
  extractInsights(documents) {
    const insights = {
      types: {},
      totalSize: 0,
      accessibility: {
        accessible: 0,
        inaccessible: 0
      },
      warnings: [],
      recommendations: []
    };
    
    // Count types and gather stats
    documents.forEach(doc => {
      // Type counts
      insights.types[doc.type] = (insights.types[doc.type] || 0) + 1;
      
      // Size calculation
      if (doc.analysis.metadata?.size) {
        insights.totalSize += doc.analysis.metadata.size;
      }
      
      // Accessibility
      if (doc.analysis.accessible) {
        insights.accessibility.accessible++;
      } else {
        insights.accessibility.inaccessible++;
      }
      
      // Collect warnings
      insights.warnings.push(...doc.analysis.warnings);
    });
    
    // Generate recommendations
    if (insights.totalSize > 100 * 1024 * 1024) {
      insights.recommendations.push(
        'Large documents detected. Consider providing summaries or excerpts.'
      );
    }
    
    if (insights.accessibility.inaccessible > 0) {
      insights.recommendations.push(
        `${insights.accessibility.inaccessible} documents may not be accessible.`
      );
    }
    
    const pdfCount = insights.types.pdf || 0;
    if (pdfCount > 5) {
      insights.recommendations.push(
        'Many PDFs detected. Consider providing HTML alternatives for better accessibility.'
      );
    }
    
    return insights;
  }

  /**
   * Helper: Get type label
   * @param {string} type
   * @returns {string}
   */
  getTypeLabel(type) {
    const labels = {
      pdf: 'PDF',
      word: 'Word Document',
      excel: 'Spreadsheet',
      powerpoint: 'Presentation',
      text: 'Text File',
      code: 'Source Code',
      archive: 'Archive',
      media: 'Media File'
    };
    return labels[type] || type;
  }

  /**
   * Helper: Format file size
   * @param {number} bytes
   * @returns {string}
   */
  formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }
}