/**
 * Build script for modular content script
 * Handles template bundling and module preparation
 */

const fs = require('fs').promises;
const path = require('path');

async function buildModular() {
  console.log('Building modular extension...');

  try {
    // Create build directory
    const buildDir = path.join(__dirname, '../build-modular');
    await fs.mkdir(buildDir, { recursive: true });

    // Copy static files
    const filesToCopy = [
      'manifest-modular.json:manifest.json',
      'background-firefox.js',
      'config.js',
      'popup/popup.html',
      'popup/popup-firefox.js',
      'content/content-firefox-modular.js:content/content-firefox.js',
      'content/styles-modular.css:content/styles-secure.css'
    ];

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

    // Copy directories
    const dirsToCopy = [
      'icons',
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

    console.log('Build completed successfully!');
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
buildModular();