/**
 * Unit tests for Firefox content script
 */

const { createMockBrowser } = require('../utils/mock-browser');
const { JSDOM } = require('jsdom');

describe('Content Script', () => {
  let dom;
  let window;
  let document;
  let browser;
  
  beforeEach(() => {
    // Create a mock DOM
    dom = new JSDOM('<!DOCTYPE html><html><body></body></html>', {
      url: 'https://example.com',
      runScripts: 'dangerously'
    });
    
    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
    
    // Mock browser API
    browser = createMockBrowser();
    global.browser = browser;
    window.browser = browser;
    
    // Reset initialization flag
    window.__deepwebInitialized = false;
    
    // Mock console
    global.console = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn()
    };
  });
  
  afterEach(() => {
    jest.clearAllMocks();
    if (dom) dom.window.close();
  });
  
  describe('Initialization', () => {
    test('should create chat UI on initialization', () => {
      // Execute content script
      require('../../content/content-firefox.js');
      
      const chatRoot = document.getElementById('deepweb-chat-root');
      expect(chatRoot).toBeTruthy();
      expect(chatRoot.getAttribute('role')).toBe('dialog');
      expect(chatRoot.getAttribute('aria-label')).toBe('DeepWeb AI Chat Assistant');
    });
    
    test('should not initialize twice', () => {
      // First initialization
      require('../../content/content-firefox.js');
      const firstRoot = document.getElementById('deepweb-chat-root');
      
      // Mark as initialized
      window.__deepwebInitialized = true;
      
      // Try to initialize again
      jest.resetModules();
      require('../../content/content-firefox.js');
      
      // Should still be the same element
      const secondRoot = document.getElementById('deepweb-chat-root');
      expect(secondRoot).toBe(firstRoot);
    });
    
    test('should handle initialization errors gracefully', () => {
      // Make document.body null to cause error
      document.body = null;
      
      // Should not throw
      expect(() => {
        require('../../content/content-firefox.js');
      }).not.toThrow();
      
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('[DeepWeb] Failed to create UI:'),
        expect.any(Error)
      );
    });
  });
  
  describe('UI Elements', () => {
    beforeEach(() => {
      require('../../content/content-firefox.js');
    });
    
    test('should have all required UI elements', () => {
      expect(document.getElementById('deepweb-close')).toBeTruthy();
      expect(document.getElementById('deepweb-minimize')).toBeTruthy();
      expect(document.getElementById('deepweb-messages')).toBeTruthy();
      expect(document.getElementById('deepweb-input')).toBeTruthy();
      expect(document.getElementById('deepweb-send')).toBeTruthy();
      expect(document.getElementById('deepweb-model-select')).toBeTruthy();
    });
    
    test('should have proper ARIA attributes', () => {
      const input = document.getElementById('deepweb-input');
      expect(input.getAttribute('aria-label')).toBe('Type your message here');
      expect(input.getAttribute('placeholder')).toBe('Ask me anything about this page...');
      
      const sendBtn = document.getElementById('deepweb-send');
      expect(sendBtn.getAttribute('aria-label')).toBe('Send message');
      
      const closeBtn = document.getElementById('deepweb-close');
      expect(closeBtn.getAttribute('aria-label')).toBe('Close chat');
    });
  });
  
  describe('Event Handlers', () => {
    beforeEach(() => {
      require('../../content/content-firefox.js');
    });
    
    test('should handle close button click', () => {
      const container = document.getElementById('deepweb-chat-root');
      const closeBtn = document.getElementById('deepweb-close');
      
      expect(container.style.display).not.toBe('none');
      
      closeBtn.click();
      
      expect(container.style.display).toBe('none');
    });
    
    test('should handle minimize button click', () => {
      const minimizeBtn = document.getElementById('deepweb-minimize');
      const messages = document.getElementById('deepweb-messages');
      const inputArea = document.getElementById('deepweb-input-area');
      
      // Initially visible
      expect(messages.style.display).not.toBe('none');
      expect(inputArea.style.display).not.toBe('none');
      
      // Click minimize
      minimizeBtn.click();
      
      expect(messages.style.display).toBe('none');
      expect(inputArea.style.display).toBe('none');
      
      // Click again to restore
      minimizeBtn.click();
      
      expect(messages.style.display).toBe('block');
      expect(inputArea.style.display).toBe('block');
    });
    
    test('should send message on button click', async () => {
      const input = document.getElementById('deepweb-input');
      const sendBtn = document.getElementById('deepweb-send');
      
      // Set up mock response
      browser.runtime.sendMessage.mockResolvedValue({
        success: true,
        content: 'Test response'
      });
      
      // Enter message
      input.value = 'Test message';
      
      // Click send
      sendBtn.click();
      
      // Should send message to background
      expect(browser.runtime.sendMessage).toHaveBeenCalledWith({
        type: 'chat_request',
        message: 'Test message',
        model: 'deepseek-chat',
        context: expect.objectContaining({
          url: 'https://example.com/',
          title: expect.any(String)
        })
      });
      
      // Input should be cleared
      expect(input.value).toBe('');
    });
    
    test('should enforce rate limiting', () => {
      const input = document.getElementById('deepweb-input');
      const sendBtn = document.getElementById('deepweb-send');
      
      // Send first message
      input.value = 'First message';
      sendBtn.click();
      
      expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(1);
      
      // Try to send second message immediately
      input.value = 'Second message';
      sendBtn.click();
      
      // Should not send due to rate limit
      expect(browser.runtime.sendMessage).toHaveBeenCalledTimes(1);
      
      // Should show rate limit message
      const rateLimitMsg = document.getElementById('deepweb-rate-limit');
      expect(rateLimitMsg).toBeTruthy();
      expect(rateLimitMsg.style.display).toBe('block');
    });
    
    test('should handle Enter key in input', () => {
      const input = document.getElementById('deepweb-input');
      
      browser.runtime.sendMessage.mockResolvedValue({
        success: true,
        content: 'Response'
      });
      
      input.value = 'Test message';
      
      // Simulate Enter key
      const enterEvent = new window.KeyboardEvent('keypress', {
        key: 'Enter',
        keyCode: 13,
        bubbles: true
      });
      
      input.dispatchEvent(enterEvent);
      
      expect(browser.runtime.sendMessage).toHaveBeenCalled();
    });
    
    test('should not send empty messages', () => {
      const input = document.getElementById('deepweb-input');
      const sendBtn = document.getElementById('deepweb-send');
      
      // Empty input
      input.value = '   ';
      sendBtn.click();
      
      expect(browser.runtime.sendMessage).not.toHaveBeenCalled();
    });
  });
  
  describe('Message Handling', () => {
    beforeEach(() => {
      require('../../content/content-firefox.js');
    });
    
    test('should display user and assistant messages', async () => {
      const input = document.getElementById('deepweb-input');
      const sendBtn = document.getElementById('deepweb-send');
      const messages = document.getElementById('deepweb-messages');
      
      browser.runtime.sendMessage.mockResolvedValue({
        success: true,
        content: 'AI response'
      });
      
      input.value = 'User question';
      sendBtn.click();
      
      // Wait for async operations
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const messageElements = messages.querySelectorAll('[id^="msg-"]');
      expect(messageElements.length).toBeGreaterThanOrEqual(2);
      
      // Check user message
      const userMsg = Array.from(messageElements).find(
        el => el.textContent.includes('User question')
      );
      expect(userMsg).toBeTruthy();
      
      // Check AI response
      const aiMsg = Array.from(messageElements).find(
        el => el.textContent.includes('AI response')
      );
      expect(aiMsg).toBeTruthy();
    });
    
    test('should handle API errors gracefully', async () => {
      const input = document.getElementById('deepweb-input');
      const sendBtn = document.getElementById('deepweb-send');
      
      browser.runtime.sendMessage.mockResolvedValue({
        success: false,
        error: 'API key not configured'
      });
      
      input.value = 'Test message';
      sendBtn.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const errorMsg = document.querySelector('[id^="msg-"][style*="ff4444"]');
      expect(errorMsg).toBeTruthy();
      expect(errorMsg.textContent).toContain('API key not configured');
    });
  });
  
  describe('Browser Messages', () => {
    beforeEach(() => {
      require('../../content/content-firefox.js');
    });
    
    test('should handle toggle_chat message', () => {
      const container = document.getElementById('deepweb-chat-root');
      
      // Initially visible
      expect(container.style.display).not.toBe('none');
      
      // Send toggle message
      const listener = browser.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ type: 'toggle_chat' });
      
      expect(container.style.display).toBe('none');
      
      // Toggle again
      listener({ type: 'toggle_chat' });
      
      expect(container.style.display).toBe('flex');
    });
    
    test('should handle process_selection message', () => {
      const input = document.getElementById('deepweb-input');
      const container = document.getElementById('deepweb-chat-root');
      
      // Send selection message
      const listener = browser.runtime.onMessage.addListener.mock.calls[0][0];
      listener({ 
        type: 'process_selection',
        text: 'Selected text to process'
      });
      
      expect(container.style.display).toBe('flex');
      expect(input.value).toBe('Selected text to process');
    });
  });
});