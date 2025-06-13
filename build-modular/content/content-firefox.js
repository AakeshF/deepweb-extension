/**
 * Firefox Content Script for DeepWeb Extension
 * Modular architecture implementation
 */

(async function() {
  'use strict';

  console.log('[DeepWeb] Firefox extension starting (modular version)...');

  // Check if already initialized
  if (window.__deepwebInitialized) {
    console.log('[DeepWeb] Already initialized, skipping');
    return;
  }
  window.__deepwebInitialized = true;

  // Dynamic import of modules
  let ChatContainer;
  
  try {
    // Import the main component
    const module = await import(browser.runtime.getURL('content/components/ChatContainer.js'));
    ChatContainer = module.default;
  } catch (error) {
    console.error('[DeepWeb] Failed to load modules:', error);
    return;
  }

  // Global chat instance
  let chatInstance = null;

  /**
   * Initialize the chat UI when needed
   */
  async function initializeChat() {
    if (!chatInstance) {
      try {
        chatInstance = new ChatContainer();
        await chatInstance.init();
        console.log('[DeepWeb] Chat UI initialized successfully');
      } catch (error) {
        console.error('[DeepWeb] Failed to initialize chat:', error);
      }
    }
    return chatInstance;
  }

  /**
   * Toggle chat visibility
   */
  async function toggleChat() {
    const chat = await initializeChat();
    if (chat) {
      chat.toggle();
    }
  }

  /**
   * Process selected text
   */
  async function processSelection(text) {
    const chat = await initializeChat();
    if (chat) {
      chat.show();
      const inputArea = chat.getChild('inputArea');
      if (inputArea) {
        inputArea.setInputValue(`Please explain: "${text}"`);
        inputArea.focusInput();
      }
    }
  }

  // Listen for messages from background
  browser.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
    console.log('[DeepWeb] Received message:', message);
    
    if (message.type === 'toggle_chat') {
      await toggleChat();
    }
    
    if (message.type === 'process_selection' && message.text) {
      await processSelection(message.text);
    }
    
    return false; // Synchronous response
  });

  // Log that we're ready
  console.log('[DeepWeb] Firefox content script loaded and ready (modular version)');

})();