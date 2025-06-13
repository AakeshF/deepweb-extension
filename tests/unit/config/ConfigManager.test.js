/**
 * ConfigManager Test Suite
 */

import ConfigManager from '../../../src/config/ConfigManager.js';
import { DEFAULT_CONFIG } from '../../../src/config/config.default.js';

// Mock browser storage
global.browser = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn()
    }
  }
};

describe('ConfigManager', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset ConfigManager state
    ConfigManager._initialized = false;
    ConfigManager._config = null;
    ConfigManager._listeners.clear();
  });

  describe('initialization', () => {
    it('should initialize with default config when storage is empty', async () => {
      browser.storage.local.get.mockResolvedValue({});
      
      await ConfigManager.initialize();
      
      expect(ConfigManager._initialized).toBe(true);
      expect(ConfigManager._config).toEqual(DEFAULT_CONFIG);
      expect(browser.storage.local.set).toHaveBeenCalledWith({
        config: DEFAULT_CONFIG
      });
    });

    it('should load config from storage', async () => {
      const storedConfig = {
        version: '1.0.0',
        api: { timeout: 60000 }
      };
      
      browser.storage.local.get.mockResolvedValue({ config: storedConfig });
      
      await ConfigManager.initialize();
      
      expect(ConfigManager._config.api.timeout).toBe(60000);
    });

    it('should not initialize twice', async () => {
      browser.storage.local.get.mockResolvedValue({});
      
      await ConfigManager.initialize();
      await ConfigManager.initialize();
      
      expect(browser.storage.local.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('get', () => {
    beforeEach(async () => {
      browser.storage.local.get.mockResolvedValue({});
      await ConfigManager.initialize();
    });

    it('should get config value by path', () => {
      const value = ConfigManager.get('api.timeout');
      expect(value).toBe(30000);
    });

    it('should return default value for non-existent path', () => {
      const value = ConfigManager.get('non.existent.path', 'default');
      expect(value).toBe('default');
    });

    it('should handle nested paths', () => {
      const value = ConfigManager.get('api.providers.deepseek.endpoint');
      expect(value).toBe('https://api.deepseek.com/v1/chat/completions');
    });
  });

  describe('set', () => {
    beforeEach(async () => {
      browser.storage.local.get.mockResolvedValue({});
      await ConfigManager.initialize();
    });

    it('should set config value', async () => {
      const result = await ConfigManager.set('api.timeout', 60000);
      
      expect(result).toBe(true);
      expect(ConfigManager.get('api.timeout')).toBe(60000);
      expect(browser.storage.local.set).toHaveBeenCalled();
    });

    it('should reject invalid values', async () => {
      const result = await ConfigManager.set('api.timeout', -1000);
      
      expect(result).toBe(false);
      expect(ConfigManager.get('api.timeout')).toBe(30000); // Original value
    });

    it('should create nested paths', async () => {
      await ConfigManager.set('new.nested.value', 'test');
      
      expect(ConfigManager.get('new.nested.value')).toBe('test');
    });
  });

  describe('update', () => {
    beforeEach(async () => {
      browser.storage.local.get.mockResolvedValue({});
      await ConfigManager.initialize();
    });

    it('should update multiple values', async () => {
      const updates = {
        api: {
          timeout: 60000,
          retries: { max: 5 }
        }
      };
      
      const result = await ConfigManager.update(updates);
      
      expect(result).toBe(true);
      expect(ConfigManager.get('api.timeout')).toBe(60000);
      expect(ConfigManager.get('api.retries.max')).toBe(5);
    });

    it('should reject invalid updates', async () => {
      const updates = {
        api: { timeout: -1000 }
      };
      
      const result = await ConfigManager.update(updates);
      
      expect(result).toBe(false);
      expect(ConfigManager.get('api.timeout')).toBe(30000);
    });
  });

  describe('reset', () => {
    beforeEach(async () => {
      browser.storage.local.get.mockResolvedValue({});
      await ConfigManager.initialize();
    });

    it('should reset specific path to default', async () => {
      await ConfigManager.set('api.timeout', 60000);
      await ConfigManager.reset('api.timeout');
      
      expect(ConfigManager.get('api.timeout')).toBe(30000);
    });

    it('should reset entire config to defaults', async () => {
      await ConfigManager.set('api.timeout', 60000);
      await ConfigManager.reset();
      
      expect(ConfigManager.getAll()).toEqual(DEFAULT_CONFIG);
    });
  });

  describe('onChange', () => {
    beforeEach(async () => {
      browser.storage.local.get.mockResolvedValue({});
      await ConfigManager.initialize();
    });

    it('should notify listeners on change', async () => {
      const callback = jest.fn();
      ConfigManager.onChange('api.timeout', callback);
      
      await ConfigManager.set('api.timeout', 60000);
      
      expect(callback).toHaveBeenCalledWith(60000, 30000, 'api.timeout');
    });

    it('should notify wildcard listeners', async () => {
      const callback = jest.fn();
      ConfigManager.onChange('*', callback);
      
      await ConfigManager.set('api.timeout', 60000);
      
      expect(callback).toHaveBeenCalledWith(60000, 30000, 'api.timeout');
    });

    it('should handle unsubscribe', async () => {
      const callback = jest.fn();
      const unsubscribe = ConfigManager.onChange('api.timeout', callback);
      
      unsubscribe();
      await ConfigManager.set('api.timeout', 60000);
      
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('validateValue', () => {
    beforeEach(async () => {
      browser.storage.local.get.mockResolvedValue({});
      await ConfigManager.initialize();
    });

    it('should validate valid values', () => {
      const result = ConfigManager.validateValue('api.timeout', 60000);
      expect(result.valid).toBe(true);
    });

    it('should reject invalid values', () => {
      const result = ConfigManager.validateValue('api.timeout', -1000);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('export/import', () => {
    beforeEach(async () => {
      browser.storage.local.get.mockResolvedValue({});
      await ConfigManager.initialize();
    });

    it('should export configuration', () => {
      const exported = ConfigManager.export();
      
      expect(exported.version).toBe('1.0.0');
      expect(exported.timestamp).toBeDefined();
      expect(exported.config).toEqual(DEFAULT_CONFIG);
    });

    it('should import valid configuration', async () => {
      const importData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        config: {
          ...DEFAULT_CONFIG,
          api: { ...DEFAULT_CONFIG.api, timeout: 60000 }
        }
      };
      
      const result = await ConfigManager.import(importData);
      
      expect(result).toBe(true);
      expect(ConfigManager.get('api.timeout')).toBe(60000);
    });

    it('should reject invalid import', async () => {
      const importData = {
        version: '1.0.0',
        config: {
          api: { timeout: -1000 }
        }
      };
      
      const result = await ConfigManager.import(importData);
      
      expect(result).toBe(false);
    });
  });
});