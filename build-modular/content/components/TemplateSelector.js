/**
 * Template Selector Component
 * UI for browsing and selecting prompt templates
 */

import BaseComponent from './BaseComponent.js';
import { animationManager } from '../utils/AnimationManager.js';

export default class TemplateSelector extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    this.state = {
      isOpen: false,
      selectedCategory: 'all',
      searchQuery: '',
      templates: [],
      suggestions: [],
      loading: false
    };
    
    this.templateManager = options.templateManager;
    this.onTemplateSelect = options.onTemplateSelect || (() => {});
    this.onClose = options.onClose || (() => {});
  }

  async render() {
    const element = document.createElement('div');
    element.className = 'deepweb-template-selector';
    element.innerHTML = `
      <div class="template-header">
        <h3>Prompt Templates</h3>
        <button class="close-button" aria-label="Close">×</button>
      </div>
      
      <div class="template-search">
        <input type="text" 
               class="template-search-input" 
               placeholder="Search templates or type shortcut..."
               value="${this.state.searchQuery}">
      </div>
      
      <div class="template-categories">
        <button class="category-chip ${this.state.selectedCategory === 'all' ? 'active' : ''}" 
                data-category="all">
          All
        </button>
        <button class="category-chip ${this.state.selectedCategory === 'suggested' ? 'active' : ''}" 
                data-category="suggested">
          Suggested
        </button>
        <button class="category-chip ${this.state.selectedCategory === 'recent' ? 'active' : ''}" 
                data-category="recent">
          Recent
        </button>
        ${this.renderCategoryChips()}
      </div>
      
      <div class="template-list">
        ${this.state.loading ? this.renderLoading() : this.renderTemplates()}
      </div>
      
      <div class="template-footer">
        <button class="create-custom-button">
          <span class="icon">+</span>
          Create Custom Template
        </button>
      </div>
    `;
    
    this.element = element;
    this.attachEventListeners();
    
    // Apply entrance animation
    await animationManager.animate(element, 'fadeIn');
    
    return element;
  }

  renderCategoryChips() {
    const categories = this.templateManager?.getCategories() || [];
    
    return categories.map(category => `
      <button class="category-chip ${this.state.selectedCategory === category ? 'active' : ''}" 
              data-category="${category}">
        ${this.capitalizeFirst(category)}
      </button>
    `).join('');
  }

  renderTemplates() {
    let templates = this.state.templates;
    
    if (this.state.selectedCategory === 'suggested') {
      templates = this.state.suggestions;
    }
    
    if (templates.length === 0) {
      return this.renderEmptyState();
    }
    
    return templates.map(template => this.renderTemplateCard(template)).join('');
  }

  renderTemplateCard(template) {
    const hasShortcuts = template.shortcuts && template.shortcuts.length > 0;
    
    return `
      <div class="template-card" data-template-id="${template.id}">
        <div class="template-icon">${template.icon || '📝'}</div>
        <div class="template-content">
          <h4 class="template-name">${template.name}</h4>
          <p class="template-description">${template.description}</p>
          ${hasShortcuts ? `
            <div class="template-shortcuts">
              ${template.shortcuts.map(s => `<span class="shortcut-chip">${s}</span>`).join('')}
            </div>
          ` : ''}
          <div class="template-meta">
            <span class="template-category">${this.capitalizeFirst(template.category)}</span>
            ${template.usageCount > 0 ? `
              <span class="template-usage">Used ${template.usageCount} times</span>
            ` : ''}
            ${template.model ? `
              <span class="template-model">${this.getModelName(template.model)}</span>
            ` : ''}
          </div>
        </div>
        <button class="template-use-button" aria-label="Use template">
          Use
        </button>
      </div>
    `;
  }

  renderEmptyState() {
    let message = 'No templates found';
    
    if (this.state.searchQuery) {
      message = 'No templates match your search';
    } else if (this.state.selectedCategory === 'recent') {
      message = 'No recently used templates';
    } else if (this.state.selectedCategory === 'suggested') {
      message = 'No suggestions available';
    }
    
    return `
      <div class="template-empty">
        <p>${message}</p>
        ${this.state.searchQuery ? `
          <button class="clear-search-button">Clear search</button>
        ` : ''}
      </div>
    `;
  }

  renderLoading() {
    return `
      <div class="template-loading">
        <div class="spinner"></div>
        <p>Loading templates...</p>
      </div>
    `;
  }

  attachEventListeners() {
    // Close button
    this.element.querySelector('.close-button').addEventListener('click', () => {
      this.close();
    });
    
    // Search input
    const searchInput = this.element.querySelector('.template-search-input');
    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.handleShortcutMatch(e.target.value);
      }
    });
    
    // Category chips
    this.element.querySelectorAll('.category-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const category = chip.dataset.category;
        this.selectCategory(category);
      });
    });
    
    // Template cards
    this.element.addEventListener('click', (e) => {
      const useButton = e.target.closest('.template-use-button');
      if (useButton) {
        const card = useButton.closest('.template-card');
        const templateId = card.dataset.templateId;
        this.selectTemplate(templateId);
      }
      
      const card = e.target.closest('.template-card');
      if (card && !useButton) {
        this.showTemplateDetails(card.dataset.templateId);
      }
    });
    
    // Clear search button
    const clearButton = this.element.querySelector('.clear-search-button');
    if (clearButton) {
      clearButton.addEventListener('click', () => {
        this.state.searchQuery = '';
        this.element.querySelector('.template-search-input').value = '';
        this.loadTemplates();
      });
    }
    
    // Create custom button
    this.element.querySelector('.create-custom-button').addEventListener('click', () => {
      this.createCustomTemplate();
    });
  }

  async handleSearch(query) {
    this.state.searchQuery = query;
    
    if (!query) {
      this.loadTemplates();
      return;
    }
    
    // Search templates
    const results = this.templateManager.searchTemplates(query);
    this.state.templates = results;
    this.updateTemplateList();
  }

  handleShortcutMatch(input) {
    if (!input || !this.templateManager) return;
    
    const match = this.templateManager.matchShortcut(input);
    if (match) {
      this.selectTemplate(match.template.id, match.args);
    }
  }

  selectCategory(category) {
    this.state.selectedCategory = category;
    
    // Update active state
    this.element.querySelectorAll('.category-chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.category === category);
    });
    
    this.loadTemplates();
  }

  async loadTemplates() {
    this.state.loading = true;
    this.updateTemplateList();
    
    try {
      if (!this.templateManager) {
        throw new Error('Template manager not initialized');
      }
      
      let templates = [];
      
      switch (this.state.selectedCategory) {
        case 'all':
          templates = this.templateManager.getAllTemplates({ sortBy: 'usage' });
          break;
          
        case 'suggested':
          templates = this.state.suggestions;
          break;
          
        case 'recent':
          templates = this.templateManager.getAllTemplates({ sortBy: 'recent' });
          break;
          
        default:
          templates = this.templateManager.getAllTemplates({ 
            category: this.state.selectedCategory,
            sortBy: 'usage'
          });
      }
      
      this.state.templates = templates;
    } catch (error) {
      console.error('Failed to load templates:', error);
      this.state.templates = [];
    } finally {
      this.state.loading = false;
      this.updateTemplateList();
    }
  }

  updateTemplateList() {
    const listContainer = this.element.querySelector('.template-list');
    const newContent = this.state.loading ? this.renderLoading() : this.renderTemplates();
    
    animationManager.animate(listContainer, 'fadeOut', { duration: 150 }).then(() => {
      listContainer.innerHTML = newContent;
      animationManager.animate(listContainer, 'fadeIn', { duration: 150 });
    });
  }

  async selectTemplate(templateId, args = {}) {
    const template = this.templateManager.getTemplate(templateId);
    if (!template) return;
    
    // Check if template needs user input
    const requiredVars = Object.entries(template.variables)
      .filter(([name, config]) => config.required && config.source === 'user' && !args[name]);
    
    if (requiredVars.length > 0) {
      // Show variable input dialog
      this.showVariableDialog(template, args);
    } else {
      // Apply template directly
      try {
        const context = await this.getContext();
        const result = await this.templateManager.applyTemplate(templateId, args, context);
        this.onTemplateSelect(result, template);
        this.close();
      } catch (error) {
        console.error('Failed to apply template:', error);
        this.showError(error.message);
      }
    }
  }

  showVariableDialog(template, existingArgs = {}) {
    // TODO: Implement variable input dialog
    // For now, just use defaults
    const args = { ...existingArgs };
    
    for (const [name, config] of Object.entries(template.variables)) {
      if (!args[name] && config.default) {
        args[name] = config.default;
      }
    }
    
    this.selectTemplate(template.id, args);
  }

  showTemplateDetails(templateId) {
    // TODO: Implement template details view
    console.log('Show details for template:', templateId);
  }

  createCustomTemplate() {
    // TODO: Implement custom template creation
    console.log('Create custom template');
  }

  async getContext() {
    // Get current page context
    const { extractChatContext } = await import('../utils/context-extractor.js');
    
    return await extractChatContext({
      userQuery: '',
      includeMetadata: true
    });
  }

  showError(message) {
    // TODO: Implement error display
    console.error('Template error:', message);
  }

  async open(context = {}) {
    this.state.isOpen = true;
    
    // Load suggestions based on context
    if (this.templateManager && context) {
      this.state.suggestions = this.templateManager.getSuggestions(context);
    }
    
    // Load templates
    await this.loadTemplates();
    
    // Focus search input
    setTimeout(() => {
      this.element.querySelector('.template-search-input')?.focus();
    }, 100);
  }

  async close() {
    this.state.isOpen = false;
    
    await animationManager.animate(this.element, 'fadeOut');
    this.onClose();
  }

  capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  getModelName(model) {
    const modelNames = {
      'deepseek-chat': 'Chat',
      'deepseek-reasoner': 'Reasoner'
    };
    return modelNames[model] || model;
  }
}