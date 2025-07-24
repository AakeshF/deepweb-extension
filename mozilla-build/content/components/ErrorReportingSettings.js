/**
 * Error Reporting Settings Component
 * Allows users to configure error monitoring preferences
 */

import { errorMonitor } from '../../src/monitoring/ErrorMonitor.js';
import DOMUtils from '../utils/dom-utils.js';

export class ErrorReportingSettings {
  constructor() {
    this.container = null;
    this.settings = {
      enabled: true,
      shareSystemInfo: true,
      shareUsageData: false
    };
  }

  async init() {
    // Load saved settings
    await this.loadSettings();
    
    // Create UI
    this.render();
  }

  async loadSettings() {
    try {
      const saved = await browser.storage.local.get([
        'errorMonitoringEnabled',
        'shareSystemInfo',
        'shareUsageData'
      ]);
      
      this.settings = {
        enabled: saved.errorMonitoringEnabled !== false,
        shareSystemInfo: saved.shareSystemInfo !== false,
        shareUsageData: saved.shareUsageData === true
      };
    } catch (error) {
      console.error('Failed to load error reporting settings:', error);
    }
  }

  render() {
    this.container = document.createElement('div');
    this.container.className = 'deepweb-error-settings';
    
    // Create header
    const header = this.createHeader();
    
    // Create content container
    const content = document.createElement('div');
    content.className = 'error-settings-content';
    
    // Create setting items
    content.appendChild(this.createSettingItem(
      'error-monitoring-enabled',
      'Enable Error Reporting',
      'Automatically send crash reports and error logs to help fix bugs',
      this.settings.enabled,
      false
    ));
    
    content.appendChild(this.createSettingItem(
      'share-system-info',
      'Share System Information',
      'Include browser version, OS, and memory usage in error reports',
      this.settings.shareSystemInfo,
      !this.settings.enabled
    ));
    
    content.appendChild(this.createSettingItem(
      'share-usage-data',
      'Share Usage Analytics',
      'Help us understand how features are used (no personal data collected)',
      this.settings.shareUsageData,
      !this.settings.enabled
    ));
    
    // Create error stats section
    content.appendChild(this.createErrorStats());
    
    // Create privacy notice
    content.appendChild(this.createPrivacyNotice());
    
    // Append all to container
    this.container.appendChild(header);
    this.container.appendChild(content);
    
    // Add styles
    this.addStyles();
    
    // Attach event listeners
    this.attachEventListeners();
    
    // Load error statistics
    this.loadErrorStats();
    
    return this.container;
  }

  addStyles() {
    if (document.getElementById('error-settings-styles')) {
      return;
    }
    
    const styles = document.createElement('style');
    styles.id = 'error-settings-styles';
    styles.textContent = `
      .deepweb-error-settings {
        padding: 20px;
        max-width: 600px;
        font-family: -apple-system, BlinkMacSystemFont, sans-serif;
      }
      
      .error-settings-header h3 {
        margin: 0 0 8px 0;
        font-size: 18px;
        font-weight: 600;
      }
      
      .error-settings-header .description {
        margin: 0 0 20px 0;
        color: #666;
        font-size: 14px;
      }
      
      .setting-item {
        margin-bottom: 24px;
        transition: opacity 0.3s;
      }
      
      .setting-item.disabled {
        opacity: 0.5;
      }
      
      .toggle-setting {
        display: flex;
        align-items: center;
        cursor: pointer;
        margin-bottom: 8px;
      }
      
      .toggle-setting input[type="checkbox"] {
        display: none;
      }
      
      .toggle-slider {
        width: 44px;
        height: 24px;
        background-color: #ccc;
        border-radius: 12px;
        margin-right: 12px;
        position: relative;
        transition: background-color 0.3s;
      }
      
      .toggle-slider::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background-color: white;
        border-radius: 50%;
        transition: transform 0.3s;
      }
      
      .toggle-setting input:checked + .toggle-slider {
        background-color: #007bff;
      }
      
      .toggle-setting input:checked + .toggle-slider::after {
        transform: translateX(20px);
      }
      
      .setting-label {
        font-weight: 500;
        font-size: 16px;
      }
      
      .setting-description {
        margin: 0 0 0 56px;
        color: #666;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .error-stats {
        margin-top: 32px;
        padding: 16px;
        background-color: #f8f9fa;
        border-radius: 8px;
      }
      
      .error-stats h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
      }
      
      #error-stats-content {
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 12px;
      }
      
      .clear-errors-btn {
        padding: 8px 16px;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.3s;
      }
      
      .clear-errors-btn:hover {
        background-color: #c82333;
      }
      
      .privacy-notice {
        margin-top: 24px;
        padding: 12px;
        background-color: #e9ecef;
        border-radius: 6px;
        font-size: 13px;
        line-height: 1.5;
      }
      
      .privacy-notice strong {
        font-weight: 600;
      }
    `;
    
    document.head.appendChild(styles);
  }

  attachEventListeners() {
    // Error monitoring toggle
    const enabledToggle = this.container.querySelector('#error-monitoring-enabled');
    enabledToggle.addEventListener('change', async (e) => {
      this.settings.enabled = e.target.checked;
      await this.saveSettings();
      
      // Update UI state
      const items = this.container.querySelectorAll('.setting-item');
      items.forEach((item, index) => {
        if (index > 0) {
          item.classList.toggle('disabled', !this.settings.enabled);
          const input = item.querySelector('input');
          if (input) {
            input.disabled = !this.settings.enabled;
          }
        }
      });
      
      // Update error monitor
      errorMonitor.config.enabled = this.settings.enabled;
    });
    
    // System info toggle
    const systemInfoToggle = this.container.querySelector('#share-system-info');
    systemInfoToggle.addEventListener('change', async (e) => {
      this.settings.shareSystemInfo = e.target.checked;
      await this.saveSettings();
      
      errorMonitor.config.includeUserAgent = this.settings.shareSystemInfo;
      errorMonitor.config.includeMemoryInfo = this.settings.shareSystemInfo;
    });
    
    // Usage data toggle
    const usageDataToggle = this.container.querySelector('#share-usage-data');
    usageDataToggle.addEventListener('change', async (e) => {
      this.settings.shareUsageData = e.target.checked;
      await this.saveSettings();
    });
    
    // Clear error log button
    const clearButton = this.container.querySelector('#clear-error-log');
    clearButton.addEventListener('click', async () => {
      if (confirm('Are you sure you want to clear the error log?')) {
        await errorMonitor.clearErrorLog();
        await this.loadErrorStats();
      }
    });
  }

  async saveSettings() {
    try {
      await browser.storage.local.set({
        errorMonitoringEnabled: this.settings.enabled,
        shareSystemInfo: this.settings.shareSystemInfo,
        shareUsageData: this.settings.shareUsageData
      });
    } catch (error) {
      console.error('Failed to save error reporting settings:', error);
    }
  }

  async loadErrorStats() {
    const statsContainer = this.container.querySelector('#error-stats-content');
    
    try {
      const stats = await errorMonitor.getErrorStats();
      
      // Clear existing content
      statsContainer.textContent = '';
      
      if (!stats || stats.total === 0) {
        const p = document.createElement('p');
        p.textContent = 'No errors recorded';
        statsContainer.appendChild(p);
        return;
      }
      
      // Create total errors paragraph
      const totalP = document.createElement('p');
      totalP.textContent = `Total errors: ${stats.total}`;
      statsContainer.appendChild(totalP);
      
      // Create error types paragraph
      const typesP = document.createElement('p');
      typesP.textContent = 'Error types:';
      statsContainer.appendChild(typesP);
      
      // Create list of error types
      const ul = document.createElement('ul');
      ul.style.margin = '8px 0 0 20px';
      ul.style.padding = '0';
      
      // Sort and add error types
      Object.entries(stats.byType)
        .sort(([, a], [, b]) => b - a)
        .forEach(([type, count]) => {
          const li = document.createElement('li');
          li.textContent = `${type}: ${count}`;
          ul.appendChild(li);
        });
      
      statsContainer.appendChild(ul);
    } catch (error) {
      // Clear existing content and show error
      statsContainer.textContent = '';
      const p = document.createElement('p');
      p.textContent = 'Failed to load error statistics';
      statsContainer.appendChild(p);
    }
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'error-settings-header';
    
    const h3 = document.createElement('h3');
    h3.textContent = 'Error Reporting & Diagnostics';
    
    const description = document.createElement('p');
    description.className = 'description';
    description.textContent = 'Help improve DeepWeb by automatically reporting errors';
    
    header.appendChild(h3);
    header.appendChild(description);
    
    return header;
  }
  
  createSettingItem(id, label, description, checked, disabled) {
    const item = document.createElement('div');
    item.className = 'setting-item' + (disabled ? ' disabled' : '');
    
    // Create label container
    const labelEl = document.createElement('label');
    labelEl.className = 'toggle-setting';
    
    // Create checkbox
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = id;
    checkbox.checked = checked;
    checkbox.disabled = disabled;
    
    // Create slider
    const slider = document.createElement('span');
    slider.className = 'toggle-slider';
    
    // Create label text
    const labelText = document.createElement('span');
    labelText.className = 'setting-label';
    labelText.textContent = label;
    
    // Assemble label
    labelEl.appendChild(checkbox);
    labelEl.appendChild(slider);
    labelEl.appendChild(labelText);
    
    // Create description
    const desc = document.createElement('p');
    desc.className = 'setting-description';
    desc.textContent = description;
    
    // Assemble item
    item.appendChild(labelEl);
    item.appendChild(desc);
    
    return item;
  }
  
  createErrorStats() {
    const stats = document.createElement('div');
    stats.className = 'error-stats';
    
    const h4 = document.createElement('h4');
    h4.textContent = 'Error Statistics';
    
    const content = document.createElement('div');
    content.id = 'error-stats-content';
    content.textContent = 'Loading...';
    
    const button = document.createElement('button');
    button.className = 'clear-errors-btn';
    button.id = 'clear-error-log';
    button.textContent = 'Clear Error Log';
    
    stats.appendChild(h4);
    stats.appendChild(content);
    stats.appendChild(button);
    
    return stats;
  }
  
  createPrivacyNotice() {
    const notice = document.createElement('div');
    notice.className = 'privacy-notice';
    
    const p = document.createElement('p');
    const strong = document.createElement('strong');
    strong.textContent = 'Privacy Notice:';
    
    p.appendChild(strong);
    p.appendChild(document.createTextNode(' Error reports never include your conversations, API keys, or personal information. All data is anonymized and used solely for improving the extension.'));
    
    notice.appendChild(p);
    
    return notice;
  }
  
  cleanup() {
    if (this.container && this.container.parentElement) {
      this.container.remove();
    }
  }
}