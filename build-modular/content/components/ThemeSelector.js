/**
 * Theme Selector Component
 * UI component for theme selection and customization
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';
import ThemeManager from '../utils/ThemeManager.js';

export default class ThemeSelector extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.selectedTheme = null;
    
    // Callbacks
    this.onThemeSelect = options.onThemeSelect || (() => {});
    this.onClose = options.onClose || (() => {});
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('theme-selector');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.element = fragment.querySelector('.deepweb-theme-selector');
    
    // Load current theme
    this.selectedTheme = ThemeManager.currentTheme || 'light';
    
    // Update UI with themes
    this.updateThemeList();
    
    // Apply styles
    this.applyStyles();
    
    // Listen for theme changes
    ThemeManager.addListener((theme) => {
      this.selectedTheme = theme.id;
      this.updateThemeList();
    });
  }

  applyStyles() {
    // Overlay styles
    const overlay = DOMUtils.$('.deepweb-theme-overlay', this.element);
    if (overlay) {
      Object.assign(overlay.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        background: 'rgba(0, 0, 0, 0.5)',
        zIndex: '2147483648',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
    }
    
    // Dialog styles
    const dialog = DOMUtils.$('.deepweb-theme-dialog', this.element);
    if (dialog) {
      Object.assign(dialog.style, {
        background: 'var(--theme-background-default)',
        borderRadius: '12px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.2)',
        width: '480px',
        maxWidth: '90vw',
        maxHeight: '80vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      });
    }
    
    // Header styles
    const header = DOMUtils.$('.deepweb-theme-header', this.element);
    if (header) {
      Object.assign(header.style, {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px',
        borderBottom: '1px solid var(--theme-divider)'
      });
    }
    
    // Title styles
    const title = DOMUtils.$('.deepweb-theme-title', this.element);
    if (title) {
      Object.assign(title.style, {
        margin: '0',
        fontSize: '20px',
        fontWeight: '600',
        color: 'var(--theme-text-primary)'
      });
    }
    
    // Close button styles
    const closeBtn = DOMUtils.$('.deepweb-theme-close', this.element);
    if (closeBtn) {
      Object.assign(closeBtn.style, {
        background: 'transparent',
        border: 'none',
        fontSize: '24px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        cursor: 'pointer',
        color: 'var(--theme-text-secondary)',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
    }
    
    // Body styles
    const body = DOMUtils.$('.deepweb-theme-body', this.element);
    if (body) {
      Object.assign(body.style, {
        flex: '1',
        overflowY: 'auto',
        padding: '20px'
      });
    }
    
    // Section styles
    DOMUtils.$$('.deepweb-theme-section', this.element).forEach(section => {
      Object.assign(section.style, {
        marginBottom: '24px'
      });
    });
    
    // Section title styles
    DOMUtils.$$('.deepweb-section-title', this.element).forEach(sectionTitle => {
      Object.assign(sectionTitle.style, {
        fontSize: '16px',
        fontWeight: '600',
        color: 'var(--theme-text-primary)',
        marginBottom: '12px'
      });
    });
    
    // Theme grid styles
    const themeGrid = DOMUtils.$('.deepweb-theme-grid', this.element);
    if (themeGrid) {
      Object.assign(themeGrid.style, {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: '12px'
      });
    }
    
    // Action buttons container
    const actions = DOMUtils.$('.deepweb-theme-actions', this.element);
    if (actions) {
      Object.assign(actions.style, {
        display: 'flex',
        gap: '8px',
        flexWrap: 'wrap'
      });
    }
    
    // Theme buttons
    DOMUtils.$$('.deepweb-theme-btn', this.element).forEach(btn => {
      Object.assign(btn.style, {
        padding: '8px 16px',
        border: '1px solid var(--theme-divider)',
        borderRadius: '6px',
        background: 'var(--theme-surface-default)',
        color: 'var(--theme-text-primary)',
        cursor: 'pointer',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        gap: '6px'
      });
    });
    
    // Footer styles
    const footer = DOMUtils.$('.deepweb-theme-footer', this.element);
    if (footer) {
      Object.assign(footer.style, {
        padding: '16px 20px',
        borderTop: '1px solid var(--theme-divider)',
        background: 'var(--theme-background-paper)'
      });
    }
    
    // Follow system checkbox label
    const followSystem = DOMUtils.$('.deepweb-follow-system', this.element);
    if (followSystem) {
      Object.assign(followSystem.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        cursor: 'pointer',
        fontSize: '14px',
        color: 'var(--theme-text-primary)'
      });
    }
  }

  updateThemeList() {
    const themes = ThemeManager.getAllThemes();
    const themeGrid = DOMUtils.$('.deepweb-theme-grid', this.element);
    
    if (!themeGrid) return;
    
    // Clear existing themes
    themeGrid.innerHTML = '';
    
    // Add theme cards
    themes.forEach(theme => {
      const card = this.createThemeCard(theme);
      themeGrid.appendChild(card);
    });
    
    // Update export button state
    const currentTheme = ThemeManager.getTheme(this.selectedTheme);
    const exportBtn = DOMUtils.$('.deepweb-export-btn', this.element);
    if (exportBtn) {
      exportBtn.disabled = !currentTheme?.isCustom;
    }
  }

  createThemeCard(theme) {
    const card = document.createElement('div');
    card.className = 'deepweb-theme-card';
    if (theme.id === this.selectedTheme) {
      card.classList.add('active');
    }
    
    // Card styles
    Object.assign(card.style, {
      border: '2px solid var(--theme-divider)',
      borderRadius: '8px',
      padding: '12px',
      cursor: 'pointer',
      transition: 'all 0.2s',
      background: 'var(--theme-surface-default)',
      position: 'relative'
    });
    
    // Preview colors
    const preview = document.createElement('div');
    preview.style.cssText = `
      height: 60px;
      marginBottom: 8px;
      borderRadius: 4px;
      background: linear-gradient(135deg, ${theme.colors.primary} 0%, ${theme.colors.accent || theme.colors.secondary} 100%);
    `;
    
    // Theme name
    const name = document.createElement('div');
    name.textContent = theme.name;
    name.style.cssText = `
      fontSize: 14px;
      fontWeight: 600;
      color: var(--theme-text-primary);
      textAlign: center;
    `;
    
    // Active indicator
    if (theme.id === this.selectedTheme) {
      const checkmark = document.createElement('div');
      checkmark.textContent = '✓';
      checkmark.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        width: 20px;
        height: 20px;
        background: var(--theme-primary);
        color: white;
        borderRadius: 50%;
        display: flex;
        alignItems: center;
        justifyContent: center;
        fontSize: 12px;
        fontWeight: bold;
      `;
      card.appendChild(checkmark);
    }
    
    card.appendChild(preview);
    card.appendChild(name);
    
    // Custom theme indicator
    if (theme.isCustom) {
      const badge = document.createElement('div');
      badge.textContent = 'Custom';
      badge.style.cssText = `
        fontSize: 10px;
        color: var(--theme-text-secondary);
        textAlign: center;
        marginTop: 4px;
      `;
      card.appendChild(badge);
    }
    
    return card;
  }

  setupEventListeners() {
    // Close button
    const closeBtn = DOMUtils.$('.deepweb-theme-close', this.element);
    if (closeBtn) {
      this._eventManager.on(closeBtn, 'click', () => this.onClose());
    }
    
    // Click outside to close
    const overlay = DOMUtils.$('.deepweb-theme-overlay', this.element);
    if (overlay) {
      this._eventManager.on(overlay, 'click', (e) => {
        if (e.target === overlay) {
          this.onClose();
        }
      });
    }
    
    // Theme card clicks
    this.delegate('.deepweb-theme-card', 'click', (e) => {
      const card = e.target.closest('.deepweb-theme-card');
      const cards = DOMUtils.$$('.deepweb-theme-card', this.element);
      const index = Array.from(cards).indexOf(card);
      const themes = ThemeManager.getAllThemes();
      
      if (index >= 0 && themes[index]) {
        this.selectTheme(themes[index].id);
      }
    });
    
    // Hover effects for theme cards
    this.delegate('.deepweb-theme-card', 'mouseenter', (e) => {
      const card = e.target.closest('.deepweb-theme-card');
      if (!card.classList.contains('active')) {
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        card.style.borderColor = 'var(--theme-primary)';
      }
    });
    
    this.delegate('.deepweb-theme-card', 'mouseleave', (e) => {
      const card = e.target.closest('.deepweb-theme-card');
      if (!card.classList.contains('active')) {
        card.style.transform = '';
        card.style.boxShadow = '';
        card.style.borderColor = 'var(--theme-divider)';
      }
    });
    
    // Button hover effects
    DOMUtils.$$('.deepweb-theme-btn', this.element).forEach(btn => {
      this._eventManager.on(btn, 'mouseenter', () => {
        btn.style.background = 'var(--theme-primary)';
        btn.style.color = 'white';
        btn.style.borderColor = 'var(--theme-primary)';
      });
      
      this._eventManager.on(btn, 'mouseleave', () => {
        btn.style.background = 'var(--theme-surface-default)';
        btn.style.color = 'var(--theme-text-primary)';
        btn.style.borderColor = 'var(--theme-divider)';
      });
    });
    
    // Create custom theme button
    const createBtn = DOMUtils.$('.deepweb-create-btn', this.element);
    if (createBtn) {
      this._eventManager.on(createBtn, 'click', () => this.createCustomTheme());
    }
    
    // Import button
    const importBtn = DOMUtils.$('.deepweb-import-btn', this.element);
    if (importBtn) {
      this._eventManager.on(importBtn, 'click', () => this.importTheme());
    }
    
    // Export button
    const exportBtn = DOMUtils.$('.deepweb-export-btn', this.element);
    if (exportBtn) {
      this._eventManager.on(exportBtn, 'click', () => this.exportTheme());
    }
    
    // Follow system checkbox
    const systemCheckbox = DOMUtils.$('.deepweb-system-checkbox', this.element);
    if (systemCheckbox) {
      systemCheckbox.checked = ThemeManager.shouldFollowSystemTheme();
      this._eventManager.on(systemCheckbox, 'change', (e) => {
        // This could be implemented with a preference setting
        console.log('Follow system theme:', e.target.checked);
      });
    }
  }

  selectTheme(themeId) {
    this.selectedTheme = themeId;
    this.onThemeSelect(themeId);
    this.updateThemeList();
  }

  createCustomTheme() {
    // For now, just create a simple custom theme
    const name = prompt('Enter theme name:');
    if (!name) return;
    
    ThemeManager.createCustomTheme(name, {
      name: name,
      mode: 'light',
      colors: {
        primary: '#667eea',
        secondary: '#764ba2',
        accent: '#f093fb',
        error: '#f44336',
        warning: '#ff9800',
        info: '#2196f3',
        success: '#4caf50',
        background: {
          default: '#ffffff',
          paper: '#f5f5f5',
          elevated: '#fafafa'
        },
        surface: {
          default: '#ffffff',
          variant: '#f0f0f0'
        },
        text: {
          primary: 'rgba(0, 0, 0, 0.87)',
          secondary: 'rgba(0, 0, 0, 0.6)',
          disabled: 'rgba(0, 0, 0, 0.38)',
          hint: 'rgba(0, 0, 0, 0.38)'
        },
        divider: 'rgba(0, 0, 0, 0.12)',
        overlay: 'rgba(0, 0, 0, 0.5)',
        shadow: 'rgba(0, 0, 0, 0.2)'
      }
    }).then(themeId => {
      this.selectTheme(themeId);
    });
  }

  importTheme() {
    const json = prompt('Paste theme JSON:');
    if (!json) return;
    
    try {
      ThemeManager.importTheme(json).then(themeId => {
        this.selectTheme(themeId);
      });
    } catch (error) {
      alert('Invalid theme JSON: ' + error.message);
    }
  }

  exportTheme() {
    const theme = ThemeManager.getTheme(this.selectedTheme);
    if (!theme || !theme.isCustom) return;
    
    const json = ThemeManager.exportTheme(this.selectedTheme);
    
    // Create a temporary textarea to copy to clipboard
    const textarea = document.createElement('textarea');
    textarea.value = json;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    alert('Theme JSON copied to clipboard!');
  }

  show() {
    super.show();
    this.updateThemeList();
  }
}