/**
 * Unit tests for Firefox background script
 */

const { createMockBrowser, triggerMessage } = require('../utils/mock-browser');

// Mock the global browser object
global.browser = createMockBrowser();

// Import after mocking
const backgroundScript = require('../../background-firefox.js');

describe('Background Script', () => {
  let browser;
  
  beforeEach(() => {
    browser = createMockBrowser();
    global.browser = browser;
    global.fetch = jest.fn();
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Message Handling', () => {
    test('should handle chat_request message', async () => {
      const mockApiKey = 'sk-test123456789';
      browser.storage.sync.get.mockResolvedValue({
        apiKeys: { deepseek: mockApiKey }
      });
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{
            message: { content: 'Test response' }
          }],
          usage: { total_tokens: 100 }
        })
      });
      
      const response = await triggerMessage(browser, {
        type: 'chat_request',
        message: 'Test question',
        context: {
          url: 'https://example.com',
          title: 'Example Page',
          content: 'Page content'
        }
      });
      
      expect(response[0]).toHaveProperty('success', true);
      expect(response[0]).toHaveProperty('content', 'Test response');
    });
    
    test('should handle missing API key', async () => {
      browser.storage.sync.get.mockResolvedValue({ apiKeys: {} });
      
      const response = await triggerMessage(browser, {
        type: 'chat_request',
        message: 'Test question'
      });
      
      expect(response[0]).toHaveProperty('error');
      expect(response[0].error).toContain('API key not configured');
    });
    
    test('should validate API key format', async () => {
      browser.storage.sync.get.mockResolvedValue({
        apiKeys: { deepseek: 'invalid-key' }
      });
      
      const response = await triggerMessage(browser, {
        type: 'chat_request',
        message: 'Test question'
      });
      
      expect(response[0]).toHaveProperty('error');
      expect(response[0].error).toContain('Invalid API key format');
    });
    
    test('should enforce rate limiting', async () => {
      const mockApiKey = 'sk-test123456789';
      browser.storage.sync.get.mockResolvedValue({
        apiKeys: { deepseek: mockApiKey }
      });
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Response' } }]
        })
      });
      
      // First request should succeed
      const response1 = await triggerMessage(browser, {
        type: 'chat_request',
        message: 'First request'
      });
      expect(response1[0]).toHaveProperty('success', true);
      
      // Second request within rate limit should fail
      const response2 = await triggerMessage(browser, {
        type: 'chat_request',
        message: 'Second request'
      });
      expect(response2[0]).toHaveProperty('error');
      expect(response2[0].error).toContain('Rate limit exceeded');
    });
    
    test('should sanitize message input', async () => {
      const mockApiKey = 'sk-test123456789';
      browser.storage.sync.get.mockResolvedValue({
        apiKeys: { deepseek: mockApiKey }
      });
      
      global.fetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          choices: [{ message: { content: 'Response' } }]
        })
      });
      
      const response = await triggerMessage(browser, {
        type: 'chat_request',
        message: '<script>alert("xss")</script>Normal text'
      });
      
      expect(response[0]).toHaveProperty('success', true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('Normal text')
        })
      );
      expect(global.fetch.mock.calls[0][1].body).not.toContain('<script>');
    });
    
    test('should handle API errors gracefully', async () => {
      const mockApiKey = 'sk-test123456789';
      browser.storage.sync.get.mockResolvedValue({
        apiKeys: { deepseek: mockApiKey }
      });
      
      global.fetch.mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve(JSON.stringify({
          error: { message: 'Invalid API key' }
        }))
      });
      
      const response = await triggerMessage(browser, {
        type: 'chat_request',
        message: 'Test question'
      });
      
      expect(response[0]).toHaveProperty('success', false);
      expect(response[0]).toHaveProperty('error', 'Invalid API key');
    });
    
    test('should handle network timeouts', async () => {
      const mockApiKey = 'sk-test123456789';
      browser.storage.sync.get.mockResolvedValue({
        apiKeys: { deepseek: mockApiKey }
      });
      
      // Mock AbortController
      const mockAbort = jest.fn();
      global.AbortController = jest.fn().mockImplementation(() => ({
        abort: mockAbort,
        signal: {}
      }));
      
      global.fetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));
      
      const response = await triggerMessage(browser, {
        type: 'chat_request',
        message: 'Test question'
      });
      
      expect(response[0]).toHaveProperty('success', false);
      expect(response[0].error).toContain('Request timed out');
    });
  });
  
  describe('Browser Action', () => {
    test('should toggle chat on browser action click', () => {
      const mockTab = { id: 123 };
      
      // Simulate browser action click
      const listeners = browser.browserAction.onClicked.addListener.mock.calls;
      const handler = listeners[listeners.length - 1][0];
      handler(mockTab);
      
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
        123,
        { type: 'toggle_chat' }
      );
    });
  });
  
  describe('Context Menu', () => {
    test('should create context menu item', () => {
      expect(browser.contextMenus.create).toHaveBeenCalledWith({
        id: 'ask-deepweb',
        title: "Ask DeepWeb AI about '%s'",
        contexts: ['selection']
      });
    });
    
    test('should handle context menu click with selection', () => {
      const mockInfo = {
        menuItemId: 'ask-deepweb',
        selectionText: 'Selected text'
      };
      const mockTab = { id: 456 };
      
      // Simulate context menu click
      const listeners = browser.contextMenus.onClicked.addListener.mock.calls;
      const handler = listeners[listeners.length - 1][0];
      handler(mockInfo, mockTab);
      
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
        456,
        {
          type: 'process_selection',
          text: 'Selected text'
        }
      );
    });
  });
  
  describe('Keyboard Commands', () => {
    test('should handle toggle-chat command', () => {
      browser.tabs.query.mockImplementation((query, callback) => {
        callback([{ id: 789 }]);
      });
      
      // Simulate command
      const listeners = browser.commands.onCommand.addListener.mock.calls;
      const handler = listeners[listeners.length - 1][0];
      handler('toggle-chat');
      
      expect(browser.tabs.query).toHaveBeenCalledWith(
        { active: true, currentWindow: true },
        expect.any(Function)
      );
      expect(browser.tabs.sendMessage).toHaveBeenCalledWith(
        789,
        { type: 'toggle_chat' }
      );
    });
  });
  
  describe('Installation', () => {
    test('should open options page on install', () => {
      // Simulate installation
      const listeners = browser.runtime.onInstalled.addListener.mock.calls;
      const handler = listeners[listeners.length - 1][0];
      handler({ reason: 'install' });
      
      expect(browser.runtime.openOptionsPage).toHaveBeenCalled();
    });
  });
});