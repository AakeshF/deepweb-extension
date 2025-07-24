/**
 * ContextManager Unit Tests
 */

import { ContextManager } from '../../../src/intelligence/context/ContextManager.js';

describe('ContextManager', () => {
  let contextManager;
  
  beforeEach(() => {
    contextManager = new ContextManager();
  });
  
  afterEach(() => {
    contextManager.clearAllContext();
  });

  describe('initializePage', () => {
    it('should initialize context for a new page', async () => {
      const pageData = {
        url: 'https://example.com',
        title: 'Example Page',
        document: {
          body: { textContent: 'Example content' }
        }
      };
      
      const result = await contextManager.initializePage(pageData);
      
      expect(result).toHaveProperty('pageContext');
      expect(result).toHaveProperty('extractedContent');
      expect(result).toHaveProperty('fullContext');
      expect(result).toHaveProperty('suggestions');
    });
    
    it('should detect research mode when appropriate', async () => {
      // Initialize with research-like content
      const pageData = {
        url: 'https://research.example.com',
        title: 'Research on AI',
        document: {
          body: { textContent: 'Deep learning research paper' }
        }
      };
      
      await contextManager.initializePage(pageData);
      
      // Process research query
      await contextManager.processMessage({
        role: 'user',
        content: 'research on neural networks'
      });
      
      const context = await contextManager.buildContext();
      expect(context.crossPage).toBeDefined();
    });
  });

  describe('processMessage', () => {
    it('should process user messages and extract memory', async () => {
      const message = {
        role: 'user',
        content: 'I prefer brief summaries. What is machine learning?'
      };
      
      const result = await contextManager.processMessage(message);
      
      expect(result).toHaveProperty('context');
      expect(result).toHaveProperty('researchMode');
      
      // Check if preference was extracted
      const memoryContext = await contextManager.conversationMemory.getContext();
      expect(memoryContext.userPreferences.length).toBeGreaterThan(0);
    });
    
    it('should process assistant messages and extract facts', async () => {
      const message = {
        role: 'assistant',
        content: 'Machine learning is a subset of artificial intelligence. It enables systems to learn from data.'
      };
      
      await contextManager.processMessage(message);
      
      const memoryContext = await contextManager.conversationMemory.getContext();
      expect(memoryContext.establishedFacts.length).toBeGreaterThan(0);
    });
  });

  describe('buildContext', () => {
    it('should build comprehensive context with all components', async () => {
      // Initialize page
      await contextManager.initializePage({
        url: 'https://example.com',
        title: 'Test Page',
        document: { body: { textContent: 'Test content' } }
      });
      
      // Add some messages
      await contextManager.processMessage({
        role: 'user',
        content: 'Tell me about this page'
      });
      
      const context = await contextManager.buildContext({
        query: 'summarize',
        targetModel: 'deepseek-chat'
      });
      
      expect(context).toHaveProperty('current');
      expect(context).toHaveProperty('history');
      expect(context).toHaveProperty('memory');
      expect(context).toHaveProperty('crossPage');
      expect(context).toHaveProperty('summary');
    });
    
    it('should respect token limits', async () => {
      const context = await contextManager.buildContext({
        maxTokens: 1000
      });
      
      // Estimate total context size
      const contextString = JSON.stringify(context);
      const estimatedTokens = Math.ceil(contextString.length / 4);
      
      expect(estimatedTokens).toBeLessThan(1000);
    });
  });

  describe('Research Sessions', () => {
    it('should start research session on demand', () => {
      const sessionId = contextManager.startResearchSession({
        name: 'AI Research',
        goal: 'Learn about deep learning'
      });
      
      expect(sessionId).toBeDefined();
      expect(contextManager.crossPageContext.activeSession).toBe(sessionId);
    });
    
    it('should auto-detect research intent', async () => {
      await contextManager.processMessage({
        role: 'user',
        content: 'I want to research deep learning algorithms'
      });
      
      expect(contextManager.crossPageContext.activeSession).toBeDefined();
    });
    
    it('should track research findings', () => {
      contextManager.startResearchSession({ name: 'Test' });
      
      contextManager.addResearchFinding({
        content: 'Important discovery',
        source: 'https://example.com'
      });
      
      const session = contextManager.crossPageContext.researchSessions.get(
        contextManager.crossPageContext.activeSession
      );
      
      expect(session.findings).toHaveLength(1);
    });
  });

  describe('Memory Management', () => {
    it('should extract and store entities', async () => {
      await contextManager.processMessage({
        role: 'assistant',
        content: 'Google is a technology company founded by Larry Page and Sergey Brin.'
      });
      
      const memory = await contextManager.conversationMemory.query('Google');
      expect(memory.entities).toHaveLength(1);
      expect(memory.entities[0].type).toBe('organization');
    });
    
    it('should track user preferences', async () => {
      await contextManager.processMessage({
        role: 'user',
        content: 'I prefer detailed explanations with examples'
      });
      
      const context = await contextManager.conversationMemory.getContext();
      expect(context.userPreferences).toContainEqual(
        expect.objectContaining({
          type: 'positive',
          value: expect.stringContaining('detailed explanations')
        })
      );
    });
    
    it('should build relationships between entities', async () => {
      await contextManager.processMessage({
        role: 'assistant',
        content: 'Python was created by Guido van Rossum. Python is used for machine learning.'
      });
      
      const memory = contextManager.conversationMemory;
      expect(memory.relationships.entities.size).toBeGreaterThan(0);
    });
  });

  describe('Cross-Page Context', () => {
    it('should track pages across session', async () => {
      // Add first page
      await contextManager.initializePage({
        url: 'https://example.com/page1',
        title: 'Page 1',
        document: { body: { textContent: 'Machine learning basics' } }
      });
      
      // Add second page
      await contextManager.initializePage({
        url: 'https://example.com/page2',
        title: 'Page 2',
        document: { body: { textContent: 'Deep learning advanced' } }
      });
      
      expect(contextManager.crossPageContext.pageContexts.size).toBe(2);
    });
    
    it('should find related pages', async () => {
      // Add pages with similar topics
      await contextManager.initializePage({
        url: 'https://ai.com/ml',
        title: 'Machine Learning',
        document: { body: { textContent: 'Introduction to ML' } }
      });
      
      await contextManager.initializePage({
        url: 'https://ai.com/dl',
        title: 'Deep Learning',
        document: { body: { textContent: 'Advanced ML techniques' } }
      });
      
      const context = await contextManager.buildContext();
      expect(context.crossPage?.related?.length).toBeGreaterThan(0);
    });
  });

  describe('Configuration', () => {
    it('should enable/disable features', () => {
      contextManager.enableMemory(false);
      expect(contextManager.config.enableMemory).toBe(false);
      
      contextManager.enableCrossPage(false);
      expect(contextManager.config.enableCrossPage).toBe(false);
      
      contextManager.enablePrivacyMode(true);
      expect(contextManager.config.privacyMode).toBe(true);
    });
    
    it('should apply privacy filtering when enabled', async () => {
      contextManager.enablePrivacyMode(true);
      
      await contextManager.processMessage({
        role: 'user',
        content: 'My email is test@example.com and phone is 123-456-7890'
      });
      
      const context = await contextManager.buildContext();
      const contextString = JSON.stringify(context);
      
      expect(contextString).not.toContain('test@example.com');
      expect(contextString).not.toContain('123-456-7890');
      expect(contextString).toContain('[REDACTED]');
    });
  });

  describe('Export/Import', () => {
    it('should export all context data', async () => {
      // Add some data
      await contextManager.initializePage({
        url: 'https://test.com',
        title: 'Test',
        document: { body: { textContent: 'Test' } }
      });
      
      await contextManager.processMessage({
        role: 'user',
        content: 'Test message'
      });
      
      const exported = contextManager.exportAllContext();
      
      expect(exported).toHaveProperty('version');
      expect(exported).toHaveProperty('contextBuilder');
      expect(exported).toHaveProperty('conversationMemory');
      expect(exported).toHaveProperty('crossPageContext');
      expect(exported).toHaveProperty('config');
      expect(exported).toHaveProperty('metrics');
    });
    
    it('should import context data', () => {
      const testData = {
        version: '1.0',
        exported: new Date().toISOString(),
        contextBuilder: {
          sessionContext: {
            pages: [],
            conversations: [],
            timeline: [],
            relationships: []
          }
        },
        conversationMemory: {
          entities: [],
          facts: [],
          preferences: [],
          questions: [],
          topics: [],
          relationships: {
            entities: [],
            topics: [],
            temporal: []
          },
          stats: {}
        },
        crossPageContext: {
          sessionContext: {
            id: 'test',
            startTime: new Date().toISOString(),
            pages: [],
            commonTopics: [],
            journey: []
          },
          pageContexts: [],
          domainGroups: [],
          topicClusters: [],
          researchSessions: []
        },
        config: contextManager.config,
        metrics: contextManager.metrics
      };
      
      expect(() => contextManager.importAllContext(testData)).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should track metrics', async () => {
      await contextManager.initializePage({
        url: 'https://test.com',
        title: 'Test',
        document: { body: { textContent: 'Test' } }
      });
      
      await contextManager.buildContext();
      
      const metrics = contextManager.getMetrics();
      
      expect(metrics.contextBuilds).toBeGreaterThan(0);
      expect(metrics.averageBuildTime).toBeGreaterThan(0);
    });
    
    it('should handle large contexts efficiently', async () => {
      // Add many pages
      for (let i = 0; i < 20; i++) {
        await contextManager.initializePage({
          url: `https://test.com/page${i}`,
          title: `Page ${i}`,
          document: { body: { textContent: `Content ${i}` } }
        });
      }
      
      const startTime = performance.now();
      await contextManager.buildContext();
      const duration = performance.now() - startTime;
      
      // Should complete in reasonable time
      expect(duration).toBeLessThan(1000); // 1 second
    });
  });
});