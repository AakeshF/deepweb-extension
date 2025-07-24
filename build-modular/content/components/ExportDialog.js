/**
 * Export Dialog Component
 * UI for selecting export options and initiating conversation exports
 */

import BaseComponent from './BaseComponent.js';

export default class ExportDialog extends BaseComponent {
  constructor() {
    super();
    
    this.state = {
      isOpen: false,
      isExporting: false,
      exportProgress: 0,
      selectedFormat: 'json',
      selectedScope: 'all',
      includeMetadata: true,
      includeTimestamps: true,
      includeStatistics: true,
      anonymize: false,
      compress: false,
      dateRange: {
        start: null,
        end: null
      },
      error: null,
      success: null
    };
    
    this.formats = [
      { value: 'json', label: 'JSON', description: 'Complete data with all details' },
      { value: 'markdown', label: 'Markdown', description: 'Human-readable format' },
      { value: 'html', label: 'HTML', description: 'Web-viewable format' },
      { value: 'csv', label: 'CSV', description: 'Spreadsheet compatible' }
    ];
    
    this.scopes = [
      { value: 'current', label: 'Current Conversation' },
      { value: 'all', label: 'All Conversations' },
      { value: 'dateRange', label: 'Date Range' }
    ];
  }

  /**
   * Create dialog template
   * @returns {string} HTML template
   */
  createTemplate() {
    return `
      <div class="deepweb-export-dialog-overlay ${this.state.isOpen ? 'open' : ''}" data-action="close">
        <div class="deepweb-export-dialog" data-stop-propagation>
          <div class="export-dialog-header">
            <h2>Export Conversations</h2>
            <button class="close-button" data-action="close" aria-label="Close dialog">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <div class="export-dialog-content">
            ${this.state.error ? `
              <div class="export-error">
                <svg class="error-icon" width="20" height="20" viewBox="0 0 20 20">
                  <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"/>
                </svg>
                ${this.escapeHtml(this.state.error)}
              </div>
            ` : ''}
            
            ${this.state.success ? `
              <div class="export-success">
                <svg class="success-icon" width="20" height="20" viewBox="0 0 20 20">
                  <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z"/>
                </svg>
                ${this.escapeHtml(this.state.success)}
              </div>
            ` : ''}
            
            <div class="export-section">
              <h3>Export Scope</h3>
              <div class="export-scope-options">
                ${this.scopes.map(scope => `
                  <label class="radio-option">
                    <input 
                      type="radio" 
                      name="exportScope" 
                      value="${scope.value}"
                      ${this.state.selectedScope === scope.value ? 'checked' : ''}
                      ${this.state.isExporting ? 'disabled' : ''}
                      data-action="selectScope"
                      data-value="${scope.value}"
                    >
                    <span class="radio-label">${scope.label}</span>
                  </label>
                `).join('')}
              </div>
              
              ${this.state.selectedScope === 'dateRange' ? `
                <div class="date-range-inputs">
                  <div class="date-input-group">
                    <label for="export-start-date">Start Date</label>
                    <input 
                      type="date" 
                      id="export-start-date"
                      value="${this.state.dateRange.start || ''}"
                      ${this.state.isExporting ? 'disabled' : ''}
                      data-action="setStartDate"
                    >
                  </div>
                  <div class="date-input-group">
                    <label for="export-end-date">End Date</label>
                    <input 
                      type="date" 
                      id="export-end-date"
                      value="${this.state.dateRange.end || ''}"
                      ${this.state.isExporting ? 'disabled' : ''}
                      data-action="setEndDate"
                    >
                  </div>
                </div>
              ` : ''}
            </div>
            
            <div class="export-section">
              <h3>Export Format</h3>
              <div class="export-format-options">
                ${this.formats.map(format => `
                  <label class="format-option ${this.state.selectedFormat === format.value ? 'selected' : ''}">
                    <input 
                      type="radio" 
                      name="exportFormat" 
                      value="${format.value}"
                      ${this.state.selectedFormat === format.value ? 'checked' : ''}
                      ${this.state.isExporting ? 'disabled' : ''}
                      data-action="selectFormat"
                      data-value="${format.value}"
                    >
                    <div class="format-info">
                      <span class="format-label">${format.label}</span>
                      <span class="format-description">${format.description}</span>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>
            
            <div class="export-section">
              <h3>Export Options</h3>
              <div class="export-options">
                <label class="checkbox-option">
                  <input 
                    type="checkbox" 
                    ${this.state.includeMetadata ? 'checked' : ''}
                    ${this.state.isExporting ? 'disabled' : ''}
                    data-action="toggleOption"
                    data-option="includeMetadata"
                  >
                  <span>Include metadata (models, URLs, etc.)</span>
                </label>
                
                <label class="checkbox-option">
                  <input 
                    type="checkbox" 
                    ${this.state.includeTimestamps ? 'checked' : ''}
                    ${this.state.isExporting ? 'disabled' : ''}
                    data-action="toggleOption"
                    data-option="includeTimestamps"
                  >
                  <span>Include timestamps</span>
                </label>
                
                <label class="checkbox-option">
                  <input 
                    type="checkbox" 
                    ${this.state.includeStatistics ? 'checked' : ''}
                    ${this.state.isExporting ? 'disabled' : ''}
                    ${this.state.selectedFormat !== 'csv' ? '' : 'disabled'}
                    data-action="toggleOption"
                    data-option="includeStatistics"
                  >
                  <span>Include statistics summary</span>
                </label>
                
                <label class="checkbox-option">
                  <input 
                    type="checkbox" 
                    ${this.state.anonymize ? 'checked' : ''}
                    ${this.state.isExporting ? 'disabled' : ''}
                    data-action="toggleOption"
                    data-option="anonymize"
                  >
                  <span>Anonymize personal data</span>
                </label>
                
                <label class="checkbox-option">
                  <input 
                    type="checkbox" 
                    ${this.state.compress ? 'checked' : ''}
                    ${this.state.isExporting ? 'disabled' : ''}
                    ${this.state.selectedFormat !== 'json' ? 'disabled' : ''}
                    data-action="toggleOption"
                    data-option="compress"
                  >
                  <span>Compress file (gzip)</span>
                </label>
              </div>
            </div>
            
            ${this.state.isExporting ? `
              <div class="export-progress">
                <div class="progress-label">Exporting conversations...</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${this.state.exportProgress}%"></div>
                </div>
                <div class="progress-text">${this.state.exportProgress}%</div>
              </div>
            ` : ''}
          </div>
          
          <div class="export-dialog-footer">
            <button 
              class="cancel-button" 
              data-action="close"
              ${this.state.isExporting ? 'disabled' : ''}
            >
              Cancel
            </button>
            <button 
              class="export-button primary" 
              data-action="export"
              ${this.state.isExporting ? 'disabled' : ''}
            >
              ${this.state.isExporting ? 'Exporting...' : 'Export'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Add styles
   */
  addStyles() {
    if (document.getElementById('deepweb-export-dialog-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'deepweb-export-dialog-styles';
    style.textContent = `
      .deepweb-export-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: none;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .deepweb-export-dialog-overlay.open {
        display: flex;
        opacity: 1;
      }
      
      .deepweb-export-dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        transform: scale(0.95);
        transition: transform 0.2s ease;
      }
      
      .deepweb-export-dialog-overlay.open .deepweb-export-dialog {
        transform: scale(1);
      }
      
      .export-dialog-header {
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .export-dialog-header h2 {
        margin: 0;
        font-size: 20px;
        font-weight: 600;
        color: #333;
      }
      
      .close-button {
        background: none;
        border: none;
        padding: 4px;
        cursor: pointer;
        color: #666;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .close-button:hover {
        background-color: #f0f0f0;
      }
      
      .export-dialog-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .export-section {
        margin-bottom: 24px;
      }
      
      .export-section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .export-error,
      .export-success {
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .export-error {
        background-color: #ffebee;
        color: #c62828;
      }
      
      .export-success {
        background-color: #e8f5e9;
        color: #2e7d32;
      }
      
      .error-icon,
      .success-icon {
        flex-shrink: 0;
        fill: currentColor;
      }
      
      .export-scope-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .radio-option {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .radio-option:hover {
        background-color: #f5f5f5;
      }
      
      .radio-option input[type="radio"] {
        margin-right: 8px;
      }
      
      .radio-label {
        font-size: 14px;
        color: #333;
      }
      
      .date-range-inputs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-top: 16px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
      
      .date-input-group {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .date-input-group label {
        font-size: 12px;
        font-weight: 500;
        color: #666;
      }
      
      .date-input-group input {
        padding: 8px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .export-format-options {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 12px;
      }
      
      .format-option {
        display: flex;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .format-option:hover {
        border-color: #1976d2;
        background-color: #f5f5f5;
      }
      
      .format-option.selected {
        border-color: #1976d2;
        background-color: #e3f2fd;
      }
      
      .format-option input[type="radio"] {
        margin-right: 12px;
        margin-top: 2px;
      }
      
      .format-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .format-label {
        font-weight: 600;
        color: #333;
      }
      
      .format-description {
        font-size: 12px;
        color: #666;
      }
      
      .export-options {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .checkbox-option {
        display: flex;
        align-items: center;
        cursor: pointer;
        padding: 8px;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .checkbox-option:hover {
        background-color: #f5f5f5;
      }
      
      .checkbox-option input[type="checkbox"] {
        margin-right: 8px;
      }
      
      .checkbox-option span {
        font-size: 14px;
        color: #333;
      }
      
      .checkbox-option input:disabled + span {
        color: #999;
      }
      
      .export-progress {
        margin-top: 20px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
      
      .progress-label {
        font-size: 14px;
        color: #666;
        margin-bottom: 8px;
      }
      
      .progress-bar {
        height: 8px;
        background-color: #e0e0e0;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
      }
      
      .progress-fill {
        height: 100%;
        background-color: #1976d2;
        transition: width 0.3s ease;
      }
      
      .progress-text {
        font-size: 12px;
        color: #666;
        text-align: center;
      }
      
      .export-dialog-footer {
        padding: 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      
      .export-dialog-footer button {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      .cancel-button {
        background-color: #f5f5f5;
        color: #333;
      }
      
      .cancel-button:hover:not(:disabled) {
        background-color: #e0e0e0;
      }
      
      .export-button {
        background-color: #1976d2;
        color: white;
      }
      
      .export-button:hover:not(:disabled) {
        background-color: #1565c0;
      }
      
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @media (max-width: 600px) {
        .export-format-options {
          grid-template-columns: 1fr;
        }
        
        .date-range-inputs {
          grid-template-columns: 1fr;
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close dialog
    this.addEventHandler('[data-action="close"]', 'click', (e) => {
      if (e.target.hasAttribute('data-stop-propagation')) return;
      if (!this.state.isExporting) {
        this.close();
      }
    });
    
    // Stop propagation for dialog content
    this.addEventHandler('[data-stop-propagation]', 'click', (e) => {
      e.stopPropagation();
    });
    
    // Select scope
    this.addEventHandler('[data-action="selectScope"]', 'change', (e) => {
      this.setState({ 
        selectedScope: e.target.dataset.value,
        error: null 
      });
    });
    
    // Select format
    this.addEventHandler('[data-action="selectFormat"]', 'change', (e) => {
      const format = e.target.dataset.value;
      this.setState({ 
        selectedFormat: format,
        error: null 
      });
      
      // Disable certain options based on format
      if (format === 'csv') {
        this.setState({ includeStatistics: false });
      }
      if (format !== 'json') {
        this.setState({ compress: false });
      }
    });
    
    // Toggle options
    this.addEventHandler('[data-action="toggleOption"]', 'change', (e) => {
      const option = e.target.dataset.option;
      this.setState({ 
        [option]: e.target.checked,
        error: null 
      });
    });
    
    // Date inputs
    this.addEventHandler('[data-action="setStartDate"]', 'change', (e) => {
      this.setState({
        dateRange: { ...this.state.dateRange, start: e.target.value },
        error: null
      });
    });
    
    this.addEventHandler('[data-action="setEndDate"]', 'change', (e) => {
      this.setState({
        dateRange: { ...this.state.dateRange, end: e.target.value },
        error: null
      });
    });
    
    // Export button
    this.addEventHandler('[data-action="export"]', 'click', () => {
      this.handleExport();
    });
  }

  /**
   * Initialize component
   */
  async initialize() {
    await super.initialize();
    this.addStyles();
  }

  /**
   * Open dialog
   * @param {Object} options - Dialog options
   */
  open(options = {}) {
    this.setState({
      isOpen: true,
      selectedScope: options.scope || 'all',
      error: null,
      success: null
    });
    
    // Set current conversation scope if conversationId provided
    if (options.conversationId) {
      this.currentConversationId = options.conversationId;
      this.setState({ selectedScope: 'current' });
    }
    
    // Focus on first input
    setTimeout(() => {
      const firstInput = this.container.querySelector('input:not(:disabled)');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  /**
   * Close dialog
   */
  close() {
    this.setState({ isOpen: false });
    
    // Reset state after animation
    setTimeout(() => {
      this.setState({
        isExporting: false,
        exportProgress: 0,
        error: null,
        success: null
      });
    }, 300);
  }

  /**
   * Handle export
   */
  async handleExport() {
    try {
      // Validate date range if selected
      if (this.state.selectedScope === 'dateRange') {
        if (!this.state.dateRange.start || !this.state.dateRange.end) {
          this.setState({ error: 'Please select both start and end dates' });
          return;
        }
        
        const startDate = new Date(this.state.dateRange.start);
        const endDate = new Date(this.state.dateRange.end);
        
        if (startDate > endDate) {
          this.setState({ error: 'Start date must be before end date' });
          return;
        }
      }
      
      // Start export
      this.setState({
        isExporting: true,
        exportProgress: 0,
        error: null
      });
      
      // Prepare export options
      const exportOptions = {
        format: this.state.selectedFormat,
        scope: this.state.selectedScope,
        includeMetadata: this.state.includeMetadata,
        includeTimestamps: this.state.includeTimestamps,
        includeStatistics: this.state.includeStatistics,
        anonymize: this.state.anonymize,
        compress: this.state.compress
      };
      
      if (this.state.selectedScope === 'current') {
        exportOptions.conversationId = this.currentConversationId;
      } else if (this.state.selectedScope === 'dateRange') {
        exportOptions.startDate = this.state.dateRange.start;
        exportOptions.endDate = this.state.dateRange.end;
      }
      
      // Send export request to background
      const response = await browser.runtime.sendMessage({
        type: 'export_data',
        options: exportOptions
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Track progress
      if (response.exportId) {
        await this.trackProgress(response.exportId);
      }
      
      // Download file
      this.downloadFile(response);
      
      this.setState({
        isExporting: false,
        success: 'Export completed successfully!'
      });
      
      // Close dialog after delay
      setTimeout(() => this.close(), 2000);
      
    } catch (error) {
      console.error('[ExportDialog] Export error:', error);
      this.setState({
        isExporting: false,
        error: error.message || 'Export failed'
      });
    }
  }

  /**
   * Track export progress
   * @private
   */
  async trackProgress(exportId) {
    const checkProgress = async () => {
      if (!this.state.isExporting) return;
      
      const response = await browser.runtime.sendMessage({
        type: 'get_export_progress',
        exportId
      });
      
      if (response.progress) {
        this.setState({ exportProgress: response.progress.progress });
        
        if (response.progress.status === 'processing') {
          setTimeout(checkProgress, 100);
        }
      }
    };
    
    checkProgress();
  }

  /**
   * Download file
   * @private
   */
  downloadFile(exportData) {
    // Create blob
    const blob = new Blob([exportData.data], { type: exportData.mimeType });
    
    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = exportData.filename;
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Clean up
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Escape HTML
   * @private
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}