/**
 * Theme Manager for DeepWeb Extension
 * Handles theme registration, switching, persistence, and dynamic CSS generation
 */

import { themes as builtInThemes, validateTheme } from './themes.js';

class ThemeManager {
  constructor() {
    this.themes = new Map();
    this.currentTheme = null;
    this.listeners = new Set();
    this.cssElement = null;
    this.transitionDuration = 300;
    this.storageKey = 'deepweb-theme';
    this.customThemesKey = 'deepweb-custom-themes';
    
    // Initialize with built-in themes
    this.initializeBuiltInThemes();
    
    // Load custom themes from storage
    this.loadCustomThemes();
    
    // Setup system preference detection
    this.setupSystemPreferenceDetection();
  }

  /**
   * Initialize built-in themes
   */
  initializeBuiltInThemes() {
    Object.entries(builtInThemes).forEach(([id, theme]) => {
      this.registerTheme(id, theme, true);
    });
  }

  /**
   * Register a new theme
   * @param {string} id - Theme identifier
   * @param {Object} theme - Theme configuration
   * @param {boolean} isBuiltIn - Whether this is a built-in theme
   */
  registerTheme(id, theme, isBuiltIn = false) {
    if (!validateTheme(theme)) {
      throw new Error(`Invalid theme configuration for ${id}`);
    }

    this.themes.set(id, {
      ...theme,
      id,
      isBuiltIn,
      isCustom: !isBuiltIn
    });
  }

  /**
   * Get all registered themes
   * @returns {Array} Array of theme objects
   */
  getAllThemes() {
    return Array.from(this.themes.values());
  }

  /**
   * Get a specific theme by ID
   * @param {string} id - Theme identifier
   * @returns {Object|null} Theme object or null
   */
  getTheme(id) {
    return this.themes.get(id) || null;
  }

  /**
   * Apply a theme
   * @param {string} themeId - Theme identifier
   * @param {boolean} skipTransition - Skip transition animation
   */
  async applyTheme(themeId, skipTransition = false) {
    const theme = this.getTheme(themeId);
    if (!theme) {
      console.error(`Theme ${themeId} not found`);
      return;
    }

    // Add transition class if not skipping
    if (!skipTransition) {
      document.body.classList.add('theme-transitioning');
    }

    // Generate and inject CSS
    this.injectThemeCSS(theme);

    // Update current theme
    this.currentTheme = themeId;

    // Save to storage
    await this.saveThemePreference(themeId);

    // Notify listeners
    this.notifyListeners(theme);

    // Remove transition class after animation
    if (!skipTransition) {
      setTimeout(() => {
        document.body.classList.remove('theme-transitioning');
      }, this.transitionDuration);
    }

    // Update body attributes
    document.body.setAttribute('data-theme', themeId);
    document.body.setAttribute('data-theme-mode', theme.mode || 'light');
  }

  /**
   * Generate CSS from theme configuration
   * @param {Object} theme - Theme object
   * @returns {string} CSS string
   */
  generateThemeCSS(theme) {
    const cssVariables = [];

    // Colors
    if (theme.colors) {
      Object.entries(theme.colors).forEach(([key, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            cssVariables.push(`--theme-${key}-${subKey}: ${subValue};`);
          });
        } else {
          cssVariables.push(`--theme-${key}: ${value};`);
        }
      });
    }

    // Typography
    if (theme.typography) {
      Object.entries(theme.typography).forEach(([key, value]) => {
        if (typeof value === 'object') {
          Object.entries(value).forEach(([subKey, subValue]) => {
            cssVariables.push(`--theme-typography-${key}-${subKey}: ${subValue};`);
          });
        } else {
          cssVariables.push(`--theme-typography-${key}: ${value};`);
        }
      });
    }

    // Spacing
    if (theme.spacing) {
      Object.entries(theme.spacing).forEach(([key, value]) => {
        cssVariables.push(`--theme-spacing-${key}: ${value};`);
      });
    }

    // Borders
    if (theme.borders) {
      Object.entries(theme.borders).forEach(([key, value]) => {
        cssVariables.push(`--theme-border-${key}: ${value};`);
      });
    }

    // Shadows
    if (theme.shadows) {
      Object.entries(theme.shadows).forEach(([key, value]) => {
        cssVariables.push(`--theme-shadow-${key}: ${value};`);
      });
    }

    // Animations
    if (theme.animations) {
      Object.entries(theme.animations).forEach(([key, value]) => {
        cssVariables.push(`--theme-animation-${key}: ${value};`);
      });
    }

    return `:root {\n  ${cssVariables.join('\n  ')}\n}`;
  }

  /**
   * Inject theme CSS into the document
   * @param {Object} theme - Theme object
   */
  injectThemeCSS(theme) {
    // Remove existing theme CSS element if present
    if (this.cssElement) {
      this.cssElement.remove();
    }

    // Create new style element
    this.cssElement = document.createElement('style');
    this.cssElement.id = 'deepweb-theme-styles';
    this.cssElement.textContent = this.generateThemeCSS(theme);

    // Inject into document head
    document.head.appendChild(this.cssElement);
  }

  /**
   * Create a custom theme
   * @param {string} name - Theme name
   * @param {Object} config - Theme configuration
   * @returns {string} Generated theme ID
   */
  async createCustomTheme(name, config) {
    const id = `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const theme = {
      ...config,
      name,
      id,
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    this.registerTheme(id, theme);
    await this.saveCustomThemes();

    return id;
  }

  /**
   * Update an existing custom theme
   * @param {string} id - Theme ID
   * @param {Object} updates - Theme updates
   */
  async updateCustomTheme(id, updates) {
    const theme = this.getTheme(id);
    if (!theme || !theme.isCustom) {
      throw new Error('Cannot update built-in themes');
    }

    const updatedTheme = {
      ...theme,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.registerTheme(id, updatedTheme);
    await this.saveCustomThemes();

    // If this is the current theme, reapply it
    if (this.currentTheme === id) {
      await this.applyTheme(id, true);
    }
  }

  /**
   * Delete a custom theme
   * @param {string} id - Theme ID
   */
  async deleteCustomTheme(id) {
    const theme = this.getTheme(id);
    if (!theme || !theme.isCustom) {
      throw new Error('Cannot delete built-in themes');
    }

    this.themes.delete(id);
    await this.saveCustomThemes();

    // If this was the current theme, switch to default
    if (this.currentTheme === id) {
      await this.applyTheme('light');
    }
  }

  /**
   * Extract colors from a website
   * @param {string} url - Website URL
   * @returns {Object} Extracted color palette
   */
  async extractWebsiteColors(url) {
    try {
      // Create a hidden iframe to load the website
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = url;
      document.body.appendChild(iframe);

      return new Promise((resolve, reject) => {
        iframe.onload = () => {
          try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            const colors = this.extractColorsFromDocument(iframeDoc);
            document.body.removeChild(iframe);
            resolve(colors);
          } catch (error) {
            document.body.removeChild(iframe);
            reject(error);
          }
        };

        iframe.onerror = () => {
          document.body.removeChild(iframe);
          reject(new Error('Failed to load website'));
        };

        // Timeout after 10 seconds
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
            reject(new Error('Timeout loading website'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error('Error extracting website colors:', error);
      throw error;
    }
  }

  /**
   * Extract colors from a document
   * @param {Document} doc - Document to extract from
   * @returns {Object} Color palette
   */
  extractColorsFromDocument(doc) {
    const colorMap = new Map();
    const elements = doc.querySelectorAll('*');

    elements.forEach(element => {
      const styles = window.getComputedStyle(element);
      
      // Extract various color properties
      const colorProperties = [
        'color',
        'backgroundColor',
        'borderColor',
        'borderTopColor',
        'borderRightColor',
        'borderBottomColor',
        'borderLeftColor'
      ];

      colorProperties.forEach(prop => {
        const color = styles[prop];
        if (color && color !== 'transparent' && color !== 'rgba(0, 0, 0, 0)') {
          const count = colorMap.get(color) || 0;
          colorMap.set(color, count + 1);
        }
      });
    });

    // Sort colors by frequency and extract top colors
    const sortedColors = Array.from(colorMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([color]) => color);

    // Analyze and categorize colors
    return this.categorizeColors(sortedColors);
  }

  /**
   * Categorize extracted colors into theme palette
   * @param {Array} colors - Array of color values
   * @returns {Object} Categorized color palette
   */
  categorizeColors(colors) {
    // This is a simplified categorization
    // In a real implementation, you'd use color analysis libraries
    const palette = {
      primary: colors[0] || '#1976d2',
      secondary: colors[1] || '#dc004e',
      background: {
        default: colors.find(c => this.isLightColor(c)) || '#ffffff',
        paper: colors.find(c => this.isLightColor(c)) || '#f5f5f5'
      },
      text: {
        primary: colors.find(c => !this.isLightColor(c)) || '#000000',
        secondary: colors.find(c => !this.isLightColor(c)) || '#666666'
      }
    };

    return palette;
  }

  /**
   * Check if a color is light
   * @param {string} color - Color value
   * @returns {boolean} True if light color
   */
  isLightColor(color) {
    // Convert color to RGB
    const rgb = this.colorToRgb(color);
    if (!rgb) return true;

    // Calculate luminance
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance > 0.5;
  }

  /**
   * Convert color string to RGB
   * @param {string} color - Color string
   * @returns {Object|null} RGB values or null
   */
  colorToRgb(color) {
    // This is a simplified conversion
    // In a real implementation, you'd handle all color formats
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    const imageData = ctx.getImageData(0, 0, 1, 1);
    return {
      r: imageData.data[0],
      g: imageData.data[1],
      b: imageData.data[2]
    };
  }

  /**
   * Setup system preference detection
   */
  setupSystemPreferenceDetection() {
    // Check for dark mode preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Apply system theme on initial load if no saved preference
    this.checkSystemPreference();

    // Listen for changes
    darkModeQuery.addEventListener('change', (e) => {
      if (this.shouldFollowSystemTheme()) {
        this.applyTheme(e.matches ? 'dark' : 'light');
      }
    });

    // Check for reduced motion preference
    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedMotionQuery.addEventListener('change', (e) => {
      document.body.classList.toggle('reduced-motion', e.matches);
    });
  }

  /**
   * Check system preference and apply if needed
   */
  async checkSystemPreference() {
    const savedTheme = await this.loadThemePreference();
    if (!savedTheme) {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      await this.applyTheme(prefersDark ? 'dark' : 'light', true);
    } else {
      await this.applyTheme(savedTheme, true);
    }
  }

  /**
   * Check if should follow system theme
   * @returns {boolean} True if should follow system
   */
  shouldFollowSystemTheme() {
    // This could be a user preference
    return !this.currentTheme || this.currentTheme === 'system';
  }

  /**
   * Save theme preference
   * @param {string} themeId - Theme ID
   */
  async saveThemePreference(themeId) {
    try {
      await browser.storage.local.set({ [this.storageKey]: themeId });
    } catch (error) {
      console.error('Error saving theme preference:', error);
    }
  }

  /**
   * Load theme preference
   * @returns {string|null} Theme ID or null
   */
  async loadThemePreference() {
    try {
      const result = await browser.storage.local.get(this.storageKey);
      return result[this.storageKey] || null;
    } catch (error) {
      console.error('Error loading theme preference:', error);
      return null;
    }
  }

  /**
   * Save custom themes to storage
   */
  async saveCustomThemes() {
    try {
      const customThemes = Array.from(this.themes.values())
        .filter(theme => theme.isCustom);
      await browser.storage.local.set({ [this.customThemesKey]: customThemes });
    } catch (error) {
      console.error('Error saving custom themes:', error);
    }
  }

  /**
   * Load custom themes from storage
   */
  async loadCustomThemes() {
    try {
      const result = await browser.storage.local.get(this.customThemesKey);
      const customThemes = result[this.customThemesKey] || [];
      
      customThemes.forEach(theme => {
        this.registerTheme(theme.id, theme);
      });
    } catch (error) {
      console.error('Error loading custom themes:', error);
    }
  }

  /**
   * Export theme as JSON
   * @param {string} themeId - Theme ID
   * @returns {string} JSON string
   */
  exportTheme(themeId) {
    const theme = this.getTheme(themeId);
    if (!theme) {
      throw new Error(`Theme ${themeId} not found`);
    }

    return JSON.stringify(theme, null, 2);
  }

  /**
   * Import theme from JSON
   * @param {string} jsonString - JSON string
   * @returns {string} Imported theme ID
   */
  async importTheme(jsonString) {
    try {
      const theme = JSON.parse(jsonString);
      if (!validateTheme(theme)) {
        throw new Error('Invalid theme format');
      }

      const id = await this.createCustomTheme(theme.name || 'Imported Theme', theme);
      return id;
    } catch (error) {
      console.error('Error importing theme:', error);
      throw error;
    }
  }

  /**
   * Add theme change listener
   * @param {Function} callback - Callback function
   */
  addListener(callback) {
    this.listeners.add(callback);
  }

  /**
   * Remove theme change listener
   * @param {Function} callback - Callback function
   */
  removeListener(callback) {
    this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of theme change
   * @param {Object} theme - New theme
   */
  notifyListeners(theme) {
    this.listeners.forEach(callback => {
      try {
        callback(theme);
      } catch (error) {
        console.error('Error in theme change listener:', error);
      }
    });
  }

  /**
   * Get theme transition CSS
   * @returns {string} Transition CSS
   */
  getTransitionCSS() {
    return `
      .theme-transitioning,
      .theme-transitioning * {
        transition: background-color ${this.transitionDuration}ms ease,
                    color ${this.transitionDuration}ms ease,
                    border-color ${this.transitionDuration}ms ease,
                    box-shadow ${this.transitionDuration}ms ease !important;
      }
    `;
  }

  /**
   * Initialize theme manager
   */
  async initialize() {
    // Inject transition CSS
    const transitionStyle = document.createElement('style');
    transitionStyle.id = 'deepweb-theme-transitions';
    transitionStyle.textContent = this.getTransitionCSS();
    document.head.appendChild(transitionStyle);

    // Load and apply saved theme
    await this.checkSystemPreference();
  }
}

// Export singleton instance
export default new ThemeManager();