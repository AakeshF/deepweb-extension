/**
 * @fileoverview Advanced model parameter controls component
 * Provides fine-grained control over AI model parameters
 */

import { BaseComponent } from './BaseComponent.js';

export class ModelParameterControls extends BaseComponent {
  constructor() {
    super();
    this.state = {
      expanded: false,
      parameters: {
        temperature: 0.7,
        maxTokens: 4096,
        topP: 0.95,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        systemPrompt: '',
        responseFormat: 'text'
      },
      presets: {
        creative: {
          name: 'Creative',
          temperature: 0.9,
          topP: 0.95,
          frequencyPenalty: 0.3,
          presencePenalty: 0.3
        },
        balanced: {
          name: 'Balanced',
          temperature: 0.7,
          topP: 0.9,
          frequencyPenalty: 0,
          presencePenalty: 0
        },
        precise: {
          name: 'Precise',
          temperature: 0.3,
          topP: 0.8,
          frequencyPenalty: -0.3,
          presencePenalty: -0.3
        },
        deterministic: {
          name: 'Deterministic',
          temperature: 0,
          topP: 1,
          frequencyPenalty: 0,
          presencePenalty: 0
        }
      },
      activePreset: 'balanced'
    };
  }

  render() {
    const { expanded, parameters, presets, activePreset } = this.state;

    return `
      <div class="model-parameter-controls ${expanded ? 'expanded' : ''}">
        <button class="parameter-toggle" aria-expanded="${expanded}">
          <svg class="parameter-icon" width="16" height="16" viewBox="0 0 16 16">
            <path d="M8 1a1 1 0 0 1 1 1v1.07a6 6 0 0 1 2.45.93l.76-.76a1 1 0 1 1 1.41 1.41l-.76.76A6 6 0 0 1 13.93 7H15a1 1 0 0 1 0 2h-1.07a6 6 0 0 1-.93 2.45l.76.76a1 1 0 1 1-1.41 1.41l-.76-.76A6 6 0 0 1 9 13.93V15a1 1 0 0 1-2 0v-1.07a6 6 0 0 1-2.45-.93l-.76.76a1 1 0 1 1-1.41-1.41l.76-.76A6 6 0 0 1 2.07 9H1a1 1 0 0 1 0-2h1.07a6 6 0 0 1 .93-2.45l-.76-.76a1 1 0 0 1 1.41-1.41l.76.76A6 6 0 0 1 7 2.07V1a1 1 0 0 1 1-1zm0 5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
          </svg>
          <span>Parameters</span>
          <svg class="chevron" width="12" height="12" viewBox="0 0 12 12">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="2" fill="none"/>
          </svg>
        </button>

        <div class="parameter-panel">
          <div class="parameter-presets">
            <label class="preset-label">Presets:</label>
            <div class="preset-buttons">
              ${Object.entries(presets).map(([key, preset]) => `
                <button class="preset-button ${activePreset === key ? 'active' : ''}" 
                        data-preset="${key}" 
                        title="${preset.name} mode">
                  ${preset.name}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="parameter-group">
            <div class="parameter-item">
              <label for="temperature">
                Temperature
                <span class="parameter-help" title="Controls randomness: 0 = deterministic, 1 = very random">?</span>
              </label>
              <div class="parameter-control">
                <input type="range" id="temperature" min="0" max="1" step="0.1" 
                       value="${parameters.temperature}" class="parameter-slider">
                <input type="number" min="0" max="1" step="0.1" 
                       value="${parameters.temperature}" class="parameter-input">
              </div>
            </div>

            <div class="parameter-item">
              <label for="max-tokens">
                Max Tokens
                <span class="parameter-help" title="Maximum length of the response">?</span>
              </label>
              <div class="parameter-control">
                <input type="range" id="max-tokens" min="100" max="8192" step="100" 
                       value="${parameters.maxTokens}" class="parameter-slider">
                <input type="number" min="100" max="8192" step="100" 
                       value="${parameters.maxTokens}" class="parameter-input">
              </div>
            </div>

            <div class="parameter-item">
              <label for="top-p">
                Top P
                <span class="parameter-help" title="Nucleus sampling: consider tokens with top P probability mass">?</span>
              </label>
              <div class="parameter-control">
                <input type="range" id="top-p" min="0" max="1" step="0.05" 
                       value="${parameters.topP}" class="parameter-slider">
                <input type="number" min="0" max="1" step="0.05" 
                       value="${parameters.topP}" class="parameter-input">
              </div>
            </div>

            <div class="parameter-item">
              <label for="frequency-penalty">
                Frequency Penalty
                <span class="parameter-help" title="Reduce repetition of tokens (-2 to 2)">?</span>
              </label>
              <div class="parameter-control">
                <input type="range" id="frequency-penalty" min="-2" max="2" step="0.1" 
                       value="${parameters.frequencyPenalty}" class="parameter-slider">
                <input type="number" min="-2" max="2" step="0.1" 
                       value="${parameters.frequencyPenalty}" class="parameter-input">
              </div>
            </div>

            <div class="parameter-item">
              <label for="presence-penalty">
                Presence Penalty
                <span class="parameter-help" title="Encourage new topics (-2 to 2)">?</span>
              </label>
              <div class="parameter-control">
                <input type="range" id="presence-penalty" min="-2" max="2" step="0.1" 
                       value="${parameters.presencePenalty}" class="parameter-slider">
                <input type="number" min="-2" max="2" step="0.1" 
                       value="${parameters.presencePenalty}" class="parameter-input">
              </div>
            </div>
          </div>

          <div class="parameter-advanced">
            <details class="advanced-section">
              <summary>Advanced Settings</summary>
              
              <div class="parameter-item">
                <label for="stop-sequences">
                  Stop Sequences
                  <span class="parameter-help" title="Comma-separated sequences where the model will stop">?</span>
                </label>
                <input type="text" id="stop-sequences" 
                       placeholder="Enter comma-separated stop sequences"
                       value="${parameters.stopSequences.join(', ')}" 
                       class="parameter-text-input">
              </div>

              <div class="parameter-item">
                <label for="system-prompt">
                  System Prompt Override
                  <span class="parameter-help" title="Override the default system prompt">?</span>
                </label>
                <textarea id="system-prompt" 
                          placeholder="Enter custom system prompt (optional)"
                          class="parameter-textarea">${parameters.systemPrompt}</textarea>
              </div>

              <div class="parameter-item">
                <label for="response-format">
                  Response Format
                  <span class="parameter-help" title="Expected format of the response">?</span>
                </label>
                <select id="response-format" class="parameter-select">
                  <option value="text" ${parameters.responseFormat === 'text' ? 'selected' : ''}>Text</option>
                  <option value="json" ${parameters.responseFormat === 'json' ? 'selected' : ''}>JSON</option>
                  <option value="markdown" ${parameters.responseFormat === 'markdown' ? 'selected' : ''}>Markdown</option>
                </select>
              </div>
            </details>
          </div>

          <div class="parameter-actions">
            <button class="reset-button" title="Reset to defaults">Reset</button>
            <button class="save-button" title="Save as custom preset">Save Preset</button>
          </div>
        </div>
      </div>
    `;
  }

  attachListeners() {
    // Toggle panel
    this.addListener('.parameter-toggle', 'click', () => {
      this.setState({ expanded: !this.state.expanded });
    });

    // Preset buttons
    this.addListener('.preset-button', 'click', (e) => {
      const preset = e.target.dataset.preset;
      this.applyPreset(preset);
    });

    // Slider/input synchronization
    this.addListener('.parameter-slider', 'input', (e) => {
      const param = this.getParameterName(e.target.id);
      const value = parseFloat(e.target.value);
      this.updateParameter(param, value);
      
      // Update corresponding input
      const input = e.target.parentElement.querySelector('.parameter-input');
      if (input) input.value = value;
    });

    this.addListener('.parameter-input', 'input', (e) => {
      const param = this.getParameterName(e.target.parentElement.parentElement.querySelector('.parameter-slider').id);
      const value = parseFloat(e.target.value);
      this.updateParameter(param, value);
      
      // Update corresponding slider
      const slider = e.target.parentElement.querySelector('.parameter-slider');
      if (slider) slider.value = value;
    });

    // Text inputs
    this.addListener('#stop-sequences', 'input', (e) => {
      const sequences = e.target.value.split(',').map(s => s.trim()).filter(s => s);
      this.updateParameter('stopSequences', sequences);
    });

    this.addListener('#system-prompt', 'input', (e) => {
      this.updateParameter('systemPrompt', e.target.value);
    });

    this.addListener('#response-format', 'change', (e) => {
      this.updateParameter('responseFormat', e.target.value);
    });

    // Action buttons
    this.addListener('.reset-button', 'click', () => {
      this.resetParameters();
    });

    this.addListener('.save-button', 'click', () => {
      this.saveCustomPreset();
    });
  }

  getParameterName(id) {
    const mapping = {
      'temperature': 'temperature',
      'max-tokens': 'maxTokens',
      'top-p': 'topP',
      'frequency-penalty': 'frequencyPenalty',
      'presence-penalty': 'presencePenalty'
    };
    return mapping[id] || id;
  }

  updateParameter(name, value) {
    this.setState({
      parameters: {
        ...this.state.parameters,
        [name]: value
      },
      activePreset: 'custom'
    });

    // Emit parameter change event
    this.emit('parameterChange', {
      parameter: name,
      value: value,
      allParameters: this.state.parameters
    });
  }

  applyPreset(presetName) {
    const preset = this.state.presets[presetName];
    if (!preset) return;

    this.setState({
      parameters: {
        ...this.state.parameters,
        temperature: preset.temperature,
        topP: preset.topP,
        frequencyPenalty: preset.frequencyPenalty,
        presencePenalty: preset.presencePenalty
      },
      activePreset: presetName
    });

    this.emit('presetApplied', {
      preset: presetName,
      parameters: this.state.parameters
    });
  }

  resetParameters() {
    this.applyPreset('balanced');
  }

  async saveCustomPreset() {
    const name = prompt('Enter a name for this preset:');
    if (!name) return;

    const customPresets = await this.getStoredPresets();
    customPresets[name] = {
      name: name,
      ...this.state.parameters
    };

    await browser.storage.local.set({ customParameterPresets: customPresets });

    this.emit('presetSaved', {
      name: name,
      parameters: this.state.parameters
    });

    // Show success message
    this.showNotification('Preset saved successfully!');
  }

  async getStoredPresets() {
    const { customParameterPresets = {} } = await browser.storage.local.get('customParameterPresets');
    return customParameterPresets;
  }

  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'parameter-notification';
    notification.textContent = message;
    this.container.appendChild(notification);

    setTimeout(() => {
      notification.classList.add('fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 2000);
  }

  getParameters() {
    return { ...this.state.parameters };
  }

  setParameters(parameters) {
    this.setState({
      parameters: { ...this.state.parameters, ...parameters }
    });
  }
}