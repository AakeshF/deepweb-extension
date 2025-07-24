/**
 * Configuration Module
 * Exports unified configuration system
 */

export { default as ConfigManager } from './ConfigManager.js';
export { DEFAULT_CONFIG } from './config.default.js';
export { CONFIG_SCHEMA } from './config.schema.js';
export { ConfigValidator } from './ConfigValidator.js';
export { ConfigMigrator } from './ConfigMigrator.js';

// Re-export commonly used functions from ConfigManager
import ConfigManager from './ConfigManager.js';

export const getConfig = (path, defaultValue) => ConfigManager.get(path, defaultValue);
export const setConfig = (path, value) => ConfigManager.set(path, value);
export const updateConfig = (updates) => ConfigManager.update(updates);
export const onConfigChange = (path, callback) => ConfigManager.onChange(path, callback);
export const validateConfig = (path, value) => ConfigManager.validateValue(path, value);