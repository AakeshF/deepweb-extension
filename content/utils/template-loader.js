/**
 * Template Loader Utility
 * Handles loading and caching of HTML templates
 */

class TemplateLoader {
  constructor() {
    this.cache = new Map();
    this.baseUrl = browser.runtime.getURL('content/templates/');
  }

  /**
   * Load a template from file
   * @param {string} templateName - Name of the template file (without .html)
   * @returns {Promise<string>} - Template HTML content
   */
  async loadTemplate(templateName) {
    // Check cache first
    if (this.cache.has(templateName)) {
      return this.cache.get(templateName);
    }

    try {
      const url = `${this.baseUrl}${templateName}.html`;
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to load template: ${templateName}`);
      }

      const content = await response.text();
      
      // Cache the template
      this.cache.set(templateName, content);
      
      return content;
    } catch (error) {
      console.error('[DeepWeb] Template loading error:', error);
      throw error;
    }
  }

  /**
   * Load multiple templates at once
   * @param {string[]} templateNames - Array of template names
   * @returns {Promise<Object>} - Object with template name as key and content as value
   */
  async loadTemplates(templateNames) {
    const templates = {};
    const promises = templateNames.map(async (name) => {
      templates[name] = await this.loadTemplate(name);
    });
    
    await Promise.all(promises);
    return templates;
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Parse template and create DOM element
   * @param {string} html - HTML string
   * @returns {DocumentFragment} - Parsed DOM fragment
   */
  parseTemplate(html) {
    const template = document.createElement('template');
    template.innerHTML = html.trim();
    return template.content;
  }
}

// Export singleton instance
export default new TemplateLoader();