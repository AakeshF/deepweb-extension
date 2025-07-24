/**
 * Secure Popup Script for DeepWeb Firefox Extension
 * Handles settings and API key management with enhanced security
 */

(async function() {
    'use strict';
    
    console.log('[DeepWeb] Secure popup initialized');
    
    // Inline security implementations for Firefox compatibility
    class APIKeySecurity {
      constructor() {
        this.STORAGE_PREFIX = 'encrypted_api_key_';
        this.SALT_KEY = 'api_key_salt';
        this.salt = null;
      }

      async initializeSalt() {
        const stored = await browser.storage.local.get(this.SALT_KEY);
        if (stored[this.SALT_KEY]) {
          this.salt = new Uint8Array(stored[this.SALT_KEY]);
        } else {
          this.salt = crypto.getRandomValues(new Uint8Array(16));
          await browser.storage.local.set({
            [this.SALT_KEY]: Array.from(this.salt)
          });
        }
      }

      async deriveKey(salt) {
        const encoder = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
          'raw',
          encoder.encode('deepweb-extension-key'),
          { name: 'PBKDF2' },
          false,
          ['deriveKey']
        );

        return crypto.subtle.deriveKey(
          {
            name: 'PBKDF2',
            salt: salt,
            iterations: 100000,
            hash: 'SHA-256'
          },
          keyMaterial,
          { name: 'AES-GCM', length: 256 },
          false,
          ['encrypt', 'decrypt']
        );
      }

      async encryptAPIKey(apiKey) {
        if (!this.salt) throw new Error('Salt not initialized');
        
        const encoder = new TextEncoder();
        const data = encoder.encode(apiKey);
        
        const key = await this.deriveKey(this.salt);
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv },
          key,
          data
        );
        
        return {
          encrypted: Array.from(new Uint8Array(encrypted)),
          iv: Array.from(iv)
        };
      }

      async decryptAPIKey(encryptedData) {
        if (!this.salt) throw new Error('Salt not initialized');
        
        const key = await this.deriveKey(this.salt);
        
        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv: new Uint8Array(encryptedData.iv) },
          key,
          new Uint8Array(encryptedData.encrypted)
        );
        
        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
      }

      async storeAPIKey(provider, apiKey) {
        const encrypted = await this.encryptAPIKey(apiKey);
        await browser.storage.local.set({
          [this.STORAGE_PREFIX + provider]: encrypted
        });
      }

      async getAPIKey(provider) {
        const stored = await browser.storage.local.get(this.STORAGE_PREFIX + provider);
        const encryptedData = stored[this.STORAGE_PREFIX + provider];
        
        if (!encryptedData) return null;
        
        try {
          return await this.decryptAPIKey(encryptedData);
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
          return null;
        }
      }

      async removeAPIKey(provider) {
        await browser.storage.local.remove(this.STORAGE_PREFIX + provider);
      }

      validateAPIKeyFormat(apiKey) {
        if (!apiKey || typeof apiKey !== 'string') return false;
        const trimmed = apiKey.trim();
        
        // Basic validation for common API key formats
        if (trimmed.startsWith('sk-') && trimmed.length >= 20 && trimmed.length <= 200) {
          return true;
        }
        
        // OpenAI format
        if (trimmed.startsWith('sk-') && trimmed.length === 51) {
          return true;
        }
        
        // Anthropic format
        if (trimmed.startsWith('sk-ant-') && trimmed.length >= 40) {
          return true;
        }
        
        return false;
      }
    }
    
    class DOMSecurity {
      static setTextContent(element, text) {
        if (element && element.textContent !== undefined) {
          element.textContent = text;
        }
      }
      
      static addEventListener(element, event, handler, options = {}) {
        if (element && typeof handler === 'function') {
          element.addEventListener(event, handler, options);
        }
      }
    }
    
    // Initialize security
    const apiKeySecurity = new APIKeySecurity();
    await apiKeySecurity.initializeSalt();
    
    // Default settings
    const DEFAULT_SETTINGS = {
        temperature: 0.7,
        maxTokens: 1000,
        theme: 'light',
        fontSize: 'medium',
        layout: 'corner',
        streamResponses: true,
        chatState: 'normal'
    };

    async function loadSettings() {
        try {
            // Load non-sensitive settings
            const settings = await browser.storage.sync.get(DEFAULT_SETTINGS);
            
            // Load encrypted API keys
            const openaiKey = await apiKeySecurity.getAPIKey('openai') || '';
            const anthropicKey = await apiKeySecurity.getAPIKey('anthropic') || '';
            const deepseekKey = await apiKeySecurity.getAPIKey('deepseek') || '';
            
            // Update UI safely
            const openaiInput = document.getElementById('openaiKey');
            const anthropicInput = document.getElementById('anthropicKey');
            const deepseekInput = document.getElementById('deepseekKey');
            
            if (openaiKey) {
                openaiInput.placeholder = '••••••••';
                openaiInput.dataset.hasKey = 'true';
            }
            if (anthropicKey) {
                anthropicInput.placeholder = '••••••••';
                anthropicInput.dataset.hasKey = 'true';
            }
            if (deepseekKey) {
                deepseekInput.placeholder = '••••••••';
                deepseekInput.dataset.hasKey = 'true';
            }
            
            // Update other settings
            document.getElementById('temperature').value = settings.temperature || 0.7;
            DOMSecurity.setTextContent(
                document.getElementById('temperatureValue'), 
                settings.temperature || 0.7
            );
            document.getElementById('maxTokens').value = settings.maxTokens || 1000;
            DOMSecurity.setTextContent(
                document.getElementById('maxTokensValue'), 
                settings.maxTokens || 1000
            );
            document.getElementById('theme').value = settings.theme || 'light';
            document.getElementById('fontSize').value = settings.fontSize || 'medium';
            document.getElementById('layout').value = settings.layout || 'corner';
            document.getElementById('streamResponses').value = 
                (settings.streamResponses !== false).toString();
        } catch (error) {
            console.error('Error loading settings:', error);
            showError('Failed to load settings');
        }
    }

    async function saveSettings() {
        try {
            // Get non-sensitive settings
            const settings = {
                temperature: parseFloat(document.getElementById('temperature').value) || 0.7,
                maxTokens: parseInt(document.getElementById('maxTokens').value) || 1000,
                theme: document.getElementById('theme').value,
                fontSize: document.getElementById('fontSize').value,
                layout: document.getElementById('layout').value,
                streamResponses: document.getElementById('streamResponses').value === 'true'
            };
            
            // Save non-sensitive settings
            await browser.storage.sync.set(settings);
            
            // Handle API keys separately with encryption
            const apiKeyInputs = {
                openai: document.getElementById('openaiKey'),
                anthropic: document.getElementById('anthropicKey'),
                deepseek: document.getElementById('deepseekKey')
            };
            
            for (const [provider, input] of Object.entries(apiKeyInputs)) {
                // Check if user entered a new key
                if (input.dataset.changed === 'true') {
                    const apiKey = input.value.trim();
                    if (apiKey && apiKey !== '••••••••') {
                        // Validate and store encrypted
                        if (apiKeySecurity.validateAPIKeyFormat(apiKey)) {
                            await apiKeySecurity.storeAPIKey(provider, apiKey);
                            // Clear the input and show masked value
                            input.value = '';
                            input.placeholder = '••••••••';
                            input.dataset.hasKey = 'true';
                            input.dataset.changed = 'false';
                        } else {
                            throw new Error(`Invalid ${provider} API key format`);
                        }
                    } else if (apiKey === '') {
                        // Remove key if cleared
                        await apiKeySecurity.removeAPIKey(provider);
                        input.placeholder = provider === 'deepseek' ? 'sk-...' : 
                                          provider === 'anthropic' ? 'sk-ant-...' : 'sk-...';
                        input.dataset.hasKey = 'false';
                        input.dataset.changed = 'false';
                    }
                }
            }
            
            // Notify all tabs about settings update
            const tabs = await browser.tabs.query({});
            for (const tab of tabs) {
                if (tab.url?.startsWith('http')) {
                    try {
                        await browser.tabs.sendMessage(tab.id, {
                            type: 'settings_updated',
                            settings: {
                                theme: settings.theme,
                                fontSize: settings.fontSize,
                                layout: settings.layout,
                                streamResponses: settings.streamResponses
                            }
                        });
                    } catch (error) {
                        // Tab not ready, ignore
                    }
                }
            }
            
            showStatus('Settings saved successfully', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            showError('Failed to save settings: ' + error.message);
        }
    }

    function showStatus(message, type = 'info') {
        const status = document.getElementById('status');
        DOMSecurity.setTextContent(status, message);
        status.className = `status ${type}`;
        status.style.display = 'block';
        
        setTimeout(() => {
            status.style.display = 'none';
        }, 3000);
    }

    function showError(message) {
        showStatus(message, 'error');
    }

    // Setup event listeners securely
    function setupEventListeners() {
        // Save button
        DOMSecurity.addEventListener(document.getElementById('save'), 'click', saveSettings);
        
        // Temperature slider
        DOMSecurity.addEventListener(document.getElementById('temperature'), 'input', (e) => {
            DOMSecurity.setTextContent(
                document.getElementById('temperatureValue'), 
                e.target.value
            );
        });
        
        // Max tokens input
        DOMSecurity.addEventListener(document.getElementById('maxTokens'), 'input', (e) => {
            DOMSecurity.setTextContent(
                document.getElementById('maxTokensValue'), 
                e.target.value
            );
        });
        
        // Tab switching
        document.querySelectorAll('.tab').forEach(tab => {
            DOMSecurity.addEventListener(tab, 'click', () => {
                document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
                const targetContent = document.getElementById(tab.dataset.tab);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
        
        // API key input handling
        const apiKeyInputs = document.querySelectorAll('input[type="password"]');
        apiKeyInputs.forEach(input => {
            // Focus handler - clear placeholder for editing
            DOMSecurity.addEventListener(input, 'focus', (e) => {
                if (e.target.dataset.hasKey === 'true') {
                    e.target.placeholder = 'Enter new key or leave empty to keep current';
                }
            });
            
            // Blur handler - restore masked placeholder if no changes
            DOMSecurity.addEventListener(input, 'blur', (e) => {
                if (e.target.value === '' && e.target.dataset.hasKey === 'true') {
                    e.target.placeholder = '••••••••';
                    e.target.dataset.changed = 'false';
                }
            });
            
            // Input handler - track changes
            DOMSecurity.addEventListener(input, 'input', (e) => {
                e.target.dataset.changed = 'true';
            });
        });
        
        // Show/hide API key toggle buttons
        document.querySelectorAll('.toggle-visibility').forEach(button => {
            DOMSecurity.addEventListener(button, 'click', async (e) => {
                const container = e.target.closest('.api-key-container');
                const input = container.querySelector('input');
                const provider = input.id.replace('Key', '');
                
                if (input.type === 'password') {
                    // Show actual key
                    try {
                        const apiKey = await apiKeySecurity.getAPIKey(provider);
                        if (apiKey) {
                            input.type = 'text';
                            input.value = apiKey;
                            DOMSecurity.setTextContent(e.target, 'Hide');
                        } else {
                            showError('No API key stored');
                        }
                    } catch (error) {
                        showError('Failed to retrieve API key');
                    }
                } else {
                    // Hide key
                    input.type = 'password';
                    if (input.dataset.hasKey === 'true' && !input.dataset.changed) {
                        input.value = '';
                        input.placeholder = '••••••••';
                    }
                    DOMSecurity.setTextContent(e.target, 'Show');
                }
            });
        });
        
        // Test connection buttons
        document.querySelectorAll('.test-connection').forEach(button => {
            DOMSecurity.addEventListener(button, 'click', async (e) => {
                const provider = e.target.dataset.provider;
                await testAPIConnection(provider);
            });
        });
        
        // Clear data button
        DOMSecurity.addEventListener(document.getElementById('clearData'), 'click', async () => {
            if (confirm('This will clear all conversations and settings. Are you sure?')) {
                try {
                    await browser.storage.local.clear();
                    await browser.storage.sync.clear();
                    showStatus('All data cleared', 'success');
                    setTimeout(() => loadSettings(), 1000);
                } catch (error) {
                    showError('Failed to clear data');
                }
            }
        });
        
        // Export data button
        DOMSecurity.addEventListener(document.getElementById('exportData'), 'click', async () => {
            try {
                const data = await browser.storage.local.get();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `deepweb-export-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
                showStatus('Data exported successfully', 'success');
            } catch (error) {
                showError('Failed to export data');
            }
        });
    }

    async function testAPIConnection(provider) {
        try {
            showStatus(`Testing ${provider} connection...`, 'info');
            
            const apiKey = await apiKeySecurity.getAPIKey(provider);
            if (!apiKey) {
                throw new Error('No API key configured');
            }
            
            // Send test request to background script
            const response = await browser.runtime.sendMessage({
                type: 'test_api_connection',
                provider: provider
            });
            
            if (response.success) {
                showStatus(`${provider} connection successful!`, 'success');
            } else {
                throw new Error(response.error || 'Connection failed');
            }
        } catch (error) {
            showError(`${provider} test failed: ${error.message}`);
        }
    }

    // Initialize
    setupEventListeners();
    await loadSettings();

})();