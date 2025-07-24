/**
 * Tests for ChatContainer Component
 */

describe('ChatContainer', () => {
  let ChatContainer;
  let container;
  let mockConfig;
  
  beforeEach(() => {
    // Reset modules
    jest.resetModules();
    
    // Mock dependencies
    jest.mock('../../../src/config/ConfigManager.js', () => ({
      ConfigManager: jest.fn().mockImplementation(() => ({
        get: jest.fn().mockResolvedValue('test-value'),
        set: jest.fn().mockResolvedValue(undefined)
      }))
    }));
    
    jest.mock('../../../src/themes/ThemeManager.js', () => ({
      ThemeManager: jest.fn().mockImplementation(() => ({
        loadTheme: jest.fn(),
        applyTheme: jest.fn()
      }))
    }));
    
    jest.mock('../../../content/components/MessageStore.js', () => ({
      MessageStore: jest.fn().mockImplementation(() => ({
        init: jest.fn(),
        addMessage: jest.fn(),
        getMessages: jest.fn().mockReturnValue([])
      }))
    }));
    
    // Mock browser APIs
    global.browser = {
      runtime: {
        onMessage: {
          addListener: jest.fn()
        },
        sendMessage: jest.fn().mockResolvedValue({ success: true })
      },
      storage: {
        local: {
          get: jest.fn().mockResolvedValue({}),
          set: jest.fn().mockResolvedValue(undefined)
        }
      }
    };
    
    // Import after mocks are set up
    ChatContainer = require('../../../content/components/ChatContainer.js').ChatContainer;
    
    // Setup DOM
    document.body.innerHTML = '<div id="test-container"></div>';
    container = document.getElementById('test-container');
    
    mockConfig = {
      get: jest.fn().mockResolvedValue('test-value'),
      set: jest.fn().mockResolvedValue(undefined)
    };
  });
  
  afterEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });
  
  describe('constructor', () => {
    it('should create instance with config', () => {
      const chatContainer = new ChatContainer(mockConfig);
      
      expect(chatContainer.config).toBe(mockConfig);
      expect(chatContainer.container).toBeNull();
      expect(chatContainer.isVisible).toBe(false);
    });
  });
  
  describe('init', () => {
    it('should initialize chat container', async () => {
      const chatContainer = new ChatContainer(mockConfig);
      
      // Mock loadTemplate
      chatContainer.loadTemplate = jest.fn().mockResolvedValue('<div class="chat"></div>');
      chatContainer.injectStyles = jest.fn();
      chatContainer.setupEventListeners = jest.fn();
      chatContainer.loadConversation = jest.fn();
      
      await chatContainer.init();
      
      expect(chatContainer.loadTemplate).toHaveBeenCalled();
      expect(chatContainer.injectStyles).toHaveBeenCalled();
      expect(chatContainer.setupEventListeners).toHaveBeenCalled();
      expect(chatContainer.container).toBeTruthy();
    });
  });
  
  describe('toggle', () => {
    it('should toggle visibility', async () => {
      const chatContainer = new ChatContainer(mockConfig);
      chatContainer.container = document.createElement('div');
      chatContainer.container.style.display = 'none';
      
      chatContainer.toggle();
      expect(chatContainer.isVisible).toBe(true);
      expect(chatContainer.container.style.display).toBe('flex');
      
      chatContainer.toggle();
      expect(chatContainer.isVisible).toBe(false);
      expect(chatContainer.container.style.display).toBe('none');
    });
  });
  
  describe('sendMessage', () => {
    it('should send message to API', async () => {
      const chatContainer = new ChatContainer(mockConfig);
      chatContainer.messageStore = {
        addMessage: jest.fn()
      };
      chatContainer.displayMessage = jest.fn();
      chatContainer.callAPI = jest.fn().mockResolvedValue({
        choices: [{ message: { content: 'AI response' } }]
      });
      
      await chatContainer.sendMessage('Hello AI');
      
      expect(chatContainer.messageStore.addMessage).toHaveBeenCalledWith({
        role: 'user',
        content: 'Hello AI',
        timestamp: expect.any(Number)
      });
      
      expect(chatContainer.callAPI).toHaveBeenCalledWith('Hello AI');
      
      expect(chatContainer.displayMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'assistant',
          content: 'AI response'
        })
      );
    });
    
    it('should handle API errors', async () => {
      const chatContainer = new ChatContainer(mockConfig);
      chatContainer.messageStore = { addMessage: jest.fn() };
      chatContainer.displayMessage = jest.fn();
      chatContainer.showError = jest.fn();
      chatContainer.callAPI = jest.fn().mockRejectedValue(new Error('API Error'));
      
      await chatContainer.sendMessage('Hello');
      
      expect(chatContainer.showError).toHaveBeenCalledWith('Failed to get response: API Error');
    });
  });
  
  describe('displayMessage', () => {
    it('should create and append message element', () => {
      const chatContainer = new ChatContainer(mockConfig);
      const messageList = document.createElement('div');
      messageList.className = 'deepweb-message-list';
      chatContainer.container = document.createElement('div');
      chatContainer.container.appendChild(messageList);
      
      const message = {
        role: 'user',
        content: 'Test message'
      };
      
      chatContainer.displayMessage(message);
      
      const messageElements = messageList.querySelectorAll('.deepweb-message');
      expect(messageElements.length).toBe(1);
      expect(messageElements[0].classList.contains('deepweb-user')).toBe(true);
    });
  });
  
  describe('clearMessages', () => {
    it('should clear all messages', () => {
      const chatContainer = new ChatContainer(mockConfig);
      chatContainer.messageStore = {
        clearMessages: jest.fn()
      };
      
      const messageList = document.createElement('div');
      messageList.innerHTML = '<div>Message 1</div><div>Message 2</div>';
      chatContainer.container = document.createElement('div');
      chatContainer.container.appendChild(messageList);
      chatContainer.container.querySelector = jest.fn().mockReturnValue(messageList);
      
      chatContainer.clearMessages();
      
      expect(chatContainer.messageStore.clearMessages).toHaveBeenCalled();
      expect(messageList.innerHTML).toBe('');
    });
  });
});