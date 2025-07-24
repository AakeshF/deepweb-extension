/**
 * TemplateManager - Manages prompt templates
 * Handles built-in and custom templates, storage, and suggestions
 */

import { PromptTemplate } from './PromptTemplate.js';
import { builtInTemplates, getCategories, searchTemplates } from './builtInTemplates.js';

export class TemplateManager {
  constructor() {
    this.templates = new Map();
    this.customTemplates = new Map();
    this.recentTemplates = [];
    this.maxRecentTemplates = 10;
    this.suggestionCache = new Map();
    this.initialized = false;
  }

  /**
   * Initialize template manager
   */
  async initialize() {
    if (this.initialized) return;
    
    try {
      // Load built-in templates
      this.loadBuiltInTemplates();
      
      // Load custom templates from storage
      await this.loadCustomTemplates();
      
      // Load usage data
      await this.loadUsageData();
      
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize TemplateManager:', error);
      throw error;
    }
  }

  /**
   * Load built-in templates
   */
  loadBuiltInTemplates() {
    for (const templateConfig of builtInTemplates) {
      const template = new PromptTemplate(templateConfig);
      this.templates.set(template.id, template);
    }
  }

  /**
   * Load custom templates from storage
   */
  async loadCustomTemplates() {
    try {
      const stored = await browser.storage.local.get('customTemplates');
      
      if (stored.customTemplates) {
        for (const templateData of stored.customTemplates) {
          const template = PromptTemplate.fromJSON(templateData);
          this.customTemplates.set(template.id, template);
          this.templates.set(template.id, template);
        }
      }
    } catch (error) {
      console.error('Failed to load custom templates:', error);
    }
  }

  /**
   * Load usage data from storage
   */
  async loadUsageData() {
    try {
      const stored = await browser.storage.local.get(['templateUsage', 'recentTemplates']);
      
      if (stored.templateUsage) {
        // Update usage counts
        for (const [templateId, usageCount] of Object.entries(stored.templateUsage)) {
          const template = this.templates.get(templateId);
          if (template) {
            template.usageCount = usageCount;
          }
        }
      }
      
      if (stored.recentTemplates) {
        this.recentTemplates = stored.recentTemplates;
      }
    } catch (error) {
      console.error('Failed to load usage data:', error);
    }
  }

  /**
   * Save custom templates to storage
   */
  async saveCustomTemplates() {
    try {
      const customTemplateData = Array.from(this.customTemplates.values()).map(t => t.toJSON());
      await browser.storage.local.set({ customTemplates: customTemplateData });
    } catch (error) {
      console.error('Failed to save custom templates:', error);
      throw error;
    }
  }

  /**
   * Save usage data to storage
   */
  async saveUsageData() {
    try {
      const usageData = {};
      for (const [id, template] of this.templates) {
        if (template.usageCount > 0) {
          usageData[id] = template.usageCount;
        }
      }
      
      await browser.storage.local.set({
        templateUsage: usageData,
        recentTemplates: this.recentTemplates
      });
    } catch (error) {
      console.error('Failed to save usage data:', error);
    }
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {PromptTemplate|null} Template instance
   */
  getTemplate(templateId) {
    return this.templates.get(templateId) || null;
  }

  /**
   * Get all templates
   * @param {Object} options - Filter options
   * @returns {Array} Templates
   */
  getAllTemplates(options = {}) {
    let templates = Array.from(this.templates.values());
    
    if (options.category) {
      templates = templates.filter(t => t.category === options.category);
    }
    
    if (options.includeCustomOnly) {
      templates = templates.filter(t => !t.isBuiltIn);
    }
    
    if (options.sortBy) {
      templates = this.sortTemplates(templates, options.sortBy);
    }
    
    return templates;
  }

  /**
   * Sort templates
   * @param {Array} templates - Templates to sort
   * @param {string} sortBy - Sort criteria
   * @returns {Array} Sorted templates
   */
  sortTemplates(templates, sortBy) {
    switch (sortBy) {
      case 'usage':
        return templates.sort((a, b) => b.usageCount - a.usageCount);
        
      case 'name':
        return templates.sort((a, b) => a.name.localeCompare(b.name));
        
      case 'recent':
        return templates.sort((a, b) => {
          const aIndex = this.recentTemplates.indexOf(a.id);
          const bIndex = this.recentTemplates.indexOf(b.id);
          if (aIndex === -1 && bIndex === -1) return 0;
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });
        
      case 'category':
        return templates.sort((a, b) => {
          const catCompare = a.category.localeCompare(b.category);
          return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name);
        });
        
      default:
        return templates;
    }
  }

  /**
   * Search templates
   * @param {string} query - Search query
   * @returns {Array} Matching templates
   */
  searchTemplates(query) {
    if (!query) return this.getAllTemplates();
    
    const results = [];
    const lowerQuery = query.toLowerCase();
    
    for (const template of this.templates.values()) {
      let score = 0;
      
      // Check shortcuts (highest priority)
      if (template.shortcuts.some(s => s.toLowerCase() === lowerQuery)) {
        score += 100;
      } else if (template.shortcuts.some(s => s.toLowerCase().startsWith(lowerQuery))) {
        score += 50;
      }
      
      // Check name
      if (template.name.toLowerCase().includes(lowerQuery)) {
        score += 30;
      }
      
      // Check description
      if (template.description.toLowerCase().includes(lowerQuery)) {
        score += 20;
      }
      
      // Check category
      if (template.category.toLowerCase().includes(lowerQuery)) {
        score += 10;
      }
      
      if (score > 0) {
        results.push({ template, score });
      }
    }
    
    // Sort by score and return templates
    return results
      .sort((a, b) => b.score - a.score)
      .map(r => r.template);
  }

  /**
   * Get template suggestions based on context
   * @param {Object} context - Current context
   * @returns {Array} Suggested templates
   */
  getSuggestions(context = {}) {
    const suggestions = [];
    const contentType = context.contentType || 'unknown';
    
    // Check cache
    const cacheKey = `${contentType}-${context.url || ''}`;
    if (this.suggestionCache.has(cacheKey)) {
      return this.suggestionCache.get(cacheKey);
    }
    
    // Content type based suggestions
    const typeMapping = {
      'article': ['summarize-page', 'key-points', 'analyze-pros-cons'],
      'code': ['review-code', 'explain-code', 'find-bugs', 'optimize-code'],
      'product': ['analyze-pros-cons', 'compare-with', 'find-issues'],
      'documentation': ['summarize-page', 'create-quiz', 'study-notes'],
      'news': ['fact-check', 'find-sources', 'summarize-page'],
      'socialMedia': ['summarize-page', 'analyze-pros-cons', 'fact-check']
    };
    
    const suggestedIds = typeMapping[contentType] || ['summarize-page', 'key-points'];
    
    // Add suggested templates
    for (const templateId of suggestedIds) {
      const template = this.templates.get(templateId);
      if (template) {
        suggestions.push(template);
      }
    }
    
    // Add recent templates
    for (const recentId of this.recentTemplates.slice(0, 3)) {
      if (!suggestedIds.includes(recentId)) {
        const template = this.templates.get(recentId);
        if (template) {
          suggestions.push(template);
        }
      }
    }
    
    // Add popular templates
    const popular = this.getAllTemplates({ sortBy: 'usage' }).slice(0, 3);
    for (const template of popular) {
      if (!suggestions.some(s => s.id === template.id)) {
        suggestions.push(template);
      }
    }
    
    // Cache suggestions
    this.suggestionCache.set(cacheKey, suggestions.slice(0, 6));
    
    return suggestions.slice(0, 6);
  }

  /**
   * Apply template
   * @param {string} templateId - Template ID
   * @param {Object} values - Variable values
   * @param {Object} context - Current context
   * @returns {string} Processed template
   */
  async applyTemplate(templateId, values = {}, context = {}) {
    const template = this.getTemplate(templateId);
    
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }
    
    try {
      const result = await template.apply(values, context);
      
      // Update usage tracking
      this.trackUsage(templateId);
      
      return result;
    } catch (error) {
      console.error('Failed to apply template:', error);
      throw error;
    }
  }

  /**
   * Track template usage
   * @param {string} templateId - Template ID
   */
  trackUsage(templateId) {
    // Update recent templates
    this.recentTemplates = [
      templateId,
      ...this.recentTemplates.filter(id => id !== templateId)
    ].slice(0, this.maxRecentTemplates);
    
    // Save usage data asynchronously
    this.saveUsageData().catch(console.error);
  }

  /**
   * Create custom template
   * @param {Object} config - Template configuration
   * @returns {PromptTemplate} Created template
   */
  async createCustomTemplate(config) {
    // Ensure unique ID
    if (this.templates.has(config.id)) {
      config.id = `${config.id}_${Date.now()}`;
    }
    
    const template = new PromptTemplate({
      ...config,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    
    this.customTemplates.set(template.id, template);
    this.templates.set(template.id, template);
    
    await this.saveCustomTemplates();
    
    return template;
  }

  /**
   * Update custom template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Updates to apply
   * @returns {PromptTemplate} Updated template
   */
  async updateCustomTemplate(templateId, updates) {
    const template = this.customTemplates.get(templateId);
    
    if (!template) {
      throw new Error('Template not found or is not custom');
    }
    
    // Create new template with updates
    const updatedTemplate = new PromptTemplate({
      ...template.toJSON(),
      ...updates,
      id: templateId,
      updatedAt: new Date().toISOString()
    });
    
    this.customTemplates.set(templateId, updatedTemplate);
    this.templates.set(templateId, updatedTemplate);
    
    await this.saveCustomTemplates();
    
    return updatedTemplate;
  }

  /**
   * Delete custom template
   * @param {string} templateId - Template ID
   */
  async deleteCustomTemplate(templateId) {
    if (!this.customTemplates.has(templateId)) {
      throw new Error('Template not found or is not custom');
    }
    
    this.customTemplates.delete(templateId);
    this.templates.delete(templateId);
    
    await this.saveCustomTemplates();
  }

  /**
   * Import templates
   * @param {Array} templateData - Template data to import
   * @returns {Object} Import results
   */
  async importTemplates(templateData) {
    const results = {
      imported: 0,
      skipped: 0,
      errors: []
    };
    
    for (const data of templateData) {
      try {
        // Skip built-in templates
        if (data.isBuiltIn) {
          results.skipped++;
          continue;
        }
        
        // Create new template with unique ID if needed
        const config = { ...data };
        if (this.templates.has(config.id)) {
          config.id = `${config.id}_imported_${Date.now()}`;
        }
        
        await this.createCustomTemplate(config);
        results.imported++;
      } catch (error) {
        results.errors.push({
          template: data.name || data.id,
          error: error.message
        });
      }
    }
    
    return results;
  }

  /**
   * Export templates
   * @param {Object} options - Export options
   * @returns {Array} Template data
   */
  exportTemplates(options = {}) {
    let templates = Array.from(this.templates.values());
    
    if (options.customOnly) {
      templates = templates.filter(t => !t.isBuiltIn);
    }
    
    if (options.templateIds) {
      templates = templates.filter(t => options.templateIds.includes(t.id));
    }
    
    return templates.map(t => t.toJSON());
  }

  /**
   * Get categories
   * @returns {Array} Category list
   */
  getCategories() {
    const categories = new Set();
    
    for (const template of this.templates.values()) {
      categories.add(template.category);
    }
    
    return Array.from(categories).sort();
  }

  /**
   * Match shortcut
   * @param {string} input - User input
   * @returns {Object|null} Matched template and arguments
   */
  matchShortcut(input) {
    for (const template of this.templates.values()) {
      if (template.matchesShortcut(input)) {
        const args = template.extractShortcutArgs(input);
        return { template, args };
      }
    }
    
    return null;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.suggestionCache.clear();
  }
}