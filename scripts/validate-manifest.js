#!/usr/bin/env node

/**
 * Validates the Firefox extension manifest.json file
 */

const fs = require('fs');
const path = require('path');

const MANIFEST_PATH = path.join(__dirname, '..', 'manifest.json');

function validateManifest() {
  try {
    // Read manifest
    const manifestContent = fs.readFileSync(MANIFEST_PATH, 'utf8');
    const manifest = JSON.parse(manifestContent);
    
    const errors = [];
    
    // Required fields
    if (!manifest.manifest_version) {
      errors.push('Missing required field: manifest_version');
    } else if (manifest.manifest_version !== 2) {
      errors.push('Firefox requires manifest_version: 2');
    }
    
    if (!manifest.name) {
      errors.push('Missing required field: name');
    }
    
    if (!manifest.version) {
      errors.push('Missing required field: version');
    } else if (!/^\d+\.\d+(\.\d+)?$/.test(manifest.version)) {
      errors.push('Invalid version format. Use x.y or x.y.z');
    }
    
    // Firefox specific
    if (!manifest.browser_specific_settings?.gecko?.id) {
      errors.push('Missing Firefox extension ID in browser_specific_settings.gecko.id');
    }
    
    // Permissions
    if (manifest.permissions) {
      const dangerousPerms = ['<all_urls>', 'http://*/*', 'https://*/*'];
      const hasDangerous = manifest.permissions.some(p => dangerousPerms.includes(p));
      if (hasDangerous && !manifest.content_scripts?.some(cs => cs.matches?.includes('<all_urls>'))) {
        errors.push('Avoid using overly broad permissions unless necessary');
      }
    }
    
    // Content Security Policy
    if (!manifest.content_security_policy) {
      errors.push('Missing content_security_policy for security');
    }
    
    // Icons
    if (!manifest.icons || Object.keys(manifest.icons).length === 0) {
      errors.push('Missing icons');
    } else {
      const requiredSizes = ['16', '48', '128'];
      requiredSizes.forEach(size => {
        if (!manifest.icons[size]) {
          errors.push(`Missing icon size: ${size}`);
        }
      });
    }
    
    // Background scripts
    if (manifest.background?.scripts) {
      manifest.background.scripts.forEach(script => {
        const scriptPath = path.join(__dirname, '..', script);
        if (!fs.existsSync(scriptPath)) {
          errors.push(`Background script not found: ${script}`);
        }
      });
    }
    
    // Content scripts
    if (manifest.content_scripts) {
      manifest.content_scripts.forEach((cs, index) => {
        if (!cs.matches || cs.matches.length === 0) {
          errors.push(`Content script ${index} missing matches pattern`);
        }
        if (!cs.js || cs.js.length === 0) {
          errors.push(`Content script ${index} missing js files`);
        }
      });
    }
    
    if (errors.length > 0) {
      console.error('Manifest validation failed:');
      errors.forEach(error => console.error(`  - ${error}`));
      process.exit(1);
    }
    
    console.log('✓ Manifest validation passed');
    process.exit(0);
    
  } catch (error) {
    console.error('Failed to validate manifest:', error.message);
    process.exit(1);
  }
}

validateManifest();