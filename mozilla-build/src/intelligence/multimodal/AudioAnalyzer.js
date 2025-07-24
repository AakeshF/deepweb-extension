/**
 * AudioAnalyzer - Analyzes audio content for AI context
 * Extracts audio metadata, transcripts, and context
 */

export class AudioAnalyzer {
  constructor() {
    this.supportedFormats = ['mp3', 'wav', 'ogg', 'webm', 'm4a', 'flac'];
    this.supportedPlatforms = {
      soundcloud: {
        regex: /soundcloud\.com\/([^\/]+)\/([^\/]+)/,
        name: 'SoundCloud'
      },
      spotify: {
        regex: /open\.spotify\.com\/(track|episode|podcast)\/([^?]+)/,
        name: 'Spotify'
      },
      apple: {
        regex: /music\.apple\.com\/[^\/]+\/album\/[^\/]+\/(\d+)/,
        name: 'Apple Music'
      }
    };
    
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Analyze audio content on the page
   * @param {Document} document - Document to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Audio analysis results
   */
  async analyzeAudio(document = window.document, options = {}) {
    const {
      maxAudio = 10,
      includeMetadata = true,
      includeTranscripts = true,
      includeWaveform = false
    } = options;
    
    const startTime = performance.now();
    
    try {
      // Find all audio elements
      const audioElements = this.findAudioElements(document);
      
      // Limit analysis
      const audioToAnalyze = audioElements.slice(0, maxAudio);
      
      // Analyze each audio element in parallel
      const analyses = await Promise.all(
        audioToAnalyze.map(audio => this.analyzeAudioElement(audio, {
          includeMetadata,
          includeTranscripts,
          includeWaveform
        }))
      );
      
      // Filter out failed analyses
      const validAnalyses = analyses.filter(a => a && !a.error);
      
      // Generate insights
      const insights = this.generateInsights(validAnalyses);
      
      return {
        audio: validAnalyses,
        count: {
          total: audioElements.length,
          analyzed: validAnalyses.length
        },
        insights,
        formats: this.countFormats(validAnalyses),
        analysis: {
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Audio analysis error:', error);
      return {
        error: error.message,
        audio: [],
        count: { total: 0, analyzed: 0 },
        analysis: {
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString(),
          error: true
        }
      };
    }
  }

  /**
   * Find all audio elements on the page
   * @param {Document} document
   * @returns {Array} Audio elements
   */
  findAudioElements(document) {
    const audioElements = [];
    
    // Native HTML5 audio
    const audioTags = document.querySelectorAll('audio');
    audioElements.push(...Array.from(audioTags).map(a => ({
      type: 'native',
      element: a,
      src: a.src || a.querySelector('source')?.src
    })));
    
    // Audio links
    const audioLinks = document.querySelectorAll('a[href]');
    audioLinks.forEach(link => {
      const href = link.href;
      if (this.isAudioUrl(href)) {
        audioElements.push({
          type: 'link',
          element: link,
          src: href
        });
      }
    });
    
    // Embedded players (SoundCloud, Spotify, etc.)
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
      const src = iframe.src;
      if (src && (src.includes('soundcloud.com') || src.includes('spotify.com'))) {
        audioElements.push({
          type: 'embedded',
          element: iframe,
          src: src
        });
      }
    });
    
    return audioElements;
  }

  /**
   * Check if URL is an audio file
   * @param {string} url
   * @returns {boolean}
   */
  isAudioUrl(url) {
    const extension = url.split('.').pop().toLowerCase().split('?')[0];
    return this.supportedFormats.includes(extension);
  }

  /**
   * Analyze individual audio element
   * @param {Object} audio - Audio object
   * @param {Object} options - Analysis options
   * @returns {Object} Audio analysis
   */
  async analyzeAudioElement(audio, options) {
    try {
      // Check cache
      const cacheKey = audio.src;
      if (cacheKey && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }
      
      const analysis = {
        type: audio.type,
        src: audio.src,
        element: {
          tag: audio.element.tagName,
          id: audio.element.id,
          classes: audio.element.className
        }
      };
      
      // Extract format
      if (audio.src) {
        analysis.format = this.extractAudioFormat(audio.src);
      }
      
      // Extract platform info
      const platformInfo = this.extractPlatformInfo(audio.src);
      if (platformInfo) {
        analysis.platform = platformInfo;
      }
      
      // Native audio analysis
      if (audio.type === 'native') {
        Object.assign(analysis, this.analyzeNativeAudio(audio.element));
      }
      
      // Extract metadata from context
      if (options.includeMetadata) {
        analysis.metadata = this.extractAudioMetadata(audio.element);
      }
      
      // Generate description
      analysis.description = this.generateAudioDescription(analysis);
      
      // Look for transcript or lyrics
      if (options.includeTranscripts) {
        analysis.transcript = this.findTranscript(audio.element);
      }
      
      // Cache result
      if (cacheKey) {
        this.cache.set(cacheKey, {
          data: analysis,
          timestamp: Date.now()
        });
      }
      
      return analysis;
      
    } catch (error) {
      console.error('Error analyzing audio:', error);
      return {
        error: error.message,
        src: audio.src,
        type: audio.type
      };
    }
  }

  /**
   * Extract audio format from URL
   * @param {string} url
   * @returns {string|null} Format
   */
  extractAudioFormat(url) {
    const extension = url.split('.').pop().toLowerCase().split('?')[0];
    return this.supportedFormats.includes(extension) ? extension : null;
  }

  /**
   * Extract platform information from URL
   * @param {string} url - Audio URL
   * @returns {Object|null} Platform info
   */
  extractPlatformInfo(url) {
    if (!url) return null;
    
    for (const [platform, config] of Object.entries(this.supportedPlatforms)) {
      const match = url.match(config.regex);
      if (match) {
        return {
          name: config.name,
          platform,
          id: match[2] || match[1]
        };
      }
    }
    
    return null;
  }

  /**
   * Analyze native HTML5 audio
   * @param {HTMLAudioElement} audio
   * @returns {Object} Analysis
   */
  analyzeNativeAudio(audio) {
    const analysis = {
      native: {
        duration: audio.duration || 0,
        currentTime: audio.currentTime || 0,
        paused: audio.paused,
        muted: audio.muted,
        volume: audio.volume,
        playbackRate: audio.playbackRate,
        readyState: audio.readyState,
        networkState: audio.networkState
      }
    };
    
    // Check for controls
    analysis.hasControls = audio.controls;
    
    // Get preload setting
    analysis.preload = audio.preload;
    
    // Check if audio has multiple sources
    const sources = audio.querySelectorAll('source');
    if (sources.length > 0) {
      analysis.sources = Array.from(sources).map(source => ({
        src: source.src,
        type: source.type
      }));
    }
    
    return analysis;
  }

  /**
   * Extract metadata from audio context
   * @param {Element} element
   * @returns {Object} Metadata
   */
  extractAudioMetadata(element) {
    const metadata = {};
    
    // Look for title
    const title = this.findNearbyText(element, ['h1', 'h2', 'h3', 'h4', '[class*="title"]', '[class*="song"]', '[class*="track"]']);
    if (title) metadata.title = title;
    
    // Look for artist
    const artist = this.findNearbyText(element, ['[class*="artist"]', '[class*="author"]', '[class*="by"]']);
    if (artist) metadata.artist = artist;
    
    // Look for album
    const album = this.findNearbyText(element, ['[class*="album"]', '[class*="collection"]']);
    if (album) metadata.album = album;
    
    // Look for duration
    const duration = this.findNearbyText(element, ['[class*="duration"]', '[class*="time"]', 'time']);
    if (duration) metadata.duration = duration;
    
    // Look for genre
    const genre = this.findNearbyText(element, ['[class*="genre"]', '[class*="category"]']);
    if (genre) metadata.genre = genre;
    
    // Look for play count
    const plays = this.findNearbyText(element, ['[class*="plays"]', '[class*="listens"]', '[class*="count"]']);
    if (plays && plays.match(/\d+/)) metadata.plays = plays;
    
    return metadata;
  }

  /**
   * Find nearby text content
   * @param {Element} element
   * @param {Array} selectors
   * @returns {string|null} Text content
   */
  findNearbyText(element, selectors) {
    // Check siblings and parent
    const searchRoot = element.parentElement || element;
    
    for (const selector of selectors) {
      const found = searchRoot.querySelector(selector);
      if (found && found.textContent.trim()) {
        return found.textContent.trim();
      }
    }
    
    // Check within a reasonable distance
    let parent = searchRoot.parentElement;
    let depth = 0;
    while (parent && depth < 3) {
      for (const selector of selectors) {
        const found = parent.querySelector(selector);
        if (found && found.textContent.trim()) {
          return found.textContent.trim();
        }
      }
      parent = parent.parentElement;
      depth++;
    }
    
    return null;
  }

  /**
   * Find transcript or lyrics
   * @param {Element} element
   * @returns {Object|null} Transcript info
   */
  findTranscript(element) {
    const transcriptSelectors = [
      '[class*="transcript"]',
      '[class*="lyrics"]',
      '[class*="caption"]',
      '[class*="subtitle"]',
      '[role="article"]'
    ];
    
    const searchRoot = element.parentElement?.parentElement || element;
    
    for (const selector of transcriptSelectors) {
      const found = searchRoot.querySelector(selector);
      if (found && found.textContent.trim().length > 100) {
        return {
          found: true,
          preview: found.textContent.trim().substring(0, 200) + '...',
          fullLength: found.textContent.trim().length
        };
      }
    }
    
    return null;
  }

  /**
   * Generate audio description for AI
   * @param {Object} analysis
   * @returns {string} Description
   */
  generateAudioDescription(analysis) {
    const parts = [];
    
    if (analysis.platform) {
      parts.push(`${analysis.platform.name} audio`);
    } else if (analysis.format) {
      parts.push(`${analysis.format.toUpperCase()} audio file`);
    } else {
      parts.push('Audio content');
    }
    
    if (analysis.metadata?.title) {
      parts.push(`"${analysis.metadata.title}"`);
    }
    
    if (analysis.metadata?.artist) {
      parts.push(`by ${analysis.metadata.artist}`);
    }
    
    if (analysis.native?.duration) {
      const duration = this.formatDuration(analysis.native.duration);
      parts.push(`(${duration})`);
    }
    
    if (analysis.metadata?.plays) {
      parts.push(`with ${analysis.metadata.plays}`);
    }
    
    if (analysis.transcript?.found) {
      parts.push('includes transcript/lyrics');
    }
    
    return parts.join(' ') || 'Audio content';
  }

  /**
   * Format duration in seconds to readable format
   * @param {number} seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return 'unknown duration';
    
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate insights from audio analyses
   * @param {Array} analyses
   * @returns {Object} Insights
   */
  generateInsights(analyses) {
    const insights = {
      formats: {},
      platforms: {},
      features: {
        withTranscripts: 0,
        withControls: 0,
        totalDuration: 0
      },
      recommendations: []
    };
    
    // Count formats and features
    analyses.forEach(analysis => {
      if (analysis.format) {
        insights.formats[analysis.format] = (insights.formats[analysis.format] || 0) + 1;
      }
      
      if (analysis.platform) {
        insights.platforms[analysis.platform.name] = (insights.platforms[analysis.platform.name] || 0) + 1;
      }
      
      if (analysis.transcript?.found) insights.features.withTranscripts++;
      if (analysis.hasControls) insights.features.withControls++;
      if (analysis.native?.duration) insights.features.totalDuration += analysis.native.duration;
    });
    
    // Generate recommendations
    if (insights.features.withTranscripts === 0 && analyses.length > 0) {
      insights.recommendations.push('Consider adding transcripts for accessibility');
    }
    
    if (insights.features.withControls < analyses.length) {
      insights.recommendations.push('Some audio elements lack controls');
    }
    
    const uniqueFormats = Object.keys(insights.formats).length;
    if (uniqueFormats > 2) {
      insights.recommendations.push('Multiple audio formats may impact compatibility');
    }
    
    return insights;
  }

  /**
   * Count audio by format
   * @param {Array} analyses
   * @returns {Object} Format counts
   */
  countFormats(analyses) {
    const counts = {};
    
    analyses.forEach(analysis => {
      const format = analysis.format || 'embedded';
      counts[format] = (counts[format] || 0) + 1;
    });
    
    return counts;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }
}