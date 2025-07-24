/**
 * Chat Container Component
 * Main container for the chat interface
 */

import BaseComponent from './BaseComponent.js';
import Header from './Header.js';
import MessageList from './MessageList.js';
import InputArea from './InputArea.js';
import ModelSelector from './ModelSelector.js';
import ConversationList from './ConversationList.js';
import ConversationHeader from './ConversationHeader.js';
import MessageSearch from './MessageSearch.js';
import ImportDialog from './ImportDialog.js';
import LayoutControls from './LayoutControls.js';
import ThemeSelector from './ThemeSelector.js';
import TemplateSelector from './TemplateSelector.js';
import { ModelParameterControls } from './ModelParameterControls.js';
import ResizeManager from '../utils/ResizeManager.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';
import { ConversationBridge, MessageBridge } from '../utils/conversation-bridge.js';
import ThemeManager from '../utils/ThemeManager.js';
import { animationManager } from '../utils/AnimationManager.js';
import { responsiveManager } from '../utils/ResponsiveManager.js';
import { extractChatContext } from '../utils/context-extractor.js';
import { TemplateManager } from '../../src/intelligence/templates/TemplateManager.js';

export default class ChatContainer extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.state = {
      isMinimized: false,
      isVisible: true,
      selectedModel: 'deepseek-chat',
      currentConversationId: null,
      isSidebarVisible: true,
      isSearchVisible: false,
      streamingEnabled: undefined, // Will use stored preference
      isLayoutControlsVisible: false,
      position: 'bottom-right',
      layoutMode: 'standard',
      opacity: 100,
      isPinned: false,
      // Mobile-specific state
      isMobileMode: false,
      isHeaderCollapsed: false,
      textScale: 'normal',
      pullToRefreshEnabled: true,
      swipeGesturesEnabled: true,
      // Template state
      isTemplateSelectorVisible: false
    };
    
    // Initialize bridges for communication with background script
    this.conversationManager = new ConversationBridge();
    this.messageManager = new MessageBridge();
    
    // Dialog instances
    this.importDialog = null;
    
    // Layout and resize managers
    this.resizeManager = null;
    this.layoutControls = null;
    
    // Theme selector instance
    this.themeSelector = null;
    
    // Template manager
    this.templateManager = null;
    this.templateSelector = null;
    
    // Animation settings instance
    this.animationSettings = null;
    
    // Mobile-specific managers
    this.mobileInteractions = {
      lastScrollTop: 0,
      scrollDirection: 'up',
      headerCollapseThreshold: 50,
      swipeStartX: 0,
      swipeStartY: 0,
      isSwipeActive: false
    };
    
    // Event cleanup functions
    this.responsiveCleanup = [];
  }

  async render() {
    // Initialize theme manager first
    await ThemeManager.initialize();
    
    // Initialize responsive manager
    responsiveManager.initialize();
    
    // Detect mobile mode
    this.state.isMobileMode = responsiveManager.isMobile() || responsiveManager.isTablet();
    
    // Load template
    const template = await TemplateLoader.loadTemplate('chat-container');
    const fragment = TemplateLoader.parseTemplate(template);
    
    // Create main element
    this.element = fragment.querySelector('#deepweb-chat-root');
    
    // Apply styles
    this.applyStyles();
    this.applySidebarStyles();
    this.applyMainChatStyles();
    
    // Apply responsive layout
    this.applyResponsiveLayout();
    
    // Initialize child components
    await this.initializeChildren();
    
    // Initialize conversation
    await this.initializeConversation();
    
    // Add to DOM
    document.body.appendChild(this.element);
    
    // Initialize mobile interactions
    this.initializeMobileInteractions();
    
    // Apply entrance animation
    await this.playEntranceAnimation();
    
    // Initialize resize manager after element is in DOM
    this.initializeResizeManager();
    
    // Initialize layout controls
    await this.initializeLayoutControls();
    
    // Initialize theme selector
    await this.initializeThemeSelector();
    
    // Initialize animation settings
    await this.initializeAnimationSettings();
    
    // Initialize animations
    await this.initializeAnimations();
    
    // Setup responsive event handlers
    this.setupResponsiveHandlers();
  }

  applyStyles() {
    // Load saved position and size preferences
    const savedPrefs = this.loadLayoutPreferences();
    
    // Default styles
    const defaultStyles = {
      position: 'fixed',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '12px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      zIndex: '2147483647',
      display: 'flex',
      flexDirection: 'row',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      lineHeight: '1.5',
      color: '#333',
      overflow: 'hidden',
      transition: 'opacity 0.3s ease'
    };
    
    // Apply saved or default position
    if (savedPrefs.position) {
      this.applyPosition(savedPrefs.position);
    } else {
      Object.assign(defaultStyles, {
        bottom: '20px',
        right: '20px',
        width: '720px',
        maxWidth: 'calc(100vw - 40px)',
        height: '600px',
        maxHeight: 'calc(100vh - 40px)'
      });
    }
    
    // Apply saved size if custom layout
    if (savedPrefs.layoutMode === 'custom' && savedPrefs.width && savedPrefs.height) {
      defaultStyles.width = `${savedPrefs.width}px`;
      defaultStyles.height = `${savedPrefs.height}px`;
    }
    
    Object.assign(this.element.style, defaultStyles);
    
    // Apply saved opacity
    if (savedPrefs.opacity !== undefined) {
      this.setOpacity(savedPrefs.opacity);
    }
  }

  applySidebarStyles() {
    const sidebar = DOMUtils.$('#deepweb-sidebar', this.element);
    if (sidebar) {
      Object.assign(sidebar.style, {
        width: '240px',
        minWidth: '240px',
        maxWidth: '240px',
        height: '100%',
        borderRight: '1px solid #e0e0e0',
        background: '#f8f9fa',
        display: this.state.isSidebarVisible ? 'flex' : 'none',
        flexDirection: 'column',
        transition: 'transform 0.3s ease'
      });
    }
  }

  applyMainChatStyles() {
    const mainChat = DOMUtils.$('#deepweb-main-chat', this.element);
    if (mainChat) {
      Object.assign(mainChat.style, {
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        background: 'white',
        overflow: 'hidden'
      });
    }
  }

  async initializeChildren() {
    // Initialize Conversation List
    const conversationList = new ConversationList({
      onConversationSelect: (conversationId) => this.handleConversationSelect(conversationId),
      onNewConversation: () => this.handleNewConversation(),
      onDeleteConversation: (conversationId) => this.handleDeleteConversation(conversationId),
      onImport: () => this.handleImport()
    });
    await conversationList.init();
    this.addChild('conversationList', conversationList);
    DOMUtils.$('#deepweb-conversation-list-container', this.element).appendChild(conversationList.element);

    // Initialize Header with sidebar toggle, search toggle, and layout controls
    const header = new Header({
      onClose: () => this.hide(),
      onMinimize: () => this.toggleMinimize(),
      onToggleSidebar: () => this.toggleSidebar(),
      onToggleSearch: () => this.toggleSearch(),
      onToggleLayout: () => this.toggleLayoutControls(),
      onToggleAnimationSettings: () => this.toggleAnimationSettings()
    });
    await header.init();
    this.addChild('header', header);
    DOMUtils.$('#deepweb-header-container', this.element).appendChild(header.element);

    // Initialize Conversation Header
    const conversationHeader = new ConversationHeader({
      onTitleUpdate: (conversationId, title) => this.handleRenameConversation(title),
      onArchive: (conversationId, archived) => this.handleArchiveConversation(conversationId, archived),
      onDelete: (conversationId) => this.handleDeleteConversation(conversationId),
      onExport: (conversationId, options) => this.handleExportConversation(conversationId, options)
    });
    await conversationHeader.init();
    this.addChild('conversationHeader', conversationHeader);
    DOMUtils.$('#deepweb-conversation-header-container', this.element).appendChild(conversationHeader.element);

    // Initialize Model Selector
    const modelSelector = new ModelSelector({
      selectedModel: this.state.selectedModel,
      onModelChange: (model) => this.handleModelChange(model)
    });
    await modelSelector.init();
    this.addChild('modelSelector', modelSelector);
    DOMUtils.$('#deepweb-model-container', this.element).appendChild(modelSelector.element);

    // Initialize Model Parameter Controls
    const modelParameterControls = new ModelParameterControls();
    await modelParameterControls.init();
    this.addChild('modelParameterControls', modelParameterControls);
    DOMUtils.$('#deepweb-model-container', this.element).appendChild(modelParameterControls.element);
    
    // Listen for parameter changes
    modelParameterControls.on('parameterChange', (data) => {
      this.handleParameterChange(data);
    });
    
    modelParameterControls.on('presetApplied', (data) => {
      console.log('[DeepWeb] Preset applied:', data);
    });

    // Initialize Message List with message manager and event handlers
    const messageList = new MessageList({
      messageManager: this.messageManager,
      onMessageUpdate: (message) => this.handleMessageUpdate(message),
      onMessageDelete: (messageId) => this.handleMessageDelete(messageId)
    });
    await messageList.init();
    this.addChild('messageList', messageList);
    DOMUtils.$('#deepweb-messages-container', this.element).appendChild(messageList.element);

    // Initialize Input Area
    const inputArea = new InputArea({
      onSendMessage: (message, options) => this.handleSendMessage(message, options),
      onStreamingToggle: (enabled) => this.handleStreamingToggle(enabled),
      onTemplateClick: () => this.toggleTemplateSelector()
    });
    await inputArea.init();
    this.addChild('inputArea', inputArea);
    DOMUtils.$('#deepweb-input-container', this.element).appendChild(inputArea.element);
    
    // Initialize template manager
    await this.initializeTemplateManager();
    
    // Initialize import dialog
    await this.initializeImportDialog();
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

  async initializeConversation() {
    try {
      // Get or create the current conversation
      let currentConv = await this.conversationManager.getCurrentConversation();
      if (!currentConv) {
        currentConv = await this.conversationManager.createConversation({
          title: 'New Chat',
          model: this.state.selectedModel
        });
      }
      
      this.setState({ currentConversationId: currentConv.id });
      
      // Update UI
      await this.loadConversation(currentConv.id);
      
      // Update conversation list
      const conversationList = this.getChild('conversationList');
      if (conversationList) {
        const conversations = await this.conversationManager.getAllConversations();
        conversationList.updateConversations(conversations, currentConv.id);
      }
    } catch (error) {
      console.error('[DeepWeb] Error initializing conversation:', error);
    }
  }

  async loadConversation(conversationId) {
    try {
      // Get conversation details
      const conversation = await this.conversationManager.getConversation(conversationId);
      if (!conversation) return;
      
      // Update conversation header
      const conversationHeader = this.getChild('conversationHeader');
      if (conversationHeader) {
        conversationHeader.updateConversation(conversation);
      }
      
      // Load messages with enhanced features
      const messages = await this.messageManager.getMessages(conversationId);
      const messageList = this.getChild('messageList');
      if (messageList) {
        messageList.clearMessages();
        // Pass the full message objects to support enhanced features
        messages.forEach(msg => {
          messageList.addMessage(msg);
        });
      }
      
      // Update model selector
      if (conversation.model) {
        this.setState({ selectedModel: conversation.model });
        const modelSelector = this.getChild('modelSelector');
        if (modelSelector) {
          modelSelector.setSelectedModel(conversation.model);
        }
      }
    } catch (error) {
      console.error('[DeepWeb] Error loading conversation:', error);
    }
  }

  async toggleMinimize() {
    this.setState({ isMinimized: !this.state.isMinimized });
    
    const messageList = this.getChild('messageList');
    const inputArea = this.getChild('inputArea');
    const modelSelector = this.getChild('modelSelector');
    const conversationHeader = this.getChild('conversationHeader');
    const conversationList = this.getChild('conversationList');
    const header = this.getChild('header');
    const sidebar = DOMUtils.$('#deepweb-sidebar', this.element);
    
    if (this.state.isMinimized) {
      // Animate minimize
      await this.animateMinimize(true);
      
      messageList.hide();
      inputArea.hide();
      modelSelector.hide();
      conversationHeader.hide();
      if (sidebar) sidebar.style.display = 'none';
      this.element.style.height = '60px';
      this.element.style.width = '380px';
      header.setMinimizeIcon('□');
    } else {
      // Restore size first
      this.element.style.height = 'auto';
      this.element.style.width = this.state.isSidebarVisible ? '720px' : '480px';
      
      // Show elements
      messageList.show();
      inputArea.show();
      modelSelector.show();
      conversationHeader.show();
      if (sidebar && this.state.isSidebarVisible) {
        sidebar.style.display = 'flex';
      }
      header.setMinimizeIcon('_');
      
      // Animate restore
      await this.animateMinimize(false);
    }
  }

  handleModelChange(model) {
    this.setState({ selectedModel: model });
    const messageList = this.getChild('messageList');
    messageList.addInfoMessage(`🔄 Switched to ${this.getModelName(model)}`);
  }

  handleParameterChange(data) {
    // Store the parameters for use in API calls
    this.modelParameters = data.allParameters;
    console.log('[DeepWeb] Model parameters updated:', data);
    
    // Store parameters in browser storage for persistence
    browser.storage.local.set({ 
      modelParameters: this.modelParameters 
    });
  }

  getModelName(modelValue) {
    const names = {
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder',
      'deepseek-reasoner': 'DeepSeek Reasoner'
    };
    return names[modelValue] || modelValue;
  }

  async handleSendMessage(message, options = {}) {
    const messageList = this.getChild('messageList');
    const inputArea = this.getChild('inputArea');
    
    // Check for template shortcuts
    if (this.templateManager) {
      const shortcutMatch = this.templateManager.matchShortcut(message);
      if (shortcutMatch) {
        // Show template selector with matched template
        this.showTemplateSelector();
        if (this.templateSelector) {
          this.templateSelector.selectTemplate(shortcutMatch.template.id, shortcutMatch.args);
        }
        return;
      }
    }
    
    // Ensure we have a conversation
    if (!this.state.currentConversationId) {
      await this.initializeConversation();
    }
    
    // Create and save user message
    const userMessage = {
      id: 'msg_' + Date.now() + '_user',
      conversationId: this.state.currentConversationId,
      role: 'user',
      content: message,
      timestamp: Date.now(),
      metadata: {
        model: this.state.selectedModel
      }
    };
    
    const userMessageId = await this.messageManager.addMessage(userMessage);
    userMessage.id = userMessageId; // Update with actual ID from storage
    
    // Add user message to UI with full message object
    messageList.addMessage(userMessage);
    
    // Use streaming preference from options or state
    const useStreaming = options.streaming !== undefined ? options.streaming : 
                        (this.state.streamingEnabled !== undefined ? this.state.streamingEnabled : true);
    
    if (useStreaming) {
      await this.handleStreamingMessage(message);
    } else {
      await this.handleNonStreamingMessage(message);
    }
    
    inputArea.resetState();
  }
  
  async handleNonStreamingMessage(message) {
    const messageList = this.getChild('messageList');
    
    // Show loading
    const loadingId = messageList.addLoadingMessage(
      `Thinking with ${this.getModelName(this.state.selectedModel)}...`
    );
    
    try {
      // Process message with context manager
      let contextData = {};
      if (this.contextManager) {
        const messageContext = await this.contextManager.processMessage({
          role: 'user',
          content: message
        });
        
        // Build comprehensive context
        const fullContext = await this.contextManager.buildContext({
          query: message,
          targetModel: this.state.selectedModel
        });
        
        contextData = {
          pageContent: fullContext.current?.relevantSections?.join('\n\n') || '',
          contentType: fullContext.meta?.primaryTopic,
          relevantSections: fullContext.current?.relevantSections || [],
          metadata: fullContext.meta || {},
          memory: fullContext.memory?.insights || {},
          crossPage: fullContext.crossPage || {},
          contextSummary: fullContext.summary
        };
      } else {
        // Fallback to smart context extraction
        const context = await extractChatContext({
          userQuery: message,
          model: this.state.selectedModel,
          includeMetadata: true,
          maxLength: 4000
        });
        contextData = context;
      }
      
      // Send to background with enhanced context and model parameters
      const response = await browser.runtime.sendMessage({
        type: 'chat_request',
        message: message,
        model: this.state.selectedModel,
        conversationId: this.state.currentConversationId,
        stream: false,
        context: contextData,
        parameters: this.modelParameters || {}
      });

      // Remove loading message
      messageList.removeMessage(loadingId);

      if (!response) {
        throw new Error('No response received from background script');
      }

      if (response.error) {
        messageList.addErrorMessage(response.error);
      } else if (response.content) {
        // Create and save assistant message
        const assistantMessage = {
          id: 'msg_' + Date.now() + '_assistant',
          conversationId: this.state.currentConversationId,
          role: 'assistant',
          content: response.content,
          timestamp: Date.now(),
          metadata: {
            model: this.state.selectedModel
          },
          cost: response.cost
        };
        
        const assistantMessageId = await this.messageManager.addMessage(assistantMessage);
        assistantMessage.id = assistantMessageId; // Update with actual ID from storage
        
        messageList.addMessage(assistantMessage);
        
        // Process assistant response with context manager
        if (this.contextManager) {
          await this.contextManager.processMessage({
            role: 'assistant',
            content: response.content
          });
        }
        
        // Update conversation timestamp and cost
        await this.conversationManager.updateConversation(this.state.currentConversationId, {
          lastMessageAt: new Date().toISOString(),
          totalCost: (await this.conversationManager.getConversation(this.state.currentConversationId)).totalCost + (response.cost || 0)
        });
        
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
    }
  }
  
  async handleStreamingMessage(message) {
    const messageList = this.getChild('messageList');
    let streamingMessageId = null;
    let port = null;
    let streamId = null;
    
    try {
      // Create streaming message component
      const { default: StreamingMessage } = await import('./StreamingMessage.js');
      const streamingMessage = new StreamingMessage();
      
      // Add streaming message to UI
      streamingMessageId = messageList.addStreamingMessage(streamingMessage);
      
      // Create port connection
      port = browser.runtime.connect({ name: 'streaming' });
      
      // Set up port message handlers
      port.onMessage.addListener(async (msg) => {
        switch (msg.type) {
          case 'stream_started':
            streamId = msg.streamId;
            console.log('[DeepWeb] Stream started:', streamId);
            break;
            
          case 'stream_content':
            // This is handled by the streaming generator
            break;
            
          case 'stream_done':
            console.log('[DeepWeb] Stream completed');
            
            // Save assistant message
            const assistantMessage = {
              id: 'msg_' + Date.now() + '_assistant',
              conversationId: this.state.currentConversationId,
              role: 'assistant',
              content: msg.content,
              timestamp: Date.now(),
              metadata: {
                model: this.state.selectedModel
              },
              cost: msg.cost
            };
            
            const assistantMessageId = await this.messageManager.addMessage(assistantMessage);
            assistantMessage.id = assistantMessageId;
            
            // Update conversation
            const conversation = await this.conversationManager.getConversation(this.state.currentConversationId);
            await this.conversationManager.updateConversation(this.state.currentConversationId, {
              lastMessageAt: new Date().toISOString(),
              totalCost: (conversation.totalCost || 0) + (msg.cost || 0)
            });
            
            // Process assistant response with context manager
            if (this.contextManager) {
              await this.contextManager.processMessage({
                role: 'assistant',
                content: msg.content
              });
            }
            
            // Show cost if available
            if (msg.cost && msg.cost > 0) {
              messageList.addInfoMessage(`💰 Cost: $${msg.cost.toFixed(4)}`);
            }
            break;
            
          case 'stream_cancelled':
            console.log('[DeepWeb] Stream cancelled');
            break;
            
          case 'error':
            throw new Error(msg.error);
        }
      });
      
      // Create async generator for streaming
      async function* createStreamGenerator() {
        return new Promise((resolve, reject) => {
          const events = [];
          let isComplete = false;
          
          port.onMessage.addListener((msg) => {
            if (msg.type === 'stream_content') {
              events.push({
                type: 'content',
                content: msg.content
              });
            } else if (msg.type === 'stream_done') {
              events.push({
                type: 'done',
                usage: msg.usage,
                cost: msg.cost,
                content: msg.content
              });
              isComplete = true;
              resolve();
            } else if (msg.type === 'error') {
              reject(new Error(msg.error));
            }
          });
          
          // Yield events as they come
          const checkEvents = setInterval(() => {
            while (events.length > 0) {
              const event = events.shift();
              // This is a hack to yield from within the promise
              // In a real implementation, we'd use a proper async iterator
            }
            
            if (isComplete) {
              clearInterval(checkEvents);
            }
          }, 10);
        });
      }
      
      // Alternative implementation using a more direct approach
      const streamGenerator = {
        [Symbol.asyncIterator]() {
          const events = [];
          let resolver = null;
          let rejecter = null;
          let done = false;
          
          // Set up message handler
          const messageHandler = (msg) => {
            if (msg.type === 'stream_content') {
              events.push({
                type: 'content',
                content: msg.content
              });
              if (resolver) {
                const resolve = resolver;
                resolver = null;
                resolve();
              }
            } else if (msg.type === 'stream_done') {
              events.push({
                type: 'done',
                usage: msg.usage,
                cost: msg.cost,
                content: msg.content
              });
              done = true;
              if (resolver) {
                const resolve = resolver;
                resolver = null;
                resolve();
              }
            } else if (msg.type === 'error') {
              done = true;
              if (rejecter) {
                const reject = rejecter;
                rejecter = null;
                reject(new Error(msg.error));
              }
            }
          };
          
          port.onMessage.addListener(messageHandler);
          
          return {
            async next() {
              if (events.length > 0) {
                return { value: events.shift(), done: false };
              }
              
              if (done) {
                return { done: true };
              }
              
              // Wait for next event
              await new Promise((resolve, reject) => {
                resolver = resolve;
                rejecter = reject;
              });
              
              if (events.length > 0) {
                return { value: events.shift(), done: false };
              }
              
              return { done: true };
            }
          };
        }
      };
      
      // Process message with context manager
      let contextData = {};
      if (this.contextManager) {
        const messageContext = await this.contextManager.processMessage({
          role: 'user',
          content: message
        });
        
        // Build comprehensive context
        const fullContext = await this.contextManager.buildContext({
          query: message,
          targetModel: this.state.selectedModel
        });
        
        contextData = {
          pageContent: fullContext.current?.relevantSections?.join('\n\n') || '',
          contentType: fullContext.meta?.primaryTopic,
          relevantSections: fullContext.current?.relevantSections || [],
          metadata: fullContext.meta || {},
          memory: fullContext.memory?.insights || {},
          crossPage: fullContext.crossPage || {},
          contextSummary: fullContext.summary
        };
      } else {
        // Fallback to smart context extraction
        const context = await extractChatContext({
          userQuery: message,
          model: this.state.selectedModel,
          includeMetadata: true,
          maxLength: 4000
        });
        contextData = context;
      }
      
      // Start streaming request with enhanced context and model parameters
      port.postMessage({
        type: 'start_stream',
        message: message,
        model: this.state.selectedModel,
        conversationId: this.state.currentConversationId,
        stream: true,
        context: contextData,
        parameters: this.modelParameters || {}
      });
      
      // Handle cancellation
      const handleCancel = () => {
        if (port && streamId) {
          port.postMessage({
            type: 'cancel_stream',
            streamId: streamId
          });
        }
      };
      
      // Start streaming
      await streamingMessage.startStreaming(streamGenerator, handleCancel);
      
      // Replace streaming message with regular message
      const finalContent = streamingMessage.getContent();
      if (finalContent) {
        messageList.replaceStreamingMessage(streamingMessageId, {
          role: 'assistant',
          content: finalContent,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('[DeepWeb] Streaming error:', error);
      
      // Remove streaming message and show error
      if (streamingMessageId) {
        messageList.removeMessage(streamingMessageId);
      }
      
      messageList.addErrorMessage(error.message || 'Failed to stream response');
      
    } finally {
      // Clean up port connection
      if (port) {
        port.disconnect();
      }
    }
  }

  toggle() {
    if (this.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  async show() {
    super.show();
    this.setState({ isVisible: true });
    
    // Play entrance animation
    await this.playEntranceAnimation();
    
    const inputArea = this.getChild('inputArea');
    if (inputArea) {
      inputArea.focusInput();
    }
  }

  async hide() {
    // Play exit animation
    await this.playExitAnimation();
    
    super.hide();
    this.setState({ isVisible: false });
  }

  async handleConversationSelect(conversationId) {
    if (conversationId === this.state.currentConversationId) return;
    
    this.setState({ currentConversationId: conversationId });
    await this.loadConversation(conversationId);
    
    // Update conversation as current
    await this.conversationManager.setCurrentConversation(conversationId);
  }

  async handleNewConversation() {
    try {
      const newConv = await this.conversationManager.createConversation({
        title: 'New Chat',
        model: this.state.selectedModel
      });
      
      this.setState({ currentConversationId: newConv.id });
      await this.loadConversation(newConv.id);
      
      // Update conversation list
      const conversationList = this.getChild('conversationList');
      if (conversationList) {
        const conversations = await this.conversationManager.getAllConversations();
        conversationList.updateConversations(conversations, newConv.id);
      }
    } catch (error) {
      console.error('[DeepWeb] Error creating new conversation:', error);
    }
  }

  async handleDeleteConversation(conversationId) {
    try {
      await this.conversationManager.deleteConversation(conversationId);
      
      // If deleted conversation was current, create a new one
      if (conversationId === this.state.currentConversationId) {
        await this.handleNewConversation();
      }
      
      // Update conversation list
      const conversationList = this.getChild('conversationList');
      if (conversationList) {
        const conversations = await this.conversationManager.getAllConversations();
        conversationList.updateConversations(conversations, this.state.currentConversationId);
      }
    } catch (error) {
      console.error('[DeepWeb] Error deleting conversation:', error);
    }
  }

  async handleRenameConversation(newName) {
    if (!this.state.currentConversationId) return;
    
    try {
      await this.conversationManager.updateConversation(this.state.currentConversationId, {
        title: newName
      });
      
      // Update conversation list
      const conversationList = this.getChild('conversationList');
      if (conversationList) {
        const conversations = await this.conversationManager.getAllConversations();
        conversationList.updateConversations(conversations, this.state.currentConversationId);
      }
    } catch (error) {
      console.error('[DeepWeb] Error renaming conversation:', error);
    }
  }

  async handleClearConversation() {
    if (!this.state.currentConversationId) return;
    
    try {
      // Clear messages from storage
      await this.messageManager.clearMessages(this.state.currentConversationId);
      
      // Clear message list UI
      const messageList = this.getChild('messageList');
      if (messageList) {
        messageList.clearMessages();
      }
      
      // Reset conversation cost
      await this.conversationManager.updateConversation(this.state.currentConversationId, {
        totalCost: 0
      });
    } catch (error) {
      console.error('[DeepWeb] Error clearing conversation:', error);
    }
  }

  async toggleSidebar() {
    this.setState({ isSidebarVisible: !this.state.isSidebarVisible });
    
    const sidebar = DOMUtils.$('#deepweb-sidebar', this.element);
    if (sidebar) {
      if (this.state.isSidebarVisible) {
        // Show sidebar with animation
        sidebar.style.display = 'flex';
        sidebar.classList.remove('deepweb-sidebar-hidden');
        await animationManager.animate(sidebar, 'slideInLeft');
      } else {
        // Hide sidebar with animation
        sidebar.classList.add('deepweb-sidebar-hidden');
        await animationManager.animate(sidebar, 'slideOut');
        sidebar.style.display = 'none';
      }
    }
    
    // Adjust main chat width with animation
    this.element.style.transition = 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
    if (this.state.isSidebarVisible) {
      this.element.style.width = '720px';
    } else {
      this.element.style.width = '480px';
    }
    
    // Remove transition after animation
    setTimeout(() => {
      this.element.style.transition = '';
    }, 300);
  }

  async toggleSearch() {
    this.setState({ isSearchVisible: !this.state.isSearchVisible });
    
    const searchContainer = DOMUtils.$('#deepweb-search-container', this.element);
    
    if (this.state.isSearchVisible) {
      // Initialize search if not already done
      if (!this.getChild('messageSearch')) {
        const messageSearch = new MessageSearch({
          messageManager: this.messageManager,
          conversationId: this.state.currentConversationId,
          onNavigate: (message) => this.handleSearchNavigate(message)
        });
        await messageSearch.init();
        this.addChild('messageSearch', messageSearch);
        searchContainer.appendChild(messageSearch.element);
      } else {
        // Update conversation ID if changed
        const messageSearch = this.getChild('messageSearch');
        messageSearch.conversationId = this.state.currentConversationId;
      }
      
      searchContainer.style.display = 'block';
    } else {
      searchContainer.style.display = 'none';
    }
  }

  handleSearchNavigate(message) {
    // Scroll to the message in the message list
    const messageList = this.getChild('messageList');
    if (messageList) {
      messageList.scrollToMessage(message.id);
      messageList.highlightMessage(message.id);
    }
  }

  async handleMessageUpdate(message) {
    // Message was updated, refresh if needed
    try {
      // Update in storage
      await this.messageManager.updateMessage(message.id, message);
      
      // Update conversation timestamp
      await this.conversationManager.updateConversation(this.state.currentConversationId, {
        lastMessageAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[DeepWeb] Error updating message:', error);
    }
  }

  async handleMessageDelete(messageId) {
    // Message was deleted, refresh if needed
    try {
      // Delete from storage
      await this.messageManager.deleteMessage(messageId);
      
      // Update conversation timestamp
      await this.conversationManager.updateConversation(this.state.currentConversationId, {
        lastMessageAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('[DeepWeb] Error deleting message:', error);
    }
  }

  handleStreamingToggle(enabled) {
    this.setState({ streamingEnabled: enabled });
    const messageList = this.getChild('messageList');
    if (messageList) {
      messageList.addInfoMessage(`💫 Streaming ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  async initializeImportDialog() {
    if (!this.importDialog) {
      this.importDialog = new ImportDialog();
      this.importDialog.onImportComplete = async (result) => {
        await this.handleImportComplete(result);
      };
      await this.importDialog.init();
      document.body.appendChild(this.importDialog.element);
    }
  }

  handleImport() {
    if (this.importDialog) {
      this.importDialog.open();
    }
  }

  async handleImportComplete(result) {
    // Refresh conversation list
    const conversationList = this.getChild('conversationList');
    if (conversationList) {
      const conversations = await this.conversationManager.getAllConversations();
      conversationList.updateConversations(conversations, this.state.currentConversationId);
    }
    
    // Show success message
    const messageList = this.getChild('messageList');
    if (messageList && result.imported > 0) {
      messageList.addInfoMessage(`✅ Successfully imported ${result.imported} conversation(s)`);
    }
  }

  async handleArchiveConversation(conversationId, archived) {
    try {
      await this.conversationManager.updateConversation(conversationId, { archived });
      
      // Update conversation list
      const conversationList = this.getChild('conversationList');
      if (conversationList) {
        const conversations = await this.conversationManager.getAllConversations();
        conversationList.updateConversations(conversations, this.state.currentConversationId);
      }
      
      // Show confirmation
      const messageList = this.getChild('messageList');
      if (messageList) {
        messageList.addInfoMessage(`📦 Conversation ${archived ? 'archived' : 'unarchived'}`);
      }
    } catch (error) {
      console.error('[DeepWeb] Error archiving conversation:', error);
    }
  }

  async handleExportConversation(conversationId, options) {
    // This will be handled by the ExportDialog component
    // The ConversationHeader already shows the ExportDialog
    console.log('[DeepWeb] Export requested for conversation:', conversationId, options);
  }

  // Resize and Layout Management
  initializeResizeManager() {
    const savedPrefs = this.loadLayoutPreferences();
    
    this.resizeManager = new ResizeManager({
      container: document.body,
      minWidth: 320,
      minHeight: 400,
      maxWidth: window.innerWidth * 0.9,
      maxHeight: window.innerHeight * 0.9,
      preferencesKey: 'deepweb-resize-preferences',
      onResize: (dimensions) => this.handleResize(dimensions),
      onPositionChange: (position) => this.handlePositionChange(position),
      keyboardEnabled: true,
      magneticEdges: true,
      snapThreshold: 20
    });
    
    // Initialize with chat element
    this.resizeManager.initialize(this.element);
    
    // Apply saved layout mode if exists
    if (savedPrefs.layoutMode && savedPrefs.layoutMode !== 'custom') {
      this.resizeManager.setLayout(savedPrefs.layoutMode);
    }
    
    // Handle window resize
    this.handleWindowResize();
  }

  async initializeLayoutControls() {
    const savedPrefs = this.loadLayoutPreferences();
    
    this.layoutControls = new LayoutControls({
      currentLayout: savedPrefs.layoutMode || 'standard',
      currentPosition: savedPrefs.position || 'bottom-right',
      currentOpacity: savedPrefs.opacity || 100,
      isPinned: savedPrefs.isPinned || false,
      onLayoutChange: (layout, preset) => this.handleLayoutChange(layout, preset),
      onPositionChange: (position) => this.handlePositionPresetChange(position),
      onOpacityChange: (opacity) => this.handleOpacityChange(opacity),
      onPin: (isPinned) => this.handlePin(isPinned),
      onReset: () => this.handleLayoutReset(),
      onThemeClick: () => this.showThemeSelector()
    });
    
    await this.layoutControls.init();
    this.addChild('layoutControls', this.layoutControls);
    
    // Add to header container area
    const headerContainer = DOMUtils.$('#deepweb-header-container', this.element);
    headerContainer.appendChild(this.layoutControls.element);
  }

  toggleLayoutControls() {
    this.setState({ isLayoutControlsVisible: !this.state.isLayoutControlsVisible });
    
    if (this.layoutControls) {
      this.layoutControls.toggle();
    }
  }

  handleResize(dimensions) {
    // Update state
    if (dimensions.preset) {
      this.setState({ layoutMode: dimensions.preset });
    }
    
    // Save preferences
    this.saveLayoutPreferences();
    
    // Adjust sidebar visibility for small widths
    if (dimensions.width < 600 && this.state.isSidebarVisible) {
      this.toggleSidebar();
    }
  }

  handlePositionChange(position) {
    // Save preferences
    this.saveLayoutPreferences();
  }

  handleLayoutChange(layout, preset) {
    this.setState({ layoutMode: layout });
    
    if (this.resizeManager) {
      this.resizeManager.setLayout(layout);
    }
    
    // Adjust sidebar for compact layout
    if (layout === 'compact' && this.state.isSidebarVisible) {
      this.toggleSidebar();
    }
  }

  handlePositionPresetChange(position) {
    this.setState({ position });
    
    if (this.resizeManager) {
      this.resizeManager.setPosition(position);
    }
  }

  handleOpacityChange(opacity) {
    this.setState({ opacity });
    this.setOpacity(opacity);
    this.saveLayoutPreferences();
  }

  setOpacity(opacity) {
    const opacityValue = opacity / 100;
    this.element.style.opacity = opacityValue;
    
    // Add visual feedback for low opacity
    if (opacity < 70) {
      this.element.style.backdropFilter = 'blur(2px)';
    } else {
      this.element.style.backdropFilter = 'none';
    }
  }

  handlePin(isPinned) {
    this.setState({ isPinned });
    
    // Update z-index based on pin state
    if (isPinned) {
      this.element.style.zIndex = '2147483647';
    } else {
      this.element.style.zIndex = '2147483646';
    }
    
    this.saveLayoutPreferences();
  }

  handleLayoutReset() {
    // Reset to default state
    this.setState({
      position: 'bottom-right',
      layoutMode: 'standard',
      opacity: 100,
      isPinned: false
    });
    
    // Reset styles
    this.element.style.opacity = '1';
    this.element.style.backdropFilter = 'none';
    this.element.style.zIndex = '2147483647';
    
    // Reset position and size
    if (this.resizeManager) {
      this.resizeManager.setPosition('bottom-right');
      this.resizeManager.setLayout('standard');
    }
    
    // Clear saved preferences
    this.clearLayoutPreferences();
  }

  applyPosition(position) {
    const positions = {
      'top-left': { top: '20px', left: '20px' },
      'top-right': { top: '20px', right: '20px' },
      'bottom-left': { bottom: '20px', left: '20px' },
      'bottom-right': { bottom: '20px', right: '20px' },
      'left-sidebar': { top: '0', left: '0', bottom: '0', width: '400px', height: '100vh' },
      'right-sidebar': { top: '0', right: '0', bottom: '0', width: '400px', height: '100vh' },
      'floating': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    };
    
    const pos = positions[position];
    if (pos) {
      // Clear all position styles first
      ['top', 'right', 'bottom', 'left', 'transform'].forEach(prop => {
        this.element.style[prop] = '';
      });
      
      // Apply new position
      Object.assign(this.element.style, pos);
    }
  }

  handleWindowResize() {
    let resizeTimeout;
    
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // Ensure chat stays within viewport
        const rect = this.element.getBoundingClientRect();
        const maxWidth = window.innerWidth - 40;
        const maxHeight = window.innerHeight - 40;
        
        if (rect.width > maxWidth) {
          this.element.style.width = `${maxWidth}px`;
        }
        
        if (rect.height > maxHeight) {
          this.element.style.height = `${maxHeight}px`;
        }
        
        // Update resize manager constraints
        if (this.resizeManager) {
          this.resizeManager.maxWidth = window.innerWidth * 0.9;
          this.resizeManager.maxHeight = window.innerHeight * 0.9;
        }
      }, 250);
    });
  }

  saveLayoutPreferences() {
    const rect = this.element.getBoundingClientRect();
    const prefs = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      position: this.state.position,
      layoutMode: this.state.layoutMode,
      opacity: this.state.opacity,
      isPinned: this.state.isPinned,
      timestamp: Date.now()
    };
    
    localStorage.setItem('deepweb-layout-preferences', JSON.stringify(prefs));
  }

  loadLayoutPreferences() {
    try {
      const saved = localStorage.getItem('deepweb-layout-preferences');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('[DeepWeb] Failed to load layout preferences:', e);
      return {};
    }
  }

  clearLayoutPreferences() {
    localStorage.removeItem('deepweb-layout-preferences');
    localStorage.removeItem('deepweb-resize-preferences');
  }

  async initializeThemeSelector() {
    this.themeSelector = new ThemeSelector({
      onThemeSelect: (themeId) => this.handleThemeChange(themeId),
      onClose: () => this.hideThemeSelector()
    });
    
    await this.themeSelector.init();
    this.addChild('themeSelector', this.themeSelector);
    
    // Add to body but keep hidden initially
    document.body.appendChild(this.themeSelector.element);
    this.themeSelector.hide();
  }

  handleThemeChange(themeId) {
    ThemeManager.applyTheme(themeId);
    this.hideThemeSelector();
    
    // Show confirmation
    const messageList = this.getChild('messageList');
    if (messageList) {
      const theme = ThemeManager.getTheme(themeId);
      messageList.addInfoMessage(`🎨 Theme changed to ${theme.name}`);
    }
  }

  showThemeSelector() {
    if (this.themeSelector) {
      this.themeSelector.show();
    }
  }

  hideThemeSelector() {
    if (this.themeSelector) {
      this.themeSelector.hide();
    }
  }
  
  async initializeAnimationSettings() {
    const { default: AnimationSettings } = await import('./AnimationSettings.js');
    
    this.animationSettings = new AnimationSettings({
      onClose: () => this.hideAnimationSettings()
    });
    
    await this.animationSettings.init();
    this.addChild('animationSettings', this.animationSettings);
    
    // Add to body but keep hidden initially
    document.body.appendChild(this.animationSettings.element);
    this.animationSettings.element.style.display = 'none';
  }
  
  toggleAnimationSettings() {
    if (this.animationSettings) {
      this.animationSettings.show();
    }
  }
  
  hideAnimationSettings() {
    if (this.animationSettings) {
      this.animationSettings.element.style.display = 'none';
    }
  }
  
  // Animation Methods
  async playEntranceAnimation() {
    // Apply entrance animation to chat container
    this.element.style.transform = 'translateY(20px)';
    this.element.style.opacity = '0';
    
    await animationManager.animate(this.element, 'slideIn');
    
    // Stagger animate child components
    const childElements = [
      this.getChild('header')?.element,
      this.getChild('conversationHeader')?.element,
      this.getChild('modelSelector')?.element,
      this.getChild('messageList')?.element,
      this.getChild('inputArea')?.element
    ].filter(Boolean);
    
    if (childElements.length > 0) {
      await animationManager.animateStagger(childElements, 'fadeIn', 100);
    }
  }
  
  async playExitAnimation() {
    // Animate out chat container
    await animationManager.animate(this.element, 'slideOut');
  }
  
  async animateMinimize(minimize) {
    if (minimize) {
      // Scale down animation
      await animationManager.animate(this.element, 'scaleOut', { duration: 200 });
    } else {
      // Scale up animation
      await animationManager.animate(this.element, 'scaleIn', { duration: 200 });
    }
  }
  
  // Apply micro-interactions to UI elements
  initializeMicroInteractions() {
    // Apply hover effects to buttons
    const buttons = this.element.querySelectorAll('button, .deepweb-control-btn');
    buttons.forEach(button => {
      animationManager.applyMicroInteraction(button, 'hover');
      animationManager.applyMicroInteraction(button, 'click');
    });
    
    // Apply ripple effect to send button
    const sendBtn = this.element.querySelector('.deepweb-send-btn');
    if (sendBtn) {
      animationManager.applyMicroInteraction(sendBtn, 'ripple');
    }
    
    // Apply focus animations to inputs
    const inputs = this.element.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      animationManager.applyMicroInteraction(input, 'focus');
    });
  }
  
  // Show loading state with animation
  showLoadingState(message = 'Loading...') {
    const loadingContainer = document.createElement('div');
    loadingContainer.className = 'deepweb-loading-overlay';
    loadingContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(255, 255, 255, 0.9);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    `;
    
    const spinner = animationManager.createSpinner('medium');
    const text = document.createElement('div');
    text.textContent = message;
    text.style.cssText = `
      margin-top: 12px;
      color: var(--theme-text-secondary);
      font-size: 14px;
    `;
    
    loadingContainer.appendChild(spinner);
    loadingContainer.appendChild(text);
    this.element.appendChild(loadingContainer);
    
    // Animate in
    animationManager.animate(loadingContainer, 'fadeIn');
    
    return loadingContainer;
  }
  
  // Hide loading state
  async hideLoadingState(loadingElement) {
    if (loadingElement && loadingElement.parentNode) {
      await animationManager.animate(loadingElement, 'fadeOut');
      loadingElement.remove();
    }
  }
  
  // Show notification toast
  showNotification(message, type = 'info') {
    animationManager.showToast(message, type, 3000);
  }
  
  // Initialize animations after all components are ready
  async initializeAnimations() {
    // Apply micro-interactions
    this.initializeMicroInteractions();
    
    // Listen for animation preference changes
    window.addEventListener('deepweb-reduced-motion-change', (e) => {
      // Re-initialize interactions based on new preference
      if (e.detail.reducedMotion) {
        this.element.classList.add('deepweb-no-animations');
      } else {
        this.element.classList.remove('deepweb-no-animations');
      }
    });
  }
  
  // ================================
  // MOBILE RESPONSIVE METHODS
  // ================================
  
  applyResponsiveLayout() {
    // Apply device-specific classes
    this.element.setAttribute('data-device', responsiveManager.getDevice());
    this.element.setAttribute('data-orientation', responsiveManager.getOrientation());
    
    if (responsiveManager.isTouchDevice()) {
      this.element.classList.add('touch-device');
    }
    
    if (this.state.isMobileMode) {
      this.element.classList.add('mobile-mode');
      this.adjustMobileLayout();
    }
  }
  
  adjustMobileLayout() {
    // Force sidebar closed on mobile
    if (this.state.isMobileMode && this.state.isSidebarVisible) {
      this.state.isSidebarVisible = false;
    }
    
    // Adjust text scaling
    this.applyTextScale(this.state.textScale);
    
    // Enable pull-to-refresh for mobile
    if (responsiveManager.isMobile() && this.state.pullToRefreshEnabled) {
      this.setupPullToRefresh();
    }
  }
  
  initializeMobileInteractions() {
    if (!this.state.isMobileMode) return;
    
    // Setup scroll-based header collapse
    this.setupHeaderCollapse();
    
    // Setup touch-friendly button sizes
    this.makeTouchFriendly();
    
    // Setup keyboard handling
    this.setupMobileKeyboard();
    
    // Add swipe indicator
    this.createSwipeIndicator();
    
    console.log('[ChatContainer] Mobile interactions initialized');
  }
  
  setupResponsiveHandlers() {
    // Device change handler
    const deviceChangeCleanup = responsiveManager.on('devicechange', (data) => {
      console.log('[ChatContainer] Device changed:', data);
      this.handleDeviceChange(data);
    });
    
    // Orientation change handler
    const orientationChangeCleanup = responsiveManager.on('orientationchange', (data) => {
      console.log('[ChatContainer] Orientation changed:', data);
      this.handleOrientationChange(data);
    });
    
    // Keyboard visibility handler
    const keyboardChangeCleanup = responsiveManager.on('keyboardchange', (data) => {
      console.log('[ChatContainer] Keyboard visibility changed:', data);
      this.handleKeyboardChange(data);
    });
    
    // Touch gesture handlers
    const swipeCleanup = responsiveManager.on('swipe', (data) => {
      this.handleSwipeGesture(data);
    });
    
    const pinchCleanup = responsiveManager.on('pinch', (data) => {
      this.handlePinchGesture(data);
    });
    
    const pullRefreshCleanup = responsiveManager.on('pullrefresh', () => {
      this.handlePullRefresh();
    });
    
    // Store cleanup functions
    this.responsiveCleanup.push(
      deviceChangeCleanup,
      orientationChangeCleanup,
      keyboardChangeCleanup,
      swipeCleanup,
      pinchCleanup,
      pullRefreshCleanup
    );
  }
  
  setupHeaderCollapse() {
    const messagesContainer = this.element.querySelector('.deepweb-messages');
    const header = this.element.querySelector('.deepweb-header');
    
    if (!messagesContainer || !header) return;
    
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrollTop = messagesContainer.scrollTop;
          const scrollDirection = scrollTop > this.mobileInteractions.lastScrollTop ? 'down' : 'up';
          
          if (scrollDirection !== this.mobileInteractions.scrollDirection) {
            this.mobileInteractions.scrollDirection = scrollDirection;
            
            if (scrollDirection === 'down' && scrollTop > this.mobileInteractions.headerCollapseThreshold) {
              this.collapseHeader();
            } else if (scrollDirection === 'up') {
              this.expandHeader();
            }
          }
          
          this.mobileInteractions.lastScrollTop = scrollTop;
          ticking = false;
        });
        ticking = true;
      }
    };
    
    messagesContainer.addEventListener('scroll', handleScroll, { passive: true });
    
    // Store cleanup
    this.responsiveCleanup.push(() => {
      messagesContainer.removeEventListener('scroll', handleScroll);
    });
  }
  
  collapseHeader() {
    if (this.state.isHeaderCollapsed) return;
    
    const header = this.element.querySelector('.deepweb-header');
    if (header) {
      header.classList.add('collapsed');
      header.classList.remove('expanding');
      this.state.isHeaderCollapsed = true;
    }
  }
  
  expandHeader() {
    if (!this.state.isHeaderCollapsed) return;
    
    const header = this.element.querySelector('.deepweb-header');
    if (header) {
      header.classList.remove('collapsed');
      header.classList.add('expanding');
      this.state.isHeaderCollapsed = false;
    }
  }
  
  makeTouchFriendly() {
    // Make all interactive elements touch-friendly
    const buttons = this.element.querySelectorAll('button, .deepweb-control-btn, .deepweb-conversation-item');
    buttons.forEach(button => {
      responsiveManager.makeTouchFriendly(button);
    });
  }
  
  setupMobileKeyboard() {
    const inputArea = this.element.querySelector('.deepweb-input-area');
    if (!inputArea) return;
    
    // Position input area properly when keyboard appears
    const keyboardHandler = (data) => {
      if (data.visible) {
        inputArea.style.position = 'fixed';
        inputArea.style.bottom = '0';
        inputArea.style.left = '0';
        inputArea.style.right = '0';
        inputArea.style.zIndex = '1000';
      } else {
        inputArea.style.position = '';
        inputArea.style.bottom = '';
        inputArea.style.left = '';
        inputArea.style.right = '';
        inputArea.style.zIndex = '';
      }
    };
    
    const cleanup = responsiveManager.on('keyboardchange', keyboardHandler);
    this.responsiveCleanup.push(cleanup);
  }
  
  setupPullToRefresh() {
    const messagesContainer = this.element.querySelector('.deepweb-messages');
    if (!messagesContainer) return;
    
    // Create pull-to-refresh indicator
    const pullIndicator = document.createElement('div');
    pullIndicator.className = 'pull-to-refresh';
    pullIndicator.innerHTML = `
      <div class="spinner deepweb-spinner-small deepweb-spinner-animated"></div>
      <span>Pull to refresh conversations</span>
    `;
    messagesContainer.prepend(pullIndicator);
    
    responsiveManager.enablePullToRefresh();
    
    const pullMoveHandler = (data) => {
      const progress = Math.min(data.distance / 80, 1);
      pullIndicator.style.transform = `translateY(${data.distance - 80}px)`;
      pullIndicator.style.opacity = progress;
    };
    
    const pullEndHandler = () => {
      pullIndicator.style.transform = '';
      pullIndicator.style.opacity = '';
    };
    
    const moveCleanup = responsiveManager.on('pullmove', pullMoveHandler);
    const endCleanup = responsiveManager.on('pullend', pullEndHandler);
    
    this.responsiveCleanup.push(moveCleanup, endCleanup);
  }
  
  createSwipeIndicator() {
    const indicator = document.createElement('div');
    indicator.className = 'swipe-indicator';
    indicator.innerHTML = '→';
    this.element.appendChild(indicator);
    
    this.swipeIndicator = indicator;
  }
  
  showSwipeIndicator(direction) {
    if (!this.swipeIndicator) return;
    
    const icons = {
      left: '←',
      right: '→',
      up: '↑',
      down: '↓'
    };
    
    this.swipeIndicator.innerHTML = icons[direction] || '→';
    this.swipeIndicator.classList.add('show');
    
    setTimeout(() => {
      this.swipeIndicator.classList.remove('show');
    }, 500);
  }
  
  applyTextScale(scale) {
    this.element.classList.remove('text-scale-small', 'text-scale-normal', 'text-scale-large', 'text-scale-extra-large');
    this.element.classList.add(`text-scale-${scale}`);
    this.state.textScale = scale;
  }
  
  // Event handlers
  
  handleDeviceChange(data) {
    const wasMobile = this.state.isMobileMode;
    this.state.isMobileMode = data.newDevice === 'mobile' || data.newDevice === 'tablet';
    
    // Update layout if device type changed
    if (wasMobile !== this.state.isMobileMode) {
      this.applyResponsiveLayout();
      
      if (this.state.isMobileMode) {
        this.initializeMobileInteractions();
      }
    }
    
    // Update device attribute
    this.element.setAttribute('data-device', data.newDevice);
  }
  
  handleOrientationChange(data) {
    this.element.setAttribute('data-orientation', data.newOrientation);
    
    // Adjust layout for orientation change
    if (this.state.isMobileMode) {
      setTimeout(() => {
        this.adjustMobileLayout();
      }, 100); // Small delay for accurate dimensions
    }
  }
  
  handleKeyboardChange(data) {
    const messagesContainer = this.element.querySelector('.deepweb-messages');
    
    if (data.visible) {
      // Keyboard is visible - adjust layout
      if (messagesContainer) {
        messagesContainer.style.paddingBottom = '100px';
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    } else {
      // Keyboard hidden - restore layout
      if (messagesContainer) {
        messagesContainer.style.paddingBottom = '';
      }
    }
  }
  
  handleSwipeGesture(data) {
    if (!this.state.swipeGesturesEnabled) return;
    
    this.showSwipeIndicator(data.direction);
    
    // Handle different swipe directions
    switch (data.direction) {
      case 'left':
        // Show sidebar (if available)
        if (!this.state.isSidebarVisible && !this.state.isMobileMode) {
          this.toggleSidebar();
        }
        break;
        
      case 'right':
        // Hide sidebar or go back
        if (this.state.isSidebarVisible) {
          this.toggleSidebar();
        }
        break;
        
      case 'up':
        // Expand header if collapsed
        if (this.state.isHeaderCollapsed) {
          this.expandHeader();
        }
        break;
        
      case 'down':
        // Collapse header
        if (!this.state.isHeaderCollapsed) {
          this.collapseHeader();
        }
        break;
    }
  }
  
  handlePinchGesture(data) {
    // Handle pinch-to-zoom for text scaling
    if (data.scale > 1.2) {
      // Zoom in
      switch (this.state.textScale) {
        case 'small':
          this.applyTextScale('normal');
          break;
        case 'normal':
          this.applyTextScale('large');
          break;
        case 'large':
          this.applyTextScale('extra-large');
          break;
      }
    } else if (data.scale < 0.8) {
      // Zoom out
      switch (this.state.textScale) {
        case 'extra-large':
          this.applyTextScale('large');
          break;
        case 'large':
          this.applyTextScale('normal');
          break;
        case 'normal':
          this.applyTextScale('small');
          break;
      }
    }
  }
  
  async handlePullRefresh() {
    try {
      // Refresh conversation list
      const conversationList = this.getChild('conversationList');
      if (conversationList) {
        await conversationList.refreshConversations();
      }
      
      // Show success feedback
      this.showNotification('Conversations refreshed', 'success');
    } catch (error) {
      console.error('[ChatContainer] Error refreshing conversations:', error);
      this.showNotification('Failed to refresh conversations', 'error');
    }
  }
  
  // Public mobile API methods
  
  setTextScale(scale) {
    this.applyTextScale(scale);
  }
  
  togglePullToRefresh() {
    this.state.pullToRefreshEnabled = !this.state.pullToRefreshEnabled;
    
    if (this.state.pullToRefreshEnabled && responsiveManager.isMobile()) {
      this.setupPullToRefresh();
    } else {
      responsiveManager.disablePullToRefresh();
    }
  }
  
  toggleSwipeGestures() {
    this.state.swipeGesturesEnabled = !this.state.swipeGesturesEnabled;
  }
  
  isMobileMode() {
    return this.state.isMobileMode;
  }
  
  async initializeTemplateManager() {
    try {
      // Initialize template manager
      this.templateManager = new TemplateManager();
      await this.templateManager.initialize();
      
      // Initialize context manager
      this.contextManager = new ContextManager();
      
      // Initialize page context
      await this.initializePageContext();
      
      // Initialize template selector
      this.templateSelector = new TemplateSelector({
        templateManager: this.templateManager,
        onTemplateSelect: (prompt, template) => this.handleTemplateSelect(prompt, template),
        onClose: () => this.hideTemplateSelector()
      });
      await this.templateSelector.init();
    } catch (error) {
      console.error('Failed to initialize template manager:', error);
    }
  }
  
  /**
   * Initialize context for current page
   */
  async initializePageContext() {
    try {
      if (!this.contextManager) return;
      
      const pageData = {
        url: window.location.href,
        title: document.title,
        document: document
      };
      
      const contextResult = await this.contextManager.initializePage(pageData);
      
      // Show suggestions if available
      if (contextResult.suggestions?.length > 0) {
        this.showContextSuggestions(contextResult.suggestions);
      }
      
      // Check for research mode
      if (contextResult.fullContext?.crossPage?.session?.hasActiveResearch) {
        this.showResearchModeIndicator();
      }
    } catch (error) {
      console.error('[DeepWeb] Failed to initialize page context:', error);
    }
  }
  
  /**
   * Show context-based suggestions
   * @param {Array} suggestions - Suggestions from context manager
   */
  showContextSuggestions(suggestions) {
    const messageList = this.getChild('messageList');
    if (!messageList) return;
    
    // Show top suggestions
    suggestions.slice(0, 3).forEach(suggestion => {
      let icon = '💡';
      switch (suggestion.type) {
        case 'topic': icon = '🔍'; break;
        case 'navigation': icon = '🧭'; break;
        case 'answer': icon = '📚'; break;
        case 'research': icon = '🔬'; break;
      }
      
      messageList.addInfoMessage(`${icon} ${suggestion.content}`);
    });
  }
  
  /**
   * Show research mode indicator
   */
  showResearchModeIndicator() {
    const header = this.getChild('header');
    if (!header || !header.element) return;
    
    // Add research mode indicator to header
    const indicator = document.createElement('div');
    indicator.className = 'deepweb-research-indicator';
    indicator.innerHTML = '🔬 Research Mode';
    indicator.style.cssText = `
      padding: 4px 8px;
      background: var(--theme-primary, #1976d2);
      color: white;
      border-radius: 4px;
      font-size: 12px;
      margin-left: 8px;
    `;
    
    const headerContent = header.element.querySelector('.deepweb-header-content');
    if (headerContent) {
      headerContent.appendChild(indicator);
    }
  }
  
  toggleTemplateSelector() {
    if (this.state.isTemplateSelectorVisible) {
      this.hideTemplateSelector();
    } else {
      this.showTemplateSelector();
    }
  }
  
  async showTemplateSelector() {
    if (!this.templateSelector || this.state.isTemplateSelectorVisible) return;
    
    this.state.isTemplateSelectorVisible = true;
    
    // Get current context
    const context = await extractChatContext({
      userQuery: '',
      model: this.state.selectedModel
    });
    
    // Add template selector to container
    const container = DOMUtils.$('#deepweb-template-selector-container', this.element);
    if (!container) {
      // Create container if it doesn't exist
      const newContainer = document.createElement('div');
      newContainer.id = 'deepweb-template-selector-container';
      this.element.appendChild(newContainer);
      newContainer.appendChild(this.templateSelector.element);
    } else {
      container.appendChild(this.templateSelector.element);
    }
    
    // Open selector with context
    await this.templateSelector.open(context);
  }
  
  hideTemplateSelector() {
    if (!this.templateSelector || !this.state.isTemplateSelectorVisible) return;
    
    this.state.isTemplateSelectorVisible = false;
    this.templateSelector.element.remove();
  }
  
  handleTemplateSelect(prompt, template) {
    // Insert prompt into input area
    const inputArea = this.getChild('inputArea');
    if (inputArea) {
      inputArea.setValue(prompt);
      inputArea.focus();
    }
    
    // Track template usage
    if (template && this.templateManager) {
      this.templateManager.trackUsage(template.id);
    }
  }
  
  // Cleanup
  destroy() {
    // Clean up responsive event handlers
    this.responsiveCleanup.forEach(cleanup => cleanup());
    this.responsiveCleanup.length = 0;
    
    // Clean up context manager
    if (this.contextManager) {
      this.contextManager.clearAllContext();
    }
    
    // Call parent destroy
    super.destroy();
  }
}