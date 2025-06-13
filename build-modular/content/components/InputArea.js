/**
 * Input Area Component
 * Message input and send button
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';

export default class InputArea extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.onSendMessage = options.onSendMessage || (() => {});
    this.state = {
      isProcessing: false,
      lastRequestTime: 0
    };
    this.RATE_LIMIT_MS = 10000; // 10 seconds
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('input-area');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.element = fragment.querySelector('#deepweb-input-area');
    
    // Store references
    this.input = this.element.querySelector('#deepweb-input');
    this.sendBtn = this.element.querySelector('#deepweb-send');
    this.rateLimitDiv = this.element.querySelector('#deepweb-rate-limit');
    this.timerSpan = this.element.querySelector('#deepweb-timer');
    
    // Apply styles
    this.applyStyles();
  }

  applyStyles() {
    // Container styles
    Object.assign(this.element.style, {
      padding: '16px',
      background: '#f8f9fa',
      borderTop: '1px solid #e0e0e0',
      borderRadius: '0 0 12px 12px'
    });

    // Input container
    const inputContainer = DOMUtils.$('.deepweb-input-container', this.element);
    Object.assign(inputContainer.style, {
      display: 'flex',
      gap: '8px'
    });

    // Input field
    Object.assign(this.input.style, {
      flex: '1',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s',
      fontFamily: 'inherit'
    });

    // Send button
    Object.assign(this.sendBtn.style, {
      padding: '10px 20px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      minWidth: '70px',
      transition: 'transform 0.1s, box-shadow 0.2s'
    });

    // Rate limit message
    Object.assign(this.rateLimitDiv.style, {
      marginTop: '8px',
      padding: '8px 12px',
      background: '#fef3c7',
      color: '#92400e',
      fontSize: '13px',
      textAlign: 'center',
      borderRadius: '6px'
    });
  }

  setupEventListeners() {
    // Send button click
    this.sendBtn.addEventListener('click', () => this.handleSend());

    // Enter key to send
    this.input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !this.state.isProcessing) {
        this.handleSend();
      }
    });

    // Input focus effects
    this.input.addEventListener('focus', () => {
      this.input.style.borderColor = '#667eea';
    });

    this.input.addEventListener('blur', () => {
      this.input.style.borderColor = '#d1d5db';
    });

    // Button hover effects
    this.sendBtn.addEventListener('mouseenter', () => {
      if (!this.state.isProcessing) {
        this.sendBtn.style.transform = 'translateY(-1px)';
        this.sendBtn.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
      }
    });

    this.sendBtn.addEventListener('mouseleave', () => {
      this.sendBtn.style.transform = 'translateY(0)';
      this.sendBtn.style.boxShadow = 'none';
    });
  }

  handleSend() {
    const text = this.input.value.trim();
    if (!text || this.state.isProcessing) return;

    // Check rate limit
    const now = Date.now();
    if (now - this.state.lastRequestTime < this.RATE_LIMIT_MS) {
      this.showRateLimit();
      return;
    }

    // Set processing state
    this.setState({ 
      isProcessing: true,
      lastRequestTime: now
    });

    // Update UI
    this.sendBtn.textContent = '...';
    this.sendBtn.disabled = true;
    this.input.disabled = true;

    // Clear input
    const message = this.input.value;
    this.input.value = '';

    // Call parent handler
    this.onSendMessage(message);
  }

  showRateLimit() {
    this.rateLimitDiv.style.display = 'block';
    
    let seconds = 10;
    this.timerSpan.textContent = seconds;
    
    const timer = setInterval(() => {
      seconds--;
      this.timerSpan.textContent = seconds;
      if (seconds <= 0) {
        clearInterval(timer);
        this.rateLimitDiv.style.display = 'none';
      }
    }, 1000);
  }

  resetState() {
    this.setState({ isProcessing: false });
    this.sendBtn.textContent = 'Send';
    this.sendBtn.disabled = false;
    this.input.disabled = false;
    this.input.focus();
  }

  setInputValue(value) {
    this.input.value = value;
  }

  focusInput() {
    this.input.focus();
  }

  getInputValue() {
    return this.input.value;
  }
}