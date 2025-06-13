/**
 * Configuration Migration Script
 * Updates existing files to use unified configuration
 */

const fs = require('fs').promises;
const path = require('path');

async function migrateConfig() {
  console.log('Starting configuration migration...');
  
  try {
    // Create src directory structure
    const srcDir = path.join(__dirname, '../src');
    await fs.mkdir(srcDir, { recursive: true });
    
    // Move config directory to src
    const configSource = path.join(__dirname, '../src/config');
    const configExists = await fs.access(configSource).then(() => true).catch(() => false);
    
    if (!configExists) {
      console.error('Config directory not found at:', configSource);
      return;
    }
    
    // Update imports in existing files
    const filesToUpdate = [
      {
        file: 'background-firefox.js',
        replacements: [
          {
            from: /const CONFIG = {[\s\S]*?};/,
            to: "import { ConfigManager, getConfig } from './src/config/index.js';\n\n// Configuration is now managed by ConfigManager"
          }
        ]
      },
      {
        file: 'popup/popup-firefox.js',
        replacements: [
          {
            from: /const DEFAULT_SETTINGS = {[\s\S]*?};/,
            to: "import { ConfigManager, getConfig, setConfig } from '../src/config/index.js';"
          }
        ]
      }
    ];
    
    for (const update of filesToUpdate) {
      const filePath = path.join(__dirname, '..', update.file);
      
      try {
        let content = await fs.readFile(filePath, 'utf8');
        
        for (const replacement of update.replacements) {
          content = content.replace(replacement.from, replacement.to);
        }
        
        // Create backup
        await fs.writeFile(`${filePath}.backup`, await fs.readFile(filePath, 'utf8'));
        
        // Write updated content
        await fs.writeFile(filePath, content);
        
        console.log(`✓ Updated ${update.file}`);
      } catch (error) {
        console.error(`✗ Failed to update ${update.file}:`, error.message);
      }
    }
    
    // Create a migration guide
    const migrationGuide = `# Configuration Migration Guide

## Overview
The DeepWeb extension has been updated to use a unified configuration system.

## Changes Made

### 1. Configuration Structure
- All configuration is now centralized in \`src/config/\`
- Single source of truth for all settings
- Automatic validation and migration

### 2. File Updates
- \`background-firefox.js\` - Now uses ConfigManager
- \`popup/popup-firefox.js\` - Now uses ConfigManager
- Removed duplicate configuration definitions

### 3. New Features
- Configuration validation
- Settings import/export
- Configuration versioning and migration
- Real-time configuration updates

## Usage

### Getting Configuration Values
\`\`\`javascript
import { getConfig } from './src/config/index.js';

const timeout = getConfig('api.timeout');
const model = getConfig('defaults.model');
\`\`\`

### Setting Configuration Values
\`\`\`javascript
import { setConfig } from './src/config/index.js';

await setConfig('api.timeout', 60000);
await setConfig('defaults.theme', 'dark');
\`\`\`

### Listening for Changes
\`\`\`javascript
import { ConfigManager } from './src/config/index.js';

const unsubscribe = ConfigManager.onChange('api.timeout', (newValue, oldValue) => {
  console.log('Timeout changed from', oldValue, 'to', newValue);
});
\`\`\`

## Benefits
1. **Consistency** - No more configuration duplication
2. **Validation** - All settings are validated against schema
3. **Migration** - Automatic updates between versions
4. **Type Safety** - Clear schema definitions
5. **Performance** - Efficient configuration access

## Testing
Run the configuration tests:
\`\`\`bash
npm test tests/unit/config/
\`\`\`

## Rollback
If needed, restore from backups:
- \`background-firefox.js.backup\`
- \`popup/popup-firefox.js.backup\`
`;
    
    await fs.writeFile(
      path.join(__dirname, '../docs/CONFIGURATION_MIGRATION.md'),
      migrationGuide
    );
    
    console.log('\n✓ Migration completed successfully!');
    console.log('✓ Created migration guide at docs/CONFIGURATION_MIGRATION.md');
    console.log('\nNext steps:');
    console.log('1. Review the changes in background-firefox.js and popup/popup-firefox.js');
    console.log('2. Test the extension with the new configuration system');
    console.log('3. Run the configuration tests: npm test tests/unit/config/');
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateConfig();