/**
 * StreamingMessage Component
 * Displays streaming AI responses with progressive text display
 */

import BaseComponent from './BaseComponent.js';

export default class StreamingMessage extends BaseComponent {
  constructor() {
    super();
    
    this.state = {
      content: '',
      isStreaming: false,
      showCursor: true,
      error: null,
      status: 'idle', // idle, streaming, completed, cancelled, error
      reconnecting: false,
      reconnectAttempt: 0
    };
    
    this.cursorInterval = null;
    this.typewriterSpeed = 10; // ms between characters
    this.buffer = [];
    this.typewriterTimeout = null;
    this.onCancel = null;
  }
  
  render() {
    const { content, isStreaming, showCursor, error, status, reconnecting, reconnectAttempt } = this.state;
    
    return `
      <div class="streaming-message ${status}">
        <div class="message-content">
          <span class="message-text">${this.escapeHtml(content)}</span>
          ${isStreaming && showCursor ? '<span class="typing-cursor">|</span>' : ''}
        </div>
        
        ${reconnecting ? `
          <div class="reconnection-status">
            <span class="spinner"></span>
            Reconnecting... (attempt ${reconnectAttempt}/3)
          </div>
        ` : ''}
        
        ${error ? `
          <div class="stream-error">
            <span class="error-icon">⚠️</span>
            <span class="error-message">${this.escapeHtml(error)}</span>
          </div>
        ` : ''}
        
        ${isStreaming ? `
          <div class="stream-controls">
            <button class="cancel-stream-btn" data-action="cancel">
              <span class="icon">⏹</span>
              Cancel
            </button>
          </div>
        ` : ''}
        
        <div class="stream-status">
          ${this.renderStatus()}
        </div>
      </div>
    `;
  }
  
  renderStatus() {
    const { status } = this.state;
    
    switch (status) {
      case 'streaming':
        return '<span class="status-indicator streaming">● Streaming...</span>';
      case 'completed':
        return '<span class="status-indicator completed">✓ Complete</span>';
      case 'cancelled':
        return '<span class="status-indicator cancelled">⏹ Cancelled</span>';
      case 'error':
        return '<span class="status-indicator error">✗ Error</span>';
      default:
        return '';
    }
  }
  
  afterRender() {
    // Add event listeners
    const cancelBtn = this.element.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.handleCancel());
    }
  }
  
  /**
   * Start streaming with a given generator
   * @param {AsyncGenerator} generator - Stream generator
   * @param {Function} onCancel - Cancel callback
   */
  async startStreaming(generator, onCancel) {
    this.onCancel = onCancel;
    this.setState({
      isStreaming: true,
      status: 'streaming',
      error: null
    });
    
    // Start cursor blinking
    this.startCursorAnimation();
    
    try {
      for await (const event of generator) {
        // Handle different event types
        switch (event.type) {
          case 'content':
            // Add to buffer for smooth display
            this.buffer.push(event.content);
            this.processBuffer();
            break;
            
          case 'done':
            await this.finishStreaming(event);
            break;
            
          case 'error':
            if (event.recoverable) {
              this.showTemporaryError(event.error);
            } else {
              throw new Error(event.error);
            }
            break;
            
          case 'reconnecting':
            this.setState({
              reconnecting: true,
              reconnectAttempt: event.attempt
            });
            break;
            
          case 'event':
            console.log('[StreamingMessage] SSE event:', event.event);
            break;
            
          case 'retry':
            console.log('[StreamingMessage] Retry delay:', event.delay);
            break;
            
          case 'cancelled':
            this.setState({
              content: event.content || this.state.content,
              isStreaming: false,
              status: 'cancelled'
            });
            this.stopCursorAnimation();
            return;
            
          case 'finish':
            console.log('[StreamingMessage] Finish reason:', event.reason);
            break;
        }
        
        // Clear reconnecting state on successful content
        if (event.type === 'content' && this.state.reconnecting) {
          this.setState({ reconnecting: false, reconnectAttempt: 0 });
        }
      }
    } catch (error) {
      console.error('[StreamingMessage] Stream error:', error);
      this.setState({
        isStreaming: false,
        status: 'error',
        error: error.message
      });
      this.stopCursorAnimation();
      throw error;
    }
  }
  
  /**
   * Process buffered content with typewriter effect
   */
  processBuffer() {
    if (this.typewriterTimeout || this.buffer.length === 0) {
      return;
    }
    
    const chunk = this.buffer.shift();
    let charIndex = 0;
    
    const typeChar = () => {
      if (charIndex < chunk.length) {
        this.setState({
          content: this.state.content + chunk[charIndex]
        });
        charIndex++;
        this.typewriterTimeout = setTimeout(typeChar, this.typewriterSpeed);
      } else {
        this.typewriterTimeout = null;
        // Process next chunk if available
        if (this.buffer.length > 0) {
          this.processBuffer();
        }
      }
    };
    
    typeChar();
  }
  
  /**
   * Immediately display all buffered content
   */
  flushBuffer() {
    if (this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
      this.typewriterTimeout = null;
    }
    
    const remainingContent = this.buffer.join('');
    if (remainingContent) {
      this.setState({
        content: this.state.content + remainingContent
      });
      this.buffer = [];
    }
  }
  
  /**
   * Handle stream completion
   */
  async finishStreaming(event) {
    // Flush any remaining buffer
    this.flushBuffer();
    
    // Update final content if provided
    if (event.content && event.content !== this.state.content) {
      this.setState({ content: event.content });
    }
    
    this.setState({
      isStreaming: false,
      status: event.incomplete ? 'completed' : 'completed'
    });
    
    this.stopCursorAnimation();
    
    // Dispatch completion event
    this.element.dispatchEvent(new CustomEvent('streamComplete', {
      detail: {
        content: this.state.content,
        usage: event.usage,
        cost: event.cost,
        incomplete: event.incomplete
      },
      bubbles: true
    }));
  }
  
  /**
   * Handle cancel action
   */
  handleCancel() {
    if (this.onCancel && typeof this.onCancel === 'function') {
      this.onCancel();
    }
    
    // Flush buffer before cancelling
    this.flushBuffer();
    
    this.setState({
      isStreaming: false,
      status: 'cancelled'
    });
    
    this.stopCursorAnimation();
  }
  
  /**
   * Show temporary error message
   */
  showTemporaryError(message) {
    this.setState({ error: message });
    
    setTimeout(() => {
      if (this.state.error === message) {
        this.setState({ error: null });
      }
    }, 3000);
  }
  
  /**
   * Start cursor blinking animation
   */
  startCursorAnimation() {
    this.stopCursorAnimation();
    
    this.cursorInterval = setInterval(() => {
      this.setState({ showCursor: !this.state.showCursor });
    }, 500);
  }
  
  /**
   * Stop cursor animation
   */
  stopCursorAnimation() {
    if (this.cursorInterval) {
      clearInterval(this.cursorInterval);
      this.cursorInterval = null;
    }
    
    if (this.typewriterTimeout) {
      clearTimeout(this.typewriterTimeout);
      this.typewriterTimeout = null;
    }
    
    this.setState({ showCursor: false });
  }
  
  /**
   * Get the final content
   */
  getContent() {
    return this.state.content;
  }
  
  /**
   * Set content directly (for editing)
   */
  setContent(content) {
    this.flushBuffer();
    this.setState({ content });
  }
  
  /**
   * Reset the component
   */
  reset() {
    this.flushBuffer();
    this.stopCursorAnimation();
    this.buffer = [];
    this.onCancel = null;
    
    this.setState({
      content: '',
      isStreaming: false,
      showCursor: true,
      error: null,
      status: 'idle',
      reconnecting: false,
      reconnectAttempt: 0
    });
  }
  
  /**
   * Cleanup
   */
  destroy() {
    this.stopCursorAnimation();
    this.flushBuffer();
    super.destroy();
  }
  
  /**
   * Get CSS styles for the component
   */
  static getStyles() {
    return `
      .streaming-message {
        position: relative;
        padding: 12px 16px;
        background: #f8f9fa;
        border-radius: 8px;
        margin: 8px 0;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .streaming-message.streaming {
        background: #e3f2fd;
      }
      
      .streaming-message.completed {
        background: #f8f9fa;
      }
      
      .streaming-message.cancelled {
        background: #fff3e0;
      }
      
      .streaming-message.error {
        background: #ffebee;
      }
      
      .message-content {
        white-space: pre-wrap;
        word-wrap: break-word;
        line-height: 1.5;
        color: #333;
      }
      
      .typing-cursor {
        display: inline-block;
        width: 2px;
        height: 1.2em;
        background: #1976d2;
        margin-left: 1px;
        vertical-align: text-bottom;
        animation: blink 1s infinite;
      }
      
      @keyframes blink {
        0%, 49% { opacity: 1; }
        50%, 100% { opacity: 0; }
      }
      
      .reconnection-status {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 4px;
        font-size: 13px;
        color: #666;
      }
      
      .spinner {
        display: inline-block;
        width: 14px;
        height: 14px;
        border: 2px solid #ddd;
        border-top-color: #1976d2;
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .stream-error {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(255, 255, 255, 0.8);
        border-radius: 4px;
        font-size: 13px;
        color: #d32f2f;
      }
      
      .stream-controls {
        display: flex;
        justify-content: flex-end;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(0, 0, 0, 0.08);
      }
      
      .cancel-stream-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
        background: #fff;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 13px;
        color: #666;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .cancel-stream-btn:hover {
        background: #f5f5f5;
        border-color: #999;
        color: #333;
      }
      
      .cancel-stream-btn .icon {
        font-size: 16px;
      }
      
      .stream-status {
        position: absolute;
        top: 8px;
        right: 12px;
        font-size: 12px;
      }
      
      .status-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
      }
      
      .status-indicator.streaming {
        color: #1976d2;
        background: rgba(25, 118, 210, 0.1);
      }
      
      .status-indicator.completed {
        color: #388e3c;
        background: rgba(56, 142, 60, 0.1);
      }
      
      .status-indicator.cancelled {
        color: #f57c00;
        background: rgba(245, 124, 0, 0.1);
      }
      
      .status-indicator.error {
        color: #d32f2f;
        background: rgba(211, 47, 47, 0.1);
      }
    `;
  }
}