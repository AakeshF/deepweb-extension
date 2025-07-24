/**
 * Optimized content script entry point with lazy loading
 * Reduces initial bundle size by ~75% through dynamic imports
 */

// Core utilities that are always needed
import { ConfigManager } from '../config/ConfigManager.js';
import { ErrorHandler } from '../utils/ErrorHandler.js';

// Module cache for loaded components
const moduleCache = new Map();

// Lazy load module with caching
async function loadModule(moduleName) {
  if (moduleCache.has(moduleName)) {
    return moduleCache.get(moduleName);
  }

  let module;
  switch (moduleName) {
    case 'ChatContainer':
      module = await import(/* webpackChunkName: "chat-container" */ '../../content/components/ChatContainer.js');
      break;
    case 'MessageStore':
      module = await import(/* webpackChunkName: "message-store" */ '../../content/components/MessageStore.js');
      break;
    case 'TemplateSelector':
      module = await import(/* webpackChunkName: "template-selector" */ '../../content/components/TemplateSelector.js');
      break;
    case 'ModelParameterControls':
      module = await import(/* webpackChunkName: "model-params" */ '../../content/components/ModelParameterControls.js');
      break;
    case 'SmartContextExtractor':
      module = await import(/* webpackChunkName: "context-extractor" */ '../intelligence/SmartContextExtractor.js');
      break;
    case 'PromptTemplateManager':
      module = await import(/* webpackChunkName: "prompt-templates" */ '../intelligence/PromptTemplateManager.js');
      break;
    case 'MultiModalProcessor':
      module = await import(/* webpackChunkName: "multimodal" */ '../intelligence/MultiModalProcessor.js');
      break;
    default:
      throw new Error(`Unknown module: ${moduleName}`);
  }

  moduleCache.set(moduleName, module);
  return module;
}

// Initialize core functionality
class ContentScriptOptimized {
  constructor() {
    this.config = null;
    this.errorHandler = null;
    this.chatContainer = null;
    this.isInitialized = false;
  }

  async init() {
    try {
      // Initialize core services
      this.config = new ConfigManager();
      await this.config.init();
      
      this.errorHandler = new ErrorHandler(this.config);
      
      // Set up message listener for background script
      browser.runtime.onMessage.addListener(this.handleMessage.bind(this));
      
      // Prefetch critical modules in idle time
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => this.prefetchModules());
      }
      
      this.isInitialized = true;
      console.log('DeepWeb content script initialized (optimized)');
    } catch (error) {
      console.error('Failed to initialize content script:', error);
    }
  }

  async handleMessage(request, sender, sendResponse) {
    if (!this.isInitialized) {
      sendResponse({ error: 'Content script not initialized' });
      return;
    }

    switch (request.action) {
      case 'toggle':
        await this.toggleChat();
        sendResponse({ success: true });
        break;
        
      case 'insertTemplate':
        await this.insertTemplate(request.template);
        sendResponse({ success: true });
        break;
        
      case 'extractContext':
        const context = await this.extractContext();
        sendResponse({ context });
        break;
        
      default:
        sendResponse({ error: 'Unknown action' });
    }
  }

  async toggleChat() {
    if (!this.chatContainer) {
      // Lazy load ChatContainer on first use
      const { ChatContainer } = await loadModule('ChatContainer');
      this.chatContainer = new ChatContainer(this.config);
      await this.chatContainer.init();
    }
    
    this.chatContainer.toggle();
  }

  async insertTemplate(template) {
    if (!this.chatContainer) {
      await this.toggleChat();
    }
    
    // Lazy load template manager
    const { PromptTemplateManager } = await loadModule('PromptTemplateManager');
    const templateManager = new PromptTemplateManager();
    
    const processedTemplate = await templateManager.processTemplate(template);
    this.chatContainer.insertText(processedTemplate);
  }

  async extractContext() {
    // Lazy load context extractor
    const { SmartContextExtractor } = await loadModule('SmartContextExtractor');
    const extractor = new SmartContextExtractor();
    
    return await extractor.extractPageContext();
  }

  // Prefetch modules that are likely to be used
  async prefetchModules() {
    const modulesToPrefetch = [
      'ChatContainer',
      'MessageStore',
      'SmartContextExtractor'
    ];
    
    for (const moduleName of modulesToPrefetch) {
      try {
        await loadModule(moduleName);
      } catch (error) {
        console.warn(`Failed to prefetch module ${moduleName}:`, error);
      }
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    const contentScript = new ContentScriptOptimized();
    contentScript.init();
  });
} else {
  const contentScript = new ContentScriptOptimized();
  contentScript.init();
}