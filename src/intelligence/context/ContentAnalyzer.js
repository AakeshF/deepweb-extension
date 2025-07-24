/**
 * ContentAnalyzer - Intelligent webpage content analysis
 * Analyzes webpage structure and content for optimal context extraction
 */

export class ContentAnalyzer {
  constructor() {
    this.contentTypePatterns = {
      article: {
        selectors: ['article', '[role="article"]', '.article', '#article', '.post', '.entry-content'],
        indicators: ['author', 'date', 'publish', 'byline', 'headline'],
        minTextLength: 300
      },
      product: {
        selectors: ['.product', '[itemtype*="Product"]', '.item-detail', '.product-detail'],
        indicators: ['price', 'cart', 'buy', 'stock', 'review', 'rating'],
        structured: ['price', 'availability', 'brand', 'description']
      },
      code: {
        selectors: ['pre code', '.highlight', '.code-block', '.gist'],
        indicators: ['function', 'class', 'const', 'import', 'export'],
        languages: ['javascript', 'python', 'java', 'css', 'html']
      },
      documentation: {
        selectors: ['.docs', '.documentation', '.api-docs', '.reference'],
        indicators: ['api', 'reference', 'guide', 'tutorial', 'example'],
        structure: ['toc', 'navigation', 'sections']
      },
      socialMedia: {
        selectors: ['.post', '.tweet', '.status', '.feed-item'],
        indicators: ['like', 'share', 'comment', 'retweet', 'reply'],
        metadata: ['author', 'timestamp', 'engagement']
      },
      news: {
        selectors: ['.news-article', '.story', '[itemtype*="NewsArticle"]'],
        indicators: ['breaking', 'update', 'report', 'headline'],
        required: ['headline', 'date', 'source']
      }
    };
  }

  /**
   * Analyze the webpage and extract structured content
   * @param {Document} document - The webpage document
   * @returns {Object} Analysis results with content type and extracted data
   */
  async analyze(document) {
    const startTime = performance.now();
    
    try {
      // Detect content type
      const contentType = this.detectContentType(document);
      
      // Extract metadata
      const metadata = this.extractMetadata(document);
      
      // Extract main content based on content type
      const mainContent = this.extractMainContent(document, contentType);
      
      // Analyze content structure
      const structure = this.analyzeStructure(document, contentType);
      
      // Extract key information
      const keyInfo = this.extractKeyInformation(mainContent, contentType);
      
      // Calculate quality score
      const qualityScore = this.calculateQualityScore(mainContent, structure);
      
      const analysisTime = performance.now() - startTime;
      
      return {
        contentType,
        metadata,
        mainContent,
        structure,
        keyInfo,
        qualityScore,
        analysisTime,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Content analysis error:', error);
      return {
        error: error.message,
        contentType: 'unknown',
        metadata: this.extractBasicMetadata(document),
        mainContent: this.extractFallbackContent(document),
        analysisTime: performance.now() - startTime
      };
    }
  }

  /**
   * Detect the type of content on the page
   * @param {Document} document
   * @returns {string} Content type
   */
  detectContentType(document) {
    const scores = {};
    
    for (const [type, config] of Object.entries(this.contentTypePatterns)) {
      scores[type] = 0;
      
      // Check for type-specific selectors
      for (const selector of config.selectors) {
        if (document.querySelector(selector)) {
          scores[type] += 10;
        }
      }
      
      // Check for indicator keywords
      const pageText = document.body.innerText.toLowerCase();
      for (const indicator of config.indicators) {
        if (pageText.includes(indicator)) {
          scores[type] += 5;
        }
      }
      
      // Special checks for specific types
      if (type === 'code' && this.hasSignificantCode(document)) {
        scores[type] += 20;
      } else if (type === 'product' && this.hasProductSchema(document)) {
        scores[type] += 25;
      } else if (type === 'article' && this.hasArticleStructure(document)) {
        scores[type] += 15;
      }
    }
    
    // Return the type with highest score, default to 'article' if unclear
    const topType = Object.entries(scores).reduce((a, b) => 
      scores[a[0]] > scores[b[0]] ? a : b
    );
    
    return topType[1] > 10 ? topType[0] : 'article';
  }

  /**
   * Extract metadata from the page
   * @param {Document} document
   * @returns {Object} Page metadata
   */
  extractMetadata(document) {
    const metadata = {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname,
      description: '',
      keywords: [],
      author: '',
      publishDate: '',
      modifiedDate: '',
      language: document.documentElement.lang || 'en',
      ogData: {},
      schemaData: {}
    };
    
    // Extract meta tags
    const metaTags = document.querySelectorAll('meta');
    metaTags.forEach(tag => {
      const name = tag.getAttribute('name') || tag.getAttribute('property');
      const content = tag.getAttribute('content');
      
      if (!name || !content) return;
      
      if (name === 'description') {
        metadata.description = content;
      } else if (name === 'keywords') {
        metadata.keywords = content.split(',').map(k => k.trim());
      } else if (name === 'author') {
        metadata.author = content;
      } else if (name.startsWith('og:')) {
        metadata.ogData[name.replace('og:', '')] = content;
      } else if (name === 'article:published_time') {
        metadata.publishDate = content;
      } else if (name === 'article:modified_time') {
        metadata.modifiedDate = content;
      }
    });
    
    // Extract JSON-LD structured data
    const jsonLdScripts = document.querySelectorAll('script[type="application/ld+json"]');
    jsonLdScripts.forEach(script => {
      try {
        const data = JSON.parse(script.textContent);
        if (data['@type']) {
          metadata.schemaData[data['@type']] = data;
        }
      } catch (e) {
        // Invalid JSON-LD
      }
    });
    
    return metadata;
  }

  /**
   * Extract main content based on content type
   * @param {Document} document
   * @param {string} contentType
   * @returns {Object} Extracted content
   */
  extractMainContent(document, contentType) {
    const config = this.contentTypePatterns[contentType];
    let content = {
      text: '',
      html: '',
      elements: [],
      images: [],
      links: [],
      headings: []
    };
    
    // Try type-specific selectors first
    for (const selector of config.selectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent.length > 100) {
        content = this.extractElementContent(element);
        break;
      }
    }
    
    // Fallback to heuristic-based extraction
    if (!content.text) {
      content = this.extractByHeuristics(document);
    }
    
    // Extract additional elements
    content.headings = this.extractHeadings(document);
    content.images = this.extractImages(document);
    content.links = this.extractImportantLinks(document);
    
    return content;
  }

  /**
   * Extract content from a specific element
   * @param {Element} element
   * @returns {Object} Content object
   */
  extractElementContent(element) {
    const content = {
      text: this.cleanText(element.textContent),
      html: element.innerHTML,
      elements: []
    };
    
    // Extract structured elements
    const paragraphs = element.querySelectorAll('p');
    const lists = element.querySelectorAll('ul, ol');
    const tables = element.querySelectorAll('table');
    const codeBlocks = element.querySelectorAll('pre, code');
    
    content.elements = [
      ...Array.from(paragraphs).map(p => ({
        type: 'paragraph',
        text: this.cleanText(p.textContent)
      })),
      ...Array.from(lists).map(list => ({
        type: list.tagName.toLowerCase(),
        items: Array.from(list.querySelectorAll('li')).map(li => 
          this.cleanText(li.textContent)
        )
      })),
      ...Array.from(tables).map(table => ({
        type: 'table',
        data: this.extractTableData(table)
      })),
      ...Array.from(codeBlocks).map(code => ({
        type: 'code',
        language: code.className.match(/language-(\w+)/)?.[1] || 'unknown',
        content: code.textContent
      }))
    ];
    
    return content;
  }

  /**
   * Extract content using heuristics
   * @param {Document} document
   * @returns {Object} Extracted content
   */
  extractByHeuristics(document) {
    const candidates = [];
    const allElements = document.querySelectorAll('div, section, article, main');
    
    allElements.forEach(element => {
      const text = element.textContent;
      const score = this.calculateContentScore(element);
      
      if (text.length > 200 && score > 0) {
        candidates.push({
          element,
          score,
          textLength: text.length
        });
      }
    });
    
    // Sort by score and pick the best candidate
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length > 0) {
      return this.extractElementContent(candidates[0].element);
    }
    
    // Fallback to body content
    return {
      text: this.cleanText(document.body.textContent),
      html: '',
      elements: []
    };
  }

  /**
   * Calculate content score for an element
   * @param {Element} element
   * @returns {number} Score
   */
  calculateContentScore(element) {
    let score = 0;
    
    // Positive indicators
    const positiveClasses = ['content', 'article', 'main', 'post', 'text', 'body'];
    const negativeClasses = ['nav', 'sidebar', 'menu', 'footer', 'header', 'ad', 'comment'];
    
    const className = element.className.toLowerCase();
    const id = element.id.toLowerCase();
    
    positiveClasses.forEach(cls => {
      if (className.includes(cls) || id.includes(cls)) score += 10;
    });
    
    negativeClasses.forEach(cls => {
      if (className.includes(cls) || id.includes(cls)) score -= 20;
    });
    
    // Text density
    const textLength = element.textContent.length;
    const htmlLength = element.innerHTML.length;
    const textDensity = textLength / (htmlLength || 1);
    
    if (textDensity > 0.4) score += 20;
    if (textDensity > 0.6) score += 10;
    
    // Paragraph count
    const paragraphs = element.querySelectorAll('p');
    score += Math.min(paragraphs.length * 3, 30);
    
    // Link density (fewer links is better for content)
    const links = element.querySelectorAll('a');
    const linkDensity = links.length / (textLength / 100 || 1);
    if (linkDensity < 1) score += 10;
    
    return score;
  }

  /**
   * Extract key information based on content type
   * @param {Object} mainContent
   * @param {string} contentType
   * @returns {Object} Key information
   */
  extractKeyInformation(mainContent, contentType) {
    const keyInfo = {
      summary: '',
      keyPoints: [],
      entities: [],
      topics: []
    };
    
    // Generate summary (first 2-3 paragraphs or 300 chars)
    if (mainContent.elements) {
      const paragraphs = mainContent.elements
        .filter(el => el.type === 'paragraph')
        .slice(0, 3);
      keyInfo.summary = paragraphs.map(p => p.text).join(' ').slice(0, 300) + '...';
    }
    
    // Extract key points (headings + first sentence of each section)
    keyInfo.keyPoints = this.extractKeyPoints(mainContent);
    
    // Extract named entities (simplified)
    keyInfo.entities = this.extractNamedEntities(mainContent.text);
    
    // Extract topics
    keyInfo.topics = this.extractTopics(mainContent.text);
    
    return keyInfo;
  }

  /**
   * Clean text content
   * @param {string} text
   * @returns {string} Cleaned text
   */
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Helper methods for specific checks
   */
  hasSignificantCode(document) {
    const codeElements = document.querySelectorAll('pre code, .highlight');
    return codeElements.length > 2;
  }

  hasProductSchema(document) {
    const productSelectors = [
      '[itemtype*="Product"]',
      '[typeof="Product"]',
      '.product-price',
      '.add-to-cart'
    ];
    return productSelectors.some(sel => document.querySelector(sel));
  }

  hasArticleStructure(document) {
    const hasArticleTag = !!document.querySelector('article');
    const hasDateInfo = !!document.querySelector('time, .date, .published');
    const hasAuthor = !!document.querySelector('.author, .byline, [rel="author"]');
    return hasArticleTag || (hasDateInfo && hasAuthor);
  }

  extractHeadings(document) {
    const headings = [];
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(h => {
      headings.push({
        level: parseInt(h.tagName[1]),
        text: this.cleanText(h.textContent),
        id: h.id
      });
    });
    return headings;
  }

  extractImages(document) {
    const images = [];
    document.querySelectorAll('img').forEach(img => {
      if (img.width > 100 && img.height > 100) {
        images.push({
          src: img.src,
          alt: img.alt,
          width: img.width,
          height: img.height
        });
      }
    });
    return images.slice(0, 10); // Limit to 10 most relevant images
  }

  extractImportantLinks(document) {
    const links = [];
    const seenUrls = new Set();
    
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.href;
      if (!seenUrls.has(href) && href.startsWith('http') && link.textContent.trim()) {
        seenUrls.add(href);
        links.push({
          text: this.cleanText(link.textContent),
          href: href,
          internal: href.includes(window.location.hostname)
        });
      }
    });
    
    return links.slice(0, 20); // Limit to 20 most relevant links
  }

  extractTableData(table) {
    const data = [];
    const rows = table.querySelectorAll('tr');
    
    rows.forEach(row => {
      const cells = row.querySelectorAll('td, th');
      const rowData = Array.from(cells).map(cell => 
        this.cleanText(cell.textContent)
      );
      if (rowData.length > 0) {
        data.push(rowData);
      }
    });
    
    return data;
  }

  extractKeyPoints(content) {
    const keyPoints = [];
    
    // Extract from headings and first sentences
    if (content.elements) {
      content.elements.forEach((element, index) => {
        if (element.type === 'paragraph' && element.text.length > 50) {
          const firstSentence = element.text.match(/^[^.!?]+[.!?]/)?.[0];
          if (firstSentence && firstSentence.length > 20) {
            keyPoints.push(firstSentence);
          }
        }
      });
    }
    
    return keyPoints.slice(0, 5);
  }

  extractNamedEntities(text) {
    const entities = [];
    
    // Simple pattern matching for common entities
    const patterns = {
      emails: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      urls: /https?:\/\/[^\s]+/g,
      numbers: /\b\d{4,}\b/g,
      capitalizedWords: /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g
    };
    
    // Extract capitalized words (potential names/places)
    const matches = text.match(patterns.capitalizedWords) || [];
    const commonWords = new Set(['The', 'This', 'That', 'These', 'Those', 'A', 'An']);
    
    matches.forEach(match => {
      if (!commonWords.has(match) && match.length > 3) {
        entities.push({
          text: match,
          type: 'UNKNOWN'
        });
      }
    });
    
    return [...new Set(entities.map(e => e.text))].slice(0, 10).map(text => ({
      text,
      type: 'ENTITY'
    }));
  }

  extractTopics(text) {
    // Simple keyword extraction based on frequency
    const words = text.toLowerCase().match(/\b[a-z]{4,}\b/g) || [];
    const frequency = {};
    const stopWords = new Set([
      'this', 'that', 'these', 'those', 'with', 'from', 'have', 'been',
      'were', 'their', 'would', 'could', 'should', 'about', 'after'
    ]);
    
    words.forEach(word => {
      if (!stopWords.has(word)) {
        frequency[word] = (frequency[word] || 0) + 1;
      }
    });
    
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word, count]) => ({ word, count }));
  }

  analyzeStructure(document, contentType) {
    return {
      headingCount: document.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      paragraphCount: document.querySelectorAll('p').length,
      imageCount: document.querySelectorAll('img').length,
      linkCount: document.querySelectorAll('a').length,
      listCount: document.querySelectorAll('ul, ol').length,
      tableCount: document.querySelectorAll('table').length,
      formCount: document.querySelectorAll('form').length,
      hasNavigation: !!document.querySelector('nav'),
      hasFooter: !!document.querySelector('footer'),
      hasComments: !!document.querySelector('.comments, #comments, [class*="comment"]')
    };
  }

  calculateQualityScore(content, structure) {
    let score = 0;
    
    // Content quality factors
    if (content.text.length > 500) score += 20;
    if (content.text.length > 1000) score += 10;
    if (content.elements && content.elements.length > 3) score += 15;
    
    // Structure quality factors
    if (structure.headingCount > 2) score += 10;
    if (structure.paragraphCount > 3) score += 10;
    if (structure.imageCount > 0) score += 5;
    
    // Negative factors
    if (structure.linkCount / (content.text.length / 100) > 5) score -= 10;
    
    return Math.max(0, Math.min(100, score));
  }

  extractBasicMetadata(document) {
    return {
      title: document.title,
      url: window.location.href,
      domain: window.location.hostname
    };
  }

  extractFallbackContent(document) {
    return {
      text: document.body.textContent.slice(0, 1000),
      html: '',
      elements: []
    };
  }
}