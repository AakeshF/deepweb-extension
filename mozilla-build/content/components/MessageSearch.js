/**
 * Message Search Component
 * Search and filter messages with advanced options
 */

import BaseComponent from './BaseComponent.js';
import DOMUtils from '../utils/dom-utils.js';
import { DOMSecurity } from '../../src/security/DOMSecurity.js';

export default class MessageSearch extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    this.state = {
      query: '',
      filters: {
        dateRange: { start: null, end: null },
        messageType: 'all', // all, user, assistant, system
        model: 'all'
      },
      results: [],
      isSearching: false,
      showFilters: false,
      highlightedMessageId: null
    };
    
    // Required options
    this.messageManager = options.messageManager || null;
    this.conversationId = options.conversationId || null;
    this.onNavigate = options.onNavigate || (() => {});
    
    // Debounce timer
    this.searchDebounceTimer = null;
    this.searchDebounceDelay = 300;
    
    // Available models (will be populated from messages)
    this.availableModels = new Set();
  }

  async render() {
    // Create search container
    this.element = DOMUtils.createElement('div', {
      class: 'deepweb-message-search',
      role: 'search'
    });

    // Apply styles
    this.applyStyles();

    // Render search input
    this.renderSearchInput();

    // Render filter toggle
    this.renderFilterToggle();

    // Render filters if visible
    if (this.state.showFilters) {
      this.renderFilters();
    }

    // Render results if any
    if (this.state.results.length > 0) {
      this.renderResults();
    }
  }

  applyStyles() {
    Object.assign(this.element.style, {
      position: 'relative',
      padding: '16px',
      background: 'white',
      borderBottom: '1px solid #e0e0e0',
      zIndex: '100'
    });
  }

  renderSearchInput() {
    const inputContainer = DOMUtils.createElement('div', {
      class: 'deepweb-search-input-container'
    });
    Object.assign(inputContainer.style, {
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    });

    // Search icon
    const searchIcon = DOMUtils.createElement('div', {
      class: 'deepweb-search-icon'
    });
    Object.assign(searchIcon.style, {
      fontSize: '18px',
      color: '#666'
    });
    DOMUtils.setTextContent(searchIcon, '🔍');

    // Search input
    const searchInput = DOMUtils.createElement('input', {
      type: 'text',
      placeholder: 'Search messages...',
      class: 'deepweb-search-input',
      value: this.state.query
    });
    Object.assign(searchInput.style, {
      flex: '1',
      padding: '8px 12px',
      border: '1px solid #ddd',
      borderRadius: '20px',
      fontSize: '14px',
      outline: 'none',
      transition: 'border-color 0.2s'
    });

    searchInput.addEventListener('focus', () => {
      searchInput.style.borderColor = '#1976d2';
    });

    searchInput.addEventListener('blur', () => {
      searchInput.style.borderColor = '#ddd';
    });

    searchInput.addEventListener('input', (e) => {
      this.handleSearchInput(e.target.value);
    });

    searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.performSearch();
      }
    });

    // Clear button
    if (this.state.query) {
      const clearBtn = DOMUtils.createElement('button', {
        class: 'deepweb-search-clear',
        'aria-label': 'Clear search'
      });
      Object.assign(clearBtn.style, {
        position: 'absolute',
        right: '60px',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        padding: '4px',
        fontSize: '16px',
        color: '#666'
      });
      DOMUtils.setTextContent(clearBtn, '✕');

      clearBtn.addEventListener('click', () => {
        this.clearSearch();
      });

      inputContainer.style.position = 'relative';
      inputContainer.appendChild(clearBtn);
    }

    // Loading spinner
    if (this.state.isSearching) {
      const spinner = DOMUtils.createElement('div', {
        class: 'deepweb-search-spinner'
      });
      Object.assign(spinner.style, {
        width: '16px',
        height: '16px',
        border: '2px solid #ddd',
        borderTop: '2px solid #1976d2',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      });
      inputContainer.appendChild(spinner);
    }

    inputContainer.appendChild(searchIcon);
    inputContainer.appendChild(searchInput);
    this.element.appendChild(inputContainer);

    this.searchInput = searchInput;
  }

  renderFilterToggle() {
    const filterBtn = DOMUtils.createElement('button', {
      class: 'deepweb-filter-toggle',
      'aria-label': 'Toggle filters'
    });
    Object.assign(filterBtn.style, {
      position: 'absolute',
      right: '16px',
      top: '50%',
      transform: 'translateY(-50%)',
      background: this.state.showFilters ? '#e3f2fd' : 'transparent',
      border: '1px solid #ddd',
      borderRadius: '4px',
      padding: '6px 10px',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#666',
      transition: 'all 0.2s'
    });

    const activeFilters = this.getActiveFilterCount();
    const filterText = activeFilters > 0 ? `Filter (${activeFilters})` : 'Filter';
    DOMUtils.setTextContent(filterBtn, `⚙️ ${filterText}`);

    filterBtn.addEventListener('click', () => {
      this.toggleFilters();
    });

    filterBtn.addEventListener('mouseenter', () => {
      filterBtn.style.background = '#f5f5f5';
    });

    filterBtn.addEventListener('mouseleave', () => {
      filterBtn.style.background = this.state.showFilters ? '#e3f2fd' : 'transparent';
    });

    this.element.appendChild(filterBtn);
  }

  renderFilters() {
    const filtersDiv = DOMUtils.createElement('div', {
      class: 'deepweb-search-filters'
    });
    Object.assign(filtersDiv.style, {
      marginTop: '16px',
      padding: '16px',
      background: '#f5f5f5',
      borderRadius: '8px',
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px'
    });

    // Message type filter
    const typeFilter = this.createFilterSection('Message Type', [
      { value: 'all', label: 'All Messages' },
      { value: 'user', label: 'User Messages' },
      { value: 'assistant', label: 'Assistant Messages' },
      { value: 'system', label: 'System Messages' }
    ], this.state.filters.messageType, (value) => {
      this.updateFilter('messageType', value);
    });

    // Model filter
    const modelOptions = [{ value: 'all', label: 'All Models' }];
    this.availableModels.forEach(model => {
      modelOptions.push({ value: model, label: model });
    });
    
    const modelFilter = this.createFilterSection('Model', modelOptions, 
      this.state.filters.model, (value) => {
        this.updateFilter('model', value);
      });

    // Date range filter
    const dateFilter = this.createDateRangeFilter();

    filtersDiv.appendChild(typeFilter);
    filtersDiv.appendChild(modelFilter);
    filtersDiv.appendChild(dateFilter);

    // Apply/Reset buttons
    const filterActions = DOMUtils.createElement('div', {
      class: 'deepweb-filter-actions'
    });
    Object.assign(filterActions.style, {
      gridColumn: '1 / -1',
      display: 'flex',
      gap: '8px',
      justifyContent: 'flex-end'
    });

    const resetBtn = this.createButton('Reset Filters', 'secondary', () => {
      this.resetFilters();
    });

    const applyBtn = this.createButton('Apply Filters', 'primary', () => {
      this.performSearch();
    });

    filterActions.appendChild(resetBtn);
    filterActions.appendChild(applyBtn);
    filtersDiv.appendChild(filterActions);

    this.element.appendChild(filtersDiv);
  }

  renderResults() {
    const resultsDiv = DOMUtils.createElement('div', {
      class: 'deepweb-search-results'
    });
    Object.assign(resultsDiv.style, {
      marginTop: '16px',
      maxHeight: '300px',
      overflowY: 'auto',
      border: '1px solid #ddd',
      borderRadius: '8px',
      background: 'white'
    });

    // Results header
    const header = DOMUtils.createElement('div', {
      class: 'deepweb-search-header'
    });
    Object.assign(header.style, {
      padding: '12px 16px',
      borderBottom: '1px solid #eee',
      fontSize: '13px',
      color: '#666',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    });

    const resultCount = DOMUtils.createElement('span');
    DOMUtils.setTextContent(resultCount, `Found ${this.state.results.length} messages`);

    const closeBtn = DOMUtils.createElement('button', {
      'aria-label': 'Close results'
    });
    Object.assign(closeBtn.style, {
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      fontSize: '16px',
      color: '#666',
      padding: '4px'
    });
    DOMUtils.setTextContent(closeBtn, '✕');

    closeBtn.addEventListener('click', () => {
      this.clearResults();
    });

    header.appendChild(resultCount);
    header.appendChild(closeBtn);
    resultsDiv.appendChild(header);

    // Result items
    this.state.results.forEach((result, index) => {
      const resultItem = this.createResultItem(result, index);
      resultsDiv.appendChild(resultItem);
    });

    this.element.appendChild(resultsDiv);
  }

  createFilterSection(label, options, currentValue, onChange) {
    const section = DOMUtils.createElement('div', {
      class: 'deepweb-filter-section'
    });

    const labelDiv = DOMUtils.createElement('label');
    Object.assign(labelDiv.style, {
      display: 'block',
      marginBottom: '4px',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#666'
    });
    DOMUtils.setTextContent(labelDiv, label);

    const select = DOMUtils.createElement('select', {
      class: 'deepweb-filter-select'
    });
    Object.assign(select.style, {
      width: '100%',
      padding: '6px 8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px',
      background: 'white'
    });

    options.forEach(option => {
      const optionEl = DOMUtils.createElement('option', {
        value: option.value
      });
      DOMUtils.setTextContent(optionEl, option.label);
      if (option.value === currentValue) {
        optionEl.selected = true;
      }
      select.appendChild(optionEl);
    });

    select.addEventListener('change', (e) => {
      onChange(e.target.value);
    });

    section.appendChild(labelDiv);
    section.appendChild(select);

    return section;
  }

  createDateRangeFilter() {
    const section = DOMUtils.createElement('div', {
      class: 'deepweb-filter-date-range'
    });

    const labelDiv = DOMUtils.createElement('label');
    Object.assign(labelDiv.style, {
      display: 'block',
      marginBottom: '4px',
      fontSize: '13px',
      fontWeight: 'bold',
      color: '#666'
    });
    DOMUtils.setTextContent(labelDiv, 'Date Range');

    const dateContainer = DOMUtils.createElement('div', {
      style: 'display: flex; gap: 8px; align-items: center;'
    });

    const startDate = DOMUtils.createElement('input', {
      type: 'date',
      class: 'deepweb-filter-date'
    });
    Object.assign(startDate.style, {
      flex: '1',
      padding: '6px 8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    });

    if (this.state.filters.dateRange.start) {
      startDate.value = this.formatDateForInput(this.state.filters.dateRange.start);
    }

    const separator = DOMUtils.createElement('span');
    DOMUtils.setTextContent(separator, 'to');

    const endDate = DOMUtils.createElement('input', {
      type: 'date',
      class: 'deepweb-filter-date'
    });
    Object.assign(endDate.style, {
      flex: '1',
      padding: '6px 8px',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '14px'
    });

    if (this.state.filters.dateRange.end) {
      endDate.value = this.formatDateForInput(this.state.filters.dateRange.end);
    }

    startDate.addEventListener('change', (e) => {
      this.updateDateFilter('start', e.target.value);
    });

    endDate.addEventListener('change', (e) => {
      this.updateDateFilter('end', e.target.value);
    });

    dateContainer.appendChild(startDate);
    dateContainer.appendChild(separator);
    dateContainer.appendChild(endDate);

    section.appendChild(labelDiv);
    section.appendChild(dateContainer);

    return section;
  }

  createResultItem(result, index) {
    const item = DOMUtils.createElement('div', {
      class: 'deepweb-search-result-item',
      'data-message-id': result.id
    });
    Object.assign(item.style, {
      padding: '12px 16px',
      borderBottom: index < this.state.results.length - 1 ? '1px solid #eee' : 'none',
      cursor: 'pointer',
      transition: 'background 0.2s'
    });

    if (result.id === this.state.highlightedMessageId) {
      item.style.background = '#e3f2fd';
    }

    item.addEventListener('mouseenter', () => {
      item.style.background = '#f5f5f5';
    });

    item.addEventListener('mouseleave', () => {
      item.style.background = result.id === this.state.highlightedMessageId ? '#e3f2fd' : 'transparent';
    });

    item.addEventListener('click', () => {
      this.navigateToMessage(result);
    });

    // Role and timestamp
    const header = DOMUtils.createElement('div', {
      style: 'display: flex; justify-content: space-between; margin-bottom: 4px;'
    });

    const role = DOMUtils.createElement('span', {
      style: 'font-size: 12px; font-weight: bold; text-transform: uppercase; color: #666;'
    });
    DOMUtils.setTextContent(role, result.role);

    const timestamp = DOMUtils.createElement('span', {
      style: 'font-size: 12px; color: #999;'
    });
    DOMUtils.setTextContent(timestamp, new Date(result.timestamp).toLocaleString([], {
      dateStyle: 'short',
      timeStyle: 'short'
    }));

    header.appendChild(role);
    header.appendChild(timestamp);

    // Content preview with highlighting
    const content = DOMUtils.createElement('div', {
      class: 'deepweb-search-result-content'
    });
    Object.assign(content.style, {
      fontSize: '14px',
      color: '#333',
      lineHeight: '1.4',
      maxHeight: '60px',
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    });

    // Highlight search terms
    const highlightedContent = this.highlightSearchTerms(
      result.matchContext || result.content.substring(0, 200),
      this.state.query
    );
    // Use DOMSecurity to safely append highlighted content
    DOMSecurity.appendHTML(content, highlightedContent, true);

    item.appendChild(header);
    item.appendChild(content);

    return item;
  }

  // Event handlers
  handleSearchInput(value) {
    this.setState({ query: value });

    // Clear existing timer
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // Set new timer
    if (value.trim()) {
      this.searchDebounceTimer = setTimeout(() => {
        this.performSearch();
      }, this.searchDebounceDelay);
    } else {
      this.clearResults();
    }
  }

  async performSearch() {
    if (!this.state.query.trim() && this.getActiveFilterCount() === 0) {
      this.clearResults();
      return;
    }

    this.setState({ isSearching: true });
    this.render();

    try {
      if (!this.messageManager || !this.conversationId) {
        throw new Error('MessageManager or conversationId not provided');
      }

      // Build search options
      const searchOptions = {
        role: this.state.filters.messageType !== 'all' ? this.state.filters.messageType : null,
        includeSystem: this.state.filters.messageType === 'system' || this.state.filters.messageType === 'all'
      };

      let results = [];

      if (this.state.query.trim()) {
        // Search with query
        results = await this.messageManager.search(
          this.conversationId,
          this.state.query,
          searchOptions
        );
      } else {
        // Just filter without query
        const allMessages = await this.messageManager.list(this.conversationId, {
          pageSize: 1000,
          includeSystem: searchOptions.includeSystem
        });
        results = allMessages.items;
      }

      // Apply additional filters
      results = this.applyFilters(results);

      // Update available models
      results.forEach(msg => {
        if (msg.metadata?.model) {
          this.availableModels.add(msg.metadata.model);
        }
      });

      this.setState({ 
        results, 
        isSearching: false 
      });
      this.render();

    } catch (error) {
      console.error('[MessageSearch] Search failed:', error);
      this.setState({ 
        results: [], 
        isSearching: false 
      });
      this.render();
    }
  }

  applyFilters(messages) {
    return messages.filter(msg => {
      // Filter by model
      if (this.state.filters.model !== 'all' && 
          msg.metadata?.model !== this.state.filters.model) {
        return false;
      }

      // Filter by date range
      if (this.state.filters.dateRange.start) {
        const startTime = new Date(this.state.filters.dateRange.start).getTime();
        if (msg.timestamp < startTime) return false;
      }

      if (this.state.filters.dateRange.end) {
        const endTime = new Date(this.state.filters.dateRange.end).getTime() + 86400000; // Include end day
        if (msg.timestamp > endTime) return false;
      }

      return true;
    });
  }

  toggleFilters() {
    this.setState({ showFilters: !this.state.showFilters });
    this.render();
  }

  updateFilter(filterName, value) {
    this.setState({
      filters: {
        ...this.state.filters,
        [filterName]: value
      }
    });
  }

  updateDateFilter(type, value) {
    this.setState({
      filters: {
        ...this.state.filters,
        dateRange: {
          ...this.state.filters.dateRange,
          [type]: value ? new Date(value).getTime() : null
        }
      }
    });
  }

  resetFilters() {
    this.setState({
      filters: {
        dateRange: { start: null, end: null },
        messageType: 'all',
        model: 'all'
      }
    });
    this.render();
  }

  clearSearch() {
    this.setState({ 
      query: '',
      results: []
    });
    this.render();
    this.searchInput.focus();
  }

  clearResults() {
    this.setState({ results: [] });
    this.render();
  }

  navigateToMessage(message) {
    this.setState({ highlightedMessageId: message.id });
    this.render();
    this.onNavigate(message);
  }

  getActiveFilterCount() {
    let count = 0;
    if (this.state.filters.messageType !== 'all') count++;
    if (this.state.filters.model !== 'all') count++;
    if (this.state.filters.dateRange.start || this.state.filters.dateRange.end) count++;
    return count;
  }

  highlightSearchTerms(text, query) {
    if (!query) return text;

    const terms = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);
    let highlighted = text;

    terms.forEach(term => {
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark style="background:#ffeb3b;padding:2px;">$1</mark>');
    });

    return highlighted;
  }

  formatDateForInput(timestamp) {
    const date = new Date(timestamp);
    return date.toISOString().split('T')[0];
  }

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

  setupEventListeners() {
    // Add CSS animation for spinner
    if (!document.getElementById('deepweb-search-styles')) {
      const style = document.createElement('style');
      style.id = 'deepweb-search-styles';
      style.textContent = `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  onDestroy() {
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }
    super.onDestroy();
  }
}