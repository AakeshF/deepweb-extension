/**
 * Template Selector Component
 * UI for browsing and selecting prompt templates
 */

import BaseComponent from './BaseComponent.js';
import { animationManager } from '../utils/AnimationManager.js';
import DOMUtils from '../utils/dom-utils.js';

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
    
    // Header
    const header = document.createElement('div');
    header.className = 'template-header';
    
    const h3 = document.createElement('h3');
    h3.textContent = 'Prompt Templates';
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-button';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    
    header.appendChild(h3);
    header.appendChild(closeBtn);
    
    // Search
    const search = document.createElement('div');
    search.className = 'template-search';
    
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'template-search-input';
    searchInput.placeholder = 'Search templates or type shortcut...';
    searchInput.value = this.state.searchQuery;
    
    search.appendChild(searchInput);
    
    // Categories
    const categories = document.createElement('div');
    categories.className = 'template-categories';
    
    // All button
    const allBtn = document.createElement('button');
    allBtn.className = 'category-chip' + (this.state.selectedCategory === 'all' ? ' active' : '');
    allBtn.setAttribute('data-category', 'all');
    allBtn.textContent = 'All';
    categories.appendChild(allBtn);
    
    // Suggested button
    const suggestedBtn = document.createElement('button');
    suggestedBtn.className = 'category-chip' + (this.state.selectedCategory === 'suggested' ? ' active' : '');
    suggestedBtn.setAttribute('data-category', 'suggested');
    suggestedBtn.textContent = 'Suggested';
    categories.appendChild(suggestedBtn);
    
    // Recent button
    const recentBtn = document.createElement('button');
    recentBtn.className = 'category-chip' + (this.state.selectedCategory === 'recent' ? ' active' : '');
    recentBtn.setAttribute('data-category', 'recent');
    recentBtn.textContent = 'Recent';
    categories.appendChild(recentBtn);
    
    // Additional category chips
    this.appendCategoryChips(categories);
    
    // Template list
    const templateList = document.createElement('div');
    templateList.className = 'template-list';
    
    if (this.state.loading) {
      templateList.appendChild(this.createLoadingElement());
    } else {
      this.appendTemplates(templateList);
    }
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'template-footer';
    
    const createBtn = document.createElement('button');
    createBtn.className = 'create-custom-button';
    
    const icon = document.createElement('span');
    icon.className = 'icon';
    icon.textContent = '+';
    
    createBtn.appendChild(icon);
    createBtn.appendChild(document.createTextNode(' Create Custom Template'));
    
    footer.appendChild(createBtn);
    
    // Assemble
    element.appendChild(header);
    element.appendChild(search);
    element.appendChild(categories);
    element.appendChild(templateList);
    element.appendChild(footer);
    
    this.element = element;
    this.attachEventListeners();
    
    // Apply entrance animation
    await animationManager.animate(element, 'fadeIn');
    
    return element;
  }

  appendCategoryChips(container) {
    const categories = this.templateManager?.getCategories() || [];
    
    categories.forEach(category => {
      const btn = document.createElement('button');
      btn.className = 'category-chip' + (this.state.selectedCategory === category ? ' active' : '');
      btn.setAttribute('data-category', category);
      btn.textContent = this.capitalizeFirst(category);
      container.appendChild(btn);
    });
  }
  
  createLoadingElement() {
    const loading = document.createElement('div');
    loading.className = 'template-loading';
    loading.textContent = 'Loading templates...';
    return loading;
  }
  
  appendTemplates(container) {
    let templates = this.state.templates;
    
    if (this.state.selectedCategory === 'suggested') {
      templates = this.state.suggestions;
    }
    
    if (templates.length === 0) {
      container.appendChild(this.createEmptyStateElement());
      return;
    }
    
    templates.forEach(template => {
      container.appendChild(this.createTemplateCard(template));
    });
  }
  
  createEmptyStateElement() {
    const empty = document.createElement('div');
    empty.className = 'template-empty';
    empty.textContent = 'No templates found. Try a different search or category.';
    return empty;
  }
  
  createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.setAttribute('data-template-id', template.id);
    
    const title = document.createElement('h4');
    title.textContent = template.title;
    
    const desc = document.createElement('p');
    desc.className = 'template-description';
    desc.textContent = template.description;
    
    const meta = document.createElement('div');
    meta.className = 'template-meta';
    
    if (template.shortcut) {
      const shortcut = document.createElement('span');
      shortcut.className = 'template-shortcut';
      shortcut.textContent = `/${template.shortcut}`;
      meta.appendChild(shortcut);
    }
    
    const category = document.createElement('span');
    category.className = 'template-category';
    category.textContent = this.capitalizeFirst(template.category);
    meta.appendChild(category);
    
    card.appendChild(title);
    card.appendChild(desc);
    card.appendChild(meta);
    
    return card;
  }
  
  renderCategoryChips() {
    // This method is no longer used, keeping for compatibility
    return '';
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
    
    animationManager.animate(listContainer, 'fadeOut', { duration: 150 }).then(() => {
      // Clear existing content
      listContainer.textContent = '';
      
      // Add new content based on state
      if (this.state.loading) {
        listContainer.appendChild(this.createLoadingElement());
      } else {
        const templates = this.createTemplateElements();
        templates.forEach(template => listContainer.appendChild(template));
      }
      
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
  
  createLoadingElement() {
    const container = document.createElement('div');
    container.className = 'template-loading';
    
    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    
    const p = document.createElement('p');
    p.textContent = 'Loading templates...';
    
    container.appendChild(spinner);
    container.appendChild(p);
    
    return container;
  }
  
  createTemplateElements() {
    const templates = this.getFilteredTemplates();
    
    if (templates.length === 0) {
      const noResults = document.createElement('div');
      noResults.className = 'no-templates';
      const p = document.createElement('p');
      p.textContent = 'No templates found';
      noResults.appendChild(p);
      return [noResults];
    }
    
    return templates.map(template => {
      const item = document.createElement('div');
      item.className = 'template-item';
      item.setAttribute('data-template-id', template.id);
      
      // Create header
      const header = document.createElement('div');
      header.className = 'template-header';
      
      const title = document.createElement('h4');
      title.textContent = template.name;
      
      const shortcut = document.createElement('span');
      shortcut.className = 'template-shortcut';
      shortcut.textContent = template.shortcut || '';
      
      header.appendChild(title);
      if (template.shortcut) {
        header.appendChild(shortcut);
      }
      
      // Create description
      const desc = document.createElement('p');
      desc.className = 'template-description';
      desc.textContent = template.description;
      
      // Create footer
      const footer = document.createElement('div');
      footer.className = 'template-footer';
      
      const category = document.createElement('span');
      category.className = 'template-category';
      category.textContent = template.category;
      
      const model = document.createElement('span');
      model.className = 'template-model';
      model.textContent = `Model: ${this.getModelName(template.model)}`;
      
      footer.appendChild(category);
      footer.appendChild(model);
      
      // Assemble item
      item.appendChild(header);
      item.appendChild(desc);
      item.appendChild(footer);
      
      // Add click handler
      item.addEventListener('click', () => this.selectTemplate(template.id));
      
      return item;
    });
  }
}