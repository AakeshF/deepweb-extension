/**
 * Tests for SecurityManager
 */

import { SecurityManager } from '../../../src/security/SecurityManager.js';

describe('SecurityManager', () => {
  let securityManager;
  let mockCrypto;
  
  beforeEach(() => {
    // Mock crypto API
    mockCrypto = {
      getRandomValues: jest.fn((array) => {
        for (let i = 0; i < array.length; i++) {
          array[i] = Math.floor(Math.random() * 256);
        }
        return array;
      }),
      subtle: {
        generateKey: jest.fn().mockResolvedValue({
          privateKey: 'mock-private-key',
          publicKey: 'mock-public-key'
        }),
        encrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
        decrypt: jest.fn().mockResolvedValue(new ArrayBuffer(16)),
        importKey: jest.fn().mockResolvedValue('mock-key'),
        exportKey: jest.fn().mockResolvedValue(new ArrayBuffer(32))
      }
    };
    
    global.crypto = mockCrypto;
    global.TextEncoder = TextEncoder;
    global.TextDecoder = TextDecoder;
    
    // Mock browser storage
    global.browser = {
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined)
        }
      }
    };
    
    securityManager = new SecurityManager();
  });
  
  describe('init', () => {
    it('should initialize security components', async () => {
      await securityManager.init();
      
      expect(securityManager.initialized).toBe(true);
    });
    
    it('should generate encryption key if not exists', async () => {
      await securityManager.init();
      
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalledWith(
        {
          name: 'AES-GCM',
          length: 256
        },
        true,
        ['encrypt', 'decrypt']
      );
    });
    
    it('should load existing encryption key', async () => {
      const mockKey = { key: 'existing-key' };
      global.browser.storage.local.get.mockResolvedValue({
        encryptionKey: mockKey
      });
      
      await securityManager.init();
      
      expect(mockCrypto.subtle.importKey).toHaveBeenCalledWith(
        'jwk',
        mockKey,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt']
      );
    });
  });
  
  describe('validateInput', () => {
    beforeEach(async () => {
      await securityManager.init();
    });
    
    it('should validate safe input', () => {
      const safeInputs = [
        'Hello world',
        'user@example.com',
        '12345',
        'Normal text with spaces'
      ];
      
      safeInputs.forEach(input => {
        expect(() => securityManager.validateInput(input)).not.toThrow();
      });
    });
    
    it('should reject dangerous input', () => {
      const dangerousInputs = [
        '<script>alert("XSS")</script>',
        'javascript:alert(1)',
        '<img src=x onerror=alert(1)>',
        '"><script>alert(1)</script>'
      ];
      
      dangerousInputs.forEach(input => {
        expect(() => securityManager.validateInput(input, 'strict'))
          .toThrow('Invalid input detected');
      });
    });
    
    it('should validate URLs properly', () => {
      const validUrls = [
        'https://example.com',
        'http://localhost:3000',
        'https://sub.domain.com/path'
      ];
      
      validUrls.forEach(url => {
        expect(securityManager.validateURL(url)).toBe(true);
      });
      
      const invalidUrls = [
        'javascript:alert(1)',
        'data:text/html,<script>alert(1)</script>',
        'vbscript:msgbox(1)'
      ];
      
      invalidUrls.forEach(url => {
        expect(securityManager.validateURL(url)).toBe(false);
      });
    });
  });
  
  describe('sanitize', () => {
    beforeEach(async () => {
      await securityManager.init();
    });
    
    it('should sanitize HTML content', () => {
      const input = '<p>Hello <script>alert(1)</script> world</p>';
      const sanitized = securityManager.sanitize(input, 'html');
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('Hello');
      expect(sanitized).toContain('world');
    });
    
    it('should sanitize text content', () => {
      const input = '<b>Bold</b> & "quoted"';
      const sanitized = securityManager.sanitize(input, 'text');
      
      expect(sanitized).toBe('&lt;b&gt;Bold&lt;/b&gt; &amp; &quot;quoted&quot;');
    });
    
    it('should sanitize attribute values', () => {
      const input = '" onclick="alert(1)"';
      const sanitized = securityManager.sanitize(input, 'attribute');
      
      expect(sanitized).toBe('&quot; onclick=&quot;alert(1)&quot;');
    });
  });
  
  describe('encrypt/decrypt', () => {
    beforeEach(async () => {
      await securityManager.init();
    });
    
    it('should encrypt and decrypt data', async () => {
      const originalData = 'sensitive information';
      
      // Mock TextEncoder/Decoder for encryption
      const encoded = new TextEncoder().encode(originalData);
      mockCrypto.subtle.decrypt.mockResolvedValue(encoded.buffer);
      
      const encrypted = await securityManager.encrypt(originalData);
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      
      const decrypted = await securityManager.decrypt(encrypted);
      expect(decrypted).toBe(originalData);
    });
    
    it('should generate unique IV for each encryption', async () => {
      const data = 'test data';
      
      const encrypted1 = await securityManager.encrypt(data);
      const encrypted2 = await securityManager.encrypt(data);
      
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });
  
  describe('hashData', () => {
    it('should create consistent hashes', async () => {
      const data = 'test data';
      
      const hash1 = await securityManager.hashData(data);
      const hash2 = await securityManager.hashData(data);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 produces 64 hex chars
    });
    
    it('should create different hashes for different data', async () => {
      const hash1 = await securityManager.hashData('data1');
      const hash2 = await securityManager.hashData('data2');
      
      expect(hash1).not.toBe(hash2);
    });
  });
  
  describe('generateNonce', () => {
    it('should generate unique nonces', () => {
      const nonce1 = securityManager.generateNonce();
      const nonce2 = securityManager.generateNonce();
      
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64
      expect(nonce1.length).toBeGreaterThan(20);
    });
  });
  
  describe('isSecureContext', () => {
    it('should detect secure contexts', () => {
      global.window = { isSecureContext: true };
      expect(securityManager.isSecureContext()).toBe(true);
      
      global.window = { isSecureContext: false };
      expect(securityManager.isSecureContext()).toBe(false);
    });
  });
  
  describe('createSecureElement', () => {
    beforeEach(async () => {
      await securityManager.init();
    });
    
    it('should create element with sanitized content', () => {
      const element = securityManager.createSecureElement('div', {
        innerHTML: 'Safe content <script>alert(1)</script>'
      });
      
      expect(element.tagName).toBe('DIV');
      expect(element.innerHTML).toContain('Safe content');
      expect(element.innerHTML).not.toContain('<script>');
    });
    
    it('should add CSP meta tag if needed', () => {
      document.head.innerHTML = '';
      securityManager.createSecureElement('div');
      
      const cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
      expect(cspMeta).toBeTruthy();
    });
  });
  
  describe('verifyIntegrity', () => {
    it('should verify data integrity', async () => {
      const data = { message: 'test' };
      const hash = await securityManager.hashData(JSON.stringify(data));
      
      const isValid = await securityManager.verifyIntegrity(data, hash);
      expect(isValid).toBe(true);
      
      const tampered = { message: 'tampered' };
      const isInvalid = await securityManager.verifyIntegrity(tampered, hash);
      expect(isInvalid).toBe(false);
    });
  });
});