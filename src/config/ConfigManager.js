/**
 * Unified Configuration Manager
 * Single source of truth for all application settings
 */

import { DEFAULT_CONFIG } from './config.default.js';
import { CONFIG_SCHEMA } from './config.schema.js';
import { ConfigValidator } from './ConfigValidator.js';
import { ConfigMigrator } from './ConfigMigrator.js';

class ConfigManager {
  constructor() {
    this._config = null;
    this._validator = new ConfigValidator(CONFIG_SCHEMA);
    this._migrator = new ConfigMigrator();
    this._listeners = new Map();
    this._initialized = false;
  }

  /**
   * Initialize configuration manager
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this._initialized) return;

    try {
      // Load configuration from storage
      const stored = await this._loadFromStorage();
      
      // Migrate if needed
      const migrated = await this._migrator.migrate(stored);
      
      // Merge with defaults
      this._config = this._mergeWithDefaults(migrated);
      
      // Validate configuration
      const validation = this._validator.validate(this._config);
      if (!validation.valid) {
        console.error('[ConfigManager] Validation errors:', validation.errors);
        // Use defaults for invalid config
        this._config = { ...DEFAULT_CONFIG };
      }
      
      // Save validated config
      await this._saveToStorage();
      
      this._initialized = true;
      console.log('[ConfigManager] Initialized successfully');
      
    } catch (error) {
      console.error('[ConfigManager] Initialization error:', error);
      this._config = { ...DEFAULT_CONFIG };
      this._initialized = true;
    }
  }

  /**
   * Get configuration value
   * @param {string} path - Dot notation path (e.g., 'api.timeout')
   * @param {*} defaultValue - Default value if path not found
   * @returns {*}
   */
  get(path, defaultValue = undefined) {
    if (!this._initialized) {
      console.warn('[ConfigManager] Not initialized, using defaults');
      return this._getFromObject(DEFAULT_CONFIG, path, defaultValue);
    }
    
    return this._getFromObject(this._config, path, defaultValue);
  }

  /**
   * Set configuration value
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   * @returns {Promise<boolean>} Success status
   */
  async set(path, value) {
    if (!this._initialized) {
      await this.initialize();
    }

    const oldValue = this.get(path);
    
    // Set the value
    this._setInObject(this._config, path, value);
    
    // Validate entire config
    const validation = this._validator.validate(this._config);
    if (!validation.valid) {
      // Revert on validation failure
      this._setInObject(this._config, path, oldValue);
      console.error('[ConfigManager] Validation failed:', validation.errors);
      return false;
    }
    
    // Save to storage
    await this._saveToStorage();
    
    // Notify listeners
    this._notifyListeners(path, value, oldValue);
    
    return true;
  }

  /**
   * Get entire configuration object
   * @returns {Object}
   */
  getAll() {
    if (!this._initialized) {
      return { ...DEFAULT_CONFIG };
    }
    return { ...this._config };
  }

  /**
   * Update multiple configuration values
   * @param {Object} updates - Object with configuration updates
   * @returns {Promise<boolean>} Success status
   */
  async update(updates) {
    if (!this._initialized) {
      await this.initialize();
    }

    const oldConfig = { ...this._config };
    
    // Apply updates
    this._config = this._deepMerge(this._config, updates);
    
    // Validate
    const validation = this._validator.validate(this._config);
    if (!validation.valid) {
      // Revert on validation failure
      this._config = oldConfig;
      console.error('[ConfigManager] Validation failed:', validation.errors);
      return false;
    }
    
    // Save to storage
    await this._saveToStorage();
    
    // Notify listeners for all changed paths
    this._notifyChanges(oldConfig, this._config);
    
    return true;
  }

  /**
   * Reset configuration to defaults
   * @param {string} path - Optional path to reset (resets all if not provided)
   * @returns {Promise<void>}
   */
  async reset(path = null) {
    if (path) {
      const defaultValue = this._getFromObject(DEFAULT_CONFIG, path);
      await this.set(path, defaultValue);
    } else {
      this._config = { ...DEFAULT_CONFIG };
      await this._saveToStorage();
      this._notifyListeners('*', this._config, {});
    }
  }

  /**
   * Listen for configuration changes
   * @param {string} path - Path to watch (use '*' for all changes)
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  onChange(path, callback) {
    if (!this._listeners.has(path)) {
      this._listeners.set(path, new Set());
    }
    
    this._listeners.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      const listeners = this._listeners.get(path);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this._listeners.delete(path);
        }
      }
    };
  }

  /**
   * Validate a configuration value
   * @param {string} path - Configuration path
   * @param {*} value - Value to validate
   * @returns {Object} Validation result
   */
  validateValue(path, value) {
    return this._validator.validatePath(path, value);
  }

  /**
   * Get configuration schema
   * @returns {Object}
   */
  getSchema() {
    return CONFIG_SCHEMA;
  }

  /**
   * Export configuration
   * @returns {Object}
   */
  export() {
    return {
      version: this._config.version || DEFAULT_CONFIG.version,
      timestamp: new Date().toISOString(),
      config: this.getAll()
    };
  }

  /**
   * Import configuration
   * @param {Object} data - Configuration data to import
   * @returns {Promise<boolean>} Success status
   */
  async import(data) {
    try {
      const { config } = data;
      
      // Validate imported config
      const validation = this._validator.validate(config);
      if (!validation.valid) {
        console.error('[ConfigManager] Import validation failed:', validation.errors);
        return false;
      }
      
      // Apply import
      this._config = this._mergeWithDefaults(config);
      await this._saveToStorage();
      
      // Notify all listeners
      this._notifyListeners('*', this._config, {});
      
      return true;
      
    } catch (error) {
      console.error('[ConfigManager] Import error:', error);
      return false;
    }
  }

  // Private methods

  async _loadFromStorage() {
    try {
      const result = await browser.storage.local.get('config');
      return result.config || {};
    } catch (error) {
      console.error('[ConfigManager] Storage load error:', error);
      return {};
    }
  }

  async _saveToStorage() {
    try {
      await browser.storage.local.set({ config: this._config });
    } catch (error) {
      console.error('[ConfigManager] Storage save error:', error);
    }
  }

  _mergeWithDefaults(config) {
    return this._deepMerge(DEFAULT_CONFIG, config);
  }

  _deepMerge(target, source) {
    const output = { ...target };
    
    for (const key in source) {
      if (source.hasOwnProperty(key)) {
        if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
          output[key] = this._deepMerge(target[key] || {}, source[key]);
        } else {
          output[key] = source[key];
        }
      }
    }
    
    return output;
  }

  _getFromObject(obj, path, defaultValue) {
    const keys = path.split('.');
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return defaultValue;
      }
    }
    
    return current;
  }

  _setInObject(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || typeof current[key] !== 'object') {
        current[key] = {};
      }
      current = current[key];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  _notifyListeners(path, newValue, oldValue) {
    // Notify exact path listeners
    const exactListeners = this._listeners.get(path);
    if (exactListeners) {
      exactListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('[ConfigManager] Listener error:', error);
        }
      });
    }
    
    // Notify wildcard listeners
    const wildcardListeners = this._listeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => {
        try {
          callback(newValue, oldValue, path);
        } catch (error) {
          console.error('[ConfigManager] Wildcard listener error:', error);
        }
      });
    }
    
    // Notify parent path listeners
    const pathParts = path.split('.');
    for (let i = pathParts.length - 1; i > 0; i--) {
      const parentPath = pathParts.slice(0, i).join('.');
      const parentListeners = this._listeners.get(parentPath);
      if (parentListeners) {
        parentListeners.forEach(callback => {
          try {
            callback(this.get(parentPath), oldValue, path);
          } catch (error) {
            console.error('[ConfigManager] Parent listener error:', error);
          }
        });
      }
    }
  }

  _notifyChanges(oldConfig, newConfig, basePath = '') {
    const allKeys = new Set([
      ...Object.keys(oldConfig),
      ...Object.keys(newConfig)
    ]);
    
    allKeys.forEach(key => {
      const path = basePath ? `${basePath}.${key}` : key;
      const oldValue = oldConfig[key];
      const newValue = newConfig[key];
      
      if (typeof oldValue === 'object' && typeof newValue === 'object' && !Array.isArray(oldValue)) {
        this._notifyChanges(oldValue || {}, newValue || {}, path);
      } else if (oldValue !== newValue) {
        this._notifyListeners(path, newValue, oldValue);
      }
    });
  }
}

// Export singleton instance
export default new ConfigManager();