import { ModelParameterControls } from '../../../content/components/ModelParameterControls.js';
import { jest } from '@jest/globals';

describe('ModelParameterControls', () => {
  let component;
  let container;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    component = new ModelParameterControls();
  });

  afterEach(() => {
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default parameters', () => {
      expect(component.state.parameters).toMatchObject({
        temperature: 0.7,
        maxTokens: 4096,
        topP: 0.95,
        frequencyPenalty: 0,
        presencePenalty: 0,
        stopSequences: [],
        systemPrompt: '',
        responseFormat: 'text'
      });
    });

    it('should initialize with collapsed state', () => {
      expect(component.state.expanded).toBe(false);
    });

    it('should have default presets', () => {
      expect(component.state.presets).toHaveProperty('creative');
      expect(component.state.presets).toHaveProperty('balanced');
      expect(component.state.presets).toHaveProperty('precise');
      expect(component.state.presets).toHaveProperty('deterministic');
    });

    it('should start with balanced preset active', () => {
      expect(component.state.activePreset).toBe('balanced');
    });
  });

  describe('render', () => {
    beforeEach(async () => {
      await component.init();
      container.appendChild(component.element);
    });

    it('should render toggle button', () => {
      const toggle = component.element.querySelector('.parameter-toggle');
      expect(toggle).toBeTruthy();
      expect(toggle.getAttribute('aria-expanded')).toBe('false');
    });

    it('should render preset buttons', () => {
      const presetButtons = component.element.querySelectorAll('.preset-button');
      expect(presetButtons.length).toBe(4);
    });

    it('should render parameter sliders', () => {
      const sliders = component.element.querySelectorAll('.parameter-slider');
      expect(sliders.length).toBeGreaterThan(0);
    });

    it('should mark active preset', () => {
      const activePreset = component.element.querySelector('.preset-button.active');
      expect(activePreset).toBeTruthy();
      expect(activePreset.dataset.preset).toBe('balanced');
    });

    it('should hide panel when collapsed', () => {
      const panel = component.element.querySelector('.parameter-panel');
      expect(getComputedStyle(panel).display).toBe('none');
    });
  });

  describe('interactions', () => {
    beforeEach(async () => {
      await component.init();
      container.appendChild(component.element);
    });

    it('should toggle panel visibility', () => {
      const toggle = component.element.querySelector('.parameter-toggle');
      toggle.click();

      expect(component.state.expanded).toBe(true);
      expect(component.element.classList.contains('expanded')).toBe(true);
    });

    it('should apply preset when clicked', () => {
      const creativeButton = component.element.querySelector('[data-preset="creative"]');
      creativeButton.click();

      expect(component.state.activePreset).toBe('creative');
      expect(component.state.parameters.temperature).toBe(0.9);
      expect(component.state.parameters.frequencyPenalty).toBe(0.3);
    });

    it('should update parameter when slider changes', () => {
      const temperatureSlider = component.element.querySelector('#temperature');
      temperatureSlider.value = '0.5';
      temperatureSlider.dispatchEvent(new Event('input'));

      expect(component.state.parameters.temperature).toBe(0.5);
    });

    it('should sync slider and input values', () => {
      const temperatureSlider = component.element.querySelector('#temperature');
      const temperatureInput = temperatureSlider.parentElement.querySelector('.parameter-input');

      temperatureSlider.value = '0.3';
      temperatureSlider.dispatchEvent(new Event('input'));

      expect(temperatureInput.value).toBe('0.3');
    });

    it('should update stop sequences from text input', () => {
      component.state.expanded = true;
      component.render();

      const stopInput = component.element.querySelector('#stop-sequences');
      stopInput.value = 'END, STOP, DONE';
      stopInput.dispatchEvent(new Event('input'));

      expect(component.state.parameters.stopSequences).toEqual(['END', 'STOP', 'DONE']);
    });

    it('should reset parameters to default', () => {
      // Change some parameters
      component.updateParameter('temperature', 0.9);
      component.updateParameter('maxTokens', 2000);

      // Reset
      const resetButton = component.element.querySelector('.reset-button');
      resetButton.click();

      expect(component.state.parameters.temperature).toBe(0.7);
      expect(component.state.parameters.maxTokens).toBe(4096);
      expect(component.state.activePreset).toBe('balanced');
    });
  });

  describe('parameter management', () => {
    it('should emit parameter change events', () => {
      const listener = jest.fn();
      component.on('parameterChange', listener);

      component.updateParameter('temperature', 0.8);

      expect(listener).toHaveBeenCalledWith({
        parameter: 'temperature',
        value: 0.8,
        allParameters: expect.objectContaining({
          temperature: 0.8
        })
      });
    });

    it('should emit preset applied events', () => {
      const listener = jest.fn();
      component.on('presetApplied', listener);

      component.applyPreset('creative');

      expect(listener).toHaveBeenCalledWith({
        preset: 'creative',
        parameters: expect.objectContaining({
          temperature: 0.9
        })
      });
    });

    it('should set active preset to custom when manually changing parameters', () => {
      component.updateParameter('temperature', 0.5);
      expect(component.state.activePreset).toBe('custom');
    });

    it('should get current parameters', () => {
      component.updateParameter('temperature', 0.6);
      const params = component.getParameters();

      expect(params.temperature).toBe(0.6);
      expect(params).toHaveProperty('maxTokens');
      expect(params).toHaveProperty('topP');
    });

    it('should set parameters externally', () => {
      component.setParameters({
        temperature: 0.4,
        maxTokens: 2000
      });

      expect(component.state.parameters.temperature).toBe(0.4);
      expect(component.state.parameters.maxTokens).toBe(2000);
      expect(component.state.parameters.topP).toBe(0.95); // Unchanged
    });
  });

  describe('parameter validation', () => {
    it('should handle edge case temperature values', () => {
      component.updateParameter('temperature', 0);
      expect(component.state.parameters.temperature).toBe(0);

      component.updateParameter('temperature', 1);
      expect(component.state.parameters.temperature).toBe(1);
    });

    it('should handle empty stop sequences', () => {
      component.updateParameter('stopSequences', []);
      expect(component.state.parameters.stopSequences).toEqual([]);
    });

    it('should filter empty stop sequences', () => {
      component.state.expanded = true;
      component.render();

      const stopInput = component.element.querySelector('#stop-sequences');
      stopInput.value = 'END, , , STOP';
      stopInput.dispatchEvent(new Event('input'));

      expect(component.state.parameters.stopSequences).toEqual(['END', 'STOP']);
    });
  });

  describe('browser storage integration', () => {
    it('should save custom preset to storage', async () => {
      const mockPrompt = jest.spyOn(window, 'prompt').mockReturnValue('My Custom Preset');
      const mockStorage = {
        get: jest.fn().mockResolvedValue({ customParameterPresets: {} }),
        set: jest.fn().mockResolvedValue({})
      };
      global.browser = { storage: { local: mockStorage } };

      await component.saveCustomPreset();

      expect(mockStorage.set).toHaveBeenCalledWith({
        customParameterPresets: expect.objectContaining({
          'My Custom Preset': expect.objectContaining({
            name: 'My Custom Preset',
            temperature: 0.7
          })
        })
      });

      mockPrompt.mockRestore();
    });

    it('should show notification after saving preset', async () => {
      jest.spyOn(window, 'prompt').mockReturnValue('Test Preset');
      global.browser = {
        storage: {
          local: {
            get: jest.fn().mockResolvedValue({ customParameterPresets: {} }),
            set: jest.fn().mockResolvedValue({})
          }
        }
      };

      await component.init();
      container.appendChild(component.element);
      await component.saveCustomPreset();

      const notification = component.element.querySelector('.parameter-notification');
      expect(notification).toBeTruthy();
      expect(notification.textContent).toContain('Preset saved successfully');
    });
  });
});