class ResizeManager {
  constructor(options = {}) {
    this.element = null;
    this.container = options.container || document.body;
    this.onResize = options.onResize || (() => {});
    this.onPositionChange = options.onPositionChange || (() => {});
    
    // State
    this.isResizing = false;
    this.isDragging = false;
    this.currentHandle = null;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.startLeft = 0;
    this.startTop = 0;
    
    // Constraints
    this.minWidth = options.minWidth || 300;
    this.minHeight = options.minHeight || 400;
    this.maxWidth = options.maxWidth || window.innerWidth * 0.9;
    this.maxHeight = options.maxHeight || window.innerHeight * 0.9;
    
    // Snapping
    this.snapThreshold = options.snapThreshold || 20;
    this.magneticEdges = options.magneticEdges !== false;
    
    // Preferences
    this.preferencesKey = options.preferencesKey || 'chatResizePreferences';
    this.preferences = this.loadPreferences();
    
    // Layout modes
    this.layoutMode = this.preferences.layoutMode || 'corner';
    this.position = this.preferences.position || 'bottom-right';
    
    // Keyboard shortcuts
    this.keyboardEnabled = options.keyboardEnabled !== false;
    this.setupKeyboardShortcuts();
    
    // Bind methods
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleMouseMove = this.handleMouseMove.bind(this);
    this.handleMouseUp = this.handleMouseUp.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
  }

  // Layout presets
  static LAYOUT_PRESETS = {
    compact: { width: 400, height: 500 },
    standard: { width: 500, height: 600 },
    wide: { width: 700, height: 600 },
    tall: { width: 500, height: 800 },
    fullscreen: { width: '100%', height: '100%' }
  };

  // Position presets
  static POSITIONS = {
    'top-left': { top: 20, left: 20 },
    'top-right': { top: 20, right: 20 },
    'bottom-left': { bottom: 20, left: 20 },
    'bottom-right': { bottom: 20, right: 20 },
    'left-sidebar': { top: 0, left: 0, bottom: 0, width: 400 },
    'right-sidebar': { top: 0, right: 0, bottom: 0, width: 400 },
    'floating': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  };

  initialize(element) {
    this.element = element;
    if (!this.element) return;

    // Apply saved preferences
    this.applyPreferences();
    
    // Create resize handles
    this.createResizeHandles();
    
    // Set up drag handle
    this.setupDragHandle();
    
    // Add event listeners
    this.addEventListeners();
    
    // Set initial ARIA attributes
    this.updateAriaAttributes();
  }

  createResizeHandles() {
    const handles = [
      { class: 'resize-handle-n', cursor: 'ns-resize', direction: 'n' },
      { class: 'resize-handle-ne', cursor: 'nesw-resize', direction: 'ne' },
      { class: 'resize-handle-e', cursor: 'ew-resize', direction: 'e' },
      { class: 'resize-handle-se', cursor: 'nwse-resize', direction: 'se' },
      { class: 'resize-handle-s', cursor: 'ns-resize', direction: 's' },
      { class: 'resize-handle-sw', cursor: 'nesw-resize', direction: 'sw' },
      { class: 'resize-handle-w', cursor: 'ew-resize', direction: 'w' },
      { class: 'resize-handle-nw', cursor: 'nwse-resize', direction: 'nw' }
    ];

    handles.forEach(handle => {
      const handleElement = document.createElement('div');
      handleElement.className = `resize-handle ${handle.class}`;
      handleElement.style.cursor = handle.cursor;
      handleElement.dataset.direction = handle.direction;
      handleElement.setAttribute('role', 'separator');
      handleElement.setAttribute('aria-label', `Resize ${handle.direction}`);
      handleElement.setAttribute('tabindex', '0');
      
      // Add visual indicator on hover
      handleElement.addEventListener('mouseenter', () => {
        handleElement.classList.add('active');
      });
      
      handleElement.addEventListener('mouseleave', () => {
        if (!this.isResizing) {
          handleElement.classList.remove('active');
        }
      });
      
      this.element.appendChild(handleElement);
    });
  }

  setupDragHandle() {
    // Find or create drag handle
    let dragHandle = this.element.querySelector('.drag-handle');
    if (!dragHandle) {
      const header = this.element.querySelector('.chat-header');
      if (header) {
        header.classList.add('drag-handle');
        dragHandle = header;
      }
    }
    
    if (dragHandle) {
      dragHandle.style.cursor = 'move';
      dragHandle.setAttribute('role', 'button');
      dragHandle.setAttribute('aria-label', 'Drag to move chat window');
      dragHandle.setAttribute('tabindex', '0');
    }
  }

  addEventListeners() {
    // Resize handles
    this.element.querySelectorAll('.resize-handle').forEach(handle => {
      handle.addEventListener('mousedown', this.handleMouseDown);
      handle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.startKeyboardResize(handle.dataset.direction);
        }
      });
    });
    
    // Drag handle
    const dragHandle = this.element.querySelector('.drag-handle');
    if (dragHandle) {
      dragHandle.addEventListener('mousedown', (e) => {
        if (e.target.closest('button') || e.target.closest('input')) return;
        this.startDragging(e);
      });
      
      dragHandle.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.startKeyboardDrag();
        }
      });
    }
    
    // Global mouse events
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('mouseup', this.handleMouseUp);
  }

  handleMouseDown(e) {
    e.preventDefault();
    this.isResizing = true;
    this.currentHandle = e.target.dataset.direction;
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    const rect = this.element.getBoundingClientRect();
    this.startWidth = rect.width;
    this.startHeight = rect.height;
    this.startLeft = rect.left;
    this.startTop = rect.top;
    
    document.body.style.cursor = e.target.style.cursor;
    this.element.classList.add('resizing');
    
    this.announceAction(`Resizing from ${this.currentHandle}`);
  }

  startDragging(e) {
    e.preventDefault();
    this.isDragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    
    const rect = this.element.getBoundingClientRect();
    this.startLeft = rect.left;
    this.startTop = rect.top;
    
    document.body.style.cursor = 'move';
    this.element.classList.add('dragging');
    
    this.announceAction('Moving chat window');
  }

  handleMouseMove(e) {
    if (this.isResizing) {
      this.resize(e);
    } else if (this.isDragging) {
      this.drag(e);
    }
  }

  handleMouseUp() {
    if (this.isResizing || this.isDragging) {
      this.isResizing = false;
      this.isDragging = false;
      this.currentHandle = null;
      
      document.body.style.cursor = '';
      this.element.classList.remove('resizing', 'dragging');
      
      // Remove active state from handles
      this.element.querySelectorAll('.resize-handle.active').forEach(handle => {
        handle.classList.remove('active');
      });
      
      // Save preferences
      this.savePreferences();
      
      // Announce completion
      this.announceAction('Resize and position saved');
    }
  }

  resize(e) {
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    let newLeft = this.startLeft;
    let newTop = this.startTop;
    
    // Calculate new dimensions based on handle
    if (this.currentHandle.includes('e')) {
      newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.startWidth + deltaX));
    }
    if (this.currentHandle.includes('w')) {
      newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, this.startWidth - deltaX));
      newLeft = this.startLeft + (this.startWidth - newWidth);
    }
    if (this.currentHandle.includes('s')) {
      newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.startHeight + deltaY));
    }
    if (this.currentHandle.includes('n')) {
      newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, this.startHeight - deltaY));
      newTop = this.startTop + (this.startHeight - newHeight);
    }
    
    // Apply dimensions
    this.element.style.width = `${newWidth}px`;
    this.element.style.height = `${newHeight}px`;
    this.element.style.left = `${newLeft}px`;
    this.element.style.top = `${newTop}px`;
    
    // Clear any conflicting position styles
    this.element.style.right = '';
    this.element.style.bottom = '';
    this.element.style.transform = '';
    
    // Update layout mode
    this.layoutMode = 'custom';
    
    // Trigger resize callback
    this.onResize({
      width: newWidth,
      height: newHeight,
      left: newLeft,
      top: newTop
    });
  }

  drag(e) {
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    let newLeft = this.startLeft + deltaX;
    let newTop = this.startTop + deltaY;
    
    // Apply edge snapping
    if (this.magneticEdges) {
      const snapResult = this.checkEdgeSnapping(newLeft, newTop);
      newLeft = snapResult.left;
      newTop = snapResult.top;
      
      // Show visual feedback for snapping
      if (snapResult.snapped) {
        this.element.classList.add('snapping');
      } else {
        this.element.classList.remove('snapping');
      }
    }
    
    // Ensure window stays within viewport
    const rect = this.element.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width;
    const maxTop = window.innerHeight - rect.height;
    
    newLeft = Math.max(0, Math.min(maxLeft, newLeft));
    newTop = Math.max(0, Math.min(maxTop, newTop));
    
    // Apply position
    this.element.style.left = `${newLeft}px`;
    this.element.style.top = `${newTop}px`;
    
    // Clear any conflicting position styles
    this.element.style.right = '';
    this.element.style.bottom = '';
    this.element.style.transform = '';
    
    // Update layout mode
    this.layoutMode = 'floating';
    
    // Trigger position change callback
    this.onPositionChange({
      left: newLeft,
      top: newTop
    });
  }

  checkEdgeSnapping(left, top) {
    const rect = this.element.getBoundingClientRect();
    const threshold = this.snapThreshold;
    let snapped = false;
    
    // Check left edge
    if (left < threshold) {
      left = 0;
      snapped = true;
    }
    
    // Check right edge
    const rightEdge = left + rect.width;
    if (rightEdge > window.innerWidth - threshold) {
      left = window.innerWidth - rect.width;
      snapped = true;
    }
    
    // Check top edge
    if (top < threshold) {
      top = 0;
      snapped = true;
    }
    
    // Check bottom edge
    const bottomEdge = top + rect.height;
    if (bottomEdge > window.innerHeight - threshold) {
      top = window.innerHeight - rect.height;
      snapped = true;
    }
    
    return { left, top, snapped };
  }

  // Layout methods
  setLayout(preset) {
    const layout = ResizeManager.LAYOUT_PRESETS[preset];
    if (!layout) return;
    
    if (preset === 'fullscreen') {
      this.setFullscreen();
      return;
    }
    
    this.element.style.width = `${layout.width}px`;
    this.element.style.height = `${layout.height}px`;
    
    // Center the window
    this.centerWindow();
    
    this.layoutMode = preset;
    this.savePreferences();
    
    this.onResize({
      width: layout.width,
      height: layout.height,
      preset
    });
    
    this.announceAction(`Layout changed to ${preset}`);
  }

  setPosition(position) {
    const pos = ResizeManager.POSITIONS[position];
    if (!pos) return;
    
    // Clear all position styles
    this.element.style.top = '';
    this.element.style.right = '';
    this.element.style.bottom = '';
    this.element.style.left = '';
    this.element.style.transform = '';
    
    // Apply new position
    Object.assign(this.element.style, pos);
    
    // Handle sidebar modes
    if (position.includes('sidebar')) {
      this.element.style.height = '100vh';
      this.layoutMode = 'sidebar';
    } else {
      this.layoutMode = 'corner';
    }
    
    this.position = position;
    this.savePreferences();
    
    this.onPositionChange({ position });
    this.announceAction(`Position changed to ${position.replace('-', ' ')}`);
  }

  setFullscreen() {
    this.element.style.position = 'fixed';
    this.element.style.top = '0';
    this.element.style.left = '0';
    this.element.style.right = '0';
    this.element.style.bottom = '0';
    this.element.style.width = '100%';
    this.element.style.height = '100%';
    this.element.style.transform = '';
    
    this.layoutMode = 'fullscreen';
    this.savePreferences();
    
    this.onResize({
      width: window.innerWidth,
      height: window.innerHeight,
      preset: 'fullscreen'
    });
    
    this.announceAction('Entered fullscreen mode');
  }

  centerWindow() {
    const rect = this.element.getBoundingClientRect();
    const left = (window.innerWidth - rect.width) / 2;
    const top = (window.innerHeight - rect.height) / 2;
    
    this.element.style.left = `${left}px`;
    this.element.style.top = `${top}px`;
    this.element.style.right = '';
    this.element.style.bottom = '';
    this.element.style.transform = '';
    
    this.layoutMode = 'floating';
  }

  // Keyboard navigation
  setupKeyboardShortcuts() {
    if (!this.keyboardEnabled) return;
    
    document.addEventListener('keydown', this.handleKeyDown);
  }

  handleKeyDown(e) {
    // Check if chat container has focus
    if (!this.element || !this.element.contains(document.activeElement)) return;
    
    const step = e.shiftKey ? 50 : 10;
    let handled = false;
    
    // Resize shortcuts (Alt + Arrow keys)
    if (e.altKey && !e.ctrlKey) {
      switch (e.key) {
        case 'ArrowUp':
          this.adjustSize(0, -step);
          handled = true;
          break;
        case 'ArrowDown':
          this.adjustSize(0, step);
          handled = true;
          break;
        case 'ArrowLeft':
          this.adjustSize(-step, 0);
          handled = true;
          break;
        case 'ArrowRight':
          this.adjustSize(step, 0);
          handled = true;
          break;
      }
    }
    
    // Move shortcuts (Ctrl + Arrow keys)
    if (e.ctrlKey && !e.altKey) {
      switch (e.key) {
        case 'ArrowUp':
          this.adjustPosition(0, -step);
          handled = true;
          break;
        case 'ArrowDown':
          this.adjustPosition(0, step);
          handled = true;
          break;
        case 'ArrowLeft':
          this.adjustPosition(-step, 0);
          handled = true;
          break;
        case 'ArrowRight':
          this.adjustPosition(step, 0);
          handled = true;
          break;
      }
    }
    
    // Layout shortcuts (Alt + Number keys)
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      switch (e.key) {
        case '1':
          this.setLayout('compact');
          handled = true;
          break;
        case '2':
          this.setLayout('standard');
          handled = true;
          break;
        case '3':
          this.setLayout('wide');
          handled = true;
          break;
        case '4':
          this.setLayout('tall');
          handled = true;
          break;
        case '0':
          this.setLayout('fullscreen');
          handled = true;
          break;
      }
    }
    
    if (handled) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  adjustSize(deltaWidth, deltaHeight) {
    const rect = this.element.getBoundingClientRect();
    const newWidth = Math.max(this.minWidth, Math.min(this.maxWidth, rect.width + deltaWidth));
    const newHeight = Math.max(this.minHeight, Math.min(this.maxHeight, rect.height + deltaHeight));
    
    this.element.style.width = `${newWidth}px`;
    this.element.style.height = `${newHeight}px`;
    
    this.onResize({
      width: newWidth,
      height: newHeight
    });
    
    this.savePreferences();
    this.announceAction(`Resized to ${newWidth} by ${newHeight} pixels`);
  }

  adjustPosition(deltaX, deltaY) {
    const rect = this.element.getBoundingClientRect();
    const newLeft = Math.max(0, Math.min(window.innerWidth - rect.width, rect.left + deltaX));
    const newTop = Math.max(0, Math.min(window.innerHeight - rect.height, rect.top + deltaY));
    
    this.element.style.left = `${newLeft}px`;
    this.element.style.top = `${newTop}px`;
    this.element.style.right = '';
    this.element.style.bottom = '';
    this.element.style.transform = '';
    
    this.onPositionChange({
      left: newLeft,
      top: newTop
    });
    
    this.savePreferences();
    this.announceAction(`Moved to ${newLeft}, ${newTop}`);
  }

  startKeyboardResize(direction) {
    // Visual feedback
    const handle = this.element.querySelector(`.resize-handle-${direction}`);
    if (handle) {
      handle.classList.add('keyboard-active');
      handle.focus();
    }
    
    this.announceAction(`Keyboard resize mode: ${direction}. Use arrow keys to resize, Enter to confirm`);
  }

  startKeyboardDrag() {
    this.element.classList.add('keyboard-dragging');
    this.announceAction('Keyboard move mode. Use arrow keys to move, Enter to confirm');
  }

  // Preferences
  savePreferences() {
    const rect = this.element.getBoundingClientRect();
    
    this.preferences = {
      width: rect.width,
      height: rect.height,
      left: rect.left,
      top: rect.top,
      layoutMode: this.layoutMode,
      position: this.position
    };
    
    localStorage.setItem(this.preferencesKey, JSON.stringify(this.preferences));
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem(this.preferencesKey);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error('Failed to load resize preferences:', e);
      return {};
    }
  }

  applyPreferences() {
    if (!this.preferences || Object.keys(this.preferences).length === 0) return;
    
    // Apply saved dimensions
    if (this.preferences.width && this.preferences.height) {
      this.element.style.width = `${this.preferences.width}px`;
      this.element.style.height = `${this.preferences.height}px`;
    }
    
    // Apply saved position
    if (this.preferences.layoutMode === 'floating' || this.preferences.layoutMode === 'custom') {
      if (this.preferences.left !== undefined && this.preferences.top !== undefined) {
        this.element.style.left = `${this.preferences.left}px`;
        this.element.style.top = `${this.preferences.top}px`;
      }
    } else if (this.preferences.position) {
      this.setPosition(this.preferences.position);
    }
  }

  // Accessibility
  updateAriaAttributes() {
    if (!this.element) return;
    
    const rect = this.element.getBoundingClientRect();
    
    this.element.setAttribute('aria-label', 
      `Chat window, ${Math.round(rect.width)} by ${Math.round(rect.height)} pixels`);
    
    this.element.setAttribute('role', 'dialog');
    this.element.setAttribute('aria-modal', 'false');
  }

  announceAction(message) {
    // Create or update live region for announcements
    let liveRegion = document.getElementById('resize-announcer');
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'resize-announcer';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.position = 'absolute';
      liveRegion.style.left = '-10000px';
      liveRegion.style.width = '1px';
      liveRegion.style.height = '1px';
      liveRegion.style.overflow = 'hidden';
      document.body.appendChild(liveRegion);
    }
    
    liveRegion.textContent = message;
    
    // Clear after announcement
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }

  // Cleanup
  destroy() {
    // Remove event listeners
    if (this.element) {
      this.element.querySelectorAll('.resize-handle').forEach(handle => {
        handle.removeEventListener('mousedown', this.handleMouseDown);
      });
      
      const dragHandle = this.element.querySelector('.drag-handle');
      if (dragHandle) {
        dragHandle.removeEventListener('mousedown', this.startDragging);
      }
    }
    
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener('mouseup', this.handleMouseUp);
    document.removeEventListener('keydown', this.handleKeyDown);
    
    // Remove live region
    const liveRegion = document.getElementById('resize-announcer');
    if (liveRegion) {
      liveRegion.remove();
    }
  }
}

// CSS styles for resize handles and visual feedback
const resizeStyles = `
  .resize-handle {
    position: absolute;
    z-index: 10;
    background: transparent;
    transition: background-color 0.2s ease;
  }
  
  .resize-handle:hover,
  .resize-handle.active,
  .resize-handle.keyboard-active {
    background-color: rgba(var(--primary-rgb, 59, 130, 246), 0.3);
  }
  
  .resize-handle:focus {
    outline: 2px solid var(--primary-color, #3b82f6);
    outline-offset: -2px;
  }
  
  /* Edge handles */
  .resize-handle-n { top: 0; left: 10px; right: 10px; height: 5px; cursor: ns-resize; }
  .resize-handle-e { top: 10px; right: 0; bottom: 10px; width: 5px; cursor: ew-resize; }
  .resize-handle-s { bottom: 0; left: 10px; right: 10px; height: 5px; cursor: ns-resize; }
  .resize-handle-w { top: 10px; left: 0; bottom: 10px; width: 5px; cursor: ew-resize; }
  
  /* Corner handles */
  .resize-handle-ne { top: 0; right: 0; width: 10px; height: 10px; cursor: nesw-resize; }
  .resize-handle-se { bottom: 0; right: 0; width: 10px; height: 10px; cursor: nwse-resize; }
  .resize-handle-sw { bottom: 0; left: 0; width: 10px; height: 10px; cursor: nesw-resize; }
  .resize-handle-nw { top: 0; left: 0; width: 10px; height: 10px; cursor: nwse-resize; }
  
  /* Visual feedback */
  .resizing {
    opacity: 0.9;
    transition: none !important;
  }
  
  .dragging {
    opacity: 0.9;
    transition: none !important;
  }
  
  .keyboard-dragging {
    box-shadow: 0 0 0 3px var(--primary-color, #3b82f6);
  }
  
  .snapping {
    box-shadow: 0 0 0 2px var(--success-color, #10b981);
  }
  
  /* Drag handle */
  .drag-handle {
    cursor: move;
    user-select: none;
  }
  
  .drag-handle:active {
    cursor: grabbing;
  }
`;

// Inject styles
if (typeof document !== 'undefined' && !document.getElementById('resize-manager-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'resize-manager-styles';
  styleSheet.textContent = resizeStyles;
  document.head.appendChild(styleSheet);
}

export default ResizeManager;