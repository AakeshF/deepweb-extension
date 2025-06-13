/**
 * AnimationSettings Component
 * Provides UI controls for animation preferences
 */

import BaseComponent from './BaseComponent.js';
import { animationManager } from '../utils/AnimationManager.js';

export default class AnimationSettings extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    this.state = {
      enabled: animationManager.animationsEnabled,
      speed: animationManager.animationSpeed,
      reducedMotion: animationManager.reducedMotion,
      performanceReport: null
    };
    
    // Animation preview elements
    this.previewElements = new Map();
    
    // Bind callbacks
    this.onClose = options.onClose || (() => {});
  }
  
  async render() {
    // Create main container
    this.element = this.createElement('div', {
      className: 'deepweb-animation-settings',
      style: {
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '400px',
        maxWidth: '90vw',
        backgroundColor: 'var(--theme-background-paper)',
        borderRadius: '8px',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        zIndex: '2147483647',
        display: 'none',
        flexDirection: 'column',
        maxHeight: '80vh',
        overflow: 'hidden'
      }
    });
    
    // Create header
    const header = this.createHeader();
    this.element.appendChild(header);
    
    // Create content
    const content = this.createContent();
    this.element.appendChild(content);
    
    // Create footer
    const footer = this.createFooter();
    this.element.appendChild(footer);
    
    // Apply initial animation
    this.element.classList.add('deepweb-modal-enter');
  }
  
  createHeader() {
    const header = this.createElement('div', {
      style: {
        padding: '16px 20px',
        borderBottom: '1px solid var(--theme-divider)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }
    });
    
    const title = this.createElement('h3', {
      textContent: 'Animation Settings',
      style: {
        margin: '0',
        fontSize: '18px',
        fontWeight: '600',
        color: 'var(--theme-text-primary)'
      }
    });
    
    const closeBtn = this.createElement('button', {
      className: 'deepweb-control-btn',
      innerHTML: '✕',
      onclick: () => this.close()
    });
    
    header.appendChild(title);
    header.appendChild(closeBtn);
    
    return header;
  }
  
  createContent() {
    const content = this.createElement('div', {
      style: {
        padding: '20px',
        overflowY: 'auto',
        flex: '1'
      }
    });
    
    // Reduced motion warning
    if (this.state.reducedMotion) {
      const warning = this.createElement('div', {
        className: 'deepweb-reduced-motion-warning',
        style: {
          padding: '12px 16px',
          backgroundColor: 'var(--theme-warning)',
          color: 'white',
          borderRadius: '4px',
          marginBottom: '20px',
          fontSize: '14px'
        },
        innerHTML: '⚠️ Reduced motion is enabled in your system preferences. Animations will be minimized.'
      });
      content.appendChild(warning);
    }
    
    // Enable/Disable animations
    const enableSection = this.createEnableSection();
    content.appendChild(enableSection);
    
    // Animation speed
    const speedSection = this.createSpeedSection();
    content.appendChild(speedSection);
    
    // Preview section
    const previewSection = this.createPreviewSection();
    content.appendChild(previewSection);
    
    // Performance section
    const performanceSection = this.createPerformanceSection();
    content.appendChild(performanceSection);
    
    return content;
  }
  
  createEnableSection() {
    const section = this.createElement('div', {
      className: 'deepweb-settings-section',
      style: {
        marginBottom: '24px'
      }
    });
    
    const label = this.createElement('label', {
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        cursor: 'pointer',
        fontSize: '16px'
      }
    });
    
    const checkbox = this.createElement('input', {
      type: 'checkbox',
      checked: this.state.enabled,
      style: {
        width: '20px',
        height: '20px',
        cursor: 'pointer'
      },
      onchange: (e) => this.handleEnableChange(e.target.checked)
    });
    
    const text = this.createElement('span', {
      textContent: 'Enable animations',
      style: {
        color: 'var(--theme-text-primary)'
      }
    });
    
    label.appendChild(checkbox);
    label.appendChild(text);
    section.appendChild(label);
    
    const description = this.createElement('p', {
      textContent: 'Turn off animations for better performance or if you prefer reduced motion.',
      style: {
        margin: '8px 0 0 32px',
        fontSize: '14px',
        color: 'var(--theme-text-secondary)'
      }
    });
    section.appendChild(description);
    
    return section;
  }
  
  createSpeedSection() {
    const section = this.createElement('div', {
      className: 'deepweb-settings-section',
      style: {
        marginBottom: '24px',
        opacity: this.state.enabled ? '1' : '0.5',
        pointerEvents: this.state.enabled ? 'auto' : 'none'
      }
    });
    
    const title = this.createElement('h4', {
      textContent: 'Animation Speed',
      style: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '500',
        color: 'var(--theme-text-primary)'
      }
    });
    section.appendChild(title);
    
    const speedOptions = ['slow', 'normal', 'fast'];
    const speedContainer = this.createElement('div', {
      style: {
        display: 'flex',
        gap: '8px'
      }
    });
    
    speedOptions.forEach(speed => {
      const button = this.createElement('button', {
        className: `deepweb-speed-btn ${this.state.speed === speed ? 'active' : ''}`,
        textContent: speed.charAt(0).toUpperCase() + speed.slice(1),
        style: {
          flex: '1',
          padding: '8px 16px',
          border: '1px solid var(--theme-divider)',
          borderRadius: '4px',
          backgroundColor: this.state.speed === speed ? 'var(--theme-primary)' : 'var(--theme-surface-default)',
          color: this.state.speed === speed ? 'white' : 'var(--theme-text-primary)',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          textTransform: 'capitalize'
        },
        onclick: () => this.handleSpeedChange(speed)
      });
      
      speedContainer.appendChild(button);
    });
    
    section.appendChild(speedContainer);
    
    // Store reference for updates
    this.speedSection = section;
    
    return section;
  }
  
  createPreviewSection() {
    const section = this.createElement('div', {
      className: 'deepweb-settings-section',
      style: {
        marginBottom: '24px'
      }
    });
    
    const title = this.createElement('h4', {
      textContent: 'Preview Animations',
      style: {
        margin: '0 0 16px 0',
        fontSize: '16px',
        fontWeight: '500',
        color: 'var(--theme-text-primary)'
      }
    });
    section.appendChild(title);
    
    // Preview grid
    const previewGrid = this.createElement('div', {
      style: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px'
      }
    });
    
    const animations = [
      { name: 'Fade In', preset: 'fadeIn' },
      { name: 'Slide In', preset: 'slideIn' },
      { name: 'Scale In', preset: 'scaleIn' },
      { name: 'Bounce In', preset: 'bounceIn' },
      { name: 'Shake', preset: 'shake' },
      { name: 'Pulse', preset: 'pulse' }
    ];
    
    animations.forEach(({ name, preset }) => {
      const previewItem = this.createPreviewItem(name, preset);
      previewGrid.appendChild(previewItem);
    });
    
    section.appendChild(previewGrid);
    
    return section;
  }
  
  createPreviewItem(name, preset) {
    const item = this.createElement('div', {
      style: {
        padding: '16px',
        border: '1px solid var(--theme-divider)',
        borderRadius: '4px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease'
      },
      onclick: () => this.playPreview(preset, item)
    });
    
    const icon = this.createElement('div', {
      style: {
        width: '40px',
        height: '40px',
        margin: '0 auto 8px',
        backgroundColor: 'var(--theme-primary)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '20px'
      },
      innerHTML: '▶'
    });
    
    const label = this.createElement('div', {
      textContent: name,
      style: {
        fontSize: '14px',
        color: 'var(--theme-text-secondary)'
      }
    });
    
    item.appendChild(icon);
    item.appendChild(label);
    
    // Store reference
    this.previewElements.set(preset, { item, icon });
    
    // Hover effect
    item.addEventListener('mouseenter', () => {
      if (this.state.enabled) {
        item.style.borderColor = 'var(--theme-primary)';
        item.style.transform = 'translateY(-2px)';
      }
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.borderColor = 'var(--theme-divider)';
      item.style.transform = 'translateY(0)';
    });
    
    return item;
  }
  
  createPerformanceSection() {
    const section = this.createElement('div', {
      className: 'deepweb-settings-section'
    });
    
    const title = this.createElement('h4', {
      textContent: 'Performance',
      style: {
        margin: '0 0 12px 0',
        fontSize: '16px',
        fontWeight: '500',
        color: 'var(--theme-text-primary)'
      }
    });
    section.appendChild(title);
    
    const performanceInfo = this.createElement('div', {
      style: {
        padding: '12px 16px',
        backgroundColor: 'var(--theme-background-elevated)',
        borderRadius: '4px',
        fontSize: '14px'
      }
    });
    
    const refreshBtn = this.createElement('button', {
      textContent: 'Check Performance',
      className: 'deepweb-control-btn',
      style: {
        marginTop: '12px',
        padding: '8px 16px',
        backgroundColor: 'var(--theme-primary)',
        color: 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer'
      },
      onclick: () => this.updatePerformanceReport()
    });
    
    section.appendChild(performanceInfo);
    section.appendChild(refreshBtn);
    
    // Store reference
    this.performanceInfo = performanceInfo;
    
    // Initial report
    this.updatePerformanceReport();
    
    return section;
  }
  
  createFooter() {
    const footer = this.createElement('div', {
      style: {
        padding: '16px 20px',
        borderTop: '1px solid var(--theme-divider)',
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '12px'
      }
    });
    
    const resetBtn = this.createElement('button', {
      textContent: 'Reset to Default',
      style: {
        padding: '8px 16px',
        border: '1px solid var(--theme-divider)',
        borderRadius: '4px',
        backgroundColor: 'var(--theme-surface-default)',
        color: 'var(--theme-text-primary)',
        cursor: 'pointer'
      },
      onclick: () => this.handleReset()
    });
    
    const closeBtn = this.createElement('button', {
      textContent: 'Done',
      style: {
        padding: '8px 20px',
        border: 'none',
        borderRadius: '4px',
        backgroundColor: 'var(--theme-primary)',
        color: 'white',
        cursor: 'pointer'
      },
      onclick: () => this.close()
    });
    
    footer.appendChild(resetBtn);
    footer.appendChild(closeBtn);
    
    return footer;
  }
  
  handleEnableChange(enabled) {
    this.setState({ enabled });
    animationManager.setEnabled(enabled);
    
    // Update speed section opacity
    if (this.speedSection) {
      this.speedSection.style.opacity = enabled ? '1' : '0.5';
      this.speedSection.style.pointerEvents = enabled ? 'auto' : 'none';
    }
    
    // Show feedback
    animationManager.showToast(
      enabled ? 'Animations enabled' : 'Animations disabled',
      'info',
      2000
    );
  }
  
  handleSpeedChange(speed) {
    this.setState({ speed });
    animationManager.setSpeed(speed);
    
    // Update button states
    const buttons = this.element.querySelectorAll('.deepweb-speed-btn');
    buttons.forEach(btn => {
      const isActive = btn.textContent.toLowerCase() === speed;
      btn.style.backgroundColor = isActive ? 'var(--theme-primary)' : 'var(--theme-surface-default)';
      btn.style.color = isActive ? 'white' : 'var(--theme-text-primary)';
    });
    
    // Show preview of new speed
    this.playPreview('pulse', this.previewElements.get('pulse').icon);
  }
  
  async playPreview(preset, element) {
    if (!this.state.enabled) return;
    
    const targetElement = element || this.previewElements.get(preset)?.icon;
    if (!targetElement) return;
    
    // Reset any ongoing animation
    targetElement.style.animation = 'none';
    targetElement.offsetHeight; // Force reflow
    
    // Play animation
    await animationManager.animate(targetElement, preset);
  }
  
  updatePerformanceReport() {
    const report = animationManager.getPerformanceReport();
    this.setState({ performanceReport: report });
    
    if (this.performanceInfo) {
      this.performanceInfo.innerHTML = `
        <div style="margin-bottom: 8px">
          <strong>Total Animations:</strong> ${report.totalAnimations}
        </div>
        <div style="margin-bottom: 8px">
          <strong>Frame Drops:</strong> ${report.frameDrops} (${report.dropRate})
        </div>
        <div style="color: ${parseFloat(report.dropRate) > 10 ? 'var(--theme-warning)' : 'var(--theme-success)'}">
          ${report.recommendation}
        </div>
      `;
    }
  }
  
  handleReset() {
    // Reset to defaults
    this.handleEnableChange(true);
    this.handleSpeedChange('normal');
    
    animationManager.showToast('Animation settings reset to default', 'success', 2000);
  }
  
  show() {
    this.element.style.display = 'flex';
    this.element.classList.remove('deepweb-modal-exit');
    this.element.classList.add('deepweb-modal-enter');
    
    // Listen for reduced motion changes
    window.addEventListener('deepweb-reduced-motion-change', this.handleReducedMotionChange);
  }
  
  close() {
    this.element.classList.remove('deepweb-modal-enter');
    this.element.classList.add('deepweb-modal-exit');
    
    setTimeout(() => {
      this.element.style.display = 'none';
      this.onClose();
    }, 200);
    
    // Remove listener
    window.removeEventListener('deepweb-reduced-motion-change', this.handleReducedMotionChange);
  }
  
  handleReducedMotionChange = (event) => {
    this.setState({ reducedMotion: event.detail.reducedMotion });
    // Re-render content to show/hide warning
    const content = this.element.querySelector('div:nth-child(2)');
    const newContent = this.createContent();
    content.replaceWith(newContent);
  }
  
  setupEventListeners() {
    // ESC key to close
    this.delegate('keydown', (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    }, document);
    
    // Click outside to close
    this.element.addEventListener('click', (e) => {
      if (e.target === this.element) {
        this.close();
      }
    });
  }
}