/**
 * API Key Security Module
 * Provides secure API key storage and validation
 */

export class APIKeySecurity {
  constructor() {
    // Initialize with a unique salt for this installation
    this.initializeSalt();
  }

  /**
   * Initialize or retrieve installation-specific salt
   */
  async initializeSalt() {
    const stored = await browser.storage.local.get('installSalt');
    if (!stored.installSalt) {
      // Generate new salt for this installation
      const salt = this.generateSalt();
      await browser.storage.local.set({ installSalt: salt });
      this.salt = salt;
    } else {
      this.salt = stored.installSalt;
    }
  }

  /**
   * Generate cryptographically secure salt
   * @returns {string} Base64 encoded salt
   */
  generateSalt() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode.apply(null, array));
  }

  /**
   * Encrypt API key for storage
   * @param {string} apiKey - Plain text API key
   * @returns {Promise<string>} Encrypted API key
   */
  async encryptAPIKey(apiKey) {
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('Invalid API key');
    }

    // Validate API key format first
    if (!this.validateAPIKeyFormat(apiKey)) {
      throw new Error('Invalid API key format');
    }

    try {
      // Use browser's crypto API for encryption
      const encoder = new TextEncoder();
      const data = encoder.encode(apiKey);
      
      // Generate key from salt
      const key = await this.deriveKey(this.salt);
      
      // Generate IV
      const iv = crypto.getRandomValues(new Uint8Array(12));
      
      // Encrypt
      const encrypted = await crypto.subtle.encrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        data
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      // Return base64 encoded
      return btoa(String.fromCharCode.apply(null, combined));
    } catch (error) {
      throw new Error('Failed to encrypt API key: ' + error.message);
    }
  }

  /**
   * Decrypt API key from storage
   * @param {string} encryptedKey - Encrypted API key
   * @returns {Promise<string>} Decrypted API key
   */
  async decryptAPIKey(encryptedKey) {
    if (!encryptedKey || typeof encryptedKey !== 'string') {
      throw new Error('Invalid encrypted key');
    }

    try {
      // Decode from base64
      const combined = Uint8Array.from(atob(encryptedKey), c => c.charCodeAt(0));
      
      // Extract IV and encrypted data
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      // Generate key from salt
      const key = await this.deriveKey(this.salt);
      
      // Decrypt
      const decrypted = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: iv
        },
        key,
        encrypted
      );
      
      // Decode
      const decoder = new TextDecoder();
      return decoder.decode(decrypted);
    } catch (error) {
      throw new Error('Failed to decrypt API key: ' + error.message);
    }
  }

  /**
   * Derive encryption key from salt
   * @param {string} salt - Salt value
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKey(salt) {
    const encoder = new TextEncoder();
    const saltBuffer = encoder.encode(salt);
    
    // Import salt as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      saltBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );
    
    // Derive AES key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBuffer,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Validate API key format
   * @param {string} apiKey - API key to validate
   * @returns {boolean} Whether API key format is valid
   */
  validateAPIKeyFormat(apiKey) {
    // DeepSeek API key format validation
    // Should be alphanumeric with dashes, typically 32-128 characters
    const keyPattern = /^[a-zA-Z0-9_-]{32,128}$/;
    return keyPattern.test(apiKey);
  }

  /**
   * Securely store API key
   * @param {string} provider - API provider name
   * @param {string} apiKey - Plain text API key
   * @returns {Promise<void>}
   */
  async storeAPIKey(provider, apiKey) {
    if (!provider || !apiKey) {
      throw new Error('Provider and API key are required');
    }

    // Encrypt the API key
    const encrypted = await this.encryptAPIKey(apiKey);
    
    // Store encrypted key
    const storage = await browser.storage.local.get('encryptedAPIKeys') || {};
    const encryptedKeys = storage.encryptedAPIKeys || {};
    encryptedKeys[provider] = encrypted;
    
    await browser.storage.local.set({ encryptedAPIKeys: encryptedKeys });
    
    // Also store a hash for quick validation without decryption
    const hash = await this.hashAPIKey(apiKey);
    const hashes = (await browser.storage.local.get('apiKeyHashes'))?.apiKeyHashes || {};
    hashes[provider] = hash;
    await browser.storage.local.set({ apiKeyHashes: hashes });
  }

  /**
   * Retrieve and decrypt API key
   * @param {string} provider - API provider name
   * @returns {Promise<string|null>} Decrypted API key or null
   */
  async getAPIKey(provider) {
    const storage = await browser.storage.local.get('encryptedAPIKeys');
    const encryptedKeys = storage.encryptedAPIKeys || {};
    
    if (!encryptedKeys[provider]) {
      return null;
    }
    
    try {
      return await this.decryptAPIKey(encryptedKeys[provider]);
    } catch (error) {
      console.error('Failed to decrypt API key:', error);
      return null;
    }
  }

  /**
   * Hash API key for validation
   * @param {string} apiKey - API key to hash
   * @returns {Promise<string>} Hashed API key
   */
  async hashAPIKey(apiKey) {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey + this.salt);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(hash)));
  }

  /**
   * Validate API key without decrypting
   * @param {string} provider - API provider name
   * @param {string} apiKey - API key to validate
   * @returns {Promise<boolean>} Whether API key matches stored hash
   */
  async validateStoredKey(provider, apiKey) {
    const storage = await browser.storage.local.get('apiKeyHashes');
    const hashes = storage.apiKeyHashes || {};
    
    if (!hashes[provider]) {
      return false;
    }
    
    const hash = await this.hashAPIKey(apiKey);
    return hash === hashes[provider];
  }

  /**
   * Remove API key
   * @param {string} provider - API provider name
   * @returns {Promise<void>}
   */
  async removeAPIKey(provider) {
    // Remove encrypted key
    const encryptedStorage = await browser.storage.local.get('encryptedAPIKeys');
    const encryptedKeys = encryptedStorage.encryptedAPIKeys || {};
    delete encryptedKeys[provider];
    await browser.storage.local.set({ encryptedAPIKeys: encryptedKeys });
    
    // Remove hash
    const hashStorage = await browser.storage.local.get('apiKeyHashes');
    const hashes = hashStorage.apiKeyHashes || {};
    delete hashes[provider];
    await browser.storage.local.set({ apiKeyHashes: hashes });
  }

  /**
   * Clear all API keys
   * @returns {Promise<void>}
   */
  async clearAllAPIKeys() {
    await browser.storage.local.remove(['encryptedAPIKeys', 'apiKeyHashes']);
  }

  /**
   * Migrate from old unencrypted storage
   * @returns {Promise<void>}
   */
  async migrateUnencryptedKeys() {
    try {
      // Check for old unencrypted keys
      const oldStorage = await browser.storage.sync.get(['apiKeys']);
      if (oldStorage.apiKeys) {
        // Migrate each key
        for (const [provider, apiKey] of Object.entries(oldStorage.apiKeys)) {
          if (apiKey && typeof apiKey === 'string') {
            await this.storeAPIKey(provider, apiKey);
          }
        }
        
        // Remove old unencrypted storage
        await browser.storage.sync.remove(['apiKeys']);
        
        console.log('API keys migrated to encrypted storage');
      }
    } catch (error) {
      console.error('Failed to migrate API keys:', error);
    }
  }

  /**
   * Create secure API request headers
   * @param {string} provider - API provider name
   * @returns {Promise<Object>} Secure headers
   */
  async createSecureHeaders(provider) {
    const apiKey = await this.getAPIKey(provider);
    if (!apiKey) {
      throw new Error('API key not found');
    }
    
    return {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Request-ID': this.generateRequestId()
    };
  }

  /**
   * Generate secure request ID
   * @returns {string} Request ID
   */
  generateRequestId() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }
}