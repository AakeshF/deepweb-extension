/**
 * Layout Controls Component
 * Provides UI for controlling chat window layout and position
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';

export default class LayoutControls extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // Callbacks
    this.onLayoutChange = options.onLayoutChange || (() => {});
    this.onPositionChange = options.onPositionChange || (() => {});
    this.onOpacityChange = options.onOpacityChange || (() => {});
    this.onPin = options.onPin || (() => {});
    this.onReset = options.onReset || (() => {});
    this.onThemeClick = options.onThemeClick || (() => {});
    
    // Default values
    this.currentLayout = options.currentLayout || 'standard';
    this.currentPosition = options.currentPosition || 'bottom-right';
    this.currentOpacity = options.currentOpacity || 100;
    this.isPinned = options.isPinned || false;
    
    // Layout presets
    this.layoutPresets = {
      compact: { width: 320, height: 480 },
      standard: { width: 400, height: 600 },
      wide: { width: 600, height: 500 },
      tall: { width: 380, height: 700 }
    };
    
    // Position options
    this.positionOptions = {
      'top-left': 'Top Left',
      'top-right': 'Top Right',
      'bottom-left': 'Bottom Left',
      'bottom-right': 'Bottom Right',
      'left-sidebar': 'Left Sidebar',
      'right-sidebar': 'Right Sidebar',
      'floating': 'Floating'
    };
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('layout-controls');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.element = fragment.querySelector('.deepweb-layout-controls');
    
    // Set initial values
    this.updateUI();
    
    // Apply styles
    this.applyStyles();
  }

  applyStyles() {
    // Container styles
    Object.assign(this.element.style, {
      position: 'absolute',
      top: '48px',
      right: '16px',
      background: 'white',
      borderRadius: '8px',
      padding: '16px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: '1000',
      minWidth: '280px',
      fontSize: '14px'
    });

    // Section styles
    DOMUtils.$$('.deepweb-layout-section', this.element).forEach(section => {
      Object.assign(section.style, {
        marginBottom: '16px'
      });
    });

    // Section title styles
    DOMUtils.$$('.deepweb-section-title', this.element).forEach(title => {
      Object.assign(title.style, {
        fontSize: '12px',
        fontWeight: '600',
        color: '#666',
        marginBottom: '8px',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      });
    });

    // Layout buttons container
    const layoutButtons = DOMUtils.$('.deepweb-layout-buttons', this.element);
    Object.assign(layoutButtons.style, {
      display: 'grid',
      gridTemplateColumns: 'repeat(2, 1fr)',
      gap: '8px'
    });

    // Layout preset buttons
    DOMUtils.$$('.deepweb-layout-btn', this.element).forEach(btn => {
      Object.assign(btn.style, {
        padding: '8px 12px',
        border: '1px solid #e0e0e0',
        borderRadius: '4px',
        background: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s',
        fontSize: '13px',
        fontWeight: '500'
      });
    });

    // Position selector
    const positionSelect = DOMUtils.$('.deepweb-position-select', this.element);
    Object.assign(positionSelect.style, {
      width: '100%',
      padding: '8px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      fontSize: '13px',
      background: 'white',
      cursor: 'pointer'
    });

    // Opacity slider container
    const opacityContainer = DOMUtils.$('.deepweb-opacity-container', this.element);
    Object.assign(opacityContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px'
    });

    // Opacity slider
    const opacitySlider = DOMUtils.$('.deepweb-opacity-slider', this.element);
    Object.assign(opacitySlider.style, {
      flex: '1',
      height: '4px',
      cursor: 'pointer'
    });

    // Opacity value
    const opacityValue = DOMUtils.$('.deepweb-opacity-value', this.element);
    Object.assign(opacityValue.style, {
      minWidth: '40px',
      textAlign: 'right',
      fontSize: '13px',
      color: '#666'
    });

    // Action buttons container
    const actionButtons = DOMUtils.$('.deepweb-action-buttons', this.element);
    Object.assign(actionButtons.style, {
      display: 'flex',
      gap: '8px',
      marginTop: '20px',
      paddingTop: '16px',
      borderTop: '1px solid #e0e0e0',
      flexWrap: 'wrap'
    });

    // Common button styles
    const buttonStyles = {
      flex: '1',
      minWidth: '120px',
      padding: '8px 16px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      background: 'white',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: '500',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px'
    };

    // Theme button
    const themeBtn = DOMUtils.$('.deepweb-theme-btn', this.element);
    Object.assign(themeBtn.style, buttonStyles);

    // Pin button
    const pinBtn = DOMUtils.$('.deepweb-pin-btn', this.element);
    Object.assign(pinBtn.style, buttonStyles);

    // Reset button
    const resetBtn = DOMUtils.$('.deepweb-reset-btn', this.element);
    Object.assign(resetBtn.style, {
      ...buttonStyles,
      flex: '1 1 100%' // Full width on its own row
    });
  }

  setupEventListeners() {
    // Layout preset buttons
    DOMUtils.$$('.deepweb-layout-btn', this.element).forEach(btn => {
      this.on('click', (e) => {
        if (e.target === btn || e.target.closest('.deepweb-layout-btn') === btn) {
          const layout = btn.dataset.layout;
          this.selectLayout(layout);
        }
      });

      // Hover effects
      this._eventManager.on(btn, 'mouseenter', () => {
        if (!btn.classList.contains('active')) {
          btn.style.background = '#f8f9fa';
          btn.style.borderColor = '#667eea';
        }
      });
      
      this._eventManager.on(btn, 'mouseleave', () => {
        if (!btn.classList.contains('active')) {
          btn.style.background = 'white';
          btn.style.borderColor = '#e0e0e0';
        }
      });
    });

    // Position selector
    const positionSelect = DOMUtils.$('.deepweb-position-select', this.element);
    this._eventManager.on(positionSelect, 'change', (e) => {
      this.currentPosition = e.target.value;
      this.onPositionChange(this.currentPosition);
    });

    // Opacity slider
    const opacitySlider = DOMUtils.$('.deepweb-opacity-slider', this.element);
    this._eventManager.on(opacitySlider, 'input', (e) => {
      this.currentOpacity = parseInt(e.target.value);
      this.updateOpacityDisplay();
      this.onOpacityChange(this.currentOpacity);
    });

    // Theme button
    const themeBtn = DOMUtils.$('.deepweb-theme-btn', this.element);
    this.on('click', (e) => {
      if (e.target === themeBtn || e.target.closest('.deepweb-theme-btn')) {
        this.onThemeClick();
      }
    });

    // Pin button
    const pinBtn = DOMUtils.$('.deepweb-pin-btn', this.element);
    this.on('click', (e) => {
      if (e.target === pinBtn || e.target.closest('.deepweb-pin-btn')) {
        this.togglePin();
      }
    });

    // Reset button
    const resetBtn = DOMUtils.$('.deepweb-reset-btn', this.element);
    this.on('click', (e) => {
      if (e.target === resetBtn || e.target.closest('.deepweb-reset-btn')) {
        this.reset();
      }
    });

    // Hover effects for action buttons
    [themeBtn, pinBtn, resetBtn].forEach(btn => {
      this._eventManager.on(btn, 'mouseenter', () => {
        if (btn !== pinBtn || !this.isPinned) {
          btn.style.background = '#f8f9fa';
          btn.style.borderColor = '#667eea';
        }
      });
      
      this._eventManager.on(btn, 'mouseleave', () => {
        if (btn !== pinBtn || !this.isPinned) {
          btn.style.background = 'white';
          btn.style.borderColor = '#e0e0e0';
        }
      });
    });
  }

  selectLayout(layout) {
    this.currentLayout = layout;
    
    // Update button states
    DOMUtils.$$('.deepweb-layout-btn', this.element).forEach(btn => {
      if (btn.dataset.layout === layout) {
        btn.classList.add('active');
        btn.style.background = '#667eea';
        btn.style.color = 'white';
        btn.style.borderColor = '#667eea';
      } else {
        btn.classList.remove('active');
        btn.style.background = 'white';
        btn.style.color = '#333';
        btn.style.borderColor = '#e0e0e0';
      }
    });
    
    // Trigger callback with preset dimensions
    const preset = this.layoutPresets[layout];
    this.onLayoutChange(layout, preset);
  }

  updateOpacityDisplay() {
    const opacityValue = DOMUtils.$('.deepweb-opacity-value', this.element);
    opacityValue.textContent = `${this.currentOpacity}%`;
  }

  togglePin() {
    this.isPinned = !this.isPinned;
    this.updatePinButton();
    this.onPin(this.isPinned);
  }

  updatePinButton() {
    const pinBtn = DOMUtils.$('.deepweb-pin-btn', this.element);
    const pinIcon = DOMUtils.$('.deepweb-pin-icon', pinBtn);
    const pinText = DOMUtils.$('.deepweb-pin-text', pinBtn);
    
    if (this.isPinned) {
      pinIcon.textContent = '📍';
      pinText.textContent = 'Unpin';
      pinBtn.style.background = '#667eea';
      pinBtn.style.color = 'white';
      pinBtn.style.borderColor = '#667eea';
    } else {
      pinIcon.textContent = '📌';
      pinText.textContent = 'Pin on Top';
      pinBtn.style.background = 'white';
      pinBtn.style.color = '#333';
      pinBtn.style.borderColor = '#e0e0e0';
    }
  }

  reset() {
    // Reset to defaults
    this.selectLayout('standard');
    this.currentPosition = 'bottom-right';
    this.currentOpacity = 100;
    this.isPinned = false;
    
    // Update UI
    this.updateUI();
    
    // Trigger reset callback
    this.onReset();
  }

  updateUI() {
    // Update layout selection
    this.selectLayout(this.currentLayout);
    
    // Update position selector
    const positionSelect = DOMUtils.$('.deepweb-position-select', this.element);
    positionSelect.value = this.currentPosition;
    
    // Update opacity slider
    const opacitySlider = DOMUtils.$('.deepweb-opacity-slider', this.element);
    opacitySlider.value = this.currentOpacity;
    this.updateOpacityDisplay();
    
    // Update pin button
    this.updatePinButton();
  }

  show() {
    this.element.style.display = 'block';
  }

  hide() {
    this.element.style.display = 'none';
  }

  toggle() {
    if (this.element.style.display === 'none') {
      this.show();
    } else {
      this.hide();
    }
  }
}