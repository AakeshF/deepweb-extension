/**
 * Conversation Item Component
 * Individual conversation item in the conversation list
 */

import BaseComponent from './BaseComponent.js';
import DOMUtils from '../utils/dom-utils.js';

export default class ConversationItem extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // Required options
    this.conversation = options.conversation || null;
    this.onSelect = options.onSelect || (() => {});
    this.onRename = options.onRename || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onArchive = options.onArchive || (() => {});
    
    // State
    this.state = {
      isActive: options.isActive || false,
      isHovered: false,
      isEditing: false,
      showActions: false
    };
  }

  async render() {
    if (!this.conversation) {
      throw new Error('Conversation data is required');
    }

    // Create container
    this.element = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-item',
      'data-conversation-id': this.conversation.id,
      role: 'button',
      tabindex: '0',
      'aria-selected': this.state.isActive
    });

    // Apply base styles
    this.applyStyles();
    
    // Build content
    this.buildContent();
    
    // Update active state
    this.updateActiveState();
  }

  applyStyles() {
    Object.assign(this.element.style, {
      padding: '12px 16px',
      marginBottom: '4px',
      borderRadius: '8px',
      cursor: 'pointer',
      position: 'relative',
      transition: 'all 0.2s ease',
      backgroundColor: this.state.isActive ? '#e3f2fd' : 'transparent',
      border: '1px solid transparent'
    });
  }

  buildContent() {
    // Main container
    const contentContainer = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-content'
    });
    Object.assign(contentContainer.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      paddingRight: '80px' // Space for actions
    });

    // Title row
    const titleRow = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-title-row'
    });
    Object.assign(titleRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    // Archive indicator
    if (this.conversation.archived) {
      const archiveIcon = DOMUtils.createElement('span', {
        class: 'deepweb-archive-icon',
        title: 'Archived'
      });
      DOMUtils.setTextContent(archiveIcon, '📦');
      Object.assign(archiveIcon.style, {
        fontSize: '12px',
        opacity: '0.7'
      });
      titleRow.appendChild(archiveIcon);
    }

    // Title
    const title = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-title'
    });
    DOMUtils.setTextContent(title, this.conversation.title || 'New Conversation');
    Object.assign(title.style, {
      fontSize: '14px',
      fontWeight: this.state.isActive ? '600' : '500',
      color: '#333',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: '1'
    });
    titleRow.appendChild(title);

    contentContainer.appendChild(titleRow);

    // Preview text
    if (this.conversation.lastMessage) {
      const preview = DOMUtils.createElement('div', {
        class: 'deepweb-conversation-preview'
      });
      DOMUtils.setTextContent(preview, this.conversation.lastMessage);
      Object.assign(preview.style, {
        fontSize: '12px',
        color: '#666',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        lineHeight: '1.4'
      });
      contentContainer.appendChild(preview);
    }

    // Metadata row
    const metaRow = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-meta'
    });
    Object.assign(metaRow.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '11px',
      color: '#999'
    });

    // Timestamp
    const timestamp = DOMUtils.createElement('span', {
      class: 'deepweb-conversation-timestamp'
    });
    DOMUtils.setTextContent(timestamp, this.getRelativeTime(this.conversation.updatedAt));
    metaRow.appendChild(timestamp);

    // Message count
    if (this.conversation.messageCount > 0) {
      const messageCount = DOMUtils.createElement('span', {
        class: 'deepweb-conversation-message-count'
      });
      DOMUtils.setTextContent(messageCount, `• ${this.conversation.messageCount} messages`);
      metaRow.appendChild(messageCount);
    }

    contentContainer.appendChild(metaRow);
    this.element.appendChild(contentContainer);

    // Action buttons container
    this.buildActionButtons();
  }

  buildActionButtons() {
    const actionsContainer = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-actions'
    });
    Object.assign(actionsContainer.style, {
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      display: 'flex',
      gap: '4px',
      opacity: this.state.showActions ? '1' : '0',
      transition: 'opacity 0.2s ease',
      pointerEvents: this.state.showActions ? 'auto' : 'none'
    });

    // Rename button
    const renameBtn = this.createActionButton('✏️', 'Rename', () => {
      this.startEditing();
    });
    actionsContainer.appendChild(renameBtn);

    // Archive/Unarchive button
    const archiveBtn = this.createActionButton(
      this.conversation.archived ? '📤' : '📥',
      this.conversation.archived ? 'Unarchive' : 'Archive',
      () => {
        this.onArchive(this.conversation.id, !this.conversation.archived);
      }
    );
    actionsContainer.appendChild(archiveBtn);

    // Delete button
    const deleteBtn = this.createActionButton('🗑️', 'Delete', () => {
      if (confirm('Are you sure you want to delete this conversation?')) {
        this.onDelete(this.conversation.id);
      }
    });
    actionsContainer.appendChild(deleteBtn);

    this.element.appendChild(actionsContainer);
    this.actionsContainer = actionsContainer;
  }

  createActionButton(icon, title, onClick) {
    const button = DOMUtils.createElement('button', {
      class: 'deepweb-action-button',
      title: title,
      type: 'button'
    });
    DOMUtils.setTextContent(button, icon);
    Object.assign(button.style, {
      padding: '4px 8px',
      fontSize: '14px',
      background: 'white',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      lineHeight: '1'
    });

    button.addEventListener('click', (e) => {
      e.stopPropagation();
      onClick();
    });

    button.addEventListener('mouseenter', () => {
      button.style.background = '#f5f5f5';
      button.style.borderColor = '#ccc';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'white';
      button.style.borderColor = '#e0e0e0';
    });

    return button;
  }

  startEditing() {
    this.setState({ isEditing: true });
    
    const titleElement = this.element.querySelector('.deepweb-conversation-title');
    const currentTitle = this.conversation.title;
    
    // Create input
    const input = DOMUtils.createElement('input', {
      type: 'text',
      class: 'deepweb-conversation-title-input',
      value: currentTitle
    });
    Object.assign(input.style, {
      fontSize: '14px',
      padding: '2px 4px',
      border: '1px solid #2196F3',
      borderRadius: '4px',
      width: '100%',
      outline: 'none'
    });

    // Replace title with input
    titleElement.replaceWith(input);
    input.focus();
    input.select();

    // Handle save
    const saveEdit = () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== currentTitle) {
        this.onRename(this.conversation.id, newTitle);
      }
      this.setState({ isEditing: false });
      this.buildContent();
    };

    // Handle cancel
    const cancelEdit = () => {
      this.setState({ isEditing: false });
      this.buildContent();
    };

    // Event listeners
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });
  }

  setupEventListeners() {
    // Click to select
    this.element.addEventListener('click', () => {
      if (!this.state.isEditing) {
        this.onSelect(this.conversation.id);
      }
    });

    // Keyboard navigation
    this.element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!this.state.isEditing) {
          this.onSelect(this.conversation.id);
        }
      }
    });

    // Hover effects
    this.element.addEventListener('mouseenter', () => {
      this.setState({ isHovered: true, showActions: true });
      if (!this.state.isActive) {
        this.element.style.backgroundColor = '#f5f5f5';
        this.element.style.borderColor = '#e0e0e0';
      }
    });

    this.element.addEventListener('mouseleave', () => {
      this.setState({ isHovered: false, showActions: false });
      if (!this.state.isActive) {
        this.element.style.backgroundColor = 'transparent';
        this.element.style.borderColor = 'transparent';
      }
    });
  }

  onStateChange(oldState, newState) {
    // Update active state
    if (oldState.isActive !== newState.isActive) {
      this.updateActiveState();
    }

    // Update action visibility
    if (oldState.showActions !== newState.showActions && this.actionsContainer) {
      this.actionsContainer.style.opacity = newState.showActions ? '1' : '0';
      this.actionsContainer.style.pointerEvents = newState.showActions ? 'auto' : 'none';
    }
  }

  updateActiveState() {
    if (this.state.isActive) {
      this.element.style.backgroundColor = '#e3f2fd';
      this.element.style.borderColor = '#90caf9';
      this.element.setAttribute('aria-selected', 'true');
    } else {
      this.element.style.backgroundColor = 'transparent';
      this.element.style.borderColor = 'transparent';
      this.element.setAttribute('aria-selected', 'false');
    }
  }

  setActive(isActive) {
    this.setState({ isActive });
  }

  updateData(conversation) {
    this.conversation = conversation;
    this.buildContent();
  }

  getRelativeTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    const date = new Date(timestamp);
    return date.toLocaleDateString();
  }
}