/**
 * Model Selector Component
 * AI model selection dropdown
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';

export default class ModelSelector extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.selectedModel = options.selectedModel || 'deepseek-chat';
    this.onModelChange = options.onModelChange || (() => {});
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('model-selector');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.element = fragment.querySelector('.deepweb-model-selector');
    this.select = this.element.querySelector('#deepweb-model-select');
    
    // Set initial value
    this.select.value = this.selectedModel;
    
    // Apply styles
    this.applyStyles();
  }

  applyStyles() {
    // Container styles
    Object.assign(this.element.style, {
      padding: '8px 16px',
      background: '#f0f4f8',
      borderBottom: '1px solid #e0e0e0'
    });

    // Select styles
    Object.assign(this.select.style, {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      background: 'white',
      cursor: 'pointer',
      color: '#333',
      fontFamily: 'inherit',
      outline: 'none',
      transition: 'border-color 0.2s'
    });
  }

  setupEventListeners() {
    // Model change
    this.select.addEventListener('change', (e) => {
      this.selectedModel = e.target.value;
      this.onModelChange(this.selectedModel);
    });

    // Focus effects
    this.select.addEventListener('focus', () => {
      this.select.style.borderColor = '#667eea';
    });

    this.select.addEventListener('blur', () => {
      this.select.style.borderColor = '#d1d5db';
    });
  }

  getSelectedModel() {
    return this.selectedModel;
  }

  setSelectedModel(model) {
    this.selectedModel = model;
    this.select.value = model;
  }
}