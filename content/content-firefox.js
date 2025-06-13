// Firefox Content Script for DeepWeb Extension
// Uses browser namespace throughout

(function() {
  'use strict';

  console.log('[DeepWeb] Firefox extension starting...');

  // Check if already initialized
  if (window.__deepwebInitialized) {
    console.log('[DeepWeb] Already initialized, skipping');
    return;
  }
  window.__deepwebInitialized = true;

  // Create chat UI with Firefox-specific considerations
  function createChatUI() {
    try {
      // Remove any existing UI
      const existing = document.getElementById('deepweb-chat-root');
      if (existing) existing.remove();

      // Create container
      const container = document.createElement('div');
      container.id = 'deepweb-chat-root';
      container.setAttribute('role', 'dialog');
      container.setAttribute('aria-label', 'DeepWeb AI Chat Assistant');
      
      // Firefox-safe styles
      container.style.cssText = `
        position: fixed !important;
        bottom: 20px !important;
        right: 20px !important;
        width: 380px !important;
        max-width: calc(100vw - 40px) !important;
        max-height: 600px !important;
        background: white !important;
        border: 1px solid #e0e0e0 !important;
        border-radius: 12px !important;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
        z-index: 2147483647 !important;
        display: flex !important;
        flex-direction: column !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        color: #333 !important;
      `;

      container.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: #f8f9fa;
          border-bottom: 1px solid #e0e0e0;
          border-radius: 12px 12px 0 0;
          user-select: none;
        ">
          <div style="
            font-weight: 600;
            font-size: 16px;
            color: #1a1a1a;
            display: flex;
            align-items: center;
            gap: 8px;
          ">
            <span style="
              width: 24px;
              height: 24px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              border-radius: 6px;
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
              font-size: 12px;
              font-weight: bold;
            ">D</span>
            DeepWeb AI
          </div>
          <div style="display: flex; gap: 8px;">
            <button id="deepweb-minimize" title="Minimize" aria-label="Minimize chat" style="
              width: 28px;
              height: 28px;
              border: none;
              background: transparent;
              cursor: pointer;
              font-size: 18px;
              color: #666;
              border-radius: 4px;
              transition: background 0.2s;
            " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='transparent'">_</button>
            <button id="deepweb-close" title="Close" aria-label="Close chat" style="
              width: 28px;
              height: 28px;
              border: none;
              background: transparent;
              cursor: pointer;
              font-size: 18px;
              color: #666;
              border-radius: 4px;
              transition: background 0.2s;
            " onmouseover="this.style.background='#e0e0e0'" onmouseout="this.style.background='transparent'">×</button>
          </div>
        </div>
        
        <div style="
          padding: 8px 16px;
          background: #f0f4f8;
          border-bottom: 1px solid #e0e0e0;
        ">
          <select id="deepweb-model-select" aria-label="Select AI model" style="
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 6px;
            font-size: 14px;
            background: white;
            cursor: pointer;
            color: #333;
          ">
            <option value="deepseek-chat" selected>🤖 DeepSeek Chat (General Purpose)</option>
            <option value="deepseek-coder">💻 DeepSeek Coder (Programming)</option>
            <option value="deepseek-reasoner">🧠 DeepSeek Reasoner (Complex Analysis)</option>
          </select>
        </div>
        
        <div id="deepweb-messages" role="log" aria-live="polite" aria-label="Chat messages" style="
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          max-height: 350px;
          min-height: 200px;
          background: #fafbfc;
        ">
          <div style="
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 12px 16px;
            border-radius: 12px;
            margin-bottom: 12px;
            text-align: center;
          ">
            🚀 Welcome to DeepWeb AI for Firefox!<br>
            <small style="opacity: 0.9;">Select a model and ask me anything about this webpage.</small>
          </div>
        </div>
        
        <div id="deepweb-input-area" style="
          padding: 16px;
          background: #f8f9fa;
          border-top: 1px solid #e0e0e0;
          border-radius: 0 0 12px 12px;
        ">
          <div style="
            display: flex;
            gap: 8px;
          ">
            <input 
              id="deepweb-input" 
              type="text" 
              placeholder="Ask me anything..." 
              maxlength="1000"
              aria-label="Type your message"
              style="
                flex: 1;
                padding: 10px 14px;
                border: 1px solid #d1d5db;
                border-radius: 8px;
                font-size: 14px;
                outline: none;
                transition: border-color 0.2s;
              "
              onfocus="this.style.borderColor='#667eea'"
              onblur="this.style.borderColor='#d1d5db'"
            />
            <button id="deepweb-send" aria-label="Send message" style="
              padding: 10px 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              border: none;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 500;
              cursor: pointer;
              min-width: 70px;
              transition: transform 0.1s, box-shadow 0.2s;
            " onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 12px rgba(102, 126, 234, 0.4)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none'">Send</button>
          </div>
          
          <div id="deepweb-rate-limit" style="
            display: none;
            margin-top: 8px;
            padding: 8px 12px;
            background: #fef3c7;
            color: #92400e;
            font-size: 13px;
            text-align: center;
            border-radius: 6px;
          ">
            ⏱️ Please wait <span id="deepweb-timer">10</span> seconds before sending another message.
          </div>
        </div>
      `;

      // Add to page
      document.body.appendChild(container);

      // Set up event handlers
      setupEventHandlers();

      console.log('[DeepWeb] UI created successfully');

    } catch (error) {
      console.error('[DeepWeb] Failed to create UI:', error);
    }
  }

  let lastRequestTime = 0;
  let isProcessing = false;
  const RATE_LIMIT_MS = 10000; // 10 seconds

  function setupEventHandlers() {
    const input = document.getElementById('deepweb-input');
    const sendBtn = document.getElementById('deepweb-send');
    const messages = document.getElementById('deepweb-messages');
    const closeBtn = document.getElementById('deepweb-close');
    const minimizeBtn = document.getElementById('deepweb-minimize');
    const container = document.getElementById('deepweb-chat-root');
    const modelSelect = document.getElementById('deepweb-model-select');
    const inputArea = document.getElementById('deepweb-input-area');

    // Close button
    closeBtn.addEventListener('click', () => {
      container.style.display = 'none';
    });

    // Minimize button
    minimizeBtn.addEventListener('click', () => {
      const isMinimized = messages.style.display === 'none';
      messages.style.display = isMinimized ? 'block' : 'none';
      inputArea.style.display = isMinimized ? 'block' : 'none';
      container.style.height = isMinimized ? 'auto' : '60px';
      minimizeBtn.textContent = isMinimized ? '_' : '□';
    });

    // Send message
    const sendMessage = async () => {
      const text = input.value.trim();
      if (!text || isProcessing) return;

      // Check rate limit
      const now = Date.now();
      if (now - lastRequestTime < RATE_LIMIT_MS) {
        showRateLimit();
        return;
      }

      // Set processing state
      isProcessing = true;
      lastRequestTime = now;
      sendBtn.textContent = '...';
      sendBtn.disabled = true;
      input.disabled = true;

      // Clear input
      input.value = '';

      // Get selected model
      const selectedModel = modelSelect.value;

      // Add user message
      addMessage(text, 'user');

      // Add loading message
      const loadingId = 'loading-' + Date.now();
      addMessage(`Thinking with ${getModelName(selectedModel)}...`, 'assistant', loadingId);

      try {
        console.log('[DeepWeb] Sending message to background...');
        
        // Firefox-compatible message passing
        const response = await browser.runtime.sendMessage({
          type: 'chat_request',
          message: text,
          model: selectedModel,
          context: {
            url: window.location.href,
            title: document.title,
            content: document.body.innerText.substring(0, 500)
          }
        });

        console.log('[DeepWeb] Received response:', response);

        // Remove loading message
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) loadingMsg.remove();

        if (!response) {
          throw new Error('No response received from background script');
        }

        if (response.error) {
          addMessage('❌ ' + response.error, 'error');
        } else if (response.content) {
          addMessage(response.content, 'assistant');
          
          // Show cost if available
          if (response.cost && response.cost > 0) {
            addMessage(`💰 Cost: $${response.cost.toFixed(4)}`, 'info');
          }
        } else {
          addMessage('No response content received', 'error');
        }

      } catch (error) {
        console.error('[DeepWeb] Error:', error);
        
        // Remove loading message
        const loadingMsg = document.getElementById(loadingId);
        if (loadingMsg) loadingMsg.remove();
        
        // Show specific error message
        if (error.message.includes('Could not establish connection')) {
          addMessage('❌ Extension was reloaded. Please refresh the page.', 'error');
        } else {
          addMessage('❌ ' + (error.message || 'Failed to get response'), 'error');
        }
      } finally {
        // Reset UI state
        isProcessing = false;
        sendBtn.textContent = 'Send';
        sendBtn.disabled = false;
        input.disabled = false;
        input.focus();
      }
    };

    // Event listeners
    sendBtn.addEventListener('click', sendMessage);
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !isProcessing) {
        sendMessage();
      }
    });

    // Model selection change
    modelSelect.addEventListener('change', (e) => {
      const modelName = getModelName(e.target.value);
      addMessage(`🔄 Switched to ${modelName}`, 'info');
    });

    // Focus input on container click
    container.addEventListener('click', (e) => {
      if (e.target === container || e.target.id === 'deepweb-messages') {
        input.focus();
      }
    });
  }

  function getModelName(modelValue) {
    const names = {
      'deepseek-chat': 'DeepSeek Chat',
      'deepseek-coder': 'DeepSeek Coder',
      'deepseek-reasoner': 'DeepSeek Reasoner'
    };
    return names[modelValue] || modelValue;
  }

  function addMessage(text, type, id) {
    const messages = document.getElementById('deepweb-messages');
    if (!messages) return;

    const messageDiv = document.createElement('div');
    if (id) messageDiv.id = id;
    
    const styles = {
      user: `
        background: #e3f2fd;
        color: #1565c0;
        margin-left: 60px;
        margin-right: 0;
        border: 1px solid #90caf9;
        text-align: right;
      `,
      assistant: `
        background: white;
        color: #333;
        margin-left: 0;
        margin-right: 60px;
        border: 1px solid #e0e0e0;
      `,
      error: `
        background: #ffebee;
        color: #c62828;
        border: 1px solid #ef9a9a;
        margin: 0 20px;
      `,
      info: `
        background: #f3e5f5;
        color: #6a1b9a;
        font-size: 12px;
        text-align: center;
        margin: 0 40px;
        border: 1px solid #ce93d8;
      `
    };

    messageDiv.style.cssText = `
      padding: 10px 14px;
      border-radius: 12px;
      margin-bottom: 12px;
      word-wrap: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
      ${styles[type] || styles.assistant}
    `;
    
    messageDiv.textContent = text;
    messages.appendChild(messageDiv);
    messages.scrollTop = messages.scrollHeight;
  }

  function showRateLimit() {
    const rateLimitDiv = document.getElementById('deepweb-rate-limit');
    const timerSpan = document.getElementById('deepweb-timer');
    rateLimitDiv.style.display = 'block';
    
    let seconds = 10;
    timerSpan.textContent = seconds;
    
    const timer = setInterval(() => {
      seconds--;
      timerSpan.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        rateLimitDiv.style.display = 'none';
      }
    }, 1000);
  }

  // Initialize when DOM is ready - lazy loading
  let uiCreated = false;
  
  function initializeWhenNeeded() {
    if (!uiCreated) {
      createChatUI();
      uiCreated = true;
    }
  }
  
  // Don't auto-create UI, wait for user action
  console.log('[DeepWeb] Waiting for user activation...');

  // Listen for messages from background (Firefox)
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[DeepWeb] Received message:', message);
    
    if (message.type === 'toggle_chat') {
      const container = document.getElementById('deepweb-chat-root');
      if (container) {
        container.style.display = container.style.display === 'none' ? 'flex' : 'none';
      } else {
        initializeWhenNeeded();
      }
    }
    
    if (message.type === 'process_selection' && message.text) {
      const container = document.getElementById('deepweb-chat-root');
      if (!container || container.style.display === 'none') {
        initializeWhenNeeded();
      }
      
      const input = document.getElementById('deepweb-input');
      if (input) {
        input.value = `Please explain: "${message.text}"`;
        input.focus();
      }
    }
    
    return false; // Synchronous response
  });

  // Log that we're ready
  console.log('[DeepWeb] Firefox content script loaded and ready');

})();