/**
 * PromptTemplate - Base class for prompt templates
 * Handles variable substitution and template validation
 */

export class PromptTemplate {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.description = config.description;
    this.category = config.category;
    this.template = config.template;
    this.variables = config.variables || {};
    this.model = config.model || null;
    this.settings = config.settings || {};
    this.shortcuts = config.shortcuts || [];
    this.icon = config.icon || null;
    this.isBuiltIn = config.isBuiltIn || false;
    this.createdAt = config.createdAt || new Date().toISOString();
    this.updatedAt = config.updatedAt || new Date().toISOString();
    this.usageCount = config.usageCount || 0;
    
    this.validateTemplate();
  }

  /**
   * Validate template structure
   */
  validateTemplate() {
    if (!this.id || !this.name || !this.template) {
      throw new Error('Template must have id, name, and template');
    }
    
    // Extract variables from template
    const extractedVars = this.extractVariables();
    
    // Validate all extracted variables have definitions
    for (const varName of extractedVars) {
      if (!this.variables[varName]) {
        throw new Error(`Variable {${varName}} used in template but not defined`);
      }
    }
    
    // Validate variable definitions
    for (const [varName, varConfig] of Object.entries(this.variables)) {
      this.validateVariable(varName, varConfig);
    }
  }

  /**
   * Validate a variable configuration
   */
  validateVariable(name, config) {
    const validTypes = ['text', 'number', 'boolean', 'select', 'url', 'selection'];
    
    if (!config.type || !validTypes.includes(config.type)) {
      throw new Error(`Invalid variable type for ${name}: ${config.type}`);
    }
    
    if (config.required === undefined) {
      config.required = true;
    }
    
    if (config.type === 'select' && !Array.isArray(config.options)) {
      throw new Error(`Select variable ${name} must have options array`);
    }
    
    const validSources = ['user', 'page', 'selection', 'context', 'custom'];
    if (config.source && !validSources.includes(config.source)) {
      throw new Error(`Invalid variable source for ${name}: ${config.source}`);
    }
  }

  /**
   * Extract variable names from template
   * @returns {Set} Variable names
   */
  extractVariables() {
    const regex = /\{([^}]+)\}/g;
    const variables = new Set();
    let match;
    
    while ((match = regex.exec(this.template)) !== null) {
      variables.add(match[1]);
    }
    
    return variables;
  }

  /**
   * Apply template with given values
   * @param {Object} values - Variable values
   * @param {Object} context - Page context
   * @returns {string} Processed template
   */
  async apply(values = {}, context = {}) {
    // Collect all variable values
    const resolvedValues = await this.resolveVariables(values, context);
    
    // Validate required variables
    for (const [varName, varConfig] of Object.entries(this.variables)) {
      if (varConfig.required && !resolvedValues[varName]) {
        throw new Error(`Required variable ${varName} not provided`);
      }
    }
    
    // Apply template substitution
    let result = this.template;
    
    for (const [varName, value] of Object.entries(resolvedValues)) {
      const regex = new RegExp(`\\{${varName}\\}`, 'g');
      result = result.replace(regex, value || '');
    }
    
    // Increment usage count
    this.usageCount++;
    this.updatedAt = new Date().toISOString();
    
    return result;
  }

  /**
   * Resolve variable values from various sources
   * @param {Object} userValues - User-provided values
   * @param {Object} context - Page context
   * @returns {Object} Resolved values
   */
  async resolveVariables(userValues, context) {
    const resolved = {};
    
    for (const [varName, varConfig] of Object.entries(this.variables)) {
      // User-provided values take priority
      if (userValues[varName] !== undefined) {
        resolved[varName] = userValues[varName];
        continue;
      }
      
      // Auto-resolve based on source
      switch (varConfig.source) {
        case 'page':
          resolved[varName] = this.getPageValue(varConfig, context);
          break;
          
        case 'selection':
          resolved[varName] = context.selection || '';
          break;
          
        case 'context':
          resolved[varName] = this.getContextValue(varConfig, context);
          break;
          
        case 'user':
          // Will be provided by user or use default
          resolved[varName] = varConfig.default || '';
          break;
          
        case 'custom':
          if (varConfig.resolver) {
            resolved[varName] = await varConfig.resolver(context);
          }
          break;
          
        default:
          resolved[varName] = varConfig.default || '';
      }
      
      // Apply transformations
      if (varConfig.transform) {
        resolved[varName] = this.transformValue(resolved[varName], varConfig.transform);
      }
    }
    
    return resolved;
  }

  /**
   * Get value from page context
   * @param {Object} varConfig - Variable configuration
   * @param {Object} context - Page context
   * @returns {string} Value
   */
  getPageValue(varConfig, context) {
    switch (varConfig.field) {
      case 'url':
        return context.url || window.location.href;
      case 'title':
        return context.title || document.title;
      case 'domain':
        return context.domain || window.location.hostname;
      case 'content':
        return context.content || '';
      case 'selection':
        return context.selection || '';
      default:
        return '';
    }
  }

  /**
   * Get value from context
   * @param {Object} varConfig - Variable configuration
   * @param {Object} context - Context object
   * @returns {string} Value
   */
  getContextValue(varConfig, context) {
    if (!varConfig.path) return '';
    
    // Navigate through context object using dot notation
    const parts = varConfig.path.split('.');
    let value = context;
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return '';
      }
    }
    
    return value || '';
  }

  /**
   * Transform value based on configuration
   * @param {any} value - Original value
   * @param {string|Function} transform - Transformation
   * @returns {any} Transformed value
   */
  transformValue(value, transform) {
    if (typeof transform === 'function') {
      return transform(value);
    }
    
    // Built-in transformations
    switch (transform) {
      case 'uppercase':
        return String(value).toUpperCase();
      case 'lowercase':
        return String(value).toLowerCase();
      case 'trim':
        return String(value).trim();
      case 'encode':
        return encodeURIComponent(String(value));
      case 'truncate':
        return String(value).slice(0, 100) + '...';
      default:
        return value;
    }
  }

  /**
   * Check if shortcut matches
   * @param {string} input - User input
   * @returns {boolean} Match status
   */
  matchesShortcut(input) {
    const lowerInput = input.toLowerCase().trim();
    
    return this.shortcuts.some(shortcut => {
      const lowerShortcut = shortcut.toLowerCase();
      return lowerInput === lowerShortcut || lowerInput.startsWith(lowerShortcut + ' ');
    });
  }

  /**
   * Extract shortcut arguments
   * @param {string} input - User input
   * @returns {Object} Extracted arguments
   */
  extractShortcutArgs(input) {
    const lowerInput = input.toLowerCase().trim();
    
    for (const shortcut of this.shortcuts) {
      const lowerShortcut = shortcut.toLowerCase();
      if (lowerInput.startsWith(lowerShortcut)) {
        const args = input.slice(shortcut.length).trim();
        return this.parseShortcutArgs(args);
      }
    }
    
    return {};
  }

  /**
   * Parse shortcut arguments
   * @param {string} args - Arguments string
   * @returns {Object} Parsed arguments
   */
  parseShortcutArgs(args) {
    // Simple parsing - can be enhanced for more complex syntax
    const parsed = {};
    
    // Look for the first non-required variable that accepts user input
    for (const [varName, varConfig] of Object.entries(this.variables)) {
      if (varConfig.source === 'user' && !varConfig.required && args) {
        parsed[varName] = args;
        break;
      }
    }
    
    return parsed;
  }

  /**
   * Clone template with modifications
   * @param {Object} modifications - Properties to modify
   * @returns {PromptTemplate} New template instance
   */
  clone(modifications = {}) {
    return new PromptTemplate({
      ...this.toJSON(),
      ...modifications,
      id: modifications.id || `${this.id}_copy`,
      isBuiltIn: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usageCount: 0
    });
  }

  /**
   * Convert to JSON representation
   * @returns {Object} JSON object
   */
  toJSON() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      category: this.category,
      template: this.template,
      variables: this.variables,
      model: this.model,
      settings: this.settings,
      shortcuts: this.shortcuts,
      icon: this.icon,
      isBuiltIn: this.isBuiltIn,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      usageCount: this.usageCount
    };
  }

  /**
   * Create from JSON
   * @param {Object} json - JSON object
   * @returns {PromptTemplate} Template instance
   */
  static fromJSON(json) {
    return new PromptTemplate(json);
  }
}