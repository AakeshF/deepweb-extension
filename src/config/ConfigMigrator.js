/**
 * Configuration Migrator
 * Handles migration of configuration between versions
 */

export class ConfigMigrator {
  constructor() {
    // Define migration functions for each version
    this.migrations = {
      '0.9.0': this._migrateFrom090,
      '0.9.5': this._migrateFrom095
    };
  }

  /**
   * Migrate configuration to latest version
   * @param {Object} config - Configuration to migrate
   * @returns {Promise<Object>} Migrated configuration
   */
  async migrate(config) {
    if (!config || !config.version) {
      console.log('[ConfigMigrator] No version found, assuming fresh install');
      return config;
    }

    const currentVersion = config.version;
    const migrations = this._getMigrationsNeeded(currentVersion);
    
    if (migrations.length === 0) {
      console.log('[ConfigMigrator] Configuration is up to date');
      return config;
    }

    console.log(`[ConfigMigrator] Migrating from ${currentVersion} through ${migrations.length} versions`);
    
    let migratedConfig = { ...config };
    
    for (const version of migrations) {
      console.log(`[ConfigMigrator] Applying migration for ${version}`);
      const migrationFn = this.migrations[version];
      if (migrationFn) {
        migratedConfig = await migrationFn.call(this, migratedConfig);
        migratedConfig.version = version;
      }
    }

    // Set to current version
    migratedConfig.version = '1.0.0';
    
    console.log('[ConfigMigrator] Migration complete');
    return migratedConfig;
  }

  /**
   * Get list of migrations needed
   * @private
   */
  _getMigrationsNeeded(fromVersion) {
    const versions = Object.keys(this.migrations).sort(this._compareVersions);
    const migrations = [];
    
    for (const version of versions) {
      if (this._compareVersions(fromVersion, version) < 0) {
        migrations.push(version);
      }
    }
    
    return migrations;
  }

  /**
   * Compare version strings
   * @private
   */
  _compareVersions(a, b) {
    const partsA = a.split('.').map(Number);
    const partsB = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
      const partA = partsA[i] || 0;
      const partB = partsB[i] || 0;
      
      if (partA < partB) return -1;
      if (partA > partB) return 1;
    }
    
    return 0;
  }

  /**
   * Migration from 0.9.0 to 0.9.5
   * @private
   */
  async _migrateFrom090(config) {
    const migrated = { ...config };
    
    // Migrate API configuration
    if (config.api && !config.api.providers) {
      migrated.api = {
        providers: {
          deepseek: {
            endpoint: config.api.endpoint || 'https://api.deepseek.com/v1/chat/completions',
            models: {
              'deepseek-chat': {
                name: 'DeepSeek Chat',
                description: 'General purpose conversations',
                maxTokens: 4000,
                temperature: 0.7
              }
            }
          }
        },
        timeout: config.api.timeout || 30000,
        retries: {
          max: config.api.maxRetries || 3,
          delay: 1000,
          backoff: 2
        }
      };
    }
    
    // Migrate rate limiting
    if (config.rateLimit) {
      migrated.api.rateLimit = {
        interval: config.rateLimit.minInterval || 10000,
        maxPerHour: config.rateLimit.maxRequestsPerHour || 100,
        maxPerDay: 1000
      };
      delete migrated.rateLimit;
    }
    
    return migrated;
  }

  /**
   * Migration from 0.9.5 to 1.0.0
   * @private
   */
  async _migrateFrom095(config) {
    const migrated = { ...config };
    
    // Add new features configuration
    if (!migrated.features) {
      migrated.features = {
        streaming: { enabled: true, chunkSize: 1024 },
        conversations: { maxHistory: 100, autoSave: true },
        export: { formats: ['json', 'markdown'], includeMetadata: true }
      };
    }
    
    // Add security configuration
    if (!migrated.security) {
      migrated.security = {
        apiKeyValidation: {
          minLength: 20,
          maxLength: 200,
          pattern: '^sk-[a-zA-Z0-9]+$',
          required: true
        },
        contentSecurity: {
          maxInputLength: migrated.content?.maxMessageLength || 1000,
          sanitizeHtml: true
        }
      };
    }
    
    // Migrate UI settings
    if (migrated.ui && !migrated.ui.themes) {
      migrated.ui.themes = {
        light: {
          name: 'Light',
          colors: {
            primary: '#667eea',
            secondary: '#764ba2',
            background: '#ffffff',
            surface: '#f8f9fa',
            text: {
              primary: '#333333',
              secondary: '#666666',
              disabled: '#999999'
            }
          }
        }
      };
    }
    
    return migrated;
  }

  /**
   * Create backup of configuration before migration
   * @param {Object} config - Configuration to backup
   * @returns {Promise<void>}
   */
  async createBackup(config) {
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        version: config.version,
        config: config
      };
      
      await browser.storage.local.set({
        [`config_backup_${Date.now()}`]: backup
      });
      
      console.log('[ConfigMigrator] Backup created');
    } catch (error) {
      console.error('[ConfigMigrator] Failed to create backup:', error);
    }
  }

  /**
   * Restore configuration from backup
   * @param {string} backupKey - Backup key to restore
   * @returns {Promise<Object>} Restored configuration
   */
  async restoreBackup(backupKey) {
    try {
      const result = await browser.storage.local.get(backupKey);
      const backup = result[backupKey];
      
      if (!backup || !backup.config) {
        throw new Error('Invalid backup');
      }
      
      console.log(`[ConfigMigrator] Restored backup from ${backup.timestamp}`);
      return backup.config;
      
    } catch (error) {
      console.error('[ConfigMigrator] Failed to restore backup:', error);
      throw error;
    }
  }

  /**
   * List available backups
   * @returns {Promise<Array>} List of backups
   */
  async listBackups() {
    try {
      const storage = await browser.storage.local.get();
      const backups = [];
      
      Object.keys(storage).forEach(key => {
        if (key.startsWith('config_backup_')) {
          const backup = storage[key];
          backups.push({
            key: key,
            timestamp: backup.timestamp,
            version: backup.version
          });
        }
      });
      
      return backups.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );
      
    } catch (error) {
      console.error('[ConfigMigrator] Failed to list backups:', error);
      return [];
    }
  }

  /**
   * Clean old backups
   * @param {number} maxAge - Maximum age in days
   * @returns {Promise<number>} Number of backups deleted
   */
  async cleanOldBackups(maxAge = 30) {
    try {
      const backups = await this.listBackups();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);
      
      const toDelete = backups.filter(backup => 
        new Date(backup.timestamp) < cutoffDate
      );
      
      if (toDelete.length > 0) {
        const keys = toDelete.map(b => b.key);
        await browser.storage.local.remove(keys);
        console.log(`[ConfigMigrator] Deleted ${toDelete.length} old backups`);
      }
      
      return toDelete.length;
      
    } catch (error) {
      console.error('[ConfigMigrator] Failed to clean backups:', error);
      return 0;
    }
  }
}