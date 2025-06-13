/**
 * Build script for unified configuration version
 */

const fs = require('fs').promises;
const path = require('path');

async function buildUnified() {
  console.log('Building unified configuration version...');

  try {
    // Create build directory
    const buildDir = path.join(__dirname, '../build-unified');
    await fs.mkdir(buildDir, { recursive: true });

    // Files to copy with renaming
    const filesToCopy = [
      'manifest.json',
      'background-firefox-unified.js:background-firefox.js',
      'popup/popup.html',
      'popup/popup-firefox-unified.js:popup/popup-firefox.js',
      'content/content-firefox-modular.js:content/content-firefox.js',
      'content/styles-modular.css:content/styles-secure.css'
    ];

    // Copy individual files
    for (const file of filesToCopy) {
      const [src, dest = src] = file.split(':');
      const srcPath = path.join(__dirname, '..', src);
      const destPath = path.join(buildDir, dest);
      
      // Create destination directory
      await fs.mkdir(path.dirname(destPath), { recursive: true });
      
      // Copy file
      await fs.copyFile(srcPath, destPath);
      console.log(`Copied ${src} -> ${dest}`);
    }

    // Directories to copy
    const dirsToCopy = [
      'icons',
      'src/config',
      'content/templates',
      'content/components', 
      'content/utils'
    ];

    for (const dir of dirsToCopy) {
      const srcDir = path.join(__dirname, '..', dir);
      const destDir = path.join(buildDir, dir);
      
      await copyDirectory(srcDir, destDir);
      console.log(`Copied directory ${dir}`);
    }

    // Update manifest for web_accessible_resources
    const manifestPath = path.join(buildDir, 'manifest.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    
    // Add web accessible resources for modules
    manifest.web_accessible_resources = [
      "content/templates/*.html",
      "content/components/*.js",
      "content/utils/*.js",
      "src/config/*.js"
    ];
    
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    console.log('Updated manifest.json');

    // Create a README for the build
    const readme = `# DeepWeb Extension - Unified Configuration Build

This build includes:
- Modular content script architecture
- Unified configuration system
- Enhanced security and performance

## Features
- Single source of truth for all configuration
- Automatic validation and migration
- Real-time configuration updates
- Import/export settings
- Comprehensive error handling

## Installation
1. Open Firefox
2. Navigate to about:debugging
3. Click "This Firefox"
4. Click "Load Temporary Add-on"
5. Select any file in this directory

## Configuration
The extension now uses a unified configuration system located in src/config/
- ConfigManager: Main configuration interface
- config.default.js: Default settings
- config.schema.js: Validation schema
- ConfigValidator: Validation logic
- ConfigMigrator: Version migration

Built on: ${new Date().toISOString()}
`;

    await fs.writeFile(path.join(buildDir, 'README.md'), readme);

    console.log('\nBuild completed successfully!');
    console.log(`Output directory: ${buildDir}`);

  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Run build
buildUnified();