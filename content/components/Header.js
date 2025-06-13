/**
 * Header Component
 * Chat window header with controls
 */

import BaseComponent from './BaseComponent.js';
import TemplateLoader from '../utils/template-loader.js';
import DOMUtils from '../utils/dom-utils.js';
import { responsiveManager } from '../utils/ResponsiveManager.js';

export default class Header extends BaseComponent {
  constructor(options = {}) {
    super(options);
    this.onClose = options.onClose || (() => {});
    this.onMinimize = options.onMinimize || (() => {});
    this.onToggleSidebar = options.onToggleSidebar || (() => {});
    this.onToggleSearch = options.onToggleSearch || (() => {});
    this.onToggleLayout = options.onToggleLayout || (() => {});
    this.onToggleLayoutControls = options.onToggleLayoutControls || (() => {});
    this.onToggleAnimationSettings = options.onToggleAnimationSettings || (() => {});
    this.onDragStart = options.onDragStart || (() => {});
    this.onDragMove = options.onDragMove || (() => {});
    this.onDragEnd = options.onDragEnd || (() => {});
    
    // Drag state
    this.isDragging = false;
    this.dragStartX = 0;
    this.dragStartY = 0;
  }

  async render() {
    // Load template
    const template = await TemplateLoader.loadTemplate('header');
    const fragment = TemplateLoader.parseTemplate(template);
    
    this.element = fragment.querySelector('.deepweb-header');
    
    // Apply styles
    this.applyStyles();
  }

  applyStyles() {
    // Header styles
    Object.assign(this.element.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      background: '#f8f9fa',
      borderBottom: '1px solid #e0e0e0',
      borderRadius: '12px 12px 0 0',
      userSelect: 'none',
      cursor: 'move',
      position: 'relative'
    });

    // Header left container
    const headerLeft = DOMUtils.$('.deepweb-header-left', this.element);
    if (headerLeft) {
      Object.assign(headerLeft.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      });
    }

    // Title styles
    const titleContainer = DOMUtils.$('.deepweb-header-title', this.element);
    Object.assign(titleContainer.style, {
      fontWeight: '600',
      fontSize: '16px',
      color: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    });

    // Logo styles
    const logo = DOMUtils.$('.deepweb-logo', this.element);
    Object.assign(logo.style, {
      width: '24px',
      height: '24px',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      borderRadius: '6px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '12px',
      fontWeight: 'bold'
    });

    // Drag indicator styles
    const dragIndicator = DOMUtils.$('.deepweb-drag-indicator', this.element);
    if (dragIndicator) {
      Object.assign(dragIndicator.style, {
        position: 'absolute',
        left: '50%',
        bottom: '4px',
        transform: 'translateX(-50%)',
        width: '40px',
        height: '4px',
        background: '#d0d0d0',
        borderRadius: '2px',
        opacity: '0.6'
      });
    }

    // Controls container
    const controls = DOMUtils.$('.deepweb-header-controls', this.element);
    Object.assign(controls.style, {
      display: 'flex',
      gap: '8px'
    });

    // Control buttons
    DOMUtils.$$('.deepweb-control-btn', this.element).forEach(btn => {
      Object.assign(btn.style, {
        width: '28px',
        height: '28px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontSize: '18px',
        color: '#666',
        borderRadius: '4px',
        transition: 'background 0.2s',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      });
    });
  }

  setupEventListeners() {
    // Drag functionality
    this.setupDragListeners();
    
    // Sidebar toggle button
    const sidebarBtn = DOMUtils.$('#deepweb-sidebar-toggle', this.element);
    if (sidebarBtn) {
      this.on('click', (e) => {
        if (e.target === sidebarBtn || e.target.closest('#deepweb-sidebar-toggle')) {
          this.onToggleSidebar();
        }
      });
    }

    // Search toggle button
    const searchBtn = DOMUtils.$('#deepweb-search-toggle', this.element);
    if (searchBtn) {
      this.on('click', (e) => {
        if (e.target === searchBtn || e.target.closest('#deepweb-search-toggle')) {
          this.onToggleSearch();
        }
      });
    }

    // Animation settings toggle button
    const animationBtn = DOMUtils.$('#deepweb-animation-toggle', this.element);
    if (animationBtn) {
      this.on('click', (e) => {
        if (e.target === animationBtn || e.target.closest('#deepweb-animation-toggle')) {
          this.onToggleAnimationSettings();
        }
      });
    }

    // Layout controls toggle button
    const layoutBtn = DOMUtils.$('#deepweb-layout-toggle', this.element);
    if (layoutBtn) {
      this.on('click', (e) => {
        if (e.target === layoutBtn || e.target.closest('#deepweb-layout-toggle')) {
          this.onToggleLayout();
        }
      });
    }

    // Close button
    const closeBtn = DOMUtils.$('#deepweb-close', this.element);
    this.on('click', (e) => {
      if (e.target === closeBtn || e.target.closest('#deepweb-close')) {
        this.onClose();
      }
    });

    // Minimize button
    const minimizeBtn = DOMUtils.$('#deepweb-minimize', this.element);
    this.on('click', (e) => {
      if (e.target === minimizeBtn || e.target.closest('#deepweb-minimize')) {
        this.onMinimize();
      }
    });

    // Hover effects
    DOMUtils.$$('.deepweb-control-btn', this.element).forEach(btn => {
      this._eventManager.on(btn, 'mouseenter', () => {
        btn.style.background = '#e0e0e0';
      });
      
      this._eventManager.on(btn, 'mouseleave', () => {
        btn.style.background = 'transparent';
      });
    });
  }

  setMinimizeIcon(icon) {
    const minimizeIcon = DOMUtils.$('.deepweb-minimize-icon', this.element);
    if (minimizeIcon) {
      minimizeIcon.textContent = icon;
    }
  }

  setupDragListeners() {
    // Only drag when clicking on header, not on buttons
    this._eventManager.on(this.element, 'mousedown', (e) => {
      // Don't start drag if clicking on a button
      if (e.target.closest('.deepweb-control-btn') || 
          e.target.closest('.deepweb-header-controls')) {
        return;
      }
      
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      
      // Add dragging class
      this.element.classList.add('dragging');
      
      // Notify parent
      this.onDragStart(e);
      
      // Prevent text selection
      e.preventDefault();
    });

    // Global mouse move
    this._eventManager.on(document, 'mousemove', (e) => {
      if (!this.isDragging) return;
      
      const deltaX = e.clientX - this.dragStartX;
      const deltaY = e.clientY - this.dragStartY;
      
      this.onDragMove(deltaX, deltaY, e);
    });

    // Global mouse up
    this._eventManager.on(document, 'mouseup', (e) => {
      if (!this.isDragging) return;
      
      this.isDragging = false;
      this.element.classList.remove('dragging');
      
      this.onDragEnd(e);
    });
    
    // Setup mobile touch interactions
    this.setupMobileInteractions();
  }
  
  setupMobileInteractions() {
    if (!responsiveManager.isTouchDevice()) return;
    
    // Touch drag for mobile
    let touchStartX = 0;
    let touchStartY = 0;
    let isTouching = false;
    
    this._eventManager.on(this.element, 'touchstart', (e) => {
      if (e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      isTouching = true;
      
      this.element.classList.add('dragging');
      this.onDragStart(touch.clientX, touch.clientY, e);
    });
    
    this._eventManager.on(document, 'touchmove', (e) => {
      if (!isTouching || e.touches.length !== 1) return;
      
      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartX;
      const deltaY = touch.clientY - touchStartY;
      
      // Prevent scrolling while dragging
      e.preventDefault();
      
      this.onDragMove(deltaX, deltaY, e);
    });
    
    this._eventManager.on(document, 'touchend', (e) => {
      if (!isTouching) return;
      
      isTouching = false;
      this.element.classList.remove('dragging');
      
      this.onDragEnd(e);
    });
    
    // Make header controls touch-friendly
    this.makeTouchFriendly();
  }
  
  makeTouchFriendly() {
    const controls = this.element.querySelectorAll('.deepweb-control-btn');
    controls.forEach(control => {
      responsiveManager.makeTouchFriendly(control);
    });
  }
  
  // Mobile-specific methods
  
  setCollapsed(collapsed) {
    if (collapsed) {
      this.element.classList.add('collapsed');
      this.element.classList.remove('expanding');
    } else {
      this.element.classList.remove('collapsed');
      this.element.classList.add('expanding');
    }
  }
  
  adaptForMobile() {
    if (responsiveManager.isMobile()) {
      // Hide some controls on mobile to save space
      const layoutBtn = this.element.querySelector('[data-action="layout"]');
      const animationBtn = this.element.querySelector('[data-action="animation"]');
      
      if (layoutBtn) layoutBtn.style.display = 'none';
      if (animationBtn) animationBtn.style.display = 'none';
      
      // Adjust header styling for mobile
      Object.assign(this.element.style, {
        padding: '8px 12px',
        minHeight: '48px'
      });
    }
  }
}