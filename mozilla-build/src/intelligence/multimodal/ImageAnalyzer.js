/**
 * ImageAnalyzer - Analyzes images on web pages
 * Extracts text, generates descriptions, and provides context
 */

export class ImageAnalyzer {
  constructor() {
    this.supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    this.minImageSize = { width: 100, height: 100 };
    this.maxImagesPerPage = 20;
    
    // OCR configuration (preparation for future OCR integration)
    this.ocrConfig = {
      enabled: false,
      confidence: 0.7,
      languages: ['eng']
    };
  }

  /**
   * Analyze images on the current page
   * @param {Document} document - The document to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  async analyzeImages(document = window.document, options = {}) {
    const {
      includeAll = false,
      maxImages = this.maxImagesPerPage,
      includeMetadata = true,
      includeContext = true,
      targetImage = null
    } = options;
    
    try {
      // Get all images
      const images = this.extractImages(document);
      
      // Filter and score images
      const scoredImages = this.scoreImages(images, {
        includeAll,
        targetImage
      });
      
      // Select top images
      const selectedImages = scoredImages
        .sort((a, b) => b.score - a.score)
        .slice(0, maxImages);
      
      // Analyze each image
      const analyzedImages = await Promise.all(
        selectedImages.map(img => this.analyzeImage(img, {
          includeMetadata,
          includeContext
        }))
      );
      
      // Extract overall insights
      const insights = this.extractInsights(analyzedImages);
      
      return {
        images: analyzedImages,
        count: {
          total: images.length,
          analyzed: analyzedImages.length,
          filtered: images.length - analyzedImages.length
        },
        insights,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Image analysis error:', error);
      return {
        error: error.message,
        images: [],
        count: { total: 0, analyzed: 0, filtered: 0 }
      };
    }
  }

  /**
   * Extract all images from document
   * @param {Document} document
   * @returns {Array} Image elements with basic info
   */
  extractImages(document) {
    const images = [];
    
    // Get <img> tags
    const imgElements = document.querySelectorAll('img');
    imgElements.forEach(img => {
      const imageInfo = this.extractImageInfo(img);
      if (imageInfo) {
        images.push(imageInfo);
      }
    });
    
    // Get background images
    const elementsWithBg = document.querySelectorAll('*');
    elementsWithBg.forEach(element => {
      const bgImage = this.extractBackgroundImage(element);
      if (bgImage) {
        images.push(bgImage);
      }
    });
    
    // Get <picture> elements
    const pictureElements = document.querySelectorAll('picture');
    pictureElements.forEach(picture => {
      const pictureInfo = this.extractPictureInfo(picture);
      if (pictureInfo) {
        images.push(pictureInfo);
      }
    });
    
    // Get SVG images
    const svgElements = document.querySelectorAll('svg');
    svgElements.forEach(svg => {
      const svgInfo = this.extractSvgInfo(svg);
      if (svgInfo) {
        images.push(svgInfo);
      }
    });
    
    // Remove duplicates
    return this.deduplicateImages(images);
  }

  /**
   * Extract information from an img element
   * @param {HTMLImageElement} img
   * @returns {Object|null} Image information
   */
  extractImageInfo(img) {
    const src = img.src || img.dataset.src || img.dataset.lazySrc;
    if (!src || !this.isValidImageUrl(src)) return null;
    
    const rect = img.getBoundingClientRect();
    const naturalWidth = img.naturalWidth || parseInt(img.getAttribute('width')) || rect.width;
    const naturalHeight = img.naturalHeight || parseInt(img.getAttribute('height')) || rect.height;
    
    // Skip small images
    if (naturalWidth < this.minImageSize.width || naturalHeight < this.minImageSize.height) {
      return null;
    }
    
    return {
      type: 'img',
      element: img,
      src: this.normalizeUrl(src),
      alt: img.alt || '',
      title: img.title || '',
      width: naturalWidth,
      height: naturalHeight,
      displayWidth: rect.width,
      displayHeight: rect.height,
      isVisible: this.isElementVisible(img),
      loading: img.loading || 'auto',
      srcset: img.srcset || '',
      sizes: img.sizes || '',
      classList: Array.from(img.classList),
      id: img.id,
      parent: {
        tag: img.parentElement?.tagName.toLowerCase(),
        href: img.parentElement?.href
      }
    };
  }

  /**
   * Extract background image from element
   * @param {Element} element
   * @returns {Object|null} Background image information
   */
  extractBackgroundImage(element) {
    const style = window.getComputedStyle(element);
    const bgImage = style.backgroundImage;
    
    if (!bgImage || bgImage === 'none') return null;
    
    const urlMatch = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (!urlMatch) return null;
    
    const src = urlMatch[1];
    if (!this.isValidImageUrl(src)) return null;
    
    const rect = element.getBoundingClientRect();
    if (rect.width < this.minImageSize.width || rect.height < this.minImageSize.height) {
      return null;
    }
    
    return {
      type: 'background',
      element: element,
      src: this.normalizeUrl(src),
      alt: element.getAttribute('aria-label') || '',
      title: element.title || '',
      width: rect.width,
      height: rect.height,
      displayWidth: rect.width,
      displayHeight: rect.height,
      isVisible: this.isElementVisible(element),
      backgroundSize: style.backgroundSize,
      backgroundPosition: style.backgroundPosition,
      classList: Array.from(element.classList),
      id: element.id
    };
  }

  /**
   * Extract information from picture element
   * @param {HTMLPictureElement} picture
   * @returns {Object|null} Picture information
   */
  extractPictureInfo(picture) {
    const img = picture.querySelector('img');
    if (!img) return null;
    
    const sources = Array.from(picture.querySelectorAll('source')).map(source => ({
      srcset: source.srcset,
      media: source.media,
      type: source.type,
      sizes: source.sizes
    }));
    
    const imageInfo = this.extractImageInfo(img);
    if (!imageInfo) return null;
    
    return {
      ...imageInfo,
      type: 'picture',
      sources
    };
  }

  /**
   * Extract information from SVG element
   * @param {SVGElement} svg
   * @returns {Object|null} SVG information
   */
  extractSvgInfo(svg) {
    const rect = svg.getBoundingClientRect();
    if (rect.width < this.minImageSize.width || rect.height < this.minImageSize.height) {
      return null;
    }
    
    // Try to get title and description
    const title = svg.querySelector('title')?.textContent || '';
    const desc = svg.querySelector('desc')?.textContent || '';
    
    return {
      type: 'svg',
      element: svg,
      src: 'inline-svg',
      alt: title || desc || svg.getAttribute('aria-label') || '',
      title: title,
      description: desc,
      width: rect.width,
      height: rect.height,
      displayWidth: rect.width,
      displayHeight: rect.height,
      isVisible: this.isElementVisible(svg),
      viewBox: svg.getAttribute('viewBox'),
      classList: Array.from(svg.classList),
      id: svg.id
    };
  }

  /**
   * Score images by relevance and importance
   * @param {Array} images - Images to score
   * @param {Object} options - Scoring options
   * @returns {Array} Scored images
   */
  scoreImages(images, options = {}) {
    return images.map(image => {
      let score = 0;
      
      // Size score (larger is better)
      const area = image.width * image.height;
      score += Math.min(area / 10000, 30);
      
      // Visibility score
      if (image.isVisible) score += 20;
      
      // Alt text score
      if (image.alt && image.alt.length > 10) score += 15;
      
      // Position score (above fold is better)
      if (image.element) {
        const rect = image.element.getBoundingClientRect();
        if (rect.top < window.innerHeight) score += 10;
        if (rect.top < 200) score += 10;
      }
      
      // Type score
      if (image.type === 'img') score += 5;
      if (image.type === 'picture') score += 8; // Responsive images
      
      // Parent context score
      if (image.parent?.tag === 'a') score += 5; // Linked images
      if (image.parent?.tag === 'figure') score += 10; // Semantic images
      
      // Specific image targeting
      if (options.targetImage && image.element === options.targetImage) {
        score += 100;
      }
      
      // Penalty for tracking/ad images
      const trackingPatterns = ['pixel', 'tracking', 'analytics', 'ad', 'banner'];
      const srcLower = image.src.toLowerCase();
      if (trackingPatterns.some(pattern => srcLower.includes(pattern))) {
        score -= 20;
      }
      
      return {
        ...image,
        score: Math.max(0, score)
      };
    });
  }

  /**
   * Analyze individual image
   * @param {Object} imageInfo - Image information
   * @param {Object} options - Analysis options
   * @returns {Object} Analyzed image data
   */
  async analyzeImage(imageInfo, options = {}) {
    const analysis = {
      ...imageInfo,
      analysis: {
        description: '',
        context: '',
        type: this.classifyImageType(imageInfo),
        metadata: {},
        accessibility: this.analyzeAccessibility(imageInfo),
        quality: this.assessQuality(imageInfo)
      }
    };
    
    // Generate description
    analysis.analysis.description = this.generateDescription(imageInfo);
    
    // Extract context
    if (options.includeContext) {
      analysis.analysis.context = this.extractImageContext(imageInfo);
    }
    
    // Extract metadata
    if (options.includeMetadata) {
      analysis.analysis.metadata = await this.extractImageMetadata(imageInfo);
    }
    
    // OCR (future implementation)
    if (this.ocrConfig.enabled && this.isTextHeavyImage(imageInfo)) {
      analysis.analysis.ocrText = await this.performOCR(imageInfo);
    }
    
    return analysis;
  }

  /**
   * Classify image type based on characteristics
   * @param {Object} imageInfo
   * @returns {string} Image type
   */
  classifyImageType(imageInfo) {
    const { src, alt, width, height, parent } = imageInfo;
    const srcLower = src.toLowerCase();
    const altLower = alt.toLowerCase();
    
    // Icon detection
    if (width < 64 && height < 64) return 'icon';
    if (srcLower.includes('icon') || altLower.includes('icon')) return 'icon';
    
    // Logo detection
    if (srcLower.includes('logo') || altLower.includes('logo')) return 'logo';
    
    // Avatar/profile detection
    if (srcLower.includes('avatar') || srcLower.includes('profile') || 
        altLower.includes('avatar') || altLower.includes('profile')) return 'avatar';
    
    // Product image detection
    if (srcLower.includes('product') || parent?.tag === 'a' && 
        parent.href?.includes('product')) return 'product';
    
    // Chart/graph detection
    if (srcLower.includes('chart') || srcLower.includes('graph') ||
        altLower.includes('chart') || altLower.includes('graph')) return 'chart';
    
    // Screenshot detection
    if (srcLower.includes('screenshot') || altLower.includes('screenshot')) return 'screenshot';
    
    // Hero/banner detection
    if (width > 800 && height < width * 0.5) return 'banner';
    
    // Infographic detection
    if (height > width * 1.5 && (altLower.includes('info') || 
        srcLower.includes('info'))) return 'infographic';
    
    // Default to photo
    return 'photo';
  }

  /**
   * Generate description for image
   * @param {Object} imageInfo
   * @returns {string} Description
   */
  generateDescription(imageInfo) {
    const parts = [];
    
    // Start with type
    const type = imageInfo.analysis?.type || this.classifyImageType(imageInfo);
    parts.push(`A ${type}`);
    
    // Add alt text if meaningful
    if (imageInfo.alt && imageInfo.alt.length > 5) {
      parts.push(`showing "${imageInfo.alt}"`);
    }
    
    // Add dimensions
    parts.push(`(${imageInfo.width}×${imageInfo.height}px)`);
    
    // Add context
    if (imageInfo.parent?.tag === 'a') {
      parts.push('that is clickable');
    }
    
    // Add loading info
    if (imageInfo.loading === 'lazy') {
      parts.push('with lazy loading');
    }
    
    return parts.join(' ');
  }

  /**
   * Extract context around image
   * @param {Object} imageInfo
   * @returns {string} Context
   */
  extractImageContext(imageInfo) {
    if (!imageInfo.element) return '';
    
    const contexts = [];
    
    // Check for figure caption
    const figure = imageInfo.element.closest('figure');
    if (figure) {
      const figcaption = figure.querySelector('figcaption');
      if (figcaption) {
        contexts.push(`Caption: ${figcaption.textContent.trim()}`);
      }
    }
    
    // Check for nearby headings
    const prevHeading = this.findPreviousHeading(imageInfo.element);
    if (prevHeading) {
      contexts.push(`Under heading: ${prevHeading.textContent.trim()}`);
    }
    
    // Check for nearby text
    const nearbyText = this.extractNearbyText(imageInfo.element);
    if (nearbyText) {
      contexts.push(`Nearby text: ${nearbyText}`);
    }
    
    // Check parent link
    if (imageInfo.parent?.href) {
      contexts.push(`Links to: ${imageInfo.parent.href}`);
    }
    
    return contexts.join('. ');
  }

  /**
   * Analyze image accessibility
   * @param {Object} imageInfo
   * @returns {Object} Accessibility analysis
   */
  analyzeAccessibility(imageInfo) {
    const issues = [];
    const score = { current: 0, max: 100 };
    
    // Check alt text
    if (!imageInfo.alt) {
      issues.push('Missing alt text');
    } else if (imageInfo.alt.length < 5) {
      issues.push('Alt text too short');
      score.current += 25;
    } else {
      score.current += 50;
    }
    
    // Check if decorative
    const isDecorative = imageInfo.width < 50 || imageInfo.alt === '';
    if (isDecorative && imageInfo.element?.getAttribute('role') !== 'presentation') {
      issues.push('Decorative image should have role="presentation"');
    } else if (!isDecorative) {
      score.current += 20;
    }
    
    // Check ARIA labels
    if (imageInfo.element?.hasAttribute('aria-label')) {
      score.current += 15;
    }
    
    // Check title attribute
    if (imageInfo.title) {
      score.current += 15;
    }
    
    return {
      score: score.current,
      maxScore: score.max,
      issues,
      isAccessible: issues.length === 0
    };
  }

  /**
   * Assess image quality
   * @param {Object} imageInfo
   * @returns {Object} Quality assessment
   */
  assessQuality(imageInfo) {
    const assessment = {
      resolution: 'unknown',
      format: this.getImageFormat(imageInfo.src),
      isResponsive: false,
      isOptimized: true
    };
    
    // Resolution assessment
    const pixels = imageInfo.width * imageInfo.height;
    if (pixels > 2000000) assessment.resolution = 'high';
    else if (pixels > 500000) assessment.resolution = 'medium';
    else assessment.resolution = 'low';
    
    // Responsive check
    if (imageInfo.srcset || imageInfo.type === 'picture') {
      assessment.isResponsive = true;
    }
    
    // Format optimization check
    const format = assessment.format;
    if (format === 'bmp' || format === 'tiff') {
      assessment.isOptimized = false;
    }
    
    return assessment;
  }

  /**
   * Extract image metadata (future implementation)
   * @param {Object} imageInfo
   * @returns {Object} Metadata
   */
  async extractImageMetadata(imageInfo) {
    // This would require server-side processing or EXIF library
    // For now, return basic metadata
    return {
      url: imageInfo.src,
      format: this.getImageFormat(imageInfo.src),
      dimensions: `${imageInfo.width}×${imageInfo.height}`,
      fileSize: 'unknown' // Would need to fetch image
    };
  }

  /**
   * Extract insights from analyzed images
   * @param {Array} analyzedImages
   * @returns {Object} Insights
   */
  extractInsights(analyzedImages) {
    const insights = {
      types: {},
      accessibility: {
        withAlt: 0,
        withoutAlt: 0,
        averageScore: 0
      },
      quality: {
        responsive: 0,
        optimized: 0
      },
      recommendations: []
    };
    
    // Count types
    analyzedImages.forEach(img => {
      const type = img.analysis.type;
      insights.types[type] = (insights.types[type] || 0) + 1;
      
      // Accessibility
      if (img.alt) insights.accessibility.withAlt++;
      else insights.accessibility.withoutAlt++;
      
      // Quality
      if (img.analysis.quality.isResponsive) insights.quality.responsive++;
      if (img.analysis.quality.isOptimized) insights.quality.optimized++;
    });
    
    // Calculate average accessibility score
    const totalScore = analyzedImages.reduce((sum, img) => 
      sum + img.analysis.accessibility.score, 0);
    insights.accessibility.averageScore = analyzedImages.length > 0 
      ? Math.round(totalScore / analyzedImages.length) 
      : 0;
    
    // Generate recommendations
    if (insights.accessibility.withoutAlt > 0) {
      insights.recommendations.push(
        `Add alt text to ${insights.accessibility.withoutAlt} images for better accessibility`
      );
    }
    
    if (insights.quality.responsive < analyzedImages.length * 0.5) {
      insights.recommendations.push(
        'Consider using responsive images (srcset) for better performance'
      );
    }
    
    return insights;
  }

  /**
   * Helper: Check if element is visible
   * @param {Element} element
   * @returns {boolean}
   */
  isElementVisible(element) {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    return (
      rect.width > 0 &&
      rect.height > 0 &&
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0'
    );
  }

  /**
   * Helper: Check if URL is valid image
   * @param {string} url
   * @returns {boolean}
   */
  isValidImageUrl(url) {
    if (!url || url.startsWith('data:') && url.length > 1000000) return false;
    
    try {
      const urlObj = new URL(url, window.location.href);
      const ext = urlObj.pathname.split('.').pop().toLowerCase();
      return this.supportedFormats.includes(ext) || 
             url.startsWith('data:image/') ||
             urlObj.pathname.includes('image');
    } catch {
      return false;
    }
  }

  /**
   * Helper: Normalize URL
   * @param {string} url
   * @returns {string}
   */
  normalizeUrl(url) {
    try {
      return new URL(url, window.location.href).href;
    } catch {
      return url;
    }
  }

  /**
   * Helper: Get image format
   * @param {string} src
   * @returns {string}
   */
  getImageFormat(src) {
    if (src.startsWith('data:image/')) {
      const match = src.match(/data:image\/([^;]+)/);
      return match ? match[1] : 'unknown';
    }
    
    const ext = src.split('.').pop().split('?')[0].toLowerCase();
    return this.supportedFormats.includes(ext) ? ext : 'unknown';
  }

  /**
   * Helper: Remove duplicate images
   * @param {Array} images
   * @returns {Array}
   */
  deduplicateImages(images) {
    const seen = new Set();
    return images.filter(img => {
      const key = img.src;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Helper: Find previous heading
   * @param {Element} element
   * @returns {Element|null}
   */
  findPreviousHeading(element) {
    let current = element;
    while (current.previousElementSibling) {
      current = current.previousElementSibling;
      if (/^H[1-6]$/.test(current.tagName)) {
        return current;
      }
    }
    
    // Check parent's previous siblings
    if (element.parentElement) {
      return this.findPreviousHeading(element.parentElement);
    }
    
    return null;
  }

  /**
   * Helper: Extract nearby text
   * @param {Element} element
   * @returns {string}
   */
  extractNearbyText(element) {
    const maxLength = 100;
    const texts = [];
    
    // Previous sibling text
    if (element.previousSibling?.nodeType === Node.TEXT_NODE) {
      const text = element.previousSibling.textContent.trim();
      if (text) texts.push(text);
    }
    
    // Next sibling text
    if (element.nextSibling?.nodeType === Node.TEXT_NODE) {
      const text = element.nextSibling.textContent.trim();
      if (text) texts.push(text);
    }
    
    // Parent text (if not too long)
    if (element.parentElement) {
      const parentText = Array.from(element.parentElement.childNodes)
        .filter(node => node.nodeType === Node.TEXT_NODE)
        .map(node => node.textContent.trim())
        .filter(text => text.length > 0)
        .join(' ');
      
      if (parentText && parentText.length < maxLength) {
        texts.push(parentText);
      }
    }
    
    return texts.join(' ').slice(0, maxLength);
  }

  /**
   * Helper: Check if image likely contains text
   * @param {Object} imageInfo
   * @returns {boolean}
   */
  isTextHeavyImage(imageInfo) {
    const indicators = ['screenshot', 'diagram', 'chart', 'infographic', 'text'];
    const srcLower = imageInfo.src.toLowerCase();
    const altLower = imageInfo.alt.toLowerCase();
    
    return indicators.some(indicator => 
      srcLower.includes(indicator) || altLower.includes(indicator)
    );
  }

  /**
   * Placeholder for OCR functionality
   * @param {Object} imageInfo
   * @returns {string}
   */
  async performOCR(imageInfo) {
    // This would integrate with an OCR service in the future
    return '';
  }
}