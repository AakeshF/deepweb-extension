/**
 * Import Dialog Component
 * UI for importing conversation data
 */

import BaseComponent from './BaseComponent.js';

export default class ImportDialog extends BaseComponent {
  constructor() {
    super();
    
    this.state = {
      isOpen: false,
      isImporting: false,
      importProgress: 0,
      duplicateHandling: 'skip', // skip, replace, merge
      selectedFile: null,
      fileInfo: null,
      previewData: null,
      error: null,
      success: null
    };
    
    this.duplicateOptions = [
      { value: 'skip', label: 'Skip Duplicates', description: 'Only import new conversations' },
      { value: 'replace', label: 'Replace Existing', description: 'Overwrite existing conversations' },
      { value: 'merge', label: 'Merge Data', description: 'Combine with existing conversations' }
    ];
  }

  /**
   * Create dialog template
   * @returns {string} HTML template
   */
  createTemplate() {
    return `
      <div class="deepweb-import-dialog-overlay ${this.state.isOpen ? 'open' : ''}" data-action="close">
        <div class="deepweb-import-dialog" data-stop-propagation>
          <div class="import-dialog-header">
            <h2>Import Conversations</h2>
            <button class="close-button" data-action="close" aria-label="Close dialog">
              <svg width="24" height="24" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
            </button>
          </div>
          
          <div class="import-dialog-content">
            ${this.state.error ? `
              <div class="import-error">
                <svg class="error-icon" width="20" height="20" viewBox="0 0 20 20">
                  <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm1 15H9v-2h2v2zm0-4H9V5h2v6z"/>
                </svg>
                ${this.escapeHtml(this.state.error)}
              </div>
            ` : ''}
            
            ${this.state.success ? `
              <div class="import-success">
                <svg class="success-icon" width="20" height="20" viewBox="0 0 20 20">
                  <path d="M10 0C4.48 0 0 4.48 0 10s4.48 10 10 10 10-4.48 10-10S15.52 0 10 0zm-2 15l-5-5 1.41-1.41L8 12.17l7.59-7.59L17 6l-9 9z"/>
                </svg>
                ${this.escapeHtml(this.state.success)}
              </div>
            ` : ''}
            
            <div class="import-section">
              <h3>Select File</h3>
              <div class="file-input-container">
                <input 
                  type="file" 
                  id="import-file-input"
                  accept=".json,.md,.html,.csv,.gz"
                  ${this.state.isImporting ? 'disabled' : ''}
                  data-action="selectFile"
                  class="file-input"
                >
                <label for="import-file-input" class="file-input-label">
                  <svg class="upload-icon" width="24" height="24" viewBox="0 0 24 24">
                    <path d="M9 16h6v-6h4l-7-7-7 7h4zm-4 2h14v2H5z"/>
                  </svg>
                  <span class="file-input-text">
                    ${this.state.selectedFile ? this.state.selectedFile.name : 'Choose file to import'}
                  </span>
                </label>
              </div>
              
              ${this.state.fileInfo ? `
                <div class="file-info">
                  <div class="file-info-item">
                    <span class="file-info-label">File size:</span>
                    <span class="file-info-value">${this.formatFileSize(this.state.fileInfo.size)}</span>
                  </div>
                  <div class="file-info-item">
                    <span class="file-info-label">Format:</span>
                    <span class="file-info-value">${this.state.fileInfo.format}</span>
                  </div>
                  ${this.state.fileInfo.conversationCount ? `
                    <div class="file-info-item">
                      <span class="file-info-label">Conversations:</span>
                      <span class="file-info-value">${this.state.fileInfo.conversationCount}</span>
                    </div>
                  ` : ''}
                </div>
              ` : ''}
            </div>
            
            ${this.state.previewData ? `
              <div class="import-section">
                <h3>Preview</h3>
                <div class="import-preview">
                  <div class="preview-stats">
                    <div class="stat-item">
                      <span class="stat-label">Total Conversations</span>
                      <span class="stat-value">${this.state.previewData.conversationCount}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Total Messages</span>
                      <span class="stat-value">${this.state.previewData.messageCount}</span>
                    </div>
                    <div class="stat-item">
                      <span class="stat-label">Date Range</span>
                      <span class="stat-value">${this.formatDateRange(this.state.previewData.dateRange)}</span>
                    </div>
                  </div>
                  
                  ${this.state.previewData.duplicates > 0 ? `
                    <div class="duplicate-warning">
                      <svg class="warning-icon" width="20" height="20" viewBox="0 0 20 20">
                        <path d="M1 16h18L10 2 1 16zm9-2H8v-2h2v2zm0-3H8V7h2v4z"/>
                      </svg>
                      Found ${this.state.previewData.duplicates} existing conversation(s) with matching IDs
                    </div>
                  ` : ''}
                </div>
              </div>
            ` : ''}
            
            <div class="import-section">
              <h3>Import Options</h3>
              <div class="duplicate-handling-options">
                ${this.duplicateOptions.map(option => `
                  <label class="radio-option ${this.state.duplicateHandling === option.value ? 'selected' : ''}">
                    <input 
                      type="radio" 
                      name="duplicateHandling" 
                      value="${option.value}"
                      ${this.state.duplicateHandling === option.value ? 'checked' : ''}
                      ${this.state.isImporting ? 'disabled' : ''}
                      data-action="selectDuplicateHandling"
                      data-value="${option.value}"
                    >
                    <div class="option-info">
                      <span class="option-label">${option.label}</span>
                      <span class="option-description">${option.description}</span>
                    </div>
                  </label>
                `).join('')}
              </div>
            </div>
            
            ${this.state.isImporting ? `
              <div class="import-progress">
                <div class="progress-label">Importing conversations...</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${this.state.importProgress}%"></div>
                </div>
                <div class="progress-text">${this.state.importProgress}%</div>
              </div>
            ` : ''}
          </div>
          
          <div class="import-dialog-footer">
            <button 
              class="cancel-button" 
              data-action="close"
              ${this.state.isImporting ? 'disabled' : ''}
            >
              Cancel
            </button>
            <button 
              class="import-button primary" 
              data-action="import"
              ${this.state.isImporting || !this.state.selectedFile ? 'disabled' : ''}
            >
              ${this.state.isImporting ? 'Importing...' : 'Import'}
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
    if (document.getElementById('deepweb-import-dialog-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'deepweb-import-dialog-styles';
    style.textContent = `
      .deepweb-import-dialog-overlay {
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
      
      .deepweb-import-dialog-overlay.open {
        display: flex;
        opacity: 1;
      }
      
      .deepweb-import-dialog {
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
      
      .deepweb-import-dialog-overlay.open .deepweb-import-dialog {
        transform: scale(1);
      }
      
      .import-dialog-header {
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      
      .import-dialog-header h2 {
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
      
      .import-dialog-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .import-section {
        margin-bottom: 24px;
      }
      
      .import-section:last-child {
        margin-bottom: 0;
      }
      
      .import-section h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .import-error,
      .import-success {
        padding: 12px;
        border-radius: 4px;
        margin-bottom: 16px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .import-error {
        background-color: #ffebee;
        color: #c62828;
      }
      
      .import-success {
        background-color: #e8f5e9;
        color: #2e7d32;
      }
      
      .error-icon,
      .success-icon,
      .warning-icon {
        flex-shrink: 0;
        fill: currentColor;
      }
      
      .file-input-container {
        position: relative;
      }
      
      .file-input {
        position: absolute;
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .file-input-label {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 32px 16px;
        border: 2px dashed #ddd;
        border-radius: 8px;
        background-color: #f9f9f9;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .file-input-label:hover {
        border-color: #1976d2;
        background-color: #f5f5f5;
      }
      
      .file-input:focus + .file-input-label {
        outline: 2px solid #1976d2;
        outline-offset: 2px;
      }
      
      .upload-icon {
        fill: #666;
      }
      
      .file-input-text {
        font-size: 14px;
        color: #666;
      }
      
      .file-info {
        margin-top: 12px;
        padding: 12px;
        background-color: #f5f5f5;
        border-radius: 4px;
      }
      
      .file-info-item {
        display: flex;
        justify-content: space-between;
        font-size: 13px;
        margin-bottom: 4px;
      }
      
      .file-info-item:last-child {
        margin-bottom: 0;
      }
      
      .file-info-label {
        color: #666;
      }
      
      .file-info-value {
        color: #333;
        font-weight: 500;
      }
      
      .import-preview {
        background-color: #f5f5f5;
        border-radius: 4px;
        padding: 16px;
      }
      
      .preview-stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 16px;
        margin-bottom: 16px;
      }
      
      .stat-item {
        text-align: center;
      }
      
      .stat-label {
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }
      
      .stat-value {
        display: block;
        font-size: 20px;
        font-weight: 600;
        color: #333;
      }
      
      .duplicate-warning {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px;
        background-color: #fff3cd;
        color: #856404;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .duplicate-handling-options {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .radio-option {
        display: flex;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .radio-option:hover {
        border-color: #1976d2;
        background-color: #f5f5f5;
      }
      
      .radio-option.selected {
        border-color: #1976d2;
        background-color: #e3f2fd;
      }
      
      .radio-option input[type="radio"] {
        margin-right: 12px;
        margin-top: 2px;
      }
      
      .option-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .option-label {
        font-weight: 600;
        color: #333;
      }
      
      .option-description {
        font-size: 12px;
        color: #666;
      }
      
      .import-progress {
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
      
      .import-dialog-footer {
        padding: 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }
      
      .import-dialog-footer button {
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
      
      .import-button {
        background-color: #1976d2;
        color: white;
      }
      
      .import-button:hover:not(:disabled) {
        background-color: #1565c0;
      }
      
      button:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      @media (max-width: 600px) {
        .preview-stats {
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
      if (!this.state.isImporting) {
        this.close();
      }
    });
    
    // Stop propagation for dialog content
    this.addEventHandler('[data-stop-propagation]', 'click', (e) => {
      e.stopPropagation();
    });
    
    // File selection
    this.addEventHandler('[data-action="selectFile"]', 'change', async (e) => {
      const file = e.target.files[0];
      if (file) {
        await this.handleFileSelection(file);
      }
    });
    
    // Duplicate handling selection
    this.addEventHandler('[data-action="selectDuplicateHandling"]', 'change', (e) => {
      this.setState({ 
        duplicateHandling: e.target.dataset.value,
        error: null 
      });
    });
    
    // Import button
    this.addEventHandler('[data-action="import"]', 'click', () => {
      this.handleImport();
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
      error: null,
      success: null
    });
    
    // Focus on file input
    setTimeout(() => {
      const fileInput = this.container.querySelector('#import-file-input');
      if (fileInput) fileInput.focus();
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
        isImporting: false,
        importProgress: 0,
        selectedFile: null,
        fileInfo: null,
        previewData: null,
        error: null,
        success: null
      });
    }, 300);
  }

  /**
   * Handle file selection
   * @private
   */
  async handleFileSelection(file) {
    try {
      this.setState({
        selectedFile: file,
        fileInfo: {
          name: file.name,
          size: file.size,
          format: this.getFileFormat(file.name)
        },
        error: null
      });
      
      // Preview file contents
      await this.previewFile(file);
      
    } catch (error) {
      console.error('[ImportDialog] File selection error:', error);
      this.setState({
        error: error.message || 'Failed to read file'
      });
    }
  }

  /**
   * Preview file contents
   * @private
   */
  async previewFile(file) {
    try {
      const reader = new FileReader();
      
      const content = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
      });
      
      // Parse content based on format
      const format = this.getFileFormat(file.name);
      let data;
      
      if (format === 'JSON' || format === 'JSON (gzip)') {
        data = JSON.parse(content);
      } else {
        // For other formats, we'll need to send to background for parsing
        const response = await browser.runtime.sendMessage({
          type: 'preview_import',
          format: format.toLowerCase(),
          content: content
        });
        
        if (response.error) {
          throw new Error(response.error);
        }
        
        data = response.data;
      }
      
      // Check for duplicates
      const checkResponse = await browser.runtime.sendMessage({
        type: 'check_import_duplicates',
        conversationIds: data.conversations.map(c => c.id)
      });
      
      this.setState({
        previewData: {
          conversationCount: data.conversations.length,
          messageCount: data.conversations.reduce((sum, conv) => 
            sum + (conv.messages ? conv.messages.length : 0), 0),
          dateRange: this.getDateRange(data.conversations),
          duplicates: checkResponse.duplicates || 0
        }
      });
      
    } catch (error) {
      console.error('[ImportDialog] Preview error:', error);
      this.setState({
        error: 'Failed to preview file: ' + error.message
      });
    }
  }

  /**
   * Handle import
   * @private
   */
  async handleImport() {
    try {
      this.setState({
        isImporting: true,
        importProgress: 0,
        error: null
      });
      
      // Read file content
      const reader = new FileReader();
      const content = await new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(this.state.selectedFile);
      });
      
      // Send import request to background
      const response = await browser.runtime.sendMessage({
        type: 'import_data',
        options: {
          format: this.getFileFormat(this.state.selectedFile.name).toLowerCase(),
          content: content,
          duplicateHandling: this.state.duplicateHandling
        }
      });
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      // Track progress
      if (response.importId) {
        await this.trackProgress(response.importId);
      }
      
      this.setState({
        isImporting: false,
        success: `Successfully imported ${response.imported} conversation(s)`
      });
      
      // Notify parent to refresh conversation list
      if (this.onImportComplete) {
        this.onImportComplete(response);
      }
      
      // Close dialog after delay
      setTimeout(() => this.close(), 2000);
      
    } catch (error) {
      console.error('[ImportDialog] Import error:', error);
      this.setState({
        isImporting: false,
        error: error.message || 'Import failed'
      });
    }
  }

  /**
   * Track import progress
   * @private
   */
  async trackProgress(importId) {
    const checkProgress = async () => {
      if (!this.state.isImporting) return;
      
      const response = await browser.runtime.sendMessage({
        type: 'get_import_progress',
        importId
      });
      
      if (response.progress) {
        this.setState({ importProgress: response.progress.progress });
        
        if (response.progress.status === 'processing') {
          setTimeout(checkProgress, 100);
        }
      }
    };
    
    checkProgress();
  }

  /**
   * Get file format from filename
   * @private
   */
  getFileFormat(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const formats = {
      'json': 'JSON',
      'gz': 'JSON (gzip)',
      'md': 'Markdown',
      'html': 'HTML',
      'csv': 'CSV'
    };
    return formats[ext] || 'Unknown';
  }

  /**
   * Format file size
   * @private
   */
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /**
   * Get date range from conversations
   * @private
   */
  getDateRange(conversations) {
    if (!conversations || conversations.length === 0) {
      return 'No data';
    }
    
    const dates = conversations
      .map(c => new Date(c.createdAt || c.updatedAt))
      .filter(d => !isNaN(d))
      .sort((a, b) => a - b);
    
    if (dates.length === 0) return 'No dates';
    
    const start = dates[0].toLocaleDateString();
    const end = dates[dates.length - 1].toLocaleDateString();
    
    return start === end ? start : `${start} - ${end}`;
  }

  /**
   * Format date range
   * @private
   */
  formatDateRange(range) {
    return range || 'Unknown';
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