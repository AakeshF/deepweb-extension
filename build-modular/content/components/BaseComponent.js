/**
 * Base Component Class
 * Foundation for all UI components
 */

import DOMUtils from '../utils/dom-utils.js';
import EventManager from '../utils/event-manager.js';

export default class BaseComponent {
  constructor(options = {}) {
    this.options = options;
    this.element = null;
    this.state = {};
    this.children = new Map();
    this._mounted = false;
    this._eventManager = EventManager;
  }

  /**
   * Initialize the component
   */
  async init() {
    await this.render();
    this.setupEventListeners();
    this._mounted = true;
    this.onMount();
  }

  /**
   * Render the component
   * @abstract
   */
  async render() {
    throw new Error('render() must be implemented by subclass');
  }

  /**
   * Setup event listeners
   * @abstract
   */
  setupEventListeners() {
    // To be implemented by subclasses
  }

  /**
   * Called when component is mounted
   */
  onMount() {
    // To be implemented by subclasses
  }

  /**
   * Update component state
   * @param {Object} newState - New state values
   */
  setState(newState) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...newState };
    this.onStateChange(oldState, this.state);
  }

  /**
   * Called when state changes
   * @param {Object} oldState - Previous state
   * @param {Object} newState - New state
   */
  onStateChange(oldState, newState) {
    // To be implemented by subclasses
  }

  /**
   * Get child component
   * @param {string} name - Component name
   * @returns {BaseComponent|null}
   */
  getChild(name) {
    return this.children.get(name) || null;
  }

  /**
   * Add child component
   * @param {string} name - Component name
   * @param {BaseComponent} component - Component instance
   */
  addChild(name, component) {
    this.children.set(name, component);
  }

  /**
   * Remove child component
   * @param {string} name - Component name
   */
  removeChild(name) {
    const child = this.children.get(name);
    if (child) {
      child.destroy();
      this.children.delete(name);
    }
  }

  /**
   * Emit custom event
   * @param {string} eventName - Event name
   * @param {*} detail - Event detail
   */
  emit(eventName, detail) {
    if (this.element) {
      this._eventManager.emit(this.element, eventName, detail);
    }
  }

  /**
   * Add event listener to component element
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   * @param {Object} options - Event options
   */
  on(event, handler, options) {
    if (this.element) {
      this._eventManager.on(this.element, event, handler, options);
    }
  }

  /**
   * Add delegated event listener
   * @param {string} selector - Child selector
   * @param {string} event - Event type
   * @param {Function} handler - Event handler
   */
  delegate(selector, event, handler) {
    if (this.element) {
      this._eventManager.delegate(this.element, selector, event, handler);
    }
  }

  /**
   * Show the component
   */
  show() {
    if (this.element) {
      this.element.style.display = '';
    }
  }

  /**
   * Hide the component
   */
  hide() {
    if (this.element) {
      this.element.style.display = 'none';
    }
  }

  /**
   * Check if component is visible
   * @returns {boolean}
   */
  isVisible() {
    return this.element && this.element.style.display !== 'none';
  }

  /**
   * Destroy the component
   */
  destroy() {
    // Destroy all children
    this.children.forEach(child => child.destroy());
    this.children.clear();

    // Remove event listeners
    if (this.element) {
      this._eventManager.removeAll(this.element);
    }

    // Remove from DOM
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }

    this._mounted = false;
    this.onDestroy();
  }

  /**
   * Called when component is destroyed
   */
  onDestroy() {
    // To be implemented by subclasses
  }

  /**
   * Check if component is mounted
   * @returns {boolean}
   */
  isMounted() {
    return this._mounted;
  }
}