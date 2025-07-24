/**
 * ContentAnalyzer Unit Tests
 */

import { ContentAnalyzer } from '../../../src/intelligence/context/ContentAnalyzer.js';

describe('ContentAnalyzer', () => {
  let analyzer;
  let mockDocument;

  beforeEach(() => {
    analyzer = new ContentAnalyzer();
    
    // Create a mock document
    mockDocument = {
      title: 'Test Page Title',
      documentElement: { lang: 'en' },
      location: {
        href: 'https://example.com/test',
        hostname: 'example.com'
      },
      body: {
        innerText: 'This is the body text content',
        innerHTML: '<p>This is the body HTML content</p>'
      },
      querySelector: jest.fn(),
      querySelectorAll: jest.fn()
    };
    
    // Mock window object
    global.window = {
      location: mockDocument.location
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectContentType', () => {
    it('should detect article content type', () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === 'article') return {};
        if (selector === 'time, .date, .published') return {};
        if (selector === '.author, .byline, [rel="author"]') return {};
        return null;
      });
      
      mockDocument.body.innerText = 'article author byline publish date headline news story';
      
      const contentType = analyzer.detectContentType(mockDocument);
      expect(contentType).toBe('article');
    });

    it('should detect product content type', () => {
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === '[itemtype*="Product"]') return {};
        if (selector === '.product-price') return {};
        if (selector === '.add-to-cart') return {};
        return null;
      });
      
      mockDocument.body.innerText = 'price cart buy stock review rating product';
      
      const contentType = analyzer.detectContentType(mockDocument);
      expect(contentType).toBe('product');
    });

    it('should detect code content type', () => {
      const codeElements = [
        { tagName: 'PRE', querySelector: () => ({ tagName: 'CODE' }) },
        { tagName: 'PRE', querySelector: () => ({ tagName: 'CODE' }) },
        { tagName: 'PRE', querySelector: () => ({ tagName: 'CODE' }) }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'pre code, .highlight') return codeElements;
        return [];
      });
      
      mockDocument.body.innerText = 'function class const import export javascript code';
      
      const contentType = analyzer.detectContentType(mockDocument);
      expect(contentType).toBe('code');
    });

    it('should default to article for unclear content', () => {
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.querySelectorAll.mockReturnValue([]);
      mockDocument.body.innerText = 'Some generic text content';
      
      const contentType = analyzer.detectContentType(mockDocument);
      expect(contentType).toBe('article');
    });
  });

  describe('extractMetadata', () => {
    it('should extract basic metadata', () => {
      const metaTags = [
        { getAttribute: (name) => name === 'name' ? 'description' : 'Test page description' },
        { getAttribute: (name) => name === 'name' ? 'keywords' : 'test, keywords, example' },
        { getAttribute: (name) => name === 'name' ? 'author' : 'John Doe' },
        { getAttribute: (name) => name === 'property' ? 'og:title' : 'OG Title' },
        { getAttribute: (name) => name === 'property' ? 'og:description' : 'OG Description' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'meta') return metaTags;
        if (selector === 'script[type="application/ld+json"]') return [];
        return [];
      });
      
      const metadata = analyzer.extractMetadata(mockDocument);
      
      expect(metadata.title).toBe('Test Page Title');
      expect(metadata.url).toBe('https://example.com/test');
      expect(metadata.domain).toBe('example.com');
      expect(metadata.description).toBe('Test page description');
      expect(metadata.keywords).toEqual(['test', 'keywords', 'example']);
      expect(metadata.author).toBe('John Doe');
      expect(metadata.ogData.title).toBe('OG Title');
      expect(metadata.ogData.description).toBe('OG Description');
    });

    it('should extract JSON-LD structured data', () => {
      const jsonLdScript = {
        textContent: JSON.stringify({
          '@type': 'Article',
          headline: 'Test Article',
          author: { name: 'John Doe' }
        })
      };
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'script[type="application/ld+json"]') return [jsonLdScript];
        if (selector === 'meta') return [];
        return [];
      });
      
      const metadata = analyzer.extractMetadata(mockDocument);
      
      expect(metadata.schemaData.Article).toBeDefined();
      expect(metadata.schemaData.Article.headline).toBe('Test Article');
    });
  });

  describe('extractMainContent', () => {
    it('should extract content from article element', () => {
      const articleElement = {
        textContent: 'This is a long article content with more than 100 characters. It contains multiple paragraphs and various elements that make it suitable for extraction.',
        innerHTML: '<p>Paragraph 1</p><p>Paragraph 2</p>',
        querySelectorAll: jest.fn((selector) => {
          if (selector === 'p') {
            return [
              { textContent: 'Paragraph 1' },
              { textContent: 'Paragraph 2' }
            ];
          }
          return [];
        })
      };
      
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === 'article') return articleElement;
        return null;
      });
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'h1, h2, h3, h4, h5, h6') {
          return [
            { tagName: 'H1', textContent: 'Main Heading', id: 'main' },
            { tagName: 'H2', textContent: 'Sub Heading', id: 'sub' }
          ];
        }
        return [];
      });
      
      const content = analyzer.extractMainContent(mockDocument, 'article');
      
      expect(content.text).toContain('long article content');
      expect(content.elements).toHaveLength(2);
      expect(content.elements[0].type).toBe('paragraph');
      expect(content.headings).toHaveLength(2);
    });

    it('should fall back to heuristic extraction', () => {
      const contentDiv = {
        textContent: 'This is the main content area with lots of text. '.repeat(10),
        innerHTML: '<p>Content</p>'.repeat(5),
        className: 'content main-content',
        id: 'content',
        querySelectorAll: jest.fn((selector) => {
          if (selector === 'p') {
            return Array(5).fill({ textContent: 'Content paragraph' });
          }
          if (selector === 'a') {
            return Array(2).fill({ href: '#' });
          }
          return [];
        })
      };
      
      mockDocument.querySelector.mockReturnValue(null);
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'div, section, article, main') {
          return [contentDiv];
        }
        return [];
      });
      
      const content = analyzer.extractMainContent(mockDocument, 'article');
      
      expect(content.text).toContain('main content area');
      expect(content.elements.length).toBeGreaterThan(0);
    });
  });

  describe('calculateContentScore', () => {
    it('should score content elements positively', () => {
      const goodElement = {
        className: 'article-content main-text',
        id: 'post-body',
        textContent: 'A'.repeat(1000),
        innerHTML: '<p>' + 'A'.repeat(100) + '</p>'.repeat(5),
        querySelectorAll: jest.fn((selector) => {
          if (selector === 'p') return Array(5).fill({});
          if (selector === 'a') return Array(2).fill({});
          return [];
        })
      };
      
      const score = analyzer.calculateContentScore(goodElement);
      expect(score).toBeGreaterThan(30);
    });

    it('should score navigation elements negatively', () => {
      const navElement = {
        className: 'navigation sidebar',
        id: 'nav-menu',
        textContent: 'Home About Contact',
        innerHTML: '<a>Home</a><a>About</a><a>Contact</a>',
        querySelectorAll: jest.fn((selector) => {
          if (selector === 'p') return [];
          if (selector === 'a') return Array(10).fill({});
          return [];
        })
      };
      
      const score = analyzer.calculateContentScore(navElement);
      expect(score).toBeLessThan(0);
    });
  });

  describe('analyze', () => {
    it('should return complete analysis results', async () => {
      // Set up mocks for a complete analysis
      mockDocument.querySelector.mockImplementation((selector) => {
        if (selector === 'article') {
          return {
            textContent: 'Article content '.repeat(50),
            innerHTML: '<p>Paragraph</p>'.repeat(3),
            querySelectorAll: jest.fn(() => [])
          };
        }
        return null;
      });
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'meta') return [];
        if (selector === 'h1, h2, h3, h4, h5, h6') return [];
        if (selector === 'img') return [];
        if (selector === 'a[href]') return [];
        return [];
      });
      
      const result = await analyzer.analyze(mockDocument);
      
      expect(result).toHaveProperty('contentType');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('mainContent');
      expect(result).toHaveProperty('structure');
      expect(result).toHaveProperty('keyInfo');
      expect(result).toHaveProperty('qualityScore');
      expect(result).toHaveProperty('analysisTime');
      expect(result).toHaveProperty('timestamp');
    });

    it('should handle errors gracefully', async () => {
      // Force an error
      mockDocument.querySelector.mockImplementation(() => {
        throw new Error('Test error');
      });
      
      const result = await analyzer.analyze(mockDocument);
      
      expect(result.error).toBe('Test error');
      expect(result.contentType).toBe('unknown');
      expect(result.metadata).toBeDefined();
      expect(result.mainContent).toBeDefined();
    });
  });

  describe('extractKeyInformation', () => {
    it('should extract key points and summary', () => {
      const mainContent = {
        elements: [
          { type: 'paragraph', text: 'First paragraph with important information.' },
          { type: 'paragraph', text: 'Second paragraph containing key details about the topic.' },
          { type: 'paragraph', text: 'Third paragraph explaining the conclusion.' }
        ],
        text: 'Combined text content'
      };
      
      const keyInfo = analyzer.extractKeyInformation(mainContent, 'article');
      
      expect(keyInfo.summary).toBeTruthy();
      expect(keyInfo.summary.length).toBeLessThanOrEqual(303); // 300 + '...'
      expect(keyInfo.keyPoints).toBeInstanceOf(Array);
      expect(keyInfo.entities).toBeInstanceOf(Array);
      expect(keyInfo.topics).toBeInstanceOf(Array);
    });
  });

  describe('helper methods', () => {
    it('cleanText should remove extra whitespace', () => {
      const dirtyText = '  Multiple   spaces\n\n\nand\n\n\n\nnewlines  ';
      const cleanedText = analyzer.cleanText(dirtyText);
      
      expect(cleanedText).toBe('Multiple spaces\n\nand\n\nnewlines');
    });

    it('extractHeadings should extract all heading levels', () => {
      const headings = [
        { tagName: 'H1', textContent: 'Main Title', id: 'main' },
        { tagName: 'H2', textContent: 'Subtitle', id: 'sub' },
        { tagName: 'H3', textContent: 'Section', id: '' }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'h1, h2, h3, h4, h5, h6') return headings;
        return [];
      });
      
      const extracted = analyzer.extractHeadings(mockDocument);
      
      expect(extracted).toHaveLength(3);
      expect(extracted[0].level).toBe(1);
      expect(extracted[1].level).toBe(2);
      expect(extracted[2].level).toBe(3);
    });

    it('extractImages should filter small images', () => {
      const images = [
        { src: 'large.jpg', alt: 'Large image', width: 800, height: 600 },
        { src: 'small.jpg', alt: 'Small image', width: 50, height: 50 },
        { src: 'medium.jpg', alt: 'Medium image', width: 300, height: 200 }
      ];
      
      mockDocument.querySelectorAll.mockImplementation((selector) => {
        if (selector === 'img') return images;
        return [];
      });
      
      const extracted = analyzer.extractImages(mockDocument);
      
      expect(extracted).toHaveLength(2);
      expect(extracted.find(img => img.src === 'small.jpg')).toBeUndefined();
    });
  });
});