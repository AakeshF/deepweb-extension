/**
 * Conversation List Component
 * Main component for displaying and managing conversations
 */

import BaseComponent from './BaseComponent.js';
import ConversationItem from './ConversationItem.js';
import DOMUtils from '../utils/dom-utils.js';
import { responsiveManager } from '../utils/ResponsiveManager.js';

export default class ConversationList extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    // Options
    this.conversationManager = options.conversationManager || null;
    this.onConversationSelect = options.onConversationSelect || (() => {});
    this.onNewConversation = options.onNewConversation || (() => {});
    this.onImport = options.onImport || (() => {});
    
    // State
    this.state = {
      conversations: [],
      activeConversationId: null,
      searchQuery: '',
      filterArchived: false,
      currentPage: 1,
      pageSize: 20,
      totalPages: 1,
      isLoading: false,
      error: null,
      // Mobile-specific state
      isMobileMode: false
    };
    
    // Component cache
    this.conversationItems = new Map();
    
    // Mobile interaction state
    this.mobileInteractions = {
      isSwipeActive: false,
      swipeStartX: 0,
      swipeThreshold: 100
    };
  }

  async render() {
    // Detect mobile mode
    this.state.isMobileMode = responsiveManager.isMobile() || responsiveManager.isTablet();
    
    // Create container
    this.element = DOMUtils.createElement('div', {
      class: 'deepweb-conversation-list',
      role: 'navigation',
      'aria-label': 'Conversations'
    });

    // Apply styles
    this.applyStyles();
    
    // Apply mobile layout if needed
    if (this.state.isMobileMode) {
      this.applyMobileLayout();
    }
    
    // Build UI structure
    this.buildStructure();
    
    // Load initial data
    await this.loadConversations();
  }

  applyStyles() {
    Object.assign(this.element.style, {
      display: 'flex',
      flexDirection: 'column',
      width: '100%',
      height: '100%',
      backgroundColor: '#f8f9fa',
      borderRight: '1px solid #e0e0e0'
    });
  }

  buildStructure() {
    // Header section
    this.buildHeader();
    
    // Search section
    this.buildSearchSection();
    
    // Filter section
    this.buildFilterSection();
    
    // Conversation list container
    this.buildListContainer();
    
    // Pagination section
    this.buildPaginationSection();
  }

  buildHeader() {
    const header = DOMUtils.createElement('div', {
      class: 'deepweb-list-header'
    });
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '16px',
      borderBottom: '1px solid #e0e0e0',
      backgroundColor: '#fff'
    });

    // Title
    const title = DOMUtils.createElement('h3');
    DOMUtils.setTextContent(title, 'Conversations');
    Object.assign(title.style, {
      fontSize: '18px',
      fontWeight: '600',
      margin: '0',
      color: '#333'
    });
    header.appendChild(title);

    // Buttons container
    const buttonsContainer = DOMUtils.createElement('div', {
      class: 'deepweb-header-buttons'
    });
    Object.assign(buttonsContainer.style, {
      display: 'flex',
      gap: '8px'
    });

    // Import button
    const importBtn = DOMUtils.createElement('button', {
      class: 'deepweb-import-btn',
      title: 'Import conversations',
      type: 'button'
    });
    DOMUtils.setTextContent(importBtn, '📥');
    Object.assign(importBtn.style, {
      padding: '8px 12px',
      fontSize: '16px',
      color: '#666',
      backgroundColor: '#f5f5f5',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'all 0.2s ease'
    });

    importBtn.addEventListener('click', () => {
      this.onImport();
    });

    importBtn.addEventListener('mouseenter', () => {
      importBtn.style.backgroundColor = '#e0e0e0';
      importBtn.style.borderColor = '#ccc';
    });

    importBtn.addEventListener('mouseleave', () => {
      importBtn.style.backgroundColor = '#f5f5f5';
      importBtn.style.borderColor = '#e0e0e0';
    });

    buttonsContainer.appendChild(importBtn);

    // New conversation button
    const newBtn = DOMUtils.createElement('button', {
      class: 'deepweb-new-conversation-btn',
      title: 'New conversation',
      type: 'button'
    });
    DOMUtils.setTextContent(newBtn, '+ New');
    Object.assign(newBtn.style, {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '500',
      color: 'white',
      backgroundColor: '#2196F3',
      border: 'none',
      borderRadius: '4px',
      cursor: 'pointer',
      transition: 'background 0.2s ease'
    });

    newBtn.addEventListener('click', () => {
      this.onNewConversation();
    });

    newBtn.addEventListener('mouseenter', () => {
      newBtn.style.backgroundColor = '#1976D2';
    });

    newBtn.addEventListener('mouseleave', () => {
      newBtn.style.backgroundColor = '#2196F3';
    });

    buttonsContainer.appendChild(newBtn);
    header.appendChild(buttonsContainer);
    this.element.appendChild(header);
  }

  buildSearchSection() {
    const searchContainer = DOMUtils.createElement('div', {
      class: 'deepweb-search-container'
    });
    Object.assign(searchContainer.style, {
      padding: '12px 16px',
      backgroundColor: '#fff',
      borderBottom: '1px solid #e0e0e0'
    });

    // Search input wrapper
    const searchWrapper = DOMUtils.createElement('div', {
      class: 'deepweb-search-wrapper'
    });
    Object.assign(searchWrapper.style, {
      position: 'relative',
      display: 'flex',
      alignItems: 'center'
    });

    // Search icon
    const searchIcon = DOMUtils.createElement('span', {
      class: 'deepweb-search-icon'
    });
    DOMUtils.setTextContent(searchIcon, '🔍');
    Object.assign(searchIcon.style, {
      position: 'absolute',
      left: '12px',
      fontSize: '16px',
      pointerEvents: 'none'
    });
    searchWrapper.appendChild(searchIcon);

    // Search input
    const searchInput = DOMUtils.createElement('input', {
      type: 'text',
      class: 'deepweb-search-input',
      placeholder: 'Search conversations...',
      'aria-label': 'Search conversations'
    });
    Object.assign(searchInput.style, {
      width: '100%',
      padding: '8px 12px 8px 40px',
      fontSize: '14px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      outline: 'none',
      transition: 'border-color 0.2s ease'
    });

    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = '#2196F3';
    });

    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = '#e0e0e0';
    });

    searchInput.addEventListener('input', (e) => {
      this.handleSearch(e.target.value);
    });

    searchWrapper.appendChild(searchInput);
    searchContainer.appendChild(searchWrapper);
    this.element.appendChild(searchContainer);
    
    this.searchInput = searchInput;
  }

  buildFilterSection() {
    const filterContainer = DOMUtils.createElement('div', {
      class: 'deepweb-filter-container'
    });
    Object.assign(filterContainer.style, {
      display: 'flex',
      alignItems: 'center',
      padding: '8px 16px',
      backgroundColor: '#f5f5f5',
      borderBottom: '1px solid #e0e0e0',
      fontSize: '13px',
      gap: '12px'
    });

    // Archive filter
    const archiveFilter = DOMUtils.createElement('label', {
      class: 'deepweb-archive-filter'
    });
    Object.assign(archiveFilter.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer'
    });

    const archiveCheckbox = DOMUtils.createElement('input', {
      type: 'checkbox',
      class: 'deepweb-archive-checkbox'
    });
    archiveCheckbox.addEventListener('change', (e) => {
      this.setState({ filterArchived: e.target.checked });
      this.loadConversations();
    });

    const archiveLabel = DOMUtils.createElement('span');
    DOMUtils.setTextContent(archiveLabel, 'Show archived');
    
    archiveFilter.appendChild(archiveCheckbox);
    archiveFilter.appendChild(archiveLabel);
    filterContainer.appendChild(archiveFilter);

    // Conversation count
    const countLabel = DOMUtils.createElement('span', {
      class: 'deepweb-conversation-count'
    });
    Object.assign(countLabel.style, {
      marginLeft: 'auto',
      color: '#666'
    });
    filterContainer.appendChild(countLabel);
    
    this.element.appendChild(filterContainer);
    this.countLabel = countLabel;
  }

  buildListContainer() {
    const listContainer = DOMUtils.createElement('div', {
      class: 'deepweb-list-container',
      role: 'list'
    });
    Object.assign(listContainer.style, {
      flex: '1',
      overflowY: 'auto',
      padding: '8px'
    });

    // Loading indicator
    const loadingIndicator = DOMUtils.createElement('div', {
      class: 'deepweb-loading-indicator'
    });
    DOMUtils.setTextContent(loadingIndicator, 'Loading conversations...');
    Object.assign(loadingIndicator.style, {
      display: 'none',
      padding: '24px',
      textAlign: 'center',
      color: '#666',
      fontSize: '14px'
    });
    listContainer.appendChild(loadingIndicator);

    // Empty state
    const emptyState = DOMUtils.createElement('div', {
      class: 'deepweb-empty-state'
    });
    Object.assign(emptyState.style, {
      display: 'none',
      padding: '48px 24px',
      textAlign: 'center',
      color: '#999'
    });

    const emptyIcon = DOMUtils.createElement('div');
    DOMUtils.setTextContent(emptyIcon, '💬');
    Object.assign(emptyIcon.style, {
      fontSize: '48px',
      marginBottom: '16px',
      opacity: '0.5'
    });
    emptyState.appendChild(emptyIcon);

    const emptyText = DOMUtils.createElement('p');
    DOMUtils.setTextContent(emptyText, 'No conversations yet');
    Object.assign(emptyText.style, {
      fontSize: '16px',
      margin: '0 0 8px 0'
    });
    emptyState.appendChild(emptyText);

    const emptySubtext = DOMUtils.createElement('p');
    DOMUtils.setTextContent(emptySubtext, 'Start a new conversation to get started');
    Object.assign(emptySubtext.style, {
      fontSize: '14px',
      margin: '0',
      opacity: '0.8'
    });
    emptyState.appendChild(emptySubtext);

    listContainer.appendChild(emptyState);

    // Error state
    const errorState = DOMUtils.createElement('div', {
      class: 'deepweb-error-state'
    });
    Object.assign(errorState.style, {
      display: 'none',
      padding: '24px',
      textAlign: 'center',
      color: '#f44336',
      fontSize: '14px'
    });
    listContainer.appendChild(errorState);

    this.element.appendChild(listContainer);
    
    this.listContainer = listContainer;
    this.loadingIndicator = loadingIndicator;
    this.emptyState = emptyState;
    this.errorState = errorState;
  }

  buildPaginationSection() {
    const paginationContainer = DOMUtils.createElement('div', {
      class: 'deepweb-pagination'
    });
    Object.assign(paginationContainer.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      padding: '12px',
      borderTop: '1px solid #e0e0e0',
      backgroundColor: '#fff'
    });

    // Previous button
    const prevBtn = DOMUtils.createElement('button', {
      class: 'deepweb-pagination-prev',
      title: 'Previous page',
      type: 'button'
    });
    DOMUtils.setTextContent(prevBtn, '←');
    Object.assign(prevBtn.style, {
      padding: '4px 8px',
      fontSize: '14px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer',
      disabled: 'true'
    });

    prevBtn.addEventListener('click', () => {
      if (this.state.currentPage > 1) {
        this.setState({ currentPage: this.state.currentPage - 1 });
        this.loadConversations();
      }
    });

    // Page info
    const pageInfo = DOMUtils.createElement('span', {
      class: 'deepweb-page-info'
    });
    Object.assign(pageInfo.style, {
      fontSize: '13px',
      color: '#666',
      padding: '0 12px'
    });

    // Next button
    const nextBtn = DOMUtils.createElement('button', {
      class: 'deepweb-pagination-next',
      title: 'Next page',
      type: 'button'
    });
    DOMUtils.setTextContent(nextBtn, '→');
    Object.assign(nextBtn.style, {
      padding: '4px 8px',
      fontSize: '14px',
      border: '1px solid #e0e0e0',
      borderRadius: '4px',
      backgroundColor: 'white',
      cursor: 'pointer'
    });

    nextBtn.addEventListener('click', () => {
      if (this.state.currentPage < this.state.totalPages) {
        this.setState({ currentPage: this.state.currentPage + 1 });
        this.loadConversations();
      }
    });

    paginationContainer.appendChild(prevBtn);
    paginationContainer.appendChild(pageInfo);
    paginationContainer.appendChild(nextBtn);

    this.element.appendChild(paginationContainer);
    
    this.paginationContainer = paginationContainer;
    this.prevBtn = prevBtn;
    this.nextBtn = nextBtn;
    this.pageInfo = pageInfo;
  }

  async loadConversations() {
    if (!this.conversationManager) {
      this.showError('Conversation manager not available');
      return;
    }

    this.setState({ isLoading: true, error: null });
    this.showLoading(true);

    try {
      const result = await this.conversationManager.list({
        page: this.state.currentPage,
        pageSize: this.state.pageSize,
        archived: this.state.filterArchived,
        search: this.state.searchQuery || null,
        sortBy: 'updatedAt',
        sortOrder: 'desc'
      });

      this.setState({
        conversations: result.items,
        totalPages: result.pagination.totalPages,
        isLoading: false
      });

      this.renderConversations();
      this.updatePagination(result.pagination);
      this.updateCount(result.pagination.total);

    } catch (error) {
      console.error('[ConversationList] Failed to load conversations:', error);
      this.setState({ isLoading: false, error: error.message });
      this.showError(error.message);
    }
  }

  renderConversations() {
    // Clear existing items
    this.conversationItems.forEach(item => item.destroy());
    this.conversationItems.clear();
    
    // Clear container
    const existingItems = this.listContainer.querySelectorAll('.deepweb-conversation-item');
    existingItems.forEach(item => item.remove());

    // Show empty state if needed
    if (this.state.conversations.length === 0) {
      this.showEmpty(true);
      return;
    }

    this.showEmpty(false);
    this.showLoading(false);
    this.showError(null);

    // Render conversation items
    this.state.conversations.forEach(conversation => {
      const item = new ConversationItem({
        conversation,
        isActive: conversation.id === this.state.activeConversationId,
        onSelect: (id) => this.handleConversationSelect(id),
        onRename: (id, title) => this.handleRename(id, title),
        onDelete: (id) => this.handleDelete(id),
        onArchive: (id, archived) => this.handleArchive(id, archived)
      });

      item.init();
      this.listContainer.appendChild(item.element);
      this.conversationItems.set(conversation.id, item);
    });
  }

  handleSearch(query) {
    this.setState({ 
      searchQuery: query,
      currentPage: 1 
    });

    // Debounce search
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.loadConversations();
    }, 300);
  }

  handleConversationSelect(id) {
    // Update active state
    this.setState({ activeConversationId: id });
    
    // Update item states
    this.conversationItems.forEach((item, itemId) => {
      item.setActive(itemId === id);
    });

    // Notify parent
    this.onConversationSelect(id);
  }

  async handleRename(id, newTitle) {
    try {
      await this.conversationManager.update(id, { title: newTitle });
      
      // Update local state
      const conversations = this.state.conversations.map(conv => 
        conv.id === id ? { ...conv, title: newTitle } : conv
      );
      this.setState({ conversations });
      
      // Update item
      const item = this.conversationItems.get(id);
      if (item) {
        item.updateData({ ...item.conversation, title: newTitle });
      }
      
    } catch (error) {
      console.error('[ConversationList] Failed to rename conversation:', error);
      this.showError('Failed to rename conversation');
    }
  }

  async handleDelete(id) {
    try {
      await this.conversationManager.delete(id);
      
      // If deleted conversation was active, clear selection
      if (this.state.activeConversationId === id) {
        this.setState({ activeConversationId: null });
        this.onConversationSelect(null);
      }
      
      // Reload list
      await this.loadConversations();
      
    } catch (error) {
      console.error('[ConversationList] Failed to delete conversation:', error);
      this.showError('Failed to delete conversation');
    }
  }

  async handleArchive(id, archived) {
    try {
      await this.conversationManager.archive(id, archived);
      
      // Reload list if we're filtering archived
      if (!this.state.filterArchived && archived) {
        await this.loadConversations();
      } else {
        // Update local state
        const conversations = this.state.conversations.map(conv => 
          conv.id === id ? { ...conv, archived } : conv
        );
        this.setState({ conversations });
        
        // Update item
        const item = this.conversationItems.get(id);
        if (item) {
          item.updateData({ ...item.conversation, archived });
        }
      }
      
    } catch (error) {
      console.error('[ConversationList] Failed to archive conversation:', error);
      this.showError('Failed to archive conversation');
    }
  }

  updatePagination(pagination) {
    // Update page info
    DOMUtils.setTextContent(
      this.pageInfo,
      `Page ${pagination.page} of ${pagination.totalPages}`
    );

    // Update button states
    this.prevBtn.disabled = !pagination.hasPrev;
    this.prevBtn.style.opacity = pagination.hasPrev ? '1' : '0.5';
    this.prevBtn.style.cursor = pagination.hasPrev ? 'pointer' : 'default';

    this.nextBtn.disabled = !pagination.hasNext;
    this.nextBtn.style.opacity = pagination.hasNext ? '1' : '0.5';
    this.nextBtn.style.cursor = pagination.hasNext ? 'pointer' : 'default';

    // Show/hide pagination if only one page
    this.paginationContainer.style.display = pagination.totalPages > 1 ? 'flex' : 'none';
  }

  updateCount(total) {
    const text = this.state.filterArchived 
      ? `${total} archived conversations`
      : `${total} conversations`;
    DOMUtils.setTextContent(this.countLabel, text);
  }

  showLoading(show) {
    this.loadingIndicator.style.display = show ? 'block' : 'none';
  }

  showEmpty(show) {
    this.emptyState.style.display = show ? 'block' : 'none';
  }

  showError(message) {
    if (message) {
      DOMUtils.setTextContent(this.errorState, `Error: ${message}`);
      this.errorState.style.display = 'block';
    } else {
      this.errorState.style.display = 'none';
    }
  }

  setActiveConversation(id) {
    this.handleConversationSelect(id);
  }

  refresh() {
    this.loadConversations();
  }

  onDestroy() {
    // Clean up conversation items
    this.conversationItems.forEach(item => item.destroy());
    this.conversationItems.clear();
    
    // Clear search timeout
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
  }
  
  // ================================
  // MOBILE RESPONSIVE METHODS
  // ================================
  
  applyMobileLayout() {
    this.element.classList.add('mobile-mode');
    
    // Apply mobile-specific styles
    Object.assign(this.element.style, {
      width: '100%',
      height: '100%',
      borderRadius: '0',
      border: 'none'
    });
    
    // Setup mobile interactions
    this.setupMobileInteractions();
  }
  
  setupMobileInteractions() {
    if (!responsiveManager.isTouchDevice()) return;
    
    // Setup swipe gestures for conversation items
    this.setupSwipeGestures();
    
    // Make conversation items touch-friendly
    this.makeTouchFriendly();
    
    // Setup pull-to-refresh
    this.setupPullToRefresh();
  }
  
  setupSwipeGestures() {
    this._eventManager.on(this.element, 'touchstart', (e) => {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      this.mobileInteractions.swipeStartX = touch.clientX;
      this.mobileInteractions.isSwipeActive = true;
    });
    
    this._eventManager.on(this.element, 'touchmove', (e) => {
      if (!this.mobileInteractions.isSwipeActive || e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.mobileInteractions.swipeStartX;
      
      // Visual feedback for swipe
      if (Math.abs(deltaX) > 20) {
        const target = e.target.closest('.deepweb-conversation-item');
        if (target) {
          target.style.transform = `translateX(${deltaX * 0.5}px)`;
          target.style.opacity = Math.max(0.7, 1 - Math.abs(deltaX) / 200);
        }
      }
    });
    
    this._eventManager.on(this.element, 'touchend', (e) => {
      if (!this.mobileInteractions.isSwipeActive) return;
      
      this.mobileInteractions.isSwipeActive = false;
      
      // Reset visual state
      const items = this.element.querySelectorAll('.deepweb-conversation-item');
      items.forEach(item => {
        item.style.transform = '';
        item.style.opacity = '';
      });
    });
  }
  
  makeTouchFriendly() {
    // Make all conversation items touch-friendly
    const updateTouchTargets = () => {
      const items = this.element.querySelectorAll('.deepweb-conversation-item');
      items.forEach(item => {
        responsiveManager.makeTouchFriendly(item, 60); // 60px minimum for conversations
      });
    };
    
    // Update when items are added
    const observer = new MutationObserver(updateTouchTargets);
    observer.observe(this.element, { childList: true, subtree: true });
    
    // Initial update
    updateTouchTargets();
    
    // Store observer for cleanup
    this.touchObserver = observer;
  }
  
  setupPullToRefresh() {
    // Create pull-to-refresh indicator
    const pullIndicator = DOMUtils.createElement('div', {
      class: 'pull-to-refresh-conversations'
    });
    
    pullIndicator.innerHTML = `
      <div class="spinner deepweb-spinner-small"></div>
      <span>Pull to refresh</span>
    `;
    
    this.element.prepend(pullIndicator);
    
    // Setup pull gesture detection
    let pullStartY = 0;
    let isPulling = false;
    
    this._eventManager.on(this.element, 'touchstart', (e) => {
      if (this.element.scrollTop === 0 && e.touches.length === 1) {
        pullStartY = e.touches[0].clientY;
      }
    });
    
    this._eventManager.on(this.element, 'touchmove', (e) => {
      if (pullStartY === 0 || e.touches.length !== 1) return;
      
      const currentY = e.touches[0].clientY;
      const pullDistance = currentY - pullStartY;
      
      if (pullDistance > 0 && this.element.scrollTop === 0) {
        e.preventDefault();
        isPulling = true;
        
        const progress = Math.min(pullDistance / 80, 1);
        pullIndicator.style.transform = `translateY(${pullDistance - 80}px)`;
        pullIndicator.style.opacity = progress;
        
        if (pullDistance > 80) {
          pullIndicator.classList.add('ready');
        } else {
          pullIndicator.classList.remove('ready');
        }
      }
    });
    
    this._eventManager.on(this.element, 'touchend', async (e) => {
      if (!isPulling) return;
      
      isPulling = false;
      pullStartY = 0;
      
      if (pullIndicator.classList.contains('ready')) {
        // Trigger refresh
        pullIndicator.classList.add('refreshing');
        await this.refreshConversations();
        pullIndicator.classList.remove('refreshing', 'ready');
      }
      
      // Reset indicator
      pullIndicator.style.transform = '';
      pullIndicator.style.opacity = '';
    });
  }
  
  async refreshConversations() {
    try {
      this.setState({ isLoading: true });
      await this.loadConversations();
      
      // Show success feedback
      if (window.animationManager) {
        window.animationManager.showToast('Conversations refreshed', 'success', 2000);
      }
    } catch (error) {
      console.error('[ConversationList] Error refreshing conversations:', error);
      
      // Show error feedback
      if (window.animationManager) {
        window.animationManager.showToast('Failed to refresh conversations', 'error', 3000);
      }
    } finally {
      this.setState({ isLoading: false });
    }
  }
  
  // Mobile-specific methods
  
  adaptForMobile() {
    if (responsiveManager.isMobile()) {
      // Increase item spacing for easier touch interaction
      const items = this.element.querySelectorAll('.deepweb-conversation-item');
      items.forEach(item => {
        item.style.marginBottom = '4px';
        item.style.padding = '16px';
      });
      
      // Add mobile navigation if needed
      this.addMobileNavigation();
    }
  }
  
  addMobileNavigation() {
    // Add floating action button for new conversation
    const fab = DOMUtils.createElement('button', {
      class: 'conversation-fab',
      'aria-label': 'New conversation'
    });
    
    fab.innerHTML = '+';
    fab.style.cssText = `
      position: fixed;
      bottom: 80px;
      right: 20px;
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--theme-primary);
      color: white;
      border: none;
      font-size: 24px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      z-index: 1000;
      cursor: pointer;
    `;
    
    fab.addEventListener('click', () => {
      this.onNewConversation();
    });
    
    document.body.appendChild(fab);
    this.mobileFab = fab;
  }
  
  destroy() {
    // Clean up mobile-specific elements
    if (this.mobileFab && this.mobileFab.parentNode) {
      this.mobileFab.parentNode.removeChild(this.mobileFab);
    }
    
    if (this.touchObserver) {
      this.touchObserver.disconnect();
    }
    
    // Call parent destroy
    this.onDestroy();
  }
}