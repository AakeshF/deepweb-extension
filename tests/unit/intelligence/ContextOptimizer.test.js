/**
 * ContextOptimizer Unit Tests
 */

import { ContextOptimizer } from '../../../src/intelligence/context/ContextOptimizer.js';

describe('ContextOptimizer', () => {
  let optimizer;
  let mockAnalyzedContent;

  beforeEach(() => {
    optimizer = new ContextOptimizer();
    
    // Create mock analyzed content
    mockAnalyzedContent = {
      contentType: 'article',
      metadata: {
        title: 'Test Article',
        url: 'https://example.com/article',
        description: 'A test article about AI and context extraction',
        keywords: ['AI', 'context', 'extraction']
      },
      mainContent: {
        text: 'This is the main article content about artificial intelligence and context extraction techniques.',
        elements: [
          {
            type: 'heading',
            text: 'Introduction to AI Context Extraction'
          },
          {
            type: 'paragraph',
            text: 'AI context extraction is a crucial technology that enables intelligent systems to understand web content.'
          },
          {
            type: 'paragraph',
            text: 'This technology uses various algorithms to identify and extract relevant information from web pages.'
          },
          {
            type: 'code',
            language: 'javascript',
            content: 'function extractContext() { return "context"; }'
          },
          {
            type: 'paragraph',
            text: 'The benefits include improved relevance and better user experience.'
          }
        ]
      },
      keyInfo: {
        summary: 'This article discusses AI context extraction techniques and their benefits.',
        keyPoints: [
          'AI context extraction enables intelligent content understanding',
          'Various algorithms are used for extraction',
          'Benefits include improved relevance'
        ],
        entities: [
          { text: 'AI', type: 'ENTITY' },
          { text: 'Context Extraction', type: 'ENTITY' }
        ],
        topics: [
          { word: 'extraction', count: 5 },
          { word: 'context', count: 4 },
          { word: 'intelligence', count: 3 }
        ]
      }
    };
  });

  describe('optimize', () => {
    it('should optimize content for AI model consumption', async () => {
      const userQuery = 'How does AI context extraction work?';
      const result = await optimizer.optimize(mockAnalyzedContent, userQuery);
      
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('tokenEstimate');
      expect(result).toHaveProperty('costEstimate');
      expect(result).toHaveProperty('relevanceScore');
      expect(result).toHaveProperty('contentType');
      expect(result).toHaveProperty('optimization');
      
      expect(result.contentType).toBe('article');
      expect(result.tokenEstimate).toBeGreaterThan(0);
      expect(result.costEstimate).toBeGreaterThan(0);
    });

    it('should handle different models', async () => {
      const userQuery = 'test query';
      
      const chatResult = await optimizer.optimize(mockAnalyzedContent, userQuery, 'deepseek-chat');
      const reasonerResult = await optimizer.optimize(mockAnalyzedContent, userQuery, 'deepseek-reasoner');
      
      // Reasoner model has higher cost per token
      expect(reasonerResult.costEstimate).toBeGreaterThan(chatResult.costEstimate);
    });

    it('should return fallback context on error', async () => {
      // Create invalid content that will cause error
      const invalidContent = {
        mainContent: null,
        metadata: { title: 'Error Page' }
      };
      
      const result = await optimizer.optimize(invalidContent, 'test query');
      
      expect(result.context).toContain('Unable to extract meaningful content');
      expect(result.relevanceScore).toBe(0);
      expect(result.contentType).toBe('unknown');
    });
  });

  describe('calculateRelevance', () => {
    it('should calculate relevance scores based on query', () => {
      const query = 'AI context extraction algorithms';
      const scores = optimizer.calculateRelevance(mockAnalyzedContent, query);
      
      expect(scores).toHaveProperty('overall');
      expect(scores).toHaveProperty('sections');
      expect(scores.overall).toBeGreaterThan(0);
      expect(scores.overall).toBeLessThanOrEqual(1);
    });

    it('should handle empty query', () => {
      const scores = optimizer.calculateRelevance(mockAnalyzedContent, '');
      
      expect(scores.overall).toBe(0.5); // Default relevance
    });

    it('should score relevant content higher', () => {
      const relevantQuery = 'AI context extraction technology algorithms';
      const irrelevantQuery = 'cooking recipes food ingredients';
      
      const relevantScores = optimizer.calculateRelevance(mockAnalyzedContent, relevantQuery);
      const irrelevantScores = optimizer.calculateRelevance(mockAnalyzedContent, irrelevantQuery);
      
      expect(relevantScores.overall).toBeGreaterThan(irrelevantScores.overall);
    });
  });

  describe('scoreElement', () => {
    it('should score elements based on query match', () => {
      const element = {
        type: 'paragraph',
        text: 'This paragraph discusses AI and machine learning algorithms'
      };
      const queryTokens = ['ai', 'algorithms', 'learning'];
      
      const score = optimizer.scoreElement(element, queryTokens);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    it('should boost heading scores', () => {
      const heading = {
        type: 'heading',
        text: 'Introduction to AI'
      };
      const paragraph = {
        type: 'paragraph',
        text: 'Introduction to AI'
      };
      const queryTokens = ['introduction', 'ai'];
      
      const headingScore = optimizer.scoreElement(heading, queryTokens);
      const paragraphScore = optimizer.scoreElement(paragraph, queryTokens);
      
      expect(headingScore).toBeGreaterThan(paragraphScore);
    });

    it('should boost code elements for code-related queries', () => {
      const codeElement = {
        type: 'code',
        content: 'function example() { return true; }'
      };
      const queryTokens = ['code', 'function', 'example'];
      
      const score = optimizer.scoreElement(codeElement, queryTokens);
      
      expect(score).toBeGreaterThan(0.5);
    });
  });

  describe('prioritizeContent', () => {
    it('should prioritize high-relevance sections', () => {
      const scores = {
        sections: [
          { index: 0, score: 0.2 },
          { index: 1, score: 0.8 },
          { index: 2, score: 0.6 },
          { index: 3, score: 0.1 },
          { index: 4, score: 0.7 }
        ]
      };
      
      const prioritized = optimizer.prioritizeContent(mockAnalyzedContent, scores);
      
      expect(prioritized.elements).toBeDefined();
      expect(prioritized.elements.length).toBeGreaterThan(0);
      
      // Check that high-relevance sections are included
      const relevanceScores = prioritized.elements.map(el => el.relevanceScore);
      expect(Math.max(...relevanceScores)).toBeGreaterThan(0.5);
    });

    it('should filter out low-relevance content', () => {
      const scores = {
        sections: [
          { index: 0, score: 0.05 },
          { index: 1, score: 0.08 },
          { index: 2, score: 0.9 }
        ]
      };
      
      const prioritized = optimizer.prioritizeContent(mockAnalyzedContent, scores);
      
      // Only the high-scoring section should be included
      expect(prioritized.elements.length).toBe(1);
      expect(prioritized.elements[0].relevanceScore).toBe(0.9);
    });
  });

  describe('fitToContextWindow', () => {
    it('should fit content to target size', () => {
      const content = {
        elements: [
          { type: 'paragraph', text: 'A'.repeat(1000) },
          { type: 'paragraph', text: 'B'.repeat(1000) },
          { type: 'paragraph', text: 'C'.repeat(1000) }
        ],
        keyInfo: {
          summary: 'Test summary',
          keyPoints: ['Point 1', 'Point 2']
        }
      };
      
      const fitted = optimizer.fitToContextWindow(content, 1500);
      
      const totalLength = fitted.summary.length + 
        fitted.elements.reduce((sum, el) => sum + (el.text || '').length, 0);
      
      expect(totalLength).toBeLessThanOrEqual(1500 * 0.9); // 90% of target
    });

    it('should prioritize summary and key points', () => {
      const content = {
        elements: [{ type: 'paragraph', text: 'A'.repeat(2000) }],
        keyInfo: {
          summary: 'Important summary',
          keyPoints: ['Key point 1', 'Key point 2']
        }
      };
      
      const fitted = optimizer.fitToContextWindow(content, 100);
      
      expect(fitted.summary).toBe('Important summary');
      expect(fitted.keyPoints).toHaveLength(2);
    });

    it('should truncate elements when necessary', () => {
      const content = {
        elements: [
          { type: 'paragraph', text: 'Short text' },
          { type: 'paragraph', text: 'A'.repeat(1000) }
        ],
        keyInfo: {}
      };
      
      const fitted = optimizer.fitToContextWindow(content, 200);
      
      const truncatedElement = fitted.elements.find(el => el.truncated);
      expect(truncatedElement).toBeDefined();
      expect(truncatedElement.text).toContain('...');
    });
  });

  describe('generateStructuredContext', () => {
    it('should generate properly formatted context', () => {
      const optimizedContent = {
        summary: 'Test summary',
        keyPoints: ['Point 1', 'Point 2'],
        elements: [
          { type: 'heading', text: 'Test Heading' },
          { type: 'paragraph', text: 'Test paragraph' },
          { type: 'code', language: 'js', content: 'console.log("test");' }
        ]
      };
      
      const metadata = {
        title: 'Test Page',
        url: 'https://example.com',
        description: 'Test description'
      };
      
      const context = optimizer.generateStructuredContext(
        optimizedContent,
        metadata,
        'test query'
      );
      
      expect(context).toContain('[Page Context]');
      expect(context).toContain('Title: Test Page');
      expect(context).toContain('[Summary]');
      expect(context).toContain('Test summary');
      expect(context).toContain('[Key Points]');
      expect(context).toContain('1. Point 1');
      expect(context).toContain('[Content]');
      expect(context).toContain('## Test Heading');
      expect(context).toContain('```js');
    });

    it('should handle missing sections gracefully', () => {
      const optimizedContent = {
        elements: [
          { type: 'paragraph', text: 'Only paragraph' }
        ]
      };
      
      const metadata = {
        title: 'Minimal Page',
        url: 'https://example.com'
      };
      
      const context = optimizer.generateStructuredContext(
        optimizedContent,
        metadata,
        'test'
      );
      
      expect(context).toContain('[Page Context]');
      expect(context).toContain('[Content]');
      expect(context).toContain('Only paragraph');
      expect(context).not.toContain('[Summary]');
      expect(context).not.toContain('[Key Points]');
    });
  });

  describe('tokenize', () => {
    it('should tokenize text into words', () => {
      const text = 'Hello, world! This is a TEST-123.';
      const tokens = optimizer.tokenize(text);
      
      expect(tokens).toContain('hello');
      expect(tokens).toContain('world');
      expect(tokens).toContain('this');
      expect(tokens).toContain('test');
      expect(tokens).toContain('123');
      expect(tokens).not.toContain('is'); // Too short
      expect(tokens).not.toContain('a'); // Too short
    });
  });

  describe('estimateTokens', () => {
    it('should estimate token count', () => {
      const text = 'This is a test string with multiple words';
      const estimate = optimizer.estimateTokens(text);
      
      // ~4 characters per token
      expect(estimate).toBe(Math.ceil(text.length / 4));
    });
  });
});