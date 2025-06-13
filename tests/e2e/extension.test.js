/**
 * E2E tests for Firefox extension functionality
 */

describe('DeepWeb Extension E2E', () => {
  let browser;
  let page;
  
  beforeAll(async () => {
    browser = await global.loadExtension();
  });
  
  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });
  
  beforeEach(async () => {
    page = await browser.newPage();
    await page.goto('https://example.com');
    await global.waitForExtension(page);
  });
  
  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });
  
  describe('Chat UI', () => {
    test('should open chat UI when triggered', async () => {
      // Initially hidden
      const chatVisible = await page.$('#deepweb-chat-root');
      expect(chatVisible).toBeFalsy();
      
      // Open chat
      await global.openChatUI(page);
      
      // Should be visible
      const chat = await page.$('#deepweb-chat-root');
      expect(chat).toBeTruthy();
      
      const isVisible = await page.evaluate(
        el => el && window.getComputedStyle(el).display !== 'none',
        chat
      );
      expect(isVisible).toBe(true);
    });
    
    test('should close chat when close button clicked', async () => {
      await global.openChatUI(page);
      
      // Click close button
      await page.click('#deepweb-close');
      
      // Should be hidden
      const isVisible = await page.evaluate(() => {
        const el = document.getElementById('deepweb-chat-root');
        return el && window.getComputedStyle(el).display !== 'none';
      });
      expect(isVisible).toBe(false);
    });
    
    test('should minimize and restore chat', async () => {
      await global.openChatUI(page);
      
      // Get initial height
      const initialHeight = await page.evaluate(() => {
        return document.getElementById('deepweb-chat-root').offsetHeight;
      });
      
      // Click minimize
      await page.click('#deepweb-minimize');
      
      // Height should be reduced
      const minimizedHeight = await page.evaluate(() => {
        return document.getElementById('deepweb-chat-root').offsetHeight;
      });
      expect(minimizedHeight).toBeLessThan(initialHeight);
      
      // Click again to restore
      await page.click('#deepweb-minimize');
      
      // Height should be restored
      const restoredHeight = await page.evaluate(() => {
        return document.getElementById('deepweb-chat-root').offsetHeight;
      });
      expect(restoredHeight).toBeGreaterThan(minimizedHeight);
    });
  });
  
  describe('Message Sending', () => {
    beforeEach(async () => {
      await global.openChatUI(page);
      
      // Mock API response
      await page.evaluateOnNewDocument(() => {
        window.browser = {
          runtime: {
            sendMessage: jest.fn().mockResolvedValue({
              success: true,
              content: 'Mocked AI response'
            })
          }
        };
      });
    });
    
    test('should send message when button clicked', async () => {
      // Type message
      await page.type('#deepweb-input', 'Test message');
      
      // Click send
      await page.click('#deepweb-send');
      
      // Wait for message to appear
      await page.waitForSelector('[id^="msg-"]', { visible: true });
      
      // Check user message appears
      const userMessage = await page.evaluate(() => {
        const messages = Array.from(document.querySelectorAll('[id^="msg-"]'));
        return messages.find(el => el.textContent.includes('Test message'));
      });
      expect(userMessage).toBeTruthy();
    });
    
    test('should send message on Enter key', async () => {
      // Type message
      await page.type('#deepweb-input', 'Enter key test');
      
      // Press Enter
      await page.keyboard.press('Enter');
      
      // Wait for message
      await page.waitForSelector('[id^="msg-"]', { visible: true });
      
      const hasMessage = await page.evaluate(() => {
        const messages = Array.from(document.querySelectorAll('[id^="msg-"]'));
        return messages.some(el => el.textContent.includes('Enter key test'));
      });
      expect(hasMessage).toBe(true);
    });
    
    test('should not send empty messages', async () => {
      // Click send without typing
      await page.click('#deepweb-send');
      
      // Should not have any messages
      const messageCount = await page.evaluate(() => {
        return document.querySelectorAll('[id^="msg-"]').length;
      });
      expect(messageCount).toBe(0);
    });
    
    test('should disable input while processing', async () => {
      // Type and send
      await page.type('#deepweb-input', 'Processing test');
      await page.click('#deepweb-send');
      
      // Input should be disabled
      const isDisabled = await page.evaluate(() => {
        return document.getElementById('deepweb-input').disabled;
      });
      expect(isDisabled).toBe(true);
    });
  });
  
  describe('Model Selection', () => {
    beforeEach(async () => {
      await global.openChatUI(page);
    });
    
    test('should have model selector with options', async () => {
      const options = await page.evaluate(() => {
        const select = document.getElementById('deepweb-model-select');
        return Array.from(select.options).map(opt => ({
          value: opt.value,
          text: opt.text
        }));
      });
      
      expect(options).toContainEqual({ value: 'deepseek-chat', text: 'DeepSeek Chat' });
      expect(options).toContainEqual({ value: 'deepseek-reasoner', text: 'DeepSeek Reasoner' });
    });
    
    test('should persist selected model', async () => {
      // Select reasoner model
      await page.select('#deepweb-model-select', 'deepseek-reasoner');
      
      // Close and reopen chat
      await page.click('#deepweb-close');
      await global.openChatUI(page);
      
      // Should still be selected
      const selectedModel = await page.evaluate(() => {
        return document.getElementById('deepweb-model-select').value;
      });
      expect(selectedModel).toBe('deepseek-reasoner');
    });
  });
  
  describe('Context Menu Integration', () => {
    test('should process selected text from context menu', async () => {
      // Add some text to page
      await page.evaluate(() => {
        document.body.innerHTML = '<p id="test-text">This is test content to select</p>';
      });
      
      // Select text
      await page.evaluate(() => {
        const textNode = document.getElementById('test-text');
        const range = document.createRange();
        range.selectNodeContents(textNode);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
      });
      
      // Simulate context menu message
      await page.evaluate(() => {
        window.postMessage({ 
          type: 'process_selection',
          text: 'This is test content to select'
        }, '*');
      });
      
      // Chat should open with selected text
      await page.waitForSelector('#deepweb-chat-root', { visible: true });
      
      const inputValue = await page.evaluate(() => {
        return document.getElementById('deepweb-input').value;
      });
      expect(inputValue).toBe('This is test content to select');
    });
  });
  
  describe('Keyboard Shortcuts', () => {
    test('should toggle chat with keyboard shortcut', async () => {
      // Simulate keyboard shortcut
      await page.keyboard.down('Control');
      await page.keyboard.down('Shift');
      await page.keyboard.press('Y');
      await page.keyboard.up('Shift');
      await page.keyboard.up('Control');
      
      // Wait a bit for event processing
      await page.waitForTimeout(500);
      
      // Chat should be visible
      const isVisible = await page.evaluate(() => {
        const el = document.getElementById('deepweb-chat-root');
        return el && window.getComputedStyle(el).display !== 'none';
      });
      expect(isVisible).toBe(true);
    });
  });
});