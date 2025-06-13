/**
 * Header Component
 * Chat window header with controls
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';

export default class Header extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.onClose = options.onClose || (() => {});
    this.onMinimize = options.onMinimize || (() => {});
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('header');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.element = fragment.querySelector('.deepweb-header');
    
    // Apply styles
    this.applyStyles();
  }

  applyStyles() {
    // Header styles
    Object.assign(this.element.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#f8f9fa',
      borderBottom: '1px solid #e0e0e0',
      borderRadius: '12px 12px 0 0',
      userSelect: 'none'
    });

    // Title styles
    const titleContainer = DOMUtils.$('.deepweb-header-title', this.element);
    Object.assign(titleContainer.style, {
      fontWeight: '600',
      fontSize: '16px',
      color: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    // Logo styles
    const logo = DOMUtils.$('.deepweb-logo', this.element);
    Object.assign(logo.style, {
      width: '24px',
      height: '24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold'
    });

    // Controls container
    const controls = DOMUtils.$('.deepweb-header-controls', this.element);
    Object.assign(controls.style, {
      display: 'flex',
      gap: '8px'
    });

    // Control buttons
    DOMUtils.$$('.deepweb-control-btn', this.element).forEach(btn => {
      Object.assign(btn.style, {
        width: '28px',
        height: '28px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '18px',
        color: '#666',
        borderRadius: '4px',
        transition: 'background 0.2s',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
    });
  }

  setupEventListeners() {
    // Close button
    const closeBtn = DOMUtils.$('#deepweb-close', this.element);
    this.on('click', (e) => {
      if (e.target === closeBtn || e.target.closest('#deepweb-close')) {
        this.onClose();
      }
    });

    // Minimize button
    const minimizeBtn = DOMUtils.$('#deepweb-minimize', this.element);
    this.on('click', (e) => {
      if (e.target === minimizeBtn || e.target.closest('#deepweb-minimize')) {
        this.onMinimize();
      }
    });

    // Hover effects
    DOMUtils.$$('.deepweb-control-btn', this.element).forEach(btn => {
      this._eventManager.on(btn, 'mouseenter', () => {
        btn.style.background = '#e0e0e0';
      });
      
      this._eventManager.on(btn, 'mouseleave', () => {
        btn.style.background = 'transparent';
      });
    });
  }

  setMinimizeIcon(icon) {
    const minimizeIcon = DOMUtils.$('.deepweb-minimize-icon', this.element);
    if (minimizeIcon) {
      minimizeIcon.textContent = icon;
    }
  }
}