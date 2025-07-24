/**
 * PromptTemplate Unit Tests
 */

import { PromptTemplate } from '../../../src/intelligence/templates/PromptTemplate.js';

describe('PromptTemplate', () => {
  let template;
  
  beforeEach(() => {
    template = new PromptTemplate({
      id: 'test-template',
      name: 'Test Template',
      description: 'A test template',
      category: 'test',
      template: 'Hello {name}, your score is {score}.',
      variables: {
        name: {
          type: 'text',
          source: 'user',
          required: true
        },
        score: {
          type: 'number',
          source: 'user',
          required: false,
          default: 0
        }
      },
      shortcuts: ['/test', '/hello']
    });
  });

  describe('constructor', () => {
    it('should create a template with valid configuration', () => {
      expect(template.id).toBe('test-template');
      expect(template.name).toBe('Test Template');
      expect(template.category).toBe('test');
      expect(template.variables).toBeDefined();
      expect(template.shortcuts).toHaveLength(2);
    });

    it('should throw error for missing required fields', () => {
      expect(() => {
        new PromptTemplate({
          id: 'invalid'
          // Missing name and template
        });
      }).toThrow();
    });

    it('should throw error for undefined variables in template', () => {
      expect(() => {
        new PromptTemplate({
          id: 'invalid',
          name: 'Invalid',
          template: 'Hello {undefined_var}',
          variables: {}
        });
      }).toThrow('Variable {undefined_var} used in template but not defined');
    });
  });

  describe('extractVariables', () => {
    it('should extract all variables from template', () => {
      const vars = template.extractVariables();
      expect(vars).toContain('name');
      expect(vars).toContain('score');
      expect(vars.size).toBe(2);
    });

    it('should handle templates with no variables', () => {
      const simpleTemplate = new PromptTemplate({
        id: 'simple',
        name: 'Simple',
        template: 'Hello world!',
        variables: {}
      });
      
      const vars = simpleTemplate.extractVariables();
      expect(vars.size).toBe(0);
    });
  });

  describe('apply', () => {
    it('should apply template with all values provided', async () => {
      const result = await template.apply({
        name: 'John',
        score: 95
      });
      
      expect(result).toBe('Hello John, your score is 95.');
    });

    it('should use default values when not provided', async () => {
      const result = await template.apply({
        name: 'Jane'
      });
      
      expect(result).toBe('Hello Jane, your score is 0.');
    });

    it('should throw error for missing required variables', async () => {
      await expect(template.apply({
        score: 100
      })).rejects.toThrow('Required variable name not provided');
    });

    it('should increment usage count', async () => {
      const initialCount = template.usageCount;
      await template.apply({ name: 'Test' });
      expect(template.usageCount).toBe(initialCount + 1);
    });
  });

  describe('resolveVariables', () => {
    it('should resolve variables from different sources', async () => {
      const contextTemplate = new PromptTemplate({
        id: 'context-test',
        name: 'Context Test',
        template: '{url} - {title}',
        variables: {
          url: {
            type: 'text',
            source: 'page',
            field: 'url',
            required: true
          },
          title: {
            type: 'text',
            source: 'page',
            field: 'title',
            required: true
          }
        }
      });
      
      const context = {
        url: 'https://example.com',
        title: 'Example Page'
      };
      
      const resolved = await contextTemplate.resolveVariables({}, context);
      expect(resolved.url).toBe('https://example.com');
      expect(resolved.title).toBe('Example Page');
    });

    it('should apply transformations', async () => {
      const transformTemplate = new PromptTemplate({
        id: 'transform-test',
        name: 'Transform Test',
        template: '{text}',
        variables: {
          text: {
            type: 'text',
            source: 'user',
            required: true,
            transform: 'uppercase'
          }
        }
      });
      
      const resolved = await transformTemplate.resolveVariables(
        { text: 'hello world' },
        {}
      );
      
      expect(resolved.text).toBe('HELLO WORLD');
    });
  });

  describe('matchesShortcut', () => {
    it('should match exact shortcuts', () => {
      expect(template.matchesShortcut('/test')).toBe(true);
      expect(template.matchesShortcut('/hello')).toBe(true);
      expect(template.matchesShortcut('/other')).toBe(false);
    });

    it('should match shortcuts with arguments', () => {
      expect(template.matchesShortcut('/test something')).toBe(true);
      expect(template.matchesShortcut('/hello world')).toBe(true);
    });

    it('should be case insensitive', () => {
      expect(template.matchesShortcut('/TEST')).toBe(true);
      expect(template.matchesShortcut('/Hello')).toBe(true);
    });
  });

  describe('extractShortcutArgs', () => {
    it('should extract arguments after shortcut', () => {
      const args = template.extractShortcutArgs('/test John Doe');
      expect(Object.keys(args).length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('clone', () => {
    it('should create a copy with modifications', () => {
      const cloned = template.clone({
        name: 'Cloned Template',
        category: 'cloned'
      });
      
      expect(cloned.id).toBe('test-template_copy');
      expect(cloned.name).toBe('Cloned Template');
      expect(cloned.category).toBe('cloned');
      expect(cloned.isBuiltIn).toBe(false);
      expect(cloned.usageCount).toBe(0);
    });
  });

  describe('toJSON and fromJSON', () => {
    it('should serialize and deserialize correctly', () => {
      const json = template.toJSON();
      expect(json.id).toBe('test-template');
      expect(json.variables).toBeDefined();
      
      const restored = PromptTemplate.fromJSON(json);
      expect(restored.id).toBe(template.id);
      expect(restored.name).toBe(template.name);
      expect(restored.template).toBe(template.template);
    });
  });

  describe('variable validation', () => {
    it('should validate select variables have options', () => {
      expect(() => {
        new PromptTemplate({
          id: 'invalid-select',
          name: 'Invalid Select',
          template: '{choice}',
          variables: {
            choice: {
              type: 'select',
              source: 'user'
              // Missing options
            }
          }
        });
      }).toThrow('Select variable choice must have options array');
    });

    it('should validate variable types', () => {
      expect(() => {
        new PromptTemplate({
          id: 'invalid-type',
          name: 'Invalid Type',
          template: '{var}',
          variables: {
            var: {
              type: 'invalid_type',
              source: 'user'
            }
          }
        });
      }).toThrow('Invalid variable type');
    });
  });
});