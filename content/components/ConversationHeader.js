/**
 * Conversation Header Component
 * Header component for active conversation with title and actions
 */

import BaseComponent from './BaseComponent.js';
import DOMUtils from '../utils/dom-utils.js';
import ExportDialog from './ExportDialog.js';

export default class ConversationHeader extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // Options
    this.conversation = options.conversation || null;
    this.onTitleUpdate = options.onTitleUpdate || (() => {});
    this.onArchive = options.onArchive || (() => {});
    this.onDelete = options.onDelete || (() => {});
    this.onExport = options.onExport || (() => {});
    
    // State
    this.state = {
      isEditing: false,
      showActions: false
    };
    
    // Export dialog instance
    this.exportDialog = null;
  }

  async render() {
    // Create container
    this.element = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-header',
      role: 'banner'
    });

    // Apply styles
    this.applyStyles();
    
    // Build content
    this.buildContent();
    
    // Initialize export dialog
    await this.initializeExportDialog();
  }

  applyStyles() {
    Object.assign(this.element.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#fff',
      minHeight: '56px'
    });
  }

  buildContent() {
    // Clear existing content
    this.element.innerHTML = '';

    if (!this.conversation) {
      this.buildEmptyState();
      return;
    }

    // Left section - Title and info
    const leftSection = DOMUtils.createElement('div', {
      class: 'deepweb-header-left'
    });
    Object.assign(leftSection.style, {
      display: 'flex',
      flexDirection: 'column',
      gap: '4px',
      flex: '1',
      minWidth: '0'
    });

    // Title container
    const titleContainer = DOMUtils.createElement('div', {
      class: 'deepweb-header-title-container'
    });
    Object.assign(titleContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    if (this.state.isEditing) {
      this.buildEditableTitle(titleContainer);
    } else {
      this.buildStaticTitle(titleContainer);
    }

    leftSection.appendChild(titleContainer);

    // Conversation info
    const infoContainer = DOMUtils.createElement('div', {
      class: 'deepweb-header-info'
    });
    Object.assign(infoContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '12px',
      color: '#666'
    });

    // Message count
    const messageCount = DOMUtils.createElement('span');
    DOMUtils.setTextContent(
      messageCount, 
      `${this.conversation.messageCount || 0} messages`
    );
    infoContainer.appendChild(messageCount);

    // Last updated
    const lastUpdated = DOMUtils.createElement('span');
    DOMUtils.setTextContent(
      lastUpdated,
      `Last updated: ${this.getRelativeTime(this.conversation.updatedAt)}`
    );
    infoContainer.appendChild(lastUpdated);

    // Domain if available
    if (this.conversation.metadata?.domain) {
      const domain = DOMUtils.createElement('span');
      DOMUtils.setTextContent(domain, `• ${this.conversation.metadata.domain}`);
      infoContainer.appendChild(domain);
    }

    leftSection.appendChild(infoContainer);
    this.element.appendChild(leftSection);

    // Right section - Actions
    this.buildActions();
  }

  buildEmptyState() {
    const emptyState = DOMUtils.createElement('div', {
      class: 'deepweb-header-empty'
    });
    DOMUtils.setTextContent(emptyState, 'No conversation selected');
    Object.assign(emptyState.style, {
      color: '#999',
      fontSize: '14px',
      fontStyle: 'italic'
    });
    this.element.appendChild(emptyState);
  }

  buildStaticTitle(container) {
    // Archive indicator
    if (this.conversation.archived) {
      const archiveIcon = DOMUtils.createElement('span', {
        title: 'Archived conversation'
      });
      DOMUtils.setTextContent(archiveIcon, '📦');
      Object.assign(archiveIcon.style, {
        fontSize: '16px'
      });
      container.appendChild(archiveIcon);
    }

    // Title
    const title = DOMUtils.createElement('h2', {
      class: 'deepweb-header-title'
    });
    DOMUtils.setTextContent(title, this.conversation.title || 'Untitled Conversation');
    Object.assign(title.style, {
      fontSize: '16px',
      fontWeight: '600',
      color: '#333',
      margin: '0',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
      flex: '1'
    });
    container.appendChild(title);

    // Edit button
    const editBtn = DOMUtils.createElement('button', {
      class: 'deepweb-edit-title-btn',
      title: 'Edit title',
      type: 'button'
    });
    DOMUtils.setTextContent(editBtn, '✏️');
    Object.assign(editBtn.style, {
      padding: '4px 8px',
      fontSize: '14px',
      background: 'transparent',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      opacity: '0.7',
      transition: 'opacity 0.2s ease'
    });

    editBtn.addEventListener('click', () => {
      this.setState({ isEditing: true });
      this.buildContent();
    });

    editBtn.addEventListener('mouseenter', () => {
      editBtn.style.opacity = '1';
      editBtn.style.backgroundColor = '#f5f5f5';
    });

    editBtn.addEventListener('mouseleave', () => {
      editBtn.style.opacity = '0.7';
      editBtn.style.backgroundColor = 'transparent';
    });

    container.appendChild(editBtn);
  }

  buildEditableTitle(container) {
    const input = DOMUtils.createElement('input', {
      type: 'text',
      class: 'deepweb-title-input',
      value: this.conversation.title || ''
    });
    Object.assign(input.style, {
      fontSize: '16px',
      fontWeight: '600',
      padding: '4px 8px',
      border: '1px solid #2196F3',
      borderRadius: '4px',
      outline: 'none',
      flex: '1',
      minWidth: '200px'
    });

    container.appendChild(input);

    // Save button
    const saveBtn = DOMUtils.createElement('button', {
      class: 'deepweb-save-title-btn',
      title: 'Save',
      type: 'button'
    });
    DOMUtils.setTextContent(saveBtn, '✓');
    Object.assign(saveBtn.style, {
      padding: '4px 8px',
      fontSize: '16px',
      background: '#4CAF50',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer'
    });

    // Cancel button
    const cancelBtn = DOMUtils.createElement('button', {
      class: 'deepweb-cancel-title-btn',
      title: 'Cancel',
      type: 'button'
    });
    DOMUtils.setTextContent(cancelBtn, '✕');
    Object.assign(cancelBtn.style, {
      padding: '4px 8px',
      fontSize: '16px',
      background: '#f44336',
      color: 'white',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      marginLeft: '4px'
    });

    container.appendChild(saveBtn);
    container.appendChild(cancelBtn);

    // Focus and select input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 0);

    // Event handlers
    const saveTitle = () => {
      const newTitle = input.value.trim();
      if (newTitle && newTitle !== this.conversation.title) {
        this.onTitleUpdate(this.conversation.id, newTitle);
        this.conversation.title = newTitle;
      }
      this.setState({ isEditing: false });
      this.buildContent();
    };

    const cancelEdit = () => {
      this.setState({ isEditing: false });
      this.buildContent();
    };

    saveBtn.addEventListener('click', saveTitle);
    cancelBtn.addEventListener('click', cancelEdit);
    
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveTitle();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });
  }

  buildActions() {
    const actionsContainer = DOMUtils.createElement('div', {
      class: 'deepweb-header-actions'
    });
    Object.assign(actionsContainer.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    // Archive button
    const archiveBtn = this.createActionButton(
      this.conversation.archived ? '📤' : '📥',
      this.conversation.archived ? 'Unarchive' : 'Archive',
      () => {
        this.onArchive(this.conversation.id, !this.conversation.archived);
      }
    );
    actionsContainer.appendChild(archiveBtn);

    // Export button
    const exportBtn = this.createActionButton('💾', 'Export', () => {
      this.showExportDialog();
    });
    actionsContainer.appendChild(exportBtn);

    // Delete button
    const deleteBtn = this.createActionButton('🗑️', 'Delete', () => {
      if (confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
        this.onDelete(this.conversation.id);
      }
    });
    Object.assign(deleteBtn.style, {
      color: '#f44336'
    });
    actionsContainer.appendChild(deleteBtn);

    this.element.appendChild(actionsContainer);
  }

  createActionButton(icon, title, onClick) {
    const button = DOMUtils.createElement('button', {
      class: 'deepweb-header-action-btn',
      title: title,
      type: 'button'
    });
    DOMUtils.setTextContent(button, icon);
    Object.assign(button.style, {
      padding: '6px 10px',
      fontSize: '16px',
      background: '#f5f5f5',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    });

    button.addEventListener('click', onClick);

    button.addEventListener('mouseenter', () => {
      button.style.background = '#e0e0e0';
      button.style.borderColor = '#ccc';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = '#f5f5f5';
      button.style.borderColor = '#e0e0e0';
    });

    return button;
  }

  async initializeExportDialog() {
    if (!this.exportDialog) {
      this.exportDialog = new ExportDialog();
      await this.exportDialog.init();
      document.body.appendChild(this.exportDialog.element);
    }
  }

  showExportDialog() {
    if (!this.conversation) return;
    
    if (this.exportDialog) {
      this.exportDialog.open({
        conversationId: this.conversation.id,
        scope: 'current'
      });
    }
  }


  updateConversation(conversation) {
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