/**
 * Chat Container Component with Error Handling
 * Main container for the chat interface with comprehensive error handling
 */

import BaseComponent from './BaseComponent.js';
import Header from './Header.js';
import MessageList from './MessageList.js';
import InputArea from './InputArea.js';
import ModelSelector from './ModelSelector.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';
import { ErrorBoundary } from '../../src/errors/ErrorBoundary.js';
import ErrorHandler, { UIError, TemplateError } from '../../src/errors/index.js';

export default class ChatContainer extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.state = {
      isMinimized: false,
      isVisible: true,
      selectedModel: 'deepseek-chat',
      isLoading: false,
      error: null
    };
    
    // Create error boundary for this component
    this.errorBoundary = new ErrorBoundary({
      component: 'ChatContainer',
      onError: (error) => this.handleComponentError(error)
    });
  }

  async render() {
    try {
      // Load template
      const template = await TemplateLoader.loadTemplate('chat-container');
      const fragment = TemplateLoader.parseTemplate(template);
      
      // Create main element
      this.element = fragment.querySelector('#deepweb-chat-root');
      
      if (!this.element) {
        throw new TemplateError('chat-container', 'Template missing root element');
      }
      
      // Apply styles
      this.applyStyles();
      
      // Initialize child components with error boundaries
      await this.initializeChildren();
      
      // Add to DOM
      document.body.appendChild(this.element);
      
    } catch (error) {
      // Handle render errors
      const result = ErrorHandler.handleError(error, {
        component: 'ChatContainer',
        action: 'render'
      });
      
      // Create fallback UI
      this.element = this.createErrorFallback(result);
      document.body.appendChild(this.element);
      
      throw error; // Re-throw for parent handling
    }
  }

  async initializeChildren() {
    const components = [
      {
        name: 'header',
        Component: Header,
        container: '#deepweb-header-container',
        options: {
          onClose: () => this.hide(),
          onMinimize: () => this.toggleMinimize()
        }
      },
      {
        name: 'modelSelector',
        Component: ModelSelector,
        container: '#deepweb-model-container',
        options: {
          selectedModel: this.state.selectedModel,
          onModelChange: (model) => this.handleModelChange(model)
        }
      },
      {
        name: 'messageList',
        Component: MessageList,
        container: '#deepweb-messages-container',
        options: {}
      },
      {
        name: 'inputArea',
        Component: InputArea,
        container: '#deepweb-input-container',
        options: {
          onSendMessage: (message) => this.handleSendMessage(message)
        }
      }
    ];

    for (const config of components) {
      try {
        const component = new config.Component(config.options);
        
        // Wrap with error boundary
        this.errorBoundary.wrap(component);
        
        await component.init();
        this.addChild(config.name, component);
        
        const container = DOMUtils.$(config.container, this.element);
        if (container) {
          container.appendChild(component.element);
        } else {
          throw new UIError(
            `Container not found: ${config.container}`,
            'ChatContainer',
            'initializeChildren'
          );
        }
        
      } catch (error) {
        console.error(`[ChatContainer] Failed to initialize ${config.name}:`, error);
        
        // Add error placeholder
        const container = DOMUtils.$(config.container, this.element);
        if (container) {
          container.appendChild(this.createComponentErrorPlaceholder(config.name));
        }
      }
    }
  }

  async handleSendMessage(message) {
    const messageList = this.getChild('messageList');
    const inputArea = this.getChild('inputArea');
    
    if (!messageList || !inputArea) {
      console.error('[ChatContainer] Required components not available');
      return;
    }
    
    try {
      // Set loading state
      this.setState({ isLoading: true, error: null });
      
      // Add user message
      messageList.addUserMessage(message);
      
      // Show loading
      const loadingId = messageList.addLoadingMessage(
        `Thinking with ${this.getModelName(this.state.selectedModel)}...`
      );
      
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
        // Handle error response
        this.handleAPIError(response, messageList);
      } else if (response.content) {
        messageList.addAssistantMessage(response.content);
        
        // Show cost if available
        if (response.cost && response.cost > 0) {
          messageList.addInfoMessage(`💰 Cost: $${response.cost.toFixed(4)}`);
        }
      } else {
        throw new Error('Invalid response format');
      }

    } catch (error) {
      console.error('[ChatContainer] Send message error:', error);
      
      // Remove loading message if still present
      const messageList = this.getChild('messageList');
      if (messageList) {
        const messages = DOMUtils.$$('.deepweb-message-loading', messageList.element);
        messages.forEach(msg => msg.remove());
      }
      
      // Handle connection errors
      if (error.message.includes('Could not establish connection')) {
        this.showConnectionError(messageList);
      } else {
        const result = ErrorHandler.handleError(error, {
          component: 'ChatContainer',
          action: 'sendMessage'
        });
        
        messageList?.addErrorMessage(result.userMessage);
      }
      
    } finally {
      this.setState({ isLoading: false });
      inputArea?.resetState();
    }
  }

  handleAPIError(response, messageList) {
    const { error, errorCode, suggestions, recoverable, retryAfter } = response;
    
    // Show error message
    messageList.addErrorMessage(error);
    
    // Show suggestions if available
    if (suggestions && suggestions.length > 0) {
      const suggestionText = suggestions.map((s, i) => `${i + 1}. ${s}`).join('\n');
      messageList.addInfoMessage(`💡 Suggestions:\n${suggestionText}`);
    }
    
    // Show retry option if recoverable
    if (recoverable && retryAfter) {
      setTimeout(() => {
        messageList.addInfoMessage(`🔄 You can try again now`);
      }, retryAfter * 1000);
    }
    
    // Update state with error
    this.setState({ 
      error: { code: errorCode, message: error }
    });
  }

  showConnectionError(messageList) {
    messageList?.addErrorMessage(
      'Extension was reloaded. Please refresh the page to reconnect.'
    );
    
    // Add refresh button
    const refreshBtn = DOMUtils.createElement('button', {
      class: 'deepweb-refresh-btn'
    }, {
      textContent: 'Refresh Page',
      style: {
        margin: '10px auto',
        display: 'block',
        padding: '8px 16px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }
    });
    
    refreshBtn.addEventListener('click', () => {
      window.location.reload();
    });
    
    messageList?.element.appendChild(refreshBtn);
  }

  handleComponentError(error) {
    console.error('[ChatContainer] Component error:', error);
    
    // Update state
    this.setState({ error: error.toJSON() });
    
    // Show inline error notification
    this.showErrorNotification(error);
  }

  showErrorNotification(error) {
    // Remove existing notifications
    const existing = DOMUtils.$('.deepweb-error-notification', this.element);
    if (existing) existing.remove();
    
    const notification = DOMUtils.createElement('div', {
      class: 'deepweb-error-notification'
    }, {
      style: {
        position: 'absolute',
        top: '60px',
        left: '10px',
        right: '10px',
        background: '#fee',
        border: '1px solid #fcc',
        borderRadius: '6px',
        padding: '10px',
        fontSize: '13px',
        color: '#c00',
        zIndex: '1000'
      }
    });
    
    const message = DOMUtils.createElement('div', {}, {
      textContent: error.getUserMessage()
    });
    
    const closeBtn = DOMUtils.createElement('button', {
      class: 'deepweb-error-close'
    }, {
      textContent: '✕',
      style: {
        position: 'absolute',
        top: '5px',
        right: '5px',
        background: 'transparent',
        border: 'none',
        fontSize: '16px',
        cursor: 'pointer',
        color: '#c00'
      }
    });
    
    closeBtn.addEventListener('click', () => notification.remove());
    
    notification.appendChild(message);
    notification.appendChild(closeBtn);
    this.element.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }

  createErrorFallback(errorResult) {
    const container = DOMUtils.createElement('div', {
      id: 'deepweb-chat-root',
      class: 'deepweb-error-state'
    });
    
    Object.assign(container.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      width: '380px',
      maxWidth: 'calc(100vw - 40px)',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      padding: '20px',
      textAlign: 'center'
    });
    
    // Create error heading
    const heading = DOMUtils.createElement('h3', {}, {
      textContent: 'Failed to Load Chat',
      style: {
        color: '#c00',
        margin: '0 0 10px'
      }
    });
    
    // Create error message
    const message = DOMUtils.createElement('p', {}, {
      textContent: errorResult.userMessage,
      style: {
        color: '#666',
        margin: '0 0 15px'
      }
    });
    
    // Create reload button
    const button = DOMUtils.createElement('button', {}, {
      textContent: 'Reload Page',
      style: {
        padding: '8px 16px',
        background: '#667eea',
        color: 'white',
        border: 'none',
        borderRadius: '6px',
        cursor: 'pointer'
      }
    });
    
    // Add click event listener
    button.addEventListener('click', () => window.location.reload());
    
    // Append elements to container
    container.appendChild(heading);
    container.appendChild(message);
    container.appendChild(button);
    return container;
  }

  createComponentErrorPlaceholder(componentName) {
    const placeholder = DOMUtils.createElement('div', {
      class: 'deepweb-component-error'
    }, {
      textContent: `Failed to load ${componentName}`,
      style: {
        padding: '10px',
        background: '#fee',
        color: '#c00',
        textAlign: 'center',
        fontSize: '13px',
        borderRadius: '4px'
      }
    });
    
    return placeholder;
  }

  // Rest of the methods remain the same but with error handling...
  
  applyStyles() {
    try {
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
    } catch (error) {
      console.error('[ChatContainer] Failed to apply styles:', error);
    }
  }

  getModelName(modelValue) {
    const names = {
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder',
      'deepseek-reasoner': 'DeepSeek Reasoner'
    };
    return names[modelValue] || modelValue;
  }

  handleModelChange(model) {
    this.setState({ selectedModel: model });
    const messageList = this.getChild('messageList');
    messageList?.addInfoMessage(`🔄 Switched to ${this.getModelName(model)}`);
  }

  toggleMinimize() {
    // Implementation with error handling...
    try {
      this.setState({ isMinimized: !this.state.isMinimized });
      
      const messageList = this.getChild('messageList');
      const inputArea = this.getChild('inputArea');
      const modelSelector = this.getChild('modelSelector');
      const header = this.getChild('header');
      
      if (this.state.isMinimized) {
        messageList?.hide();
        inputArea?.hide();
        modelSelector?.hide();
        this.element.style.height = '60px';
        header?.setMinimizeIcon('□');
      } else {
        messageList?.show();
        inputArea?.show();
        modelSelector?.show();
        this.element.style.height = 'auto';
        header?.setMinimizeIcon('_');
      }
    } catch (error) {
      console.error('[ChatContainer] Error toggling minimize:', error);
    }
  }

  setupEventListeners() {
    // Browser message listener with error handling
    browser.runtime.onMessage.addListener((message) => {
      try {
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
      } catch (error) {
        console.error('[ChatContainer] Error handling browser message:', error);
      }
    });

    // Click handler with error boundary
    this.delegate('#deepweb-messages', 'click', () => {
      try {
        const inputArea = this.getChild('inputArea');
        inputArea?.focusInput();
      } catch (error) {
        // Silent fail for focus errors
      }
    });
  }
}