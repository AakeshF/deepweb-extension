/**
 * Message Component
 * Enhanced message display with actions and metadata
 */

import BaseComponent from './BaseComponent.js';
import DOMUtils from '../utils/dom-utils.js';
import MarkdownRenderer from '../utils/markdown-renderer.js';
import { SecureMarkdownRenderer } from '../../src/security/SecureMarkdownRenderer.js';

export default class Message extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    this.state = {
      isEditing: false,
      editContent: '',
      showActions: false,
      showMetadata: false
    };
    
    // Required options
    this.message = options.message || null;
    this.messageManager = options.messageManager || null;
    this.onUpdate = options.onUpdate || (() => {});
    this.onDelete = options.onDelete || (() => {});
    
    // Initialize markdown renderer
    this.markdownRenderer = new MarkdownRenderer({
      sanitize: true,
      breaks: true,
      linkify: true,
      highlightCode: true,
      addCopyButtons: true
    });
  }

  async render() {
    if (!this.message) {
      console.error('[Message] No message data provided');
      return;
    }

    // Create message container
    this.element = DOMUtils.createElement('div', {
      class: `deepweb-message deepweb-message-${this.message.role}`,
      'data-message-id': this.message.id,
      role: 'article'
    });

    // Apply base styles
    this.applyStyles();

    // Render message content
    this.renderContent();

    // Render actions menu
    this.renderActions();

    // Render metadata if visible
    if (this.state.showMetadata) {
      this.renderMetadata();
    }
  }

  applyStyles() {
    const baseStyles = {
      padding: '12px 16px',
      borderRadius: '12px',
      marginBottom: '12px',
      wordWrap: 'break-word',
      whiteSpace: 'pre-wrap',
      lineHeight: '1.5',
      position: 'relative',
      transition: 'all 0.2s ease'
    };

    // Role-specific styles
    const roleStyles = this.getRoleStyles();
    Object.assign(this.element.style, baseStyles, roleStyles);

    // Add hover effect
    this.element.addEventListener('mouseenter', () => {
      this.element.style.transform = 'translateX(2px)';
      this.showActionButton();
    });

    this.element.addEventListener('mouseleave', () => {
      this.element.style.transform = 'translateX(0)';
      if (!this.state.showActions) {
        this.hideActionButton();
      }
    });
  }

  getRoleStyles() {
    const styles = {
      user: {
        background: '#e3f2fd',
        color: '#1565c0',
        marginLeft: '60px',
        marginRight: '0',
        border: '1px solid #90caf9',
        textAlign: 'left'
      },
      assistant: {
        background: 'white',
        color: '#333',
        marginLeft: '0',
        marginRight: '60px',
        border: '1px solid #e0e0e0',
        textAlign: 'left'
      },
      system: {
        background: '#f3e5f5',
        color: '#6a1b9a',
        margin: '0 40px',
        border: '1px solid #ce93d8',
        textAlign: 'center',
        fontSize: '13px'
      }
    };

    return styles[this.message.role] || styles.assistant;
  }

  renderContent() {
    // Clear existing content
    this.element.innerHTML = '';

    if (this.state.isEditing) {
      this.renderEditMode();
    } else {
      this.renderViewMode();
    }
  }

  renderViewMode() {
    // Role indicator
    const roleDiv = DOMUtils.createElement('div', {
      class: 'deepweb-message-role'
    });
    Object.assign(roleDiv.style, {
      fontSize: '11px',
      fontWeight: 'bold',
      textTransform: 'uppercase',
      opacity: '0.7',
      marginBottom: '4px'
    });
    DOMUtils.setTextContent(roleDiv, this.message.role);
    this.element.appendChild(roleDiv);

    // Message content with markdown rendering
    const contentDiv = DOMUtils.createElement('div', {
      class: 'deepweb-message-content'
    });
    
    // Use SecureMarkdownRenderer for assistant messages, plain text for user messages
    if (this.message.role === 'assistant') {
      // Apply secure markdown rendering for assistant messages
      const secureRenderer = new SecureMarkdownRenderer();
      secureRenderer.render(this.message.content, contentDiv);
      contentDiv.classList.add('md-content');
    } else {
      // Keep user messages as plain text
      DOMUtils.setTextContent(contentDiv, this.message.content);
      Object.assign(contentDiv.style, {
        whiteSpace: 'pre-wrap',
        wordWrap: 'break-word'
      });
    }
    
    this.element.appendChild(contentDiv);

    // Timestamp
    if (this.message.timestamp) {
      const timeDiv = DOMUtils.createElement('div', {
        class: 'deepweb-message-time'
      });
      Object.assign(timeDiv.style, {
        fontSize: '11px',
        color: '#999',
        marginTop: '6px',
        opacity: '0.7'
      });
      
      const timeStr = new Date(this.message.timestamp).toLocaleString([], {
        dateStyle: 'short',
        timeStyle: 'short'
      });
      DOMUtils.setTextContent(timeDiv, timeStr);
      this.element.appendChild(timeDiv);
    }

    // Edited indicator
    if (this.message.state?.edited) {
      const editedDiv = DOMUtils.createElement('span', {
        class: 'deepweb-message-edited'
      });
      Object.assign(editedDiv.style, {
        fontSize: '11px',
        color: '#666',
        marginLeft: '8px',
        fontStyle: 'italic'
      });
      DOMUtils.setTextContent(editedDiv, '(edited)');
      this.element.querySelector('.deepweb-message-time')?.appendChild(editedDiv);
    }

    // Pin indicator
    if (this.message.state?.pinned) {
      const pinIcon = DOMUtils.createElement('div', {
        class: 'deepweb-message-pin'
      });
      Object.assign(pinIcon.style, {
        position: 'absolute',
        top: '8px',
        right: '8px',
        fontSize: '16px'
      });
      DOMUtils.setTextContent(pinIcon, '📌');
      this.element.appendChild(pinIcon);
    }
  }

  renderEditMode() {
    // Edit textarea
    const textarea = DOMUtils.createElement('textarea', {
      class: 'deepweb-message-edit',
      rows: '4'
    });
    Object.assign(textarea.style, {
      width: '100%',
      padding: '8px',
      border: '1px solid #ccc',
      borderRadius: '4px',
      fontSize: '14px',
      resize: 'vertical',
      fontFamily: 'inherit'
    });
    textarea.value = this.state.editContent || this.message.content;
    this.element.appendChild(textarea);

    // Edit actions
    const actionsDiv = DOMUtils.createElement('div', {
      class: 'deepweb-message-edit-actions'
    });
    Object.assign(actionsDiv.style, {
      marginTop: '8px',
      display: 'flex',
      gap: '8px'
    });

    // Save button
    const saveBtn = this.createButton('Save', 'primary', async () => {
      await this.handleSaveEdit(textarea.value);
    });

    // Cancel button
    const cancelBtn = this.createButton('Cancel', 'secondary', () => {
      this.setState({ isEditing: false, editContent: '' });
      this.renderContent();
    });

    actionsDiv.appendChild(saveBtn);
    actionsDiv.appendChild(cancelBtn);
    this.element.appendChild(actionsDiv);

    // Focus textarea
    textarea.focus();
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
  }

  renderActions() {
    // Action button
    const actionBtn = DOMUtils.createElement('button', {
      class: 'deepweb-message-action-btn',
      'aria-label': 'Message actions'
    });
    Object.assign(actionBtn.style, {
      position: 'absolute',
      top: '8px',
      right: this.message.state?.pinned ? '32px' : '8px',
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: '4px',
      borderRadius: '4px',
      fontSize: '18px',
      display: 'none',
      transition: 'background 0.2s'
    });
    DOMUtils.setTextContent(actionBtn, '⋮');

    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleActions();
    });

    actionBtn.addEventListener('mouseenter', () => {
      actionBtn.style.background = 'rgba(0,0,0,0.1)';
    });

    actionBtn.addEventListener('mouseleave', () => {
      actionBtn.style.background = 'transparent';
    });

    this.element.appendChild(actionBtn);
    this.actionBtn = actionBtn;

    // Actions menu
    if (this.state.showActions) {
      this.renderActionsMenu();
    }
  }

  renderActionsMenu() {
    const menu = DOMUtils.createElement('div', {
      class: 'deepweb-message-actions-menu'
    });
    Object.assign(menu.style, {
      position: 'absolute',
      top: '32px',
      right: '8px',
      background: 'white',
      border: '1px solid #ddd',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      padding: '4px',
      zIndex: '1000',
      minWidth: '150px'
    });

    const actions = [
      { icon: '✏️', text: 'Edit', handler: () => this.handleEdit() },
      { icon: '📋', text: 'Copy', handler: () => this.handleCopy() },
      { icon: '💬', text: 'Quote', handler: () => this.handleQuote() },
      { icon: '📌', text: this.message.state?.pinned ? 'Unpin' : 'Pin', handler: () => this.handlePin() },
      { icon: 'ℹ️', text: 'Details', handler: () => this.handleToggleMetadata() },
      { icon: '🗑️', text: 'Delete', handler: () => this.handleDelete(), danger: true }
    ];

    actions.forEach(action => {
      const item = DOMUtils.createElement('button', {
        class: 'deepweb-message-action-item'
      });
      Object.assign(item.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 12px',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        fontSize: '14px',
        textAlign: 'left',
        borderRadius: '4px',
        color: action.danger ? '#d32f2f' : '#333',
        transition: 'background 0.2s'
      });

      // Create icon span
      const iconSpan = document.createElement('span');
      iconSpan.textContent = action.icon;
      
      // Create text span
      const textSpan = document.createElement('span');
      textSpan.textContent = action.text;
      
      // Append spans to item
      item.appendChild(iconSpan);
      item.appendChild(textSpan);

      item.addEventListener('mouseenter', () => {
        item.style.background = action.danger ? '#ffebee' : '#f5f5f5';
      });

      item.addEventListener('mouseleave', () => {
        item.style.background = 'transparent';
      });

      item.addEventListener('click', (e) => {
        e.stopPropagation();
        action.handler();
        this.toggleActions();
      });

      menu.appendChild(item);
    });

    this.element.appendChild(menu);
    this.actionsMenu = menu;

    // Click outside to close
    setTimeout(() => {
      document.addEventListener('click', this.handleClickOutside);
    }, 0);
  }

  renderMetadata() {
    const metaDiv = DOMUtils.createElement('div', {
      class: 'deepweb-message-metadata'
    });
    Object.assign(metaDiv.style, {
      marginTop: '12px',
      padding: '8px',
      background: 'rgba(0,0,0,0.05)',
      borderRadius: '4px',
      fontSize: '12px',
      color: '#666'
    });

    const metadata = [];
    
    if (this.message.metadata?.model) {
      metadata.push(`Model: ${this.message.metadata.model}`);
    }
    
    if (this.message.tokens) {
      metadata.push(`Tokens: ${this.message.tokens}`);
    }
    
    if (this.message.cost && this.message.cost > 0) {
      metadata.push(`Cost: $${this.message.cost.toFixed(4)}`);
    }
    
    if (this.message.metadata?.temperature !== null) {
      metadata.push(`Temperature: ${this.message.metadata.temperature}`);
    }

    if (this.message.id) {
      metadata.push(`ID: ${this.message.id}`);
    }

    DOMUtils.setTextContent(metaDiv, metadata.join(' | '));
    this.element.appendChild(metaDiv);
  }

  // Action handlers
  async handleEdit() {
    this.setState({ 
      isEditing: true, 
      editContent: this.message.content 
    });
    this.renderContent();
  }

  async handleSaveEdit(newContent) {
    if (!newContent.trim()) {
      alert('Message content cannot be empty');
      return;
    }

    try {
      if (this.messageManager) {
        const updated = await this.messageManager.updateContent(this.message.id, newContent);
        this.message = updated;
        this.onUpdate(updated);
      }
      
      this.setState({ isEditing: false, editContent: '' });
      this.renderContent();
    } catch (error) {
      console.error('[Message] Failed to save edit:', error);
      alert('Failed to save edit. Please try again.');
    }
  }

  async handleCopy() {
    try {
      await navigator.clipboard.writeText(this.message.content);
      this.showToast('Copied to clipboard');
    } catch (error) {
      console.error('[Message] Failed to copy:', error);
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = this.message.content;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.showToast('Copied to clipboard');
    }
  }

  handleQuote() {
    const quotedText = `> ${this.message.content.split('\n').join('\n> ')}`;
    this.emit('quote', { 
      messageId: this.message.id, 
      quotedText,
      originalMessage: this.message 
    });
  }

  async handlePin() {
    try {
      if (this.messageManager) {
        const updated = await this.messageManager.togglePin(this.message.id);
        this.message = updated;
        this.onUpdate(updated);
        this.renderContent();
        this.renderActions();
      }
    } catch (error) {
      console.error('[Message] Failed to toggle pin:', error);
    }
  }

  handleToggleMetadata() {
    this.setState({ showMetadata: !this.state.showMetadata });
    this.render();
  }

  async handleDelete() {
    if (!confirm('Are you sure you want to delete this message?')) {
      return;
    }

    try {
      if (this.messageManager) {
        await this.messageManager.delete(this.message.id);
        this.onDelete(this.message.id);
      }
    } catch (error) {
      console.error('[Message] Failed to delete:', error);
      alert('Failed to delete message. Please try again.');
    }
  }

  // Helper methods
  toggleActions() {
    this.setState({ showActions: !this.state.showActions });
    
    if (this.state.showActions) {
      this.renderActionsMenu();
    } else if (this.actionsMenu) {
      this.actionsMenu.remove();
      this.actionsMenu = null;
      document.removeEventListener('click', this.handleClickOutside);
    }
  }

  showActionButton() {
    if (this.actionBtn) {
      this.actionBtn.style.display = 'block';
    }
  }

  hideActionButton() {
    if (this.actionBtn) {
      this.actionBtn.style.display = 'none';
    }
  }

  handleClickOutside = (e) => {
    if (this.actionsMenu && !this.actionsMenu.contains(e.target) && !this.actionBtn.contains(e.target)) {
      this.toggleActions();
    }
  };

  createButton(text, type, handler) {
    const button = DOMUtils.createElement('button', {
      class: `deepweb-btn deepweb-btn-${type}`
    });
    
    const styles = {
      padding: '6px 12px',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '13px',
      transition: 'background 0.2s'
    };

    if (type === 'primary') {
      Object.assign(styles, {
        background: '#1976d2',
        color: 'white'
      });
    } else {
      Object.assign(styles, {
        background: '#f5f5f5',
        color: '#333'
      });
    }

    Object.assign(button.style, styles);
    DOMUtils.setTextContent(button, text);
    button.addEventListener('click', handler);

    return button;
  }

  showToast(message) {
    const toast = DOMUtils.createElement('div', {
      class: 'deepweb-toast'
    });
    Object.assign(toast.style, {
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      background: '#333',
      color: 'white',
      padding: '12px 20px',
      borderRadius: '4px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      fontSize: '14px',
      zIndex: '10000',
      animation: 'fadeIn 0.3s ease'
    });
    DOMUtils.setTextContent(toast, message);
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }


  onDestroy() {
    document.removeEventListener('click', this.handleClickOutside);
    super.onDestroy();
  }
}