/**
 * Chat Container Component
 * Main container for the chat interface
 */

import BaseComponent from './BaseComponent.js';
import Header from './Header.js';
import MessageList from './MessageList.js';
import InputArea from './InputArea.js';
import ModelSelector from './ModelSelector.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';

export default class ChatContainer extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.state = {
      isMinimized: false,
      isVisible: true,
      selectedModel: 'deepseek-chat'
    };
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('chat-container');
    const fragment = TemplateLoader.parseTemplate(template);
    
    // Create main element
    this.element = fragment.querySelector('#deepweb-chat-root');
    
    // Apply styles
    this.applyStyles();
    
    // Initialize child components
    await this.initializeChildren();
    
    // Add to DOM
    document.body.appendChild(this.element);
  }

  applyStyles() {
    Object.assign(this.element.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '380px',
      maxWidth: 'calc(100vw - 40px)',
      maxHeight: '600px',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
      color: '#333'
    });
  }

  async initializeChildren() {
    // Initialize Header
    const header = new Header({
      onClose: () => this.hide(),
      onMinimize: () => this.toggleMinimize()
    });
    await header.init();
    this.addChild('header', header);
    DOMUtils.$('#deepweb-header-container', this.element).appendChild(header.element);

    // Initialize Model Selector
    const modelSelector = new ModelSelector({
      selectedModel: this.state.selectedModel,
      onModelChange: (model) => this.handleModelChange(model)
    });
    await modelSelector.init();
    this.addChild('modelSelector', modelSelector);
    DOMUtils.$('#deepweb-model-container', this.element).appendChild(modelSelector.element);

    // Initialize Message List
    const messageList = new MessageList();
    await messageList.init();
    this.addChild('messageList', messageList);
    DOMUtils.$('#deepweb-messages-container', this.element).appendChild(messageList.element);

    // Initialize Input Area
    const inputArea = new InputArea({
      onSendMessage: (message) => this.handleSendMessage(message)
    });
    await inputArea.init();
    this.addChild('inputArea', inputArea);
    DOMUtils.$('#deepweb-input-container', this.element).appendChild(inputArea.element);
  }

  setupEventListeners() {
    // Listen for browser messages
    browser.runtime.onMessage.addListener((message) => {
      if (message.type === 'toggle_chat') {
        this.toggle();
      } else if (message.type === 'process_selection' && message.text) {
        this.show();
        const inputArea = this.getChild('inputArea');
        if (inputArea) {
          inputArea.setInputValue(`Please explain: "${message.text}"`);
          inputArea.focusInput();
        }
      }
    });

    // Click on container to focus input
    this.delegate('#deepweb-messages', 'click', () => {
      const inputArea = this.getChild('inputArea');
      if (inputArea) {
        inputArea.focusInput();
      }
    });
  }

  toggleMinimize() {
    this.setState({ isMinimized: !this.state.isMinimized });
    
    const messageList = this.getChild('messageList');
    const inputArea = this.getChild('inputArea');
    const modelSelector = this.getChild('modelSelector');
    const header = this.getChild('header');
    
    if (this.state.isMinimized) {
      messageList.hide();
      inputArea.hide();
      modelSelector.hide();
      this.element.style.height = '60px';
      header.setMinimizeIcon('□');
    } else {
      messageList.show();
      inputArea.show();
      modelSelector.show();
      this.element.style.height = 'auto';
      header.setMinimizeIcon('_');
    }
  }

  handleModelChange(model) {
    this.setState({ selectedModel: model });
    const messageList = this.getChild('messageList');
    messageList.addInfoMessage(`🔄 Switched to ${this.getModelName(model)}`);
  }

  getModelName(modelValue) {
    const names = {
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder',
      'deepseek-reasoner': 'DeepSeek Reasoner'
    };
    return names[modelValue] || modelValue;
  }

  async handleSendMessage(message) {
    const messageList = this.getChild('messageList');
    const inputArea = this.getChild('inputArea');
    
    // Add user message
    messageList.addUserMessage(message);
    
    // Show loading
    const loadingId = messageList.addLoadingMessage(
      `Thinking with ${this.getModelName(this.state.selectedModel)}...`
    );
    
    try {
      // Send to background
      const response = await browser.runtime.sendMessage({
        type: 'chat_request',
        message: message,
        model: this.state.selectedModel,
        context: {
          url: window.location.href,
          title: document.title,
          content: document.body.innerText.substring(0, 500)
        }
      });

      // Remove loading message
      messageList.removeMessage(loadingId);

      if (!response) {
        throw new Error('No response received from background script');
      }

      if (response.error) {
        messageList.addErrorMessage(response.error);
      } else if (response.content) {
        messageList.addAssistantMessage(response.content);
        
        // Show cost if available
        if (response.cost && response.cost > 0) {
          messageList.addInfoMessage(`💰 Cost: $${response.cost.toFixed(4)}`);
        }
      } else {
        messageList.addErrorMessage('No response content received');
      }

    } catch (error) {
      console.error('[DeepWeb] Error:', error);
      
      // Remove loading message
      messageList.removeMessage(loadingId);
      
      // Show specific error message
      if (error.message.includes('Could not establish connection')) {
        messageList.addErrorMessage('Extension was reloaded. Please refresh the page.');
      } else {
        messageList.addErrorMessage(error.message || 'Failed to get response');
      }
    } finally {
      inputArea.resetState();
    }
  }

  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  show() {
    super.show();
    this.setState({ isVisible: true });
    const inputArea = this.getChild('inputArea');
    if (inputArea) {
      inputArea.focusInput();
    }
  }

  hide() {
    super.hide();
    this.setState({ isVisible: false });
  }
}