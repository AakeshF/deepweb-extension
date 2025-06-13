/**
 * Firefox Popup Script with Unified Configuration
 * Manages extension settings and UI
 */

import { ConfigManager, getConfig, setConfig } from '../src/config/index.js';

// Initialize configuration
async function initializePopup() {
  try {
    await ConfigManager.initialize();
    console.log('[DeepWeb Popup] Configuration initialized');
    
    // Load current settings
    await loadSettings();
    
    // Setup UI
    setupEventListeners();
    
  } catch (error) {
    console.error('[DeepWeb Popup] Initialization error:', error);
    showError('Failed to initialize settings');
  }
}

// Load settings from storage and config
async function loadSettings() {
  try {
    // Get API key from storage
    const { apiKey } = await browser.storage.local.get('apiKey');
    const apiKeyInput = document.getElementById('apiKey');
    
    if (apiKey) {
      apiKeyInput.value = apiKey;
      updateApiKeyStatus(true);
    } else {
      updateApiKeyStatus(false);
    }
    
    // Load model selection
    const defaultModel = getConfig('defaults.model');
    const modelSelect = document.getElementById('model');
    modelSelect.value = defaultModel;
    
    // Load theme
    const theme = getConfig('defaults.theme');
    const themeSelect = document.getElementById('theme');
    themeSelect.value = theme;
    
    // Load other settings
    document.getElementById('streamingEnabled').checked = getConfig('features.streaming.enabled');
    document.getElementById('autoSave').checked = getConfig('features.conversations.autoSave');
    document.getElementById('contextExtraction').checked = getConfig('features.contextExtraction.enabled');
    document.getElementById('animationsEnabled').checked = getConfig('ui.animations.enabled');
    
    // Show version
    document.getElementById('version').textContent = browser.runtime.getManifest().version;
    
  } catch (error) {
    console.error('[DeepWeb Popup] Error loading settings:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // API Key handling
  const apiKeyInput = document.getElementById('apiKey');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  
  saveApiKeyBtn.addEventListener('click', saveApiKey);
  apiKeyInput.addEventListener('input', () => {
    const isValid = validateApiKeyFormat(apiKeyInput.value);
    saveApiKeyBtn.disabled = !isValid;
    updateApiKeyStatus(isValid && apiKeyInput.value.length > 0);
  });
  
  // Model selection
  const modelSelect = document.getElementById('model');
  modelSelect.addEventListener('change', async () => {
    await setConfig('defaults.model', modelSelect.value);
    showSuccess('Default model updated');
  });
  
  // Theme selection
  const themeSelect = document.getElementById('theme');
  themeSelect.addEventListener('change', async () => {
    await setConfig('defaults.theme', themeSelect.value);
    showSuccess('Theme preference saved');
  });
  
  // Feature toggles
  document.getElementById('streamingEnabled').addEventListener('change', async (e) => {
    await setConfig('features.streaming.enabled', e.target.checked);
    showSuccess('Streaming setting updated');
  });
  
  document.getElementById('autoSave').addEventListener('change', async (e) => {
    await setConfig('features.conversations.autoSave', e.target.checked);
    showSuccess('Auto-save setting updated');
  });
  
  document.getElementById('contextExtraction').addEventListener('change', async (e) => {
    await setConfig('features.contextExtraction.enabled', e.target.checked);
    showSuccess('Context extraction setting updated');
  });
  
  document.getElementById('animationsEnabled').addEventListener('change', async (e) => {
    await setConfig('ui.animations.enabled', e.target.checked);
    showSuccess('Animation setting updated');
  });
  
  // Action buttons
  document.getElementById('clearHistory').addEventListener('click', clearHistory);
  document.getElementById('exportSettings').addEventListener('click', exportSettings);
  document.getElementById('importSettings').addEventListener('click', () => {
    document.getElementById('importFile').click();
  });
  document.getElementById('importFile').addEventListener('change', importSettings);
  document.getElementById('resetSettings').addEventListener('click', resetSettings);
  
  // Links
  document.getElementById('helpLink').addEventListener('click', (e) => {
    e.preventDefault();
    browser.tabs.create({ url: 'https://github.com/yourusername/deepweb-extension/wiki' });
  });
  
  document.getElementById('privacyLink').addEventListener('click', (e) => {
    e.preventDefault();
    browser.tabs.create({ url: 'https://github.com/yourusername/deepweb-extension/blob/main/PRIVACY.md' });
  });
}

// Validate API key format
function validateApiKeyFormat(apiKey) {
  if (!apiKey) return false;
  
  const validation = getConfig('security.apiKeyValidation');
  const pattern = new RegExp(validation.pattern);
  
  return apiKey.length >= validation.minLength && 
         apiKey.length <= validation.maxLength &&
         pattern.test(apiKey);
}

// Save API key
async function saveApiKey() {
  const apiKeyInput = document.getElementById('apiKey');
  const apiKey = apiKeyInput.value.trim();
  
  if (!validateApiKeyFormat(apiKey)) {
    showError('Invalid API key format');
    return;
  }
  
  try {
    await browser.storage.local.set({ apiKey });
    updateApiKeyStatus(true);
    showSuccess('API key saved successfully');
  } catch (error) {
    console.error('[DeepWeb Popup] Error saving API key:', error);
    showError('Failed to save API key');
  }
}

// Update API key status display
function updateApiKeyStatus(isValid) {
  const statusElement = document.getElementById('apiKeyStatus');
  const statusIcon = statusElement.querySelector('.status-icon');
  const statusText = statusElement.querySelector('.status-text');
  
  if (isValid) {
    statusIcon.textContent = '✓';
    statusIcon.style.color = '#10b981';
    statusText.textContent = 'API key configured';
    statusText.style.color = '#10b981';
  } else {
    statusIcon.textContent = '✗';
    statusIcon.style.color = '#ef4444';
    statusText.textContent = 'API key required';
    statusText.style.color = '#ef4444';
  }
}

// Clear chat history
async function clearHistory() {
  if (!confirm('Are you sure you want to clear all chat history?')) {
    return;
  }
  
  try {
    // Send message to background script to clear history
    await browser.runtime.sendMessage({ type: 'clear_history' });
    showSuccess('Chat history cleared');
  } catch (error) {
    console.error('[DeepWeb Popup] Error clearing history:', error);
    showError('Failed to clear history');
  }
}

// Export settings
async function exportSettings() {
  try {
    const config = ConfigManager.export();
    const { apiKey } = await browser.storage.local.get('apiKey');
    
    const exportData = {
      ...config,
      // Don't export the actual API key for security
      hasApiKey: !!apiKey
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepweb-settings-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    showSuccess('Settings exported');
    
  } catch (error) {
    console.error('[DeepWeb Popup] Error exporting settings:', error);
    showError('Failed to export settings');
  }
}

// Import settings
async function importSettings(event) {
  const file = event.target.files[0];
  if (!file) return;
  
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    
    if (!data.config || !data.version) {
      throw new Error('Invalid settings file');
    }
    
    const success = await ConfigManager.import(data);
    if (success) {
      await loadSettings(); // Reload UI
      showSuccess('Settings imported successfully');
    } else {
      showError('Failed to import settings - invalid configuration');
    }
    
  } catch (error) {
    console.error('[DeepWeb Popup] Error importing settings:', error);
    showError('Failed to import settings - invalid file format');
  }
  
  // Clear the file input
  event.target.value = '';
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults? This cannot be undone.')) {
    return;
  }
  
  try {
    await ConfigManager.reset();
    await loadSettings(); // Reload UI
    showSuccess('Settings reset to defaults');
  } catch (error) {
    console.error('[DeepWeb Popup] Error resetting settings:', error);
    showError('Failed to reset settings');
  }
}

// Show success message
function showSuccess(message) {
  showNotification(message, 'success');
}

// Show error message
function showError(message) {
  showNotification(message, 'error');
}

// Show notification
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification ${type}`;
  notification.style.display = 'block';
  
  setTimeout(() => {
    notification.style.display = 'none';
  }, 3000);
}

// Initialize popup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}