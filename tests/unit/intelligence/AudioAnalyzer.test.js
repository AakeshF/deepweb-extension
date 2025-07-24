import { AudioAnalyzer } from '../../../src/intelligence/multimodal/AudioAnalyzer.js';
import { jest } from '@jest/globals';

describe('AudioAnalyzer', () => {
  let analyzer;
  let mockDocument;

  beforeEach(() => {
    analyzer = new AudioAnalyzer();
    mockDocument = document.implementation.createHTMLDocument('Test');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with supported formats', () => {
      expect(analyzer.supportedFormats).toContain('mp3');
      expect(analyzer.supportedFormats).toContain('wav');
      expect(analyzer.supportedFormats).toContain('ogg');
    });

    it('should initialize with supported platforms', () => {
      expect(analyzer.supportedPlatforms).toHaveProperty('soundcloud');
      expect(analyzer.supportedPlatforms).toHaveProperty('spotify');
      expect(analyzer.supportedPlatforms).toHaveProperty('apple');
    });
  });

  describe('findAudioElements', () => {
    it('should find native HTML5 audio', () => {
      const audio = mockDocument.createElement('audio');
      audio.src = 'audio.mp3';
      mockDocument.body.appendChild(audio);

      const elements = analyzer.findAudioElements(mockDocument);
      expect(elements).toHaveLength(1);
      expect(elements[0].type).toBe('native');
      expect(elements[0].src).toBe('audio.mp3');
    });

    it('should find audio links', () => {
      const link = mockDocument.createElement('a');
      link.href = 'song.mp3';
      mockDocument.body.appendChild(link);

      const elements = analyzer.findAudioElements(mockDocument);
      expect(elements).toHaveLength(1);
      expect(elements[0].type).toBe('link');
    });

    it('should find SoundCloud embeds', () => {
      const iframe = mockDocument.createElement('iframe');
      iframe.src = 'https://w.soundcloud.com/player/?url=https://api.soundcloud.com/tracks/123';
      mockDocument.body.appendChild(iframe);

      const elements = analyzer.findAudioElements(mockDocument);
      expect(elements).toHaveLength(1);
      expect(elements[0].type).toBe('embedded');
    });

    it('should find Spotify embeds', () => {
      const iframe = mockDocument.createElement('iframe');
      iframe.src = 'https://open.spotify.com/embed/track/123abc';
      mockDocument.body.appendChild(iframe);

      const elements = analyzer.findAudioElements(mockDocument);
      expect(elements).toHaveLength(1);
      expect(elements[0].type).toBe('embedded');
    });

    it('should ignore non-audio links', () => {
      const link = mockDocument.createElement('a');
      link.href = 'document.pdf';
      mockDocument.body.appendChild(link);

      const elements = analyzer.findAudioElements(mockDocument);
      expect(elements).toHaveLength(0);
    });
  });

  describe('isAudioUrl', () => {
    it('should identify audio URLs', () => {
      expect(analyzer.isAudioUrl('song.mp3')).toBe(true);
      expect(analyzer.isAudioUrl('audio.wav')).toBe(true);
      expect(analyzer.isAudioUrl('music.ogg')).toBe(true);
    });

    it('should reject non-audio URLs', () => {
      expect(analyzer.isAudioUrl('document.pdf')).toBe(false);
      expect(analyzer.isAudioUrl('image.jpg')).toBe(false);
      expect(analyzer.isAudioUrl('video.mp4')).toBe(false);
    });

    it('should handle URLs with query params', () => {
      expect(analyzer.isAudioUrl('song.mp3?id=123')).toBe(true);
    });
  });

  describe('extractAudioFormat', () => {
    it('should extract format from URL', () => {
      expect(analyzer.extractAudioFormat('song.mp3')).toBe('mp3');
      expect(analyzer.extractAudioFormat('audio.wav')).toBe('wav');
      expect(analyzer.extractAudioFormat('music.ogg')).toBe('ogg');
    });

    it('should handle URLs with query params', () => {
      expect(analyzer.extractAudioFormat('song.mp3?id=123')).toBe('mp3');
    });

    it('should return null for unsupported formats', () => {
      expect(analyzer.extractAudioFormat('file.xyz')).toBeNull();
    });
  });

  describe('extractPlatformInfo', () => {
    it('should extract SoundCloud info', () => {
      const info = analyzer.extractPlatformInfo('https://soundcloud.com/artist/track-name');
      expect(info).toEqual({
        name: 'SoundCloud',
        platform: 'soundcloud',
        id: 'track-name'
      });
    });

    it('should extract Spotify track info', () => {
      const info = analyzer.extractPlatformInfo('https://open.spotify.com/track/123abc');
      expect(info).toEqual({
        name: 'Spotify',
        platform: 'spotify',
        id: '123abc'
      });
    });

    it('should extract Apple Music info', () => {
      const info = analyzer.extractPlatformInfo('https://music.apple.com/us/album/song-name/123456789');
      expect(info).toEqual({
        name: 'Apple Music',
        platform: 'apple',
        id: '123456789'
      });
    });
  });

  describe('analyzeNativeAudio', () => {
    it('should analyze audio properties', () => {
      const audio = mockDocument.createElement('audio');
      Object.defineProperty(audio, 'duration', { value: 180 });
      Object.defineProperty(audio, 'currentTime', { value: 45 });
      Object.defineProperty(audio, 'paused', { value: false });
      Object.defineProperty(audio, 'muted', { value: false });
      Object.defineProperty(audio, 'volume', { value: 0.7 });
      Object.defineProperty(audio, 'playbackRate', { value: 1 });
      audio.controls = true;
      audio.preload = 'metadata';

      const analysis = analyzer.analyzeNativeAudio(audio);
      expect(analysis.native).toMatchObject({
        duration: 180,
        currentTime: 45,
        paused: false,
        muted: false,
        volume: 0.7,
        playbackRate: 1
      });
      expect(analysis.hasControls).toBe(true);
      expect(analysis.preload).toBe('metadata');
    });

    it('should detect multiple sources', () => {
      const audio = mockDocument.createElement('audio');
      const source1 = mockDocument.createElement('source');
      source1.src = 'audio.mp3';
      source1.type = 'audio/mpeg';
      const source2 = mockDocument.createElement('source');
      source2.src = 'audio.ogg';
      source2.type = 'audio/ogg';
      
      audio.appendChild(source1);
      audio.appendChild(source2);

      const analysis = analyzer.analyzeNativeAudio(audio);
      expect(analysis.sources).toHaveLength(2);
      expect(analysis.sources[0]).toMatchObject({
        src: 'audio.mp3',
        type: 'audio/mpeg'
      });
    });
  });

  describe('extractAudioMetadata', () => {
    it('should extract title', () => {
      const container = mockDocument.createElement('div');
      const title = mockDocument.createElement('h3');
      title.className = 'track-title';
      title.textContent = 'My Song';
      const audio = mockDocument.createElement('audio');
      
      container.appendChild(title);
      container.appendChild(audio);
      mockDocument.body.appendChild(container);

      const metadata = analyzer.extractAudioMetadata(audio);
      expect(metadata.title).toBe('My Song');
    });

    it('should extract artist and album', () => {
      const container = mockDocument.createElement('div');
      
      const artist = mockDocument.createElement('span');
      artist.className = 'artist-name';
      artist.textContent = 'The Artist';
      
      const album = mockDocument.createElement('span');
      album.className = 'album-name';
      album.textContent = 'Greatest Hits';
      
      const audio = mockDocument.createElement('audio');
      
      container.appendChild(artist);
      container.appendChild(album);
      container.appendChild(audio);
      mockDocument.body.appendChild(container);

      const metadata = analyzer.extractAudioMetadata(audio);
      expect(metadata.artist).toBe('The Artist');
      expect(metadata.album).toBe('Greatest Hits');
    });

    it('should extract play count', () => {
      const container = mockDocument.createElement('div');
      const plays = mockDocument.createElement('span');
      plays.className = 'play-count';
      plays.textContent = '1,234 plays';
      const audio = mockDocument.createElement('audio');
      
      container.appendChild(plays);
      container.appendChild(audio);
      mockDocument.body.appendChild(container);

      const metadata = analyzer.extractAudioMetadata(audio);
      expect(metadata.plays).toBe('1,234 plays');
    });
  });

  describe('findTranscript', () => {
    it('should find lyrics', () => {
      const container = mockDocument.createElement('div');
      const parent = mockDocument.createElement('div');
      const lyrics = mockDocument.createElement('div');
      lyrics.className = 'lyrics-container';
      lyrics.textContent = 'These are the lyrics to the song. '.repeat(10);
      const audio = mockDocument.createElement('audio');
      
      parent.appendChild(audio);
      parent.appendChild(lyrics);
      container.appendChild(parent);
      mockDocument.body.appendChild(container);

      const transcript = analyzer.findTranscript(audio);
      expect(transcript).toBeTruthy();
      expect(transcript.found).toBe(true);
      expect(transcript.preview).toContain('These are the lyrics');
    });

    it('should ignore short text', () => {
      const container = mockDocument.createElement('div');
      const lyrics = mockDocument.createElement('div');
      lyrics.className = 'lyrics';
      lyrics.textContent = 'Too short';
      const audio = mockDocument.createElement('audio');
      
      container.appendChild(lyrics);
      container.appendChild(audio);
      mockDocument.body.appendChild(container);

      const transcript = analyzer.findTranscript(audio);
      expect(transcript).toBeNull();
    });
  });

  describe('generateAudioDescription', () => {
    it('should generate description for platform audio', () => {
      const analysis = {
        platform: { name: 'SoundCloud' },
        metadata: { 
          title: 'Test Song',
          artist: 'Test Artist',
          plays: '1000 plays'
        }
      };

      const description = analyzer.generateAudioDescription(analysis);
      expect(description).toBe('SoundCloud audio "Test Song" by Test Artist with 1000 plays');
    });

    it('should generate description for audio file', () => {
      const analysis = {
        format: 'mp3',
        metadata: { title: 'My Track' },
        native: { duration: 210 }
      };

      const description = analyzer.generateAudioDescription(analysis);
      expect(description).toBe('MP3 audio file "My Track" (3:30)');
    });

    it('should include transcript info', () => {
      const analysis = {
        format: 'mp3',
        transcript: { found: true }
      };

      const description = analyzer.generateAudioDescription(analysis);
      expect(description).toContain('includes transcript/lyrics');
    });
  });

  describe('formatDuration', () => {
    it('should format seconds to m:ss', () => {
      expect(analyzer.formatDuration(90)).toBe('1:30');
      expect(analyzer.formatDuration(210)).toBe('3:30');
    });

    it('should pad seconds', () => {
      expect(analyzer.formatDuration(65)).toBe('1:05');
    });

    it('should handle zero duration', () => {
      expect(analyzer.formatDuration(0)).toBe('unknown duration');
    });
  });

  describe('analyzeAudio', () => {
    it('should analyze all audio on page', async () => {
      const audio1 = mockDocument.createElement('audio');
      audio1.src = 'song1.mp3';
      const audio2 = mockDocument.createElement('audio');
      audio2.src = 'song2.mp3';
      
      mockDocument.body.appendChild(audio1);
      mockDocument.body.appendChild(audio2);

      const result = await analyzer.analyzeAudio(mockDocument);
      expect(result.count.total).toBe(2);
      expect(result.audio).toHaveLength(2);
    });

    it('should respect maxAudio limit', async () => {
      for (let i = 0; i < 5; i++) {
        const audio = mockDocument.createElement('audio');
        audio.src = `song${i}.mp3`;
        mockDocument.body.appendChild(audio);
      }

      const result = await analyzer.analyzeAudio(mockDocument, { maxAudio: 3 });
      expect(result.count.total).toBe(5);
      expect(result.audio).toHaveLength(3);
    });

    it('should generate insights', async () => {
      const audio = mockDocument.createElement('audio');
      audio.src = 'song.mp3';
      mockDocument.body.appendChild(audio);

      const result = await analyzer.analyzeAudio(mockDocument);
      expect(result.insights).toBeDefined();
      expect(result.insights.recommendations).toBeInstanceOf(Array);
    });
  });

  describe('generateInsights', () => {
    it('should recommend transcripts for accessibility', () => {
      const analyses = [{
        format: 'mp3',
        transcript: { found: false }
      }];

      const insights = analyzer.generateInsights(analyses);
      expect(insights.recommendations).toContain('Consider adding transcripts for accessibility');
    });

    it('should warn about missing controls', () => {
      const analyses = [{
        hasControls: false
      }];

      const insights = analyzer.generateInsights(analyses);
      expect(insights.recommendations).toContain('Some audio elements lack controls');
    });

    it('should warn about multiple formats', () => {
      const analyses = [
        { format: 'mp3' },
        { format: 'wav' },
        { format: 'ogg' },
        { format: 'flac' }
      ];

      const insights = analyzer.generateInsights(analyses);
      expect(insights.recommendations).toContain('Multiple audio formats may impact compatibility');
    });

    it('should count formats and platforms', () => {
      const analyses = [
        { format: 'mp3' },
        { format: 'mp3' },
        { platform: { name: 'SoundCloud' } }
      ];

      const insights = analyzer.generateInsights(analyses);
      expect(insights.formats).toEqual({ mp3: 2 });
      expect(insights.platforms).toEqual({ SoundCloud: 1 });
    });
  });

  describe('caching', () => {
    it('should cache analysis results', async () => {
      const audio = mockDocument.createElement('audio');
      audio.src = 'cached-audio.mp3';
      mockDocument.body.appendChild(audio);

      await analyzer.analyzeAudio(mockDocument);
      expect(analyzer.cache.size).toBe(1);

      // Second analysis should use cache
      await analyzer.analyzeAudio(mockDocument);
      expect(analyzer.cache.size).toBe(1);
    });

    it('should clear cache', () => {
      analyzer.cache.set('test', { data: 'test' });
      expect(analyzer.cache.size).toBe(1);

      analyzer.clearCache();
      expect(analyzer.cache.size).toBe(0);
    });
  });
});