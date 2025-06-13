/**
 * Message List Component
 * Displays chat messages with enhanced features
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';
import Message from './Message.js';
import MessageSearch from './MessageSearch.js';
import MarkdownRenderer from '../utils/markdown-renderer.js';
import { animationManager } from '../utils/AnimationManager.js';
import { responsiveManager } from '../utils/ResponsiveManager.js';

export default class MessageList extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    this.state = {
      messages: [],
      searchVisible: false,
      editingMessageId: null,
      scrollPosition: 0,
      isVirtualScrolling: false,
      // Mobile-specific state
      isMobileMode: false,
      textScale: 'normal'
    };
    
    // Options
    this.messageManager = options.messageManager || null;
    this.conversationId = options.conversationId || null;
    this.onMessageUpdate = options.onMessageUpdate || (() => {});
    this.onMessageDelete = options.onMessageDelete || (() => {});
    
    // Virtual scrolling configuration
    this.virtualScrollConfig = {
      itemHeight: 80, // Estimated height per message
      overscan: 5, // Number of items to render outside viewport
      containerHeight: 0,
      scrollTop: 0,
      startIndex: 0,
      endIndex: 0
    };
    
    // Message components map
    this.messageComponents = new Map();
    
    // Legacy support
    this.messageIdCounter = 0;
  }

  async render() {
    // Detect mobile mode
    this.state.isMobileMode = responsiveManager.isMobile() || responsiveManager.isTablet();
    
    // Create container if not exists
    if (!this.element) {
      this.element = DOMUtils.createElement('div', {
        class: 'deepweb-message-list-container'
      });
    }
    
    // Clear existing content
    this.element.innerHTML = '';
    
    // Apply container styles
    Object.assign(this.element.style, {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      position: 'relative'
    });
    
    // Render search component if visible
    if (this.state.searchVisible) {
      await this.renderSearch();
    }
    
    // Render messages container
    await this.renderMessagesContainer();
    
    // Load messages if we have messageManager
    if (this.messageManager && this.conversationId) {
      await this.loadMessages();
    }
  }
  
  async renderSearch() {
    const searchComponent = new MessageSearch({
      messageManager: this.messageManager,
      conversationId: this.conversationId,
      onNavigate: (message) => this.scrollToMessage(message.id)
    });
    
    await searchComponent.init();
    this.element.appendChild(searchComponent.element);
    this.addChild('search', searchComponent);
  }
  
  async renderMessagesContainer() {
    // Load template for welcome message
    const template = await TemplateLoader.loadTemplate('message-list');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.messagesContainer = fragment.querySelector('#deepweb-messages');
    
    // Apply styles
    this.applyStyles();
    
    // Style welcome message
    this.styleWelcomeMessage();
    
    // Add to main element
    this.element.appendChild(this.messagesContainer);
  }

  applyStyles() {
    Object.assign(this.messagesContainer.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '16px',
      maxHeight: '350px',
      minHeight: '200px',
      background: '#fafbfc',
      position: 'relative'
    });
  }

  styleWelcomeMessage() {
    const welcomeMsg = DOMUtils.$('.deepweb-welcome-message', this.messagesContainer);
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

    const welcomeText = DOMUtils.$('.deepweb-welcome-text', this.messagesContainer);
    if (welcomeText) {
      Object.assign(welcomeText.style, {
        fontSize: '14px',
        lineHeight: '1.5'
      });
    }

    const welcomeSubtext = DOMUtils.$('.deepweb-welcome-subtext', this.messagesContainer);
    if (welcomeSubtext) {
      Object.assign(welcomeSubtext.style, {
        fontSize: '12px',
        opacity: '0.9',
        marginTop: '4px'
      });
    }
  }
  
  async loadMessages() {
    if (!this.messageManager || !this.conversationId) return;
    
    try {
      const result = await this.messageManager.list(this.conversationId, {
        pageSize: 100,
        sortOrder: 'asc'
      });
      
      this.setState({ messages: result.items });
      await this.renderMessages();
    } catch (error) {
      console.error('[MessageList] Failed to load messages:', error);
    }
  }
  
  async renderMessages() {
    // Clear existing message components
    this.messageComponents.forEach(component => component.destroy());
    this.messageComponents.clear();
    
    // Check if we should use virtual scrolling
    const shouldVirtualize = this.state.messages.length > 50;
    this.setState({ isVirtualScrolling: shouldVirtualize });
    
    if (shouldVirtualize) {
      await this.renderVirtualMessages();
    } else {
      await this.renderAllMessages();
    }
  }
  
  async renderAllMessages() {
    for (const messageData of this.state.messages) {
      await this.renderMessage(messageData);
    }
    this.scrollToBottom();
  }
  
  async renderVirtualMessages() {
    // Set up virtual scrolling container
    const scrollContainer = DOMUtils.createElement('div', {
      class: 'deepweb-virtual-scroll-container'
    });
    Object.assign(scrollContainer.style, {
      height: `${this.state.messages.length * this.virtualScrollConfig.itemHeight}px`,
      position: 'relative'
    });
    
    // Calculate visible range
    this.updateVirtualScrollRange();
    
    // Render visible messages
    for (let i = this.virtualScrollConfig.startIndex; i <= this.virtualScrollConfig.endIndex; i++) {
      if (this.state.messages[i]) {
        await this.renderMessage(this.state.messages[i], i);
      }
    }
    
    this.messagesContainer.appendChild(scrollContainer);
  }
  
  async renderMessage(messageData, index = null) {
    const messageComponent = new Message({
      message: messageData,
      messageManager: this.messageManager,
      onUpdate: (updated) => this.handleMessageUpdate(updated),
      onDelete: (id) => this.handleMessageDelete(id)
    });
    
    await messageComponent.init();
    
    // Position for virtual scrolling
    if (this.state.isVirtualScrolling && index !== null) {
      Object.assign(messageComponent.element.style, {
        position: 'absolute',
        top: `${index * this.virtualScrollConfig.itemHeight}px`,
        left: '0',
        right: '0'
      });
    }
    
    // Handle quote event
    messageComponent.on('quote', (e) => {
      this.emit('quote', e.detail);
    });
    
    this.messagesContainer.appendChild(messageComponent.element);
    this.messageComponents.set(messageData.id, messageComponent);
  }
  
  updateVirtualScrollRange() {
    const container = this.messagesContainer;
    this.virtualScrollConfig.containerHeight = container.clientHeight;
    this.virtualScrollConfig.scrollTop = container.scrollTop;
    
    const startIndex = Math.max(0, 
      Math.floor(this.virtualScrollConfig.scrollTop / this.virtualScrollConfig.itemHeight) - this.virtualScrollConfig.overscan
    );
    
    const endIndex = Math.min(this.state.messages.length - 1,
      Math.ceil((this.virtualScrollConfig.scrollTop + this.virtualScrollConfig.containerHeight) / this.virtualScrollConfig.itemHeight) + this.virtualScrollConfig.overscan
    );
    
    this.virtualScrollConfig.startIndex = startIndex;
    this.virtualScrollConfig.endIndex = endIndex;
  }
  
  handleMessageUpdate(updatedMessage) {
    // Update message in state
    const messages = this.state.messages.map(msg => 
      msg.id === updatedMessage.id ? updatedMessage : msg
    );
    this.setState({ messages });
    
    // Re-render the specific message
    const component = this.messageComponents.get(updatedMessage.id);
    if (component) {
      component.message = updatedMessage;
      component.render();
    }
    
    // Call parent callback
    this.onMessageUpdate(updatedMessage);
  }
  
  async handleMessageDelete(messageId) {
    // Get component before deletion
    const component = this.messageComponents.get(messageId);
    
    // Animate out if component exists
    if (component && component.element) {
      await animationManager.animate(component.element, 'fadeOut');
    }
    
    // Remove from state
    const messages = this.state.messages.filter(msg => msg.id !== messageId);
    this.setState({ messages });
    
    // Remove component
    if (component) {
      component.destroy();
      this.messageComponents.delete(messageId);
    }
    
    // Call parent callback
    this.onMessageDelete(messageId);
  }

  // New method for adding messages with full data
  async addMessage(messageOrContent, type = null, id = null, timestamp = null) {
    let messageData;
    
    // Check if we received a full message object or just content
    if (typeof messageOrContent === 'object' && messageOrContent.role) {
      // Full message object
      messageData = messageOrContent;
    } else {
      // Legacy support - create message from content
      const messageId = id || `msg-${++this.messageIdCounter}`;
      messageData = {
        id: messageId,
        role: type === 'user' || type === 'assistant' ? type : 'system',
        content: messageOrContent,
        timestamp: timestamp || Date.now(),
        metadata: {},
        state: {
          read: false,
          pinned: false,
          edited: false
        }
      };
    }
    
    // Add to messages if we have messageManager
    if (this.messageManager && this.conversationId && !messageData.id.startsWith('msg_')) {
      try {
        const savedMessage = await this.messageManager.add(this.conversationId, messageData);
        messageData.id = savedMessage.id;
        
        // Update state
        this.state.messages.push(savedMessage);
      } catch (error) {
        console.error('[MessageList] Failed to save message:', error);
      }
    } else {
      // Just add to local state
      this.state.messages.push(messageData);
    }
    
    // Render the new message with animation
    await this.renderMessage(messageData);
    
    // Animate the new message
    const messageComponent = this.messageComponents.get(messageData.id);
    if (messageComponent && messageComponent.element) {
      // Set initial state for animation
      messageComponent.element.style.opacity = '0';
      messageComponent.element.style.transform = 'translateY(20px)';
      
      // Animate in
      await animationManager.animate(messageComponent.element, 'slideIn');
    }
    
    this.scrollToBottom();
    
    return messageData.id;
  }

  // Toggle search visibility
  toggleSearch() {
    this.setState({ searchVisible: !this.state.searchVisible });
    this.render();
  }
  
  // Scroll to specific message
  scrollToMessage(messageId) {
    const component = this.messageComponents.get(messageId);
    if (component && component.element) {
      component.element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Highlight briefly
      this.highlightMessage(messageId);
    }
  }
  
  // Highlight a specific message
  async highlightMessage(messageId) {
    const component = this.messageComponents.get(messageId);
    if (component && component.element) {
      // Add highlight class
      component.element.classList.add('deepweb-message-highlight');
      
      // Pulse animation
      await animationManager.animate(component.element, 'pulse');
      
      // Remove highlight after delay
      setTimeout(() => {
        component.element.classList.remove('deepweb-message-highlight');
      }, 2000);
    }
  }

  addUserMessage(content, timestamp = null) {
    return this.addMessage(content, 'user', null, timestamp);
  }

  addAssistantMessage(content, timestamp = null) {
    return this.addMessage(content, 'assistant', null, timestamp);
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
    // Use the new delete handler
    this.handleMessageDelete(messageId);
  }

  clearMessages() {
    // Clear all message components
    this.messageComponents.forEach(component => component.destroy());
    this.messageComponents.clear();
    
    // Clear state
    this.setState({ messages: [] });
    
    // Keep welcome message, remove all others
    const messages = DOMUtils.$$('.deepweb-message', this.messagesContainer);
    messages.forEach(msg => msg.remove());
  }

  scrollToBottom() {
    if (this.messagesContainer) {
      this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }
  }

  setupEventListeners() {
    // Add required CSS animations and markdown styles
    if (!document.getElementById('deepweb-message-list-styles')) {
      const style = document.createElement('style');
      style.id = 'deepweb-message-list-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        .deepweb-message {
          animation: fadeIn 0.3s ease;
        }
        
        .deepweb-toast {
          animation: fadeIn 0.3s ease;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Add markdown styles if not already present
    if (!document.getElementById('deepweb-markdown-styles')) {
      const markdownStyle = document.createElement('style');
      markdownStyle.id = 'deepweb-markdown-styles';
      markdownStyle.textContent = MarkdownRenderer.getDefaultStyles();
      document.head.appendChild(markdownStyle);
    }
    
    // Smooth scrolling on new messages
    if (this.messagesContainer) {
      const observer = new MutationObserver(() => {
        if (!this.state.isVirtualScrolling) {
          this.scrollToBottom();
        }
      });

      observer.observe(this.messagesContainer, {
        childList: true,
        subtree: true
      });

      // Store observer for cleanup
      this._observer = observer;
      
      // Virtual scrolling handler
      if (this.state.isVirtualScrolling) {
        this.messagesContainer.addEventListener('scroll', this.handleVirtualScroll);
      }
    }
    
    // Add keyboard shortcuts
    this.element.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + F for search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        this.toggleSearch();
      }
    });
  }
  
  handleVirtualScroll = () => {
    if (!this.virtualScrollTimer) {
      this.virtualScrollTimer = setTimeout(() => {
        this.updateVirtualScrollRange();
        this.renderMessages();
        this.virtualScrollTimer = null;
      }, 100);
    }
  }

  onDestroy() {
    if (this._observer) {
      this._observer.disconnect();
    }
    
    if (this.virtualScrollTimer) {
      clearTimeout(this.virtualScrollTimer);
    }
    
    if (this.messagesContainer) {
      this.messagesContainer.removeEventListener('scroll', this.handleVirtualScroll);
    }
    
    // Clean up message components
    this.messageComponents.forEach(component => component.destroy());
    this.messageComponents.clear();
    
    super.onDestroy();
  }
  
  // Legacy methods for backward compatibility
  addUserMessage(content, timestamp = null) {
    return this.addMessage(content, 'user', null, timestamp);
  }

  addAssistantMessage(content, timestamp = null) {
    return this.addMessage(content, 'assistant', null, timestamp);
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
  
  // Add a streaming message component
  async addStreamingMessage(streamingComponent) {
    const messageId = `streaming-${Date.now()}`;
    
    // Initialize the component if needed
    if (!streamingComponent.element) {
      await streamingComponent.init();
    }
    
    // Add to container
    this.messagesContainer.appendChild(streamingComponent.element);
    
    // Track the component
    this.messageComponents.set(messageId, streamingComponent);
    
    // Scroll to bottom
    this.scrollToBottom();
    
    return messageId;
  }
  
  // Replace streaming message with final message
  replaceStreamingMessage(streamingId, messageData) {
    // Remove streaming component
    const streamingComponent = this.messageComponents.get(streamingId);
    if (streamingComponent) {
      streamingComponent.destroy();
      this.messageComponents.delete(streamingId);
    }
    
    // Add regular message
    const finalMessage = {
      ...messageData,
      id: `msg_${Date.now()}_assistant`
    };
    
    return this.addMessage(finalMessage);
  }
  
  // ================================
  // MOBILE RESPONSIVE METHODS
  // ================================
  
  applyMobileLayout() {
    if (!this.state.isMobileMode) return;
    
    this.element.classList.add('mobile-mode');
    
    // Enable touch scrolling
    if (this.messagesContainer) {
      this.messagesContainer.style.webkitOverflowScrolling = 'touch';
      this.messagesContainer.style.overflowY = 'auto';
    }
    
    // Setup mobile interactions
    this.setupMobileInteractions();
  }
  
  setupMobileInteractions() {
    if (!responsiveManager.isTouchDevice()) return;
    
    // Setup scroll optimization for mobile
    this.setupMobileScrolling();
    
    // Setup text selection optimization
    this.setupMobileTextSelection();
    
    // Setup message gestures
    this.setupMessageGestures();
  }
  
  setupMobileScrolling() {
    if (!this.messagesContainer) return;
    
    let isScrolling = false;
    let scrollTimeout;
    
    // Optimize scrolling performance
    this._eventManager.on(this.messagesContainer, 'scroll', () => {
      if (!isScrolling) {
        isScrolling = true;
        this.messagesContainer.classList.add('scrolling');
      }
      
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
        this.messagesContainer.classList.remove('scrolling');
      }, 150);
    }, { passive: true });
    
    // Prevent momentum scrolling beyond content
    this._eventManager.on(this.messagesContainer, 'touchstart', (e) => {
      const container = this.messagesContainer;
      if (container.scrollTop === 0) {
        container.scrollTop = 1;
      } else if (container.scrollTop + container.offsetHeight >= container.scrollHeight) {
        container.scrollTop = container.scrollHeight - container.offsetHeight - 1;
      }
    });
  }
  
  setupMobileTextSelection() {
    // Enhanced text selection for mobile
    this._eventManager.on(this.messagesContainer, 'touchstart', (e) => {
      const messageElement = e.target.closest('.deepweb-message');
      if (messageElement) {
        // Allow text selection on long press
        let longPressTimer = setTimeout(() => {
          messageElement.style.userSelect = 'text';
          messageElement.style.webkitUserSelect = 'text';
        }, 500);
        
        const cancelLongPress = () => {
          clearTimeout(longPressTimer);
          messageElement.style.userSelect = '';
          messageElement.style.webkitUserSelect = '';
        };
        
        messageElement.addEventListener('touchend', cancelLongPress, { once: true });
        messageElement.addEventListener('touchmove', cancelLongPress, { once: true });
      }
    });
  }
  
  setupMessageGestures() {
    let swipeStartX = 0;
    let swipeStartY = 0;
    let isSwipeActive = false;
    
    this._eventManager.on(this.messagesContainer, 'touchstart', (e) => {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      swipeStartX = touch.clientX;
      swipeStartY = touch.clientY;
      isSwipeActive = true;
    });
    
    this._eventManager.on(this.messagesContainer, 'touchmove', (e) => {
      if (!isSwipeActive || e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - swipeStartX;
      const deltaY = touch.clientY - swipeStartY;
      
      // Check for horizontal swipe on message
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 30) {
        const messageElement = e.target.closest('.deepweb-message');
        if (messageElement) {
          // Show message actions on swipe
          this.showMessageActions(messageElement, deltaX > 0 ? 'right' : 'left');
        }
      }
    });
    
    this._eventManager.on(this.messagesContainer, 'touchend', () => {
      isSwipeActive = false;
      // Hide message actions after a delay
      setTimeout(() => {
        this.hideMessageActions();
      }, 2000);
    });
  }
  
  showMessageActions(messageElement, direction) {
    // Remove any existing action indicators
    this.hideMessageActions();
    
    // Create action indicator
    const actionIndicator = DOMUtils.createElement('div', {
      class: `message-action-indicator ${direction}`
    });
    
    if (direction === 'right') {
      actionIndicator.innerHTML = '📋'; // Copy
      actionIndicator.title = 'Copy message';
    } else {
      actionIndicator.innerHTML = '⚙️'; // Options
      actionIndicator.title = 'Message options';
    }
    
    messageElement.appendChild(actionIndicator);
    
    // Add click handler
    actionIndicator.addEventListener('click', (e) => {
      e.stopPropagation();
      if (direction === 'right') {
        this.copyMessage(messageElement);
      } else {
        this.showMessageOptions(messageElement);
      }
      this.hideMessageActions();
    });
    
    this.currentActionIndicator = actionIndicator;
  }
  
  hideMessageActions() {
    if (this.currentActionIndicator && this.currentActionIndicator.parentNode) {
      this.currentActionIndicator.parentNode.removeChild(this.currentActionIndicator);
      this.currentActionIndicator = null;
    }
  }
  
  copyMessage(messageElement) {
    const textContent = messageElement.textContent;
    
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textContent).then(() => {
        this.showMobileToast('Message copied');
      });
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = textContent;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      this.showMobileToast('Message copied');
    }
  }
  
  showMessageOptions(messageElement) {
    // Show context menu with mobile-friendly options
    const contextMenu = DOMUtils.createElement('div', {
      class: 'mobile-message-menu'
    });
    
    contextMenu.innerHTML = `
      <button class="menu-option" data-action="copy">📋 Copy</button>
      <button class="menu-option" data-action="select">✂️ Select Text</button>
      <button class="menu-option" data-action="edit">✏️ Edit</button>
      <button class="menu-option" data-action="delete">🗑️ Delete</button>
    `;
    
    // Position menu
    const rect = messageElement.getBoundingClientRect();
    contextMenu.style.cssText = `
      position: fixed;
      top: ${rect.top - 60}px;
      left: ${rect.left + 20}px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      display: flex;
      flex-direction: column;
      min-width: 160px;
    `;
    
    document.body.appendChild(contextMenu);
    
    // Handle menu actions
    contextMenu.addEventListener('click', (e) => {
      const action = e.target.dataset.action;
      if (action) {
        this.handleMessageAction(messageElement, action);
        document.body.removeChild(contextMenu);
      }
    });
    
    // Remove menu on outside click
    setTimeout(() => {
      const outsideClickHandler = (e) => {
        if (!contextMenu.contains(e.target)) {
          if (contextMenu.parentNode) {
            document.body.removeChild(contextMenu);
          }
          document.removeEventListener('click', outsideClickHandler);
        }
      };
      document.addEventListener('click', outsideClickHandler);
    }, 100);
  }
  
  handleMessageAction(messageElement, action) {
    switch (action) {
      case 'copy':
        this.copyMessage(messageElement);
        break;
      case 'select':
        this.selectMessageText(messageElement);
        break;
      case 'edit':
        // Trigger edit mode if supported
        break;
      case 'delete':
        // Trigger delete if supported
        break;
    }
  }
  
  selectMessageText(messageElement) {
    const range = document.createRange();
    range.selectNodeContents(messageElement);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    
    this.showMobileToast('Text selected');
  }
  
  showMobileToast(message) {
    if (animationManager && animationManager.showToast) {
      animationManager.showToast(message, 'info', 2000);
    }
  }
  
  // Text scaling for mobile
  setTextScale(scale) {
    this.state.textScale = scale;
    this.messagesContainer.classList.remove('text-scale-small', 'text-scale-normal', 'text-scale-large', 'text-scale-extra-large');
    this.messagesContainer.classList.add(`text-scale-${scale}`);
  }
  
  // Mobile scroll optimization
  scrollToBottomMobile() {
    if (this.messagesContainer) {
      // Use smooth scrolling on mobile
      this.messagesContainer.scrollTo({
        top: this.messagesContainer.scrollHeight,
        behavior: responsiveManager.isMobile() ? 'smooth' : 'auto'
      });
    }
  }
  
  // Override scrollToBottom for mobile
  scrollToBottom() {
    if (this.state.isMobileMode) {
      this.scrollToBottomMobile();
    } else {
      // Original scroll behavior for desktop
      if (this.messagesContainer) {
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
      }
    }
  }
}