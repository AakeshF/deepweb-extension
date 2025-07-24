import { VideoAnalyzer } from '../../../src/intelligence/multimodal/VideoAnalyzer.js';
import { jest } from '@jest/globals';

describe('VideoAnalyzer', () => {
  let analyzer;
  let mockDocument;

  beforeEach(() => {
    analyzer = new VideoAnalyzer();
    mockDocument = document.implementation.createHTMLDocument('Test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with supported platforms', () => {
      expect(analyzer.supportedPlatforms).toHaveProperty('youtube');
      expect(analyzer.supportedPlatforms).toHaveProperty('vimeo');
      expect(analyzer.supportedPlatforms).toHaveProperty('dailymotion');
    });

    it('should initialize with empty cache', () => {
      expect(analyzer.cache.size).toBe(0);
    });
  });

  describe('findVideos', () => {
    it('should find native HTML5 videos', () => {
      const video = mockDocument.createElement('video');
      video.src = 'video.mp4';
      mockDocument.body.appendChild(video);

      const videos = analyzer.findVideos(mockDocument);
      expect(videos).toHaveLength(1);
      expect(videos[0].type).toBe('native');
      expect(videos[0].src).toBe('video.mp4');
    });

    it('should find YouTube embeds', () => {
      const iframe = mockDocument.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
      mockDocument.body.appendChild(iframe);

      const videos = analyzer.findVideos(mockDocument);
      expect(videos).toHaveLength(1);
      expect(videos[0].type).toBe('youtube');
    });

    it('should find Vimeo embeds', () => {
      const iframe = mockDocument.createElement('iframe');
      iframe.src = 'https://player.vimeo.com/video/123456789';
      mockDocument.body.appendChild(iframe);

      const videos = analyzer.findVideos(mockDocument);
      expect(videos).toHaveLength(1);
      expect(videos[0].type).toBe('vimeo');
    });

    it('should find video links', () => {
      const link = mockDocument.createElement('a');
      link.href = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
      mockDocument.body.appendChild(link);

      const videos = analyzer.findVideos(mockDocument);
      expect(videos).toHaveLength(1);
      expect(videos[0].type).toBe('link');
    });

    it('should find multiple videos', () => {
      const video = mockDocument.createElement('video');
      video.src = 'video.mp4';
      mockDocument.body.appendChild(video);

      const iframe = mockDocument.createElement('iframe');
      iframe.src = 'https://www.youtube.com/embed/test';
      mockDocument.body.appendChild(iframe);

      const videos = analyzer.findVideos(mockDocument);
      expect(videos).toHaveLength(2);
    });
  });

  describe('extractPlatformInfo', () => {
    it('should extract YouTube video ID', () => {
      const info = analyzer.extractPlatformInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
      expect(info).toEqual({
        name: 'YouTube',
        id: 'dQw4w9WgXcQ',
        platform: 'youtube'
      });
    });

    it('should extract YouTube embed ID', () => {
      const info = analyzer.extractPlatformInfo('https://www.youtube.com/embed/dQw4w9WgXcQ');
      expect(info).toEqual({
        name: 'YouTube',
        id: 'dQw4w9WgXcQ',
        platform: 'youtube'
      });
    });

    it('should extract Vimeo video ID', () => {
      const info = analyzer.extractPlatformInfo('https://vimeo.com/123456789');
      expect(info).toEqual({
        name: 'Vimeo',
        id: '123456789',
        platform: 'vimeo'
      });
    });

    it('should return null for unsupported URLs', () => {
      const info = analyzer.extractPlatformInfo('https://example.com/video');
      expect(info).toBeNull();
    });
  });

  describe('analyzeNativeVideo', () => {
    it('should analyze video properties', () => {
      const video = mockDocument.createElement('video');
      Object.defineProperty(video, 'duration', { value: 120 });
      Object.defineProperty(video, 'currentTime', { value: 30 });
      Object.defineProperty(video, 'paused', { value: true });
      Object.defineProperty(video, 'muted', { value: false });
      Object.defineProperty(video, 'volume', { value: 0.8 });

      const analysis = analyzer.analyzeNativeVideo(video);
      expect(analysis.native).toMatchObject({
        duration: 120,
        currentTime: 30,
        paused: true,
        muted: false,
        volume: 0.8
      });
    });

    it('should detect captions', () => {
      const video = mockDocument.createElement('video');
      const track = {
        kind: 'captions',
        label: 'English',
        language: 'en',
        mode: 'showing'
      };
      Object.defineProperty(video, 'textTracks', { value: [track] });

      const analysis = analyzer.analyzeNativeVideo(video);
      expect(analysis.hasCaptions).toBe(true);
      expect(analysis.captionLanguage).toBe('en');
    });

    it('should extract poster image', () => {
      const video = mockDocument.createElement('video');
      video.poster = 'thumbnail.jpg';

      const analysis = analyzer.analyzeNativeVideo(video);
      expect(analysis.thumbnail).toBe('thumbnail.jpg');
    });
  });

  describe('analyzeEmbeddedVideo', () => {
    it('should generate YouTube thumbnail URL', async () => {
      const video = {
        type: 'youtube',
        src: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
        element: mockDocument.createElement('iframe')
      };

      const analysis = await analyzer.analyzeEmbeddedVideo(video);
      expect(analysis.thumbnail).toBe('https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg');
      expect(analysis.embedded.videoId).toBe('dQw4w9WgXcQ');
      expect(analysis.embedded.watchUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    });

    it('should handle Vimeo videos', async () => {
      const video = {
        type: 'vimeo',
        src: 'https://player.vimeo.com/video/123456789',
        element: mockDocument.createElement('iframe')
      };

      const analysis = await analyzer.analyzeEmbeddedVideo(video);
      expect(analysis.embedded.videoId).toBe('123456789');
      expect(analysis.embedded.watchUrl).toBe('https://vimeo.com/123456789');
    });
  });

  describe('extractVideoMetadata', () => {
    it('should extract title from nearby elements', () => {
      const container = mockDocument.createElement('div');
      const title = mockDocument.createElement('h2');
      title.textContent = 'My Video Title';
      const video = mockDocument.createElement('video');
      
      container.appendChild(title);
      container.appendChild(video);
      mockDocument.body.appendChild(container);

      const metadata = analyzer.extractVideoMetadata(video);
      expect(metadata.title).toBe('My Video Title');
    });

    it('should extract multiple metadata fields', () => {
      const container = mockDocument.createElement('div');
      
      const title = mockDocument.createElement('h2');
      title.textContent = 'Video Title';
      
      const duration = mockDocument.createElement('span');
      duration.className = 'duration';
      duration.textContent = '5:30';
      
      const views = mockDocument.createElement('span');
      views.className = 'views';
      views.textContent = '1,234 views';
      
      const video = mockDocument.createElement('video');
      
      container.appendChild(title);
      container.appendChild(duration);
      container.appendChild(views);
      container.appendChild(video);
      mockDocument.body.appendChild(container);

      const metadata = analyzer.extractVideoMetadata(video);
      expect(metadata.title).toBe('Video Title');
      expect(metadata.duration).toBe('5:30');
      expect(metadata.views).toBe('1,234 views');
    });
  });

  describe('generateVideoDescription', () => {
    it('should generate description for YouTube video', () => {
      const analysis = {
        platform: { name: 'YouTube' },
        metadata: { title: 'Test Video', views: '1000 views' }
      };

      const description = analyzer.generateVideoDescription(analysis);
      expect(description).toBe('YouTube video titled "Test Video" with 1000 views');
    });

    it('should generate description for native video with duration', () => {
      const analysis = {
        type: 'native',
        native: { duration: 150 }
      };

      const description = analyzer.generateVideoDescription(analysis);
      expect(description).toBe('Embedded video (2:30)');
    });

    it('should include captions info', () => {
      const analysis = {
        type: 'native',
        hasCaptions: true
      };

      const description = analyzer.generateVideoDescription(analysis);
      expect(description).toContain('includes captions');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to mm:ss', () => {
      expect(analyzer.formatDuration(90)).toBe('1:30');
      expect(analyzer.formatDuration(150)).toBe('2:30');
    });

    it('should format hours correctly', () => {
      expect(analyzer.formatDuration(3661)).toBe('1:01:01');
    });

    it('should handle zero duration', () => {
      expect(analyzer.formatDuration(0)).toBe('unknown duration');
    });
  });

  describe('analyzeVideos', () => {
    it('should analyze all videos on page', async () => {
      const video1 = mockDocument.createElement('video');
      video1.src = 'video1.mp4';
      const video2 = mockDocument.createElement('video');
      video2.src = 'video2.mp4';
      
      mockDocument.body.appendChild(video1);
      mockDocument.body.appendChild(video2);

      const result = await analyzer.analyzeVideos(mockDocument);
      expect(result.count.total).toBe(2);
      expect(result.videos).toHaveLength(2);
    });

    it('should respect maxVideos limit', async () => {
      for (let i = 0; i < 5; i++) {
        const video = mockDocument.createElement('video');
        video.src = `video${i}.mp4`;
        mockDocument.body.appendChild(video);
      }

      const result = await analyzer.analyzeVideos(mockDocument, { maxVideos: 3 });
      expect(result.count.total).toBe(5);
      expect(result.videos).toHaveLength(3);
    });

    it('should generate insights', async () => {
      const video = mockDocument.createElement('video');
      video.src = 'video.mp4';
      mockDocument.body.appendChild(video);

      const result = await analyzer.analyzeVideos(mockDocument);
      expect(result.insights).toBeDefined();
      expect(result.insights.recommendations).toBeInstanceOf(Array);
    });

    it('should cache analysis results', async () => {
      const video = mockDocument.createElement('video');
      video.src = 'cached-video.mp4';
      mockDocument.body.appendChild(video);

      // First analysis
      await analyzer.analyzeVideos(mockDocument);
      expect(analyzer.cache.size).toBe(1);

      // Second analysis should use cache
      const cachedResult = await analyzer.analyzeVideos(mockDocument);
      expect(analyzer.cache.size).toBe(1);
    });
  });

  describe('generateInsights', () => {
    it('should recommend captions for accessibility', () => {
      const analyses = [{
        type: 'native',
        hasCaptions: false
      }];

      const insights = analyzer.generateInsights(analyses);
      expect(insights.recommendations).toContain('Consider adding captions for accessibility');
    });

    it('should warn about performance with multiple videos', () => {
      const analyses = [
        { type: 'native' },
        { type: 'native' },
        { type: 'native' },
        { type: 'native' }
      ];

      const insights = analyzer.generateInsights(analyses);
      expect(insights.recommendations).toContain('Multiple native videos may impact page load performance');
    });

    it('should count platforms correctly', () => {
      const analyses = [
        { platform: { name: 'YouTube' } },
        { platform: { name: 'YouTube' } },
        { platform: { name: 'Vimeo' } }
      ];

      const insights = analyzer.generateInsights(analyses);
      expect(insights.platforms).toEqual({
        YouTube: 2,
        Vimeo: 1
      });
    });
  });
});