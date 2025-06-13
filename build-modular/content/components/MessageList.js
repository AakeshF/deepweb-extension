/**
 * Message List Component
 * Displays chat messages
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';

export default class MessageList extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.messageIdCounter = 0;
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('message-list');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.element = fragment.querySelector('#deepweb-messages');
    
    // Apply styles
    this.applyStyles();
    
    // Style welcome message
    this.styleWelcomeMessage();
  }

  applyStyles() {
    Object.assign(this.element.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '16px',
      maxHeight: '350px',
      minHeight: '200px',
      background: '#fafbfc'
    });
  }

  styleWelcomeMessage() {
    const welcomeMsg = DOMUtils.$('.deepweb-welcome-message', this.element);
    if (welcomeMsg) {
      Object.assign(welcomeMsg.style, {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '12px',
        marginBottom: '12px',
        textAlign: 'center'
      });
    }

    const welcomeText = DOMUtils.$('.deepweb-welcome-text', this.element);
    if (welcomeText) {
      Object.assign(welcomeText.style, {
        fontSize: '14px',
        lineHeight: '1.5'
      });
    }

    const welcomeSubtext = DOMUtils.$('.deepweb-welcome-subtext', this.element);
    if (welcomeSubtext) {
      Object.assign(welcomeSubtext.style, {
        fontSize: '12px',
        opacity: '0.9',
        marginTop: '4px'
      });
    }
  }

  addMessage(content, type, id = null) {
    const messageId = id || `msg-${++this.messageIdCounter}`;
    
    const messageDiv = DOMUtils.createElement('div', {
      id: messageId,
      class: `deepweb-message deepweb-message-${type}`,
      role: 'article'
    });

    // Apply type-specific styles
    const styles = this.getMessageStyles(type);
    Object.assign(messageDiv.style, {
      padding: '10px 14px',
      borderRadius: '12px',
      marginBottom: '12px',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.5',
      ...styles
    });

    // Set content safely
    DOMUtils.setTextContent(messageDiv, content);
    
    this.element.appendChild(messageDiv);
    this.scrollToBottom();
    
    return messageId;
  }

  getMessageStyles(type) {
    const styles = {
      user: {
        background: '#e3f2fd',
        color: '#1565c0',
        marginLeft: '60px',
        marginRight: '0',
        border: '1px solid #90caf9',
        textAlign: 'right'
      },
      assistant: {
        background: 'white',
        color: '#333',
        marginLeft: '0',
        marginRight: '60px',
        border: '1px solid #e0e0e0'
      },
      error: {
        background: '#ffebee',
        color: '#c62828',
        border: '1px solid #ef9a9a',
        margin: '0 20px'
      },
      info: {
        background: '#f3e5f5',
        color: '#6a1b9a',
        fontSize: '12px',
        textAlign: 'center',
        margin: '0 40px',
        border: '1px solid #ce93d8'
      },
      loading: {
        background: '#f5f5f5',
        color: '#666',
        marginLeft: '0',
        marginRight: '60px',
        border: '1px solid #e0e0e0',
        fontStyle: 'italic'
      }
    };

    return styles[type] || styles.assistant;
  }

  addUserMessage(content) {
    return this.addMessage(content, 'user');
  }

  addAssistantMessage(content) {
    return this.addMessage(content, 'assistant');
  }

  addErrorMessage(content) {
    return this.addMessage(`❌ ${content}`, 'error');
  }

  addInfoMessage(content) {
    return this.addMessage(content, 'info');
  }

  addLoadingMessage(content) {
    return this.addMessage(content, 'loading');
  }

  removeMessage(messageId) {
    const message = DOMUtils.$(`#${messageId}`, this.element);
    if (message) {
      message.remove();
    }
  }

  clearMessages() {
    // Keep welcome message, remove all others
    const messages = DOMUtils.$$('.deepweb-message', this.element);
    messages.forEach(msg => msg.remove());
  }

  scrollToBottom() {
    this.element.scrollTop = this.element.scrollHeight;
  }

  setupEventListeners() {
    // Smooth scrolling on new messages
    const observer = new MutationObserver(() => {
      this.scrollToBottom();
    });

    observer.observe(this.element, {
      childList: true,
      subtree: true
    });

    // Store observer for cleanup
    this._observer = observer;
  }

  onDestroy() {
    if (this._observer) {
      this._observer.disconnect();
    }
  }
}