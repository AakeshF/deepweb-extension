/**
 * VideoAnalyzer - Analyzes video content for AI context
 * Extracts video metadata, thumbnails, and transcripts when available
 */

export class VideoAnalyzer {
  constructor() {
    this.supportedPlatforms = {
      youtube: {
        regex: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/,
        name: 'YouTube'
      },
      vimeo: {
        regex: /vimeo\.com\/(\d+)/,
        name: 'Vimeo'
      },
      dailymotion: {
        regex: /dailymotion\.com\/video\/([^_]+)/,
        name: 'Dailymotion'
      }
    };
    
    this.cache = new Map();
    this.cacheExpiry = 30 * 60 * 1000; // 30 minutes
  }

  /**
   * Analyze videos on the page
   * @param {Document} document - Document to analyze
   * @param {Object} options - Analysis options
   * @returns {Object} Video analysis results
   */
  async analyzeVideos(document = window.document, options = {}) {
    const {
      maxVideos = 10,
      includeTranscripts = true,
      includeThumbnails = true,
      includeMetadata = true
    } = options;
    
    const startTime = performance.now();
    
    try {
      // Find all video elements and embeds
      const videos = this.findVideos(document);
      
      // Limit analysis
      const videosToAnalyze = videos.slice(0, maxVideos);
      
      // Analyze each video in parallel
      const analyses = await Promise.all(
        videosToAnalyze.map(video => this.analyzeVideo(video, {
          includeTranscripts,
          includeThumbnails,
          includeMetadata
        }))
      );
      
      // Filter out failed analyses
      const validAnalyses = analyses.filter(a => a && !a.error);
      
      // Generate insights
      const insights = this.generateInsights(validAnalyses);
      
      return {
        videos: validAnalyses,
        count: {
          total: videos.length,
          analyzed: validAnalyses.length
        },
        insights,
        platforms: this.countPlatforms(validAnalyses),
        analysis: {
          duration: performance.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('Video analysis error:', error);
      return {
        error: error.message,
        videos: [],
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
   * Find all videos on the page
   * @param {Document} document
   * @returns {Array} Video elements
   */
  findVideos(document) {
    const videos = [];
    
    // Native HTML5 videos
    const videoElements = document.querySelectorAll('video');
    videos.push(...Array.from(videoElements).map(v => ({
      type: 'native',
      element: v,
      src: v.src || v.querySelector('source')?.src
    })));
    
    // YouTube embeds
    const youtubeIframes = document.querySelectorAll('iframe[src*="youtube.com"], iframe[src*="youtu.be"]');
    videos.push(...Array.from(youtubeIframes).map(iframe => ({
      type: 'youtube',
      element: iframe,
      src: iframe.src
    })));
    
    // Vimeo embeds
    const vimeoIframes = document.querySelectorAll('iframe[src*="vimeo.com"]');
    videos.push(...Array.from(vimeoIframes).map(iframe => ({
      type: 'vimeo',
      element: iframe,
      src: iframe.src
    })));
    
    // Video links
    const videoLinks = document.querySelectorAll('a[href*="youtube.com"], a[href*="youtu.be"], a[href*="vimeo.com"]');
    videos.push(...Array.from(videoLinks).map(link => ({
      type: 'link',
      element: link,
      src: link.href
    })));
    
    return videos;
  }

  /**
   * Analyze individual video
   * @param {Object} video - Video object
   * @param {Object} options - Analysis options
   * @returns {Object} Video analysis
   */
  async analyzeVideo(video, options) {
    try {
      // Check cache
      const cacheKey = video.src;
      if (cacheKey && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey);
        if (Date.now() - cached.timestamp < this.cacheExpiry) {
          return cached.data;
        }
      }
      
      const analysis = {
        type: video.type,
        src: video.src,
        element: {
          tag: video.element.tagName,
          id: video.element.id,
          classes: video.element.className
        }
      };
      
      // Extract platform info
      const platformInfo = this.extractPlatformInfo(video.src);
      if (platformInfo) {
        analysis.platform = platformInfo;
      }
      
      // Native video analysis
      if (video.type === 'native') {
        Object.assign(analysis, this.analyzeNativeVideo(video.element));
      }
      
      // Embedded video analysis
      if (video.type === 'youtube' || video.type === 'vimeo') {
        Object.assign(analysis, await this.analyzeEmbeddedVideo(video));
      }
      
      // Extract metadata from surrounding context
      if (options.includeMetadata) {
        analysis.metadata = this.extractVideoMetadata(video.element);
      }
      
      // Generate description
      analysis.description = this.generateVideoDescription(analysis);
      
      // Cache result
      if (cacheKey) {
        this.cache.set(cacheKey, {
          data: analysis,
          timestamp: Date.now()
        });
      }
      
      return analysis;
      
    } catch (error) {
      console.error('Error analyzing video:', error);
      return {
        error: error.message,
        src: video.src,
        type: video.type
      };
    }
  }

  /**
   * Extract platform information from URL
   * @param {string} url - Video URL
   * @returns {Object|null} Platform info
   */
  extractPlatformInfo(url) {
    if (!url) return null;
    
    for (const [platform, config] of Object.entries(this.supportedPlatforms)) {
      const match = url.match(config.regex);
      if (match) {
        return {
          name: config.name,
          id: match[1],
          platform
        };
      }
    }
    
    return null;
  }

  /**
   * Analyze native HTML5 video
   * @param {HTMLVideoElement} video
   * @returns {Object} Analysis
   */
  analyzeNativeVideo(video) {
    const analysis = {
      native: {
        duration: video.duration || 0,
        currentTime: video.currentTime || 0,
        paused: video.paused,
        muted: video.muted,
        volume: video.volume,
        dimensions: {
          width: video.videoWidth || video.width,
          height: video.videoHeight || video.height
        },
        readyState: video.readyState,
        networkState: video.networkState
      }
    };
    
    // Check for tracks (captions/subtitles)
    const tracks = Array.from(video.textTracks || []);
    if (tracks.length > 0) {
      analysis.tracks = tracks.map(track => ({
        kind: track.kind,
        label: track.label,
        language: track.language,
        mode: track.mode
      }));
      
      // Look for active captions
      const activeTrack = tracks.find(t => t.mode === 'showing' && t.kind === 'captions');
      if (activeTrack) {
        analysis.hasCaptions = true;
        analysis.captionLanguage = activeTrack.language;
      }
    }
    
    // Get poster image
    if (video.poster) {
      analysis.thumbnail = video.poster;
    }
    
    return analysis;
  }

  /**
   * Analyze embedded video (YouTube, Vimeo, etc.)
   * @param {Object} video
   * @returns {Object} Analysis
   */
  async analyzeEmbeddedVideo(video) {
    const analysis = {
      embedded: {
        platform: video.type,
        dimensions: {
          width: video.element.width || video.element.offsetWidth,
          height: video.element.height || video.element.offsetHeight
        }
      }
    };
    
    // Extract video ID and generate thumbnail
    const platformInfo = this.extractPlatformInfo(video.src);
    if (platformInfo) {
      if (platformInfo.platform === 'youtube') {
        analysis.thumbnail = `https://img.youtube.com/vi/${platformInfo.id}/maxresdefault.jpg`;
        analysis.embedded.videoId = platformInfo.id;
        analysis.embedded.watchUrl = `https://www.youtube.com/watch?v=${platformInfo.id}`;
      } else if (platformInfo.platform === 'vimeo') {
        analysis.embedded.videoId = platformInfo.id;
        analysis.embedded.watchUrl = `https://vimeo.com/${platformInfo.id}`;
        // Note: Vimeo thumbnails require API call, skipping for now
      }
    }
    
    return analysis;
  }

  /**
   * Extract metadata from video context
   * @param {Element} element
   * @returns {Object} Metadata
   */
  extractVideoMetadata(element) {
    const metadata = {};
    
    // Look for title
    const title = this.findNearbyText(element, ['h1', 'h2', 'h3', 'h4', '[class*="title"]']);
    if (title) metadata.title = title;
    
    // Look for description
    const description = this.findNearbyText(element, ['p', '[class*="description"]', '[class*="summary"]']);
    if (description) metadata.description = description;
    
    // Look for duration
    const duration = this.findNearbyText(element, ['[class*="duration"]', '[class*="time"]', 'time']);
    if (duration) metadata.duration = duration;
    
    // Look for view count
    const views = this.findNearbyText(element, ['[class*="views"]', '[class*="count"]']);
    if (views && views.match(/\d+/)) metadata.views = views;
    
    // Look for upload date
    const date = this.findNearbyText(element, ['time', '[class*="date"]', '[class*="published"]']);
    if (date) metadata.uploadDate = date;
    
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
    
    return null;
  }

  /**
   * Generate video description for AI
   * @param {Object} analysis
   * @returns {string} Description
   */
  generateVideoDescription(analysis) {
    const parts = [];
    
    if (analysis.platform) {
      parts.push(`${analysis.platform.name} video`);
    } else if (analysis.type === 'native') {
      parts.push('Embedded video');
    }
    
    if (analysis.metadata?.title) {
      parts.push(`titled "${analysis.metadata.title}"`);
    }
    
    if (analysis.native?.duration) {
      const duration = this.formatDuration(analysis.native.duration);
      parts.push(`(${duration})`);
    }
    
    if (analysis.metadata?.views) {
      parts.push(`with ${analysis.metadata.views}`);
    }
    
    if (analysis.hasCaptions) {
      parts.push('includes captions');
    }
    
    return parts.join(' ') || 'Video content';
  }

  /**
   * Format duration in seconds to readable format
   * @param {number} seconds
   * @returns {string} Formatted duration
   */
  formatDuration(seconds) {
    if (!seconds || seconds === 0) return 'unknown duration';
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }

  /**
   * Generate insights from video analyses
   * @param {Array} analyses
   * @returns {Object} Insights
   */
  generateInsights(analyses) {
    const insights = {
      platforms: {},
      features: {
        withCaptions: 0,
        nativeVideos: 0,
        embeddedVideos: 0
      },
      recommendations: []
    };
    
    // Count platforms and features
    analyses.forEach(analysis => {
      if (analysis.platform) {
        insights.platforms[analysis.platform.name] = (insights.platforms[analysis.platform.name] || 0) + 1;
      }
      
      if (analysis.hasCaptions) insights.features.withCaptions++;
      if (analysis.type === 'native') insights.features.nativeVideos++;
      if (analysis.type === 'youtube' || analysis.type === 'vimeo') insights.features.embeddedVideos++;
    });
    
    // Generate recommendations
    if (insights.features.withCaptions === 0 && analyses.length > 0) {
      insights.recommendations.push('Consider adding captions for accessibility');
    }
    
    if (insights.features.nativeVideos > 3) {
      insights.recommendations.push('Multiple native videos may impact page load performance');
    }
    
    return insights;
  }

  /**
   * Count videos by platform
   * @param {Array} analyses
   * @returns {Object} Platform counts
   */
  countPlatforms(analyses) {
    const counts = {};
    
    analyses.forEach(analysis => {
      const platform = analysis.platform?.name || 'Native';
      counts[platform] = (counts[platform] || 0) + 1;
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