#!/usr/bin/env node

/**
 * Build script for Mozilla Add-ons submission
 * Creates a clean, compliant build ready for submission
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

const SOURCE_DIR = path.resolve(__dirname, '..');
const BUILD_DIR = path.resolve(SOURCE_DIR, 'mozilla-build');

async function clean() {
  console.log('🧹 Cleaning build directory...');
  await fs.rm(BUILD_DIR, { recursive: true, force: true });
  await fs.mkdir(BUILD_DIR, { recursive: true });
}

async function copyFile(src, dest) {
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.copyFile(src, dest);
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

async function processBackgroundScript() {
  console.log('📝 Processing background script...');
  let content = await fs.readFile(path.join(SOURCE_DIR, 'background-firefox.js'), 'utf8');
  
  // Remove or wrap incompatible APIs
  content = content.replace(
    /browser\.runtime\.onSuspend\.addListener/g,
    'browser.runtime.onSuspend && browser.runtime.onSuspend.addListener'
  );
  
  await fs.writeFile(path.join(BUILD_DIR, 'background.js'), content);
}

async function processContentScript() {
  console.log('📝 Processing content script...');
  const content = await fs.readFile(path.join(SOURCE_DIR, 'content/content-firefox.js'), 'utf8');
  
  await fs.mkdir(path.join(BUILD_DIR, 'content'), { recursive: true });
  await fs.writeFile(path.join(BUILD_DIR, 'content/content-firefox.js'), content);
}

async function copyStaticAssets() {
  console.log('📁 Copying static assets...');
  
  // Copy manifest
  await copyFile(path.join(SOURCE_DIR, 'manifest.json'), path.join(BUILD_DIR, 'manifest.json'));
  
  // Copy icons
  await copyDir(path.join(SOURCE_DIR, 'icons'), path.join(BUILD_DIR, 'icons'));
  
  // Copy popup files
  await copyDir(path.join(SOURCE_DIR, 'popup'), path.join(BUILD_DIR, 'popup'));
  
  // Copy content styles and templates
  await copyFile(
    path.join(SOURCE_DIR, 'content/styles-modular.css'),
    path.join(BUILD_DIR, 'content/styles-modular.css')
  );
  await copyDir(
    path.join(SOURCE_DIR, 'content/templates'),
    path.join(BUILD_DIR, 'content/templates')
  );
  await copyDir(
    path.join(SOURCE_DIR, 'content/styles'),
    path.join(BUILD_DIR, 'content/styles')
  );
  
  // Copy components (needed by content script)
  await copyDir(
    path.join(SOURCE_DIR, 'content/components'),
    path.join(BUILD_DIR, 'content/components')
  );
  
  // Copy utils
  await copyDir(
    path.join(SOURCE_DIR, 'content/utils'),
    path.join(BUILD_DIR, 'content/utils')
  );
  
  // Copy src directory (needed by modular architecture)
  await copyDir(
    path.join(SOURCE_DIR, 'src'),
    path.join(BUILD_DIR, 'src')
  );
}

async function removeZoneIdentifiers() {
  console.log('🧹 Removing Zone.Identifier files...');
  
  async function removeInDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await removeInDir(fullPath);
      } else if (entry.name.endsWith('.Identifier')) {
        await fs.unlink(fullPath);
        console.log(`  Removed: ${entry.name}`);
      }
    }
  }
  
  await removeInDir(BUILD_DIR);
}

async function validateBuild() {
  console.log('✅ Validating build...');
  
  try {
    execSync(`npx web-ext lint --source-dir=${BUILD_DIR}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Validation failed!');
    process.exit(1);
  }
}

async function createPackage() {
  console.log('📦 Creating extension package...');
  
  try {
    execSync(`npx web-ext build --source-dir=${BUILD_DIR} --artifacts-dir=${SOURCE_DIR}/artifacts --overwrite-dest`, {
      stdio: 'inherit'
    });
    
    console.log('\n✅ Package created in artifacts/ directory');
  } catch (error) {
    console.error('❌ Package creation failed!');
    process.exit(1);
  }
}

async function main() {
  console.log('🚀 Building DeepWeb Firefox Extension for Mozilla submission...\n');
  
  try {
    await clean();
    await processBackgroundScript();
    await processContentScript();
    await copyStaticAssets();
    await removeZoneIdentifiers();
    await validateBuild();
    await createPackage();
    
    console.log('\n🎉 Build complete! Extension is ready for Mozilla submission.');
    console.log('📦 Package location: artifacts/');
    console.log('📝 Next steps:');
    console.log('   1. Test the extension from mozilla-build/ directory');
    console.log('   2. Submit the .zip file from artifacts/ to addons.mozilla.org');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

main();