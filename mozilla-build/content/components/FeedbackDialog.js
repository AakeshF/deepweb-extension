/**
 * Feedback Dialog Component
 * User interface for collecting feedback
 */

import { feedbackManager, FEEDBACK_TYPES } from '../../src/feedback/FeedbackManager.js';
import DOMUtils from '../utils/dom-utils.js';

export class FeedbackDialog {
  constructor() {
    this.container = null;
    this.isOpen = false;
    this.currentType = FEEDBACK_TYPES.GENERAL_FEEDBACK;
  }

  /**
   * Open feedback dialog
   */
  async open(type = FEEDBACK_TYPES.GENERAL_FEEDBACK) {
    if (this.isOpen) return;
    
    this.currentType = type;
    this.render();
    this.show();
  }

  /**
   * Render dialog
   */
  render() {
    // Create container if not exists
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'deepweb-feedback-dialog';
      document.body.appendChild(this.container);
    }

    const typeLabels = {
      [FEEDBACK_TYPES.BUG_REPORT]: '🐛 Report a Bug',
      [FEEDBACK_TYPES.FEATURE_REQUEST]: '✨ Request a Feature',
      [FEEDBACK_TYPES.GENERAL_FEEDBACK]: '💬 General Feedback',
      [FEEDBACK_TYPES.RATING]: '⭐ Rate DeepWeb',
      [FEEDBACK_TYPES.PERFORMANCE_ISSUE]: '🚀 Performance Issue',
      [FEEDBACK_TYPES.UI_FEEDBACK]: '🎨 UI/UX Feedback',
      [FEEDBACK_TYPES.MODEL_FEEDBACK]: '🤖 AI Model Feedback',
      [FEEDBACK_TYPES.TEMPLATE_FEEDBACK]: '📝 Template Feedback'
    };

    // Build DOM structure programmatically to avoid innerHTML warnings
    const overlay = document.createElement('div');
    overlay.className = 'feedback-overlay';
    
    const modal = document.createElement('div');
    modal.className = 'feedback-modal';
    
    // Header
    const header = document.createElement('div');
    header.className = 'feedback-header';
    
    const h2 = document.createElement('h2');
    h2.textContent = typeLabels[this.currentType];
    
    const closeBtn = document.createElement('button');
    closeBtn.className = 'feedback-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';
    
    header.appendChild(h2);
    header.appendChild(closeBtn);
    
    // Content
    const content = document.createElement('div');
    content.className = 'feedback-content';
    
    // Type selector
    const typeSelector = document.createElement('div');
    typeSelector.className = 'feedback-type-selector';
    
    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Feedback Type:';
    
    const select = document.createElement('select');
    select.id = 'feedback-type';
    
    Object.entries(typeLabels).forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      if (value === this.currentType) option.selected = true;
      select.appendChild(option);
    });
    
    typeSelector.appendChild(typeLabel);
    typeSelector.appendChild(select);
    content.appendChild(typeSelector);
    
    // Type-specific fields
    const specificFields = this.createTypeSpecificFieldsDOM();
    if (specificFields) content.appendChild(specificFields);
    
    // Message field
    const messageField = document.createElement('div');
    messageField.className = 'feedback-field';
    
    const messageLabel = document.createElement('label');
    messageLabel.setAttribute('for', 'feedback-message');
    messageLabel.textContent = 'Your Feedback:';
    
    const textarea = document.createElement('textarea');
    textarea.id = 'feedback-message';
    textarea.placeholder = 'Please share your thoughts...';
    textarea.rows = 6;
    textarea.maxLength = 1000;
    
    const charCount = document.createElement('div');
    charCount.className = 'character-count';
    charCount.textContent = '0 / 1000';
    
    messageField.appendChild(messageLabel);
    messageField.appendChild(textarea);
    messageField.appendChild(charCount);
    content.appendChild(messageField);
    
    // Contact checkbox
    const contactField = document.createElement('div');
    contactField.className = 'feedback-field';
    
    const contactLabel = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = 'feedback-contact';
    
    contactLabel.appendChild(checkbox);
    contactLabel.appendChild(document.createTextNode(' I\'m willing to be contacted about this feedback'));
    contactField.appendChild(contactLabel);
    content.appendChild(contactField);
    
    // Privacy notice
    const privacy = document.createElement('div');
    privacy.className = 'feedback-privacy';
    
    const p1 = document.createElement('p');
    p1.textContent = '📊 Your feedback helps us improve DeepWeb!';
    
    const p2 = document.createElement('p');
    p2.textContent = '🔒 We respect your privacy. No personal data is collected unless you opt-in.';
    
    privacy.appendChild(p1);
    privacy.appendChild(p2);
    content.appendChild(privacy);
    
    // Footer
    const footer = document.createElement('div');
    footer.className = 'feedback-footer';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'feedback-cancel';
    cancelBtn.textContent = 'Cancel';
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'feedback-submit';
    submitBtn.textContent = 'Send Feedback';
    
    footer.appendChild(cancelBtn);
    footer.appendChild(submitBtn);
    
    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    
    // Clear and append
    this.container.innerHTML = '';
    this.container.appendChild(overlay);

    this.attachEventListeners();
    this.addStyles();
  }

  /**
   * Create type-specific fields DOM
   */
  createTypeSpecificFieldsDOM() {
    const container = document.createElement('div');
    
    switch (this.currentType) {
      case FEEDBACK_TYPES.BUG_REPORT:
        // Steps field
        const stepsField = document.createElement('div');
        stepsField.className = 'feedback-field';
        
        const stepsLabel = document.createElement('label');
        stepsLabel.setAttribute('for', 'bug-steps');
        stepsLabel.textContent = 'Steps to Reproduce:';
        
        const stepsTextarea = document.createElement('textarea');
        stepsTextarea.id = 'bug-steps';
        stepsTextarea.placeholder = '1. Open a webpage\n2. Click...\n3. ...';
        stepsTextarea.rows = 4;
        
        stepsField.appendChild(stepsLabel);
        stepsField.appendChild(stepsTextarea);
        
        // Expected field
        const expectedField = document.createElement('div');
        expectedField.className = 'feedback-field';
        
        const expectedLabel = document.createElement('label');
        expectedLabel.setAttribute('for', 'bug-expected');
        expectedLabel.textContent = 'Expected Behavior:';
        
        const expectedInput = document.createElement('input');
        expectedInput.type = 'text';
        expectedInput.id = 'bug-expected';
        expectedInput.placeholder = 'What should happen?';
        
        expectedField.appendChild(expectedLabel);
        expectedField.appendChild(expectedInput);
        
        // Actual field
        const actualField = document.createElement('div');
        actualField.className = 'feedback-field';
        
        const actualLabel = document.createElement('label');
        actualLabel.setAttribute('for', 'bug-actual');
        actualLabel.textContent = 'Actual Behavior:';
        
        const actualInput = document.createElement('input');
        actualInput.type = 'text';
        actualInput.id = 'bug-actual';
        actualInput.placeholder = 'What actually happened?';
        
        actualField.appendChild(actualLabel);
        actualField.appendChild(actualInput);
        
        container.appendChild(stepsField);
        container.appendChild(expectedField);
        container.appendChild(actualField);
        break;
        
      case FEEDBACK_TYPES.RATING:
        const ratingField = document.createElement('div');
        ratingField.className = 'feedback-field rating-field';
        
        const ratingLabel = document.createElement('label');
        ratingLabel.textContent = 'How would you rate DeepWeb?';
        
        const starRating = document.createElement('div');
        starRating.className = 'star-rating';
        
        [1,2,3,4,5].forEach(i => {
          const star = document.createElement('span');
          star.className = 'star';
          star.setAttribute('data-rating', i);
          star.textContent = '☆';
          starRating.appendChild(star);
        });
        
        ratingField.appendChild(ratingLabel);
        ratingField.appendChild(starRating);
        container.appendChild(ratingField);
        break;
        
      case FEEDBACK_TYPES.FEATURE_REQUEST:
        // Title field
        const titleField = document.createElement('div');
        titleField.className = 'feedback-field';
        
        const titleLabel = document.createElement('label');
        titleLabel.setAttribute('for', 'feature-title');
        titleLabel.textContent = 'Feature Title:';
        
        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.id = 'feature-title';
        titleInput.placeholder = 'Brief title for your feature idea';
        
        titleField.appendChild(titleLabel);
        titleField.appendChild(titleInput);
        
        // Use case field
        const useCaseField = document.createElement('div');
        useCaseField.className = 'feedback-field';
        
        const useCaseLabel = document.createElement('label');
        useCaseLabel.setAttribute('for', 'feature-use-case');
        useCaseLabel.textContent = 'Use Case:';
        
        const useCaseTextarea = document.createElement('textarea');
        useCaseTextarea.id = 'feature-use-case';
        useCaseTextarea.placeholder = 'How would you use this feature?';
        useCaseTextarea.rows = 3;
        
        useCaseField.appendChild(useCaseLabel);
        useCaseField.appendChild(useCaseTextarea);
        
        container.appendChild(titleField);
        container.appendChild(useCaseField);
        break;
        
      case FEEDBACK_TYPES.PERFORMANCE_ISSUE:
        // Page URL field
        const pageField = document.createElement('div');
        pageField.className = 'feedback-field';
        
        const pageLabel = document.createElement('label');
        pageLabel.setAttribute('for', 'perf-page');
        pageLabel.textContent = 'Page URL (optional):';
        
        const pageInput = document.createElement('input');
        pageInput.type = 'url';
        pageInput.id = 'perf-page';
        pageInput.placeholder = 'https://example.com';
        
        pageField.appendChild(pageLabel);
        pageField.appendChild(pageInput);
        
        // Issue type field
        const issueField = document.createElement('div');
        issueField.className = 'feedback-field';
        
        const issueLabel = document.createElement('label');
        issueLabel.setAttribute('for', 'perf-issue');
        issueLabel.textContent = 'Performance Issue:';
        
        const issueSelect = document.createElement('select');
        issueSelect.id = 'perf-issue';
        
        const issues = ['Slow response time', 'High memory usage', 'UI freezing', 'Other'];
        issues.forEach(issue => {
          const option = document.createElement('option');
          option.value = issue.toLowerCase().replace(/ /g, '-');
          option.textContent = issue;
          issueSelect.appendChild(option);
        });
        
        issueField.appendChild(issueLabel);
        issueField.appendChild(issueSelect);
        
        container.appendChild(pageField);
        container.appendChild(issueField);
        break;
        
      default:
        return null;
    }
    
    return container;
  }

  /**
   * Render type-specific fields
   */
  renderTypeSpecificFields() {
    switch (this.currentType) {
      case FEEDBACK_TYPES.BUG_REPORT:
        return `
          <div class="feedback-field">
            <label for="bug-steps">Steps to Reproduce:</label>
            <textarea id="bug-steps" placeholder="1. Open a webpage&#10;2. Click...&#10;3. ..." rows="4"></textarea>
          </div>
          <div class="feedback-field">
            <label for="bug-expected">Expected Behavior:</label>
            <input type="text" id="bug-expected" placeholder="What should happen?" />
          </div>
          <div class="feedback-field">
            <label for="bug-actual">Actual Behavior:</label>
            <input type="text" id="bug-actual" placeholder="What actually happened?" />
          </div>
        `;
        
      case FEEDBACK_TYPES.RATING:
        return `
          <div class="feedback-field rating-field">
            <label>How would you rate DeepWeb?</label>
            <div class="star-rating">
              ${[1,2,3,4,5].map(i => `
                <span class="star" data-rating="${i}">☆</span>
              `).join('')}
            </div>
          </div>
        `;
        
      case FEEDBACK_TYPES.FEATURE_REQUEST:
        return `
          <div class="feedback-field">
            <label for="feature-title">Feature Title:</label>
            <input type="text" id="feature-title" placeholder="Brief title for your feature idea" />
          </div>
          <div class="feedback-field">
            <label for="feature-use-case">Use Case:</label>
            <textarea id="feature-use-case" placeholder="How would you use this feature?" rows="3"></textarea>
          </div>
        `;
        
      case FEEDBACK_TYPES.PERFORMANCE_ISSUE:
        return `
          <div class="feedback-field">
            <label for="perf-page">Page URL (optional):</label>
            <input type="text" id="perf-page" placeholder="Where did you experience issues?" />
          </div>
          <div class="feedback-field">
            <label for="perf-issue">Performance Issue:</label>
            <select id="perf-issue">
              <option value="">Select an issue...</option>
              <option value="slow-response">Slow AI responses</option>
              <option value="high-memory">High memory usage</option>
              <option value="ui-lag">UI lag or freezing</option>
              <option value="page-slowdown">Page becomes slow</option>
              <option value="other">Other</option>
            </select>
          </div>
        `;
        
      default:
        return '';
    }
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    // Close button
    this.container.querySelector('.feedback-close').addEventListener('click', () => this.close());
    this.container.querySelector('.feedback-cancel').addEventListener('click', () => this.close());
    
    // Overlay click
    this.container.querySelector('.feedback-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('feedback-overlay')) {
        this.close();
      }
    });
    
    // Type selector
    this.container.querySelector('#feedback-type').addEventListener('change', (e) => {
      this.currentType = e.target.value;
      this.render();
    });
    
    // Character count
    const textarea = this.container.querySelector('#feedback-message');
    const charCount = this.container.querySelector('.character-count');
    textarea.addEventListener('input', () => {
      charCount.textContent = `${textarea.value.length} / 1000`;
    });
    
    // Star rating
    if (this.currentType === FEEDBACK_TYPES.RATING) {
      const stars = this.container.querySelectorAll('.star');
      let selectedRating = 0;
      
      stars.forEach((star, index) => {
        star.addEventListener('click', () => {
          selectedRating = index + 1;
          stars.forEach((s, i) => {
            s.textContent = i < selectedRating ? '★' : '☆';
            s.classList.toggle('selected', i < selectedRating);
          });
        });
        
        star.addEventListener('mouseenter', () => {
          stars.forEach((s, i) => {
            s.textContent = i <= index ? '★' : '☆';
          });
        });
      });
      
      this.container.querySelector('.star-rating').addEventListener('mouseleave', () => {
        stars.forEach((s, i) => {
          s.textContent = i < selectedRating ? '★' : '☆';
        });
      });
    }
    
    // Submit button
    this.container.querySelector('.feedback-submit').addEventListener('click', () => this.submit());
    
    // ESC key
    document.addEventListener('keydown', this.handleEsc = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });
  }

  /**
   * Submit feedback
   */
  async submit() {
    const data = {
      type: this.currentType,
      message: this.container.querySelector('#feedback-message').value.trim(),
      contactAllowed: this.container.querySelector('#feedback-contact').checked,
      timestamp: new Date().toISOString()
    };
    
    // Validate
    if (!data.message) {
      this.showError('Please enter your feedback');
      return;
    }
    
    // Collect type-specific data
    switch (this.currentType) {
      case FEEDBACK_TYPES.BUG_REPORT:
        data.steps = this.container.querySelector('#bug-steps')?.value || '';
        data.expected = this.container.querySelector('#bug-expected')?.value || '';
        data.actual = this.container.querySelector('#bug-actual')?.value || '';
        break;
        
      case FEEDBACK_TYPES.RATING:
        const selectedStar = this.container.querySelector('.star.selected:last-child');
        data.rating = selectedStar ? parseInt(selectedStar.dataset.rating) : 0;
        if (!data.rating) {
          this.showError('Please select a rating');
          return;
        }
        break;
        
      case FEEDBACK_TYPES.FEATURE_REQUEST:
        data.title = this.container.querySelector('#feature-title')?.value || '';
        data.useCase = this.container.querySelector('#feature-use-case')?.value || '';
        break;
        
      case FEEDBACK_TYPES.PERFORMANCE_ISSUE:
        data.pageUrl = this.container.querySelector('#perf-page')?.value || '';
        data.issue = this.container.querySelector('#perf-issue')?.value || '';
        break;
    }
    
    // Show loading
    const submitBtn = this.container.querySelector('.feedback-submit');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Sending...';
    submitBtn.disabled = true;
    
    try {
      // Send feedback
      await feedbackManager.collectFeedback(this.currentType, data);
      
      // Show success
      this.showSuccess();
      
      // Close after delay
      setTimeout(() => this.close(), 2000);
    } catch (error) {
      console.error('Failed to send feedback:', error);
      this.showError('Failed to send feedback. Please try again.');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }

  /**
   * Show success message
   */
  showSuccess() {
    const content = this.container.querySelector('.feedback-content');
    content.innerHTML = `
      <div class="feedback-success">
        <div class="success-icon">✅</div>
        <h3>Thank You!</h3>
        <p>Your feedback has been received.</p>
        <p>We appreciate you helping us improve DeepWeb!</p>
      </div>
    `;
  }

  /**
   * Show error message
   */
  showError(message) {
    let errorDiv = this.container.querySelector('.feedback-error');
    if (!errorDiv) {
      errorDiv = document.createElement('div');
      errorDiv.className = 'feedback-error';
      this.container.querySelector('.feedback-content').prepend(errorDiv);
    }
    errorDiv.textContent = message;
    
    setTimeout(() => errorDiv.remove(), 3000);
  }

  /**
   * Show dialog
   */
  show() {
    this.isOpen = true;
    this.container.style.display = 'block';
    requestAnimationFrame(() => {
      this.container.classList.add('open');
    });
    
    // Focus first input
    setTimeout(() => {
      const firstInput = this.container.querySelector('input, textarea, select');
      if (firstInput) firstInput.focus();
    }, 100);
  }

  /**
   * Close dialog
   */
  close() {
    this.isOpen = false;
    this.container.classList.remove('open');
    
    setTimeout(() => {
      if (this.container) {
        this.container.remove();
        this.container = null;
      }
    }, 300);
    
    // Remove ESC listener
    if (this.handleEsc) {
      document.removeEventListener('keydown', this.handleEsc);
    }
  }

  /**
   * Add styles
   */
  addStyles() {
    if (document.getElementById('feedback-dialog-styles')) return;
    
    const styles = document.createElement('style');
    styles.id = 'feedback-dialog-styles';
    styles.textContent = `
      .deepweb-feedback-dialog {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999999;
      }
      
      .feedback-overlay {
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        opacity: 0;
        transition: opacity 0.3s;
      }
      
      .deepweb-feedback-dialog.open .feedback-overlay {
        opacity: 1;
      }
      
      .feedback-modal {
        background: white;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        max-width: 500px;
        width: 100%;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transform: scale(0.9);
        transition: transform 0.3s;
      }
      
      .deepweb-feedback-dialog.open .feedback-modal {
        transform: scale(1);
      }
      
      .feedback-header {
        padding: 20px;
        border-bottom: 1px solid #e9ecef;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .feedback-header h2 {
        margin: 0;
        font-size: 20px;
        color: #333;
      }
      
      .feedback-close {
        background: none;
        border: none;
        font-size: 30px;
        color: #999;
        cursor: pointer;
        padding: 0;
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .feedback-close:hover {
        background: #f8f9fa;
        color: #333;
      }
      
      .feedback-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .feedback-field {
        margin-bottom: 20px;
      }
      
      .feedback-field label {
        display: block;
        margin-bottom: 8px;
        font-weight: 600;
        color: #333;
        font-size: 14px;
      }
      
      .feedback-field input[type="text"],
      .feedback-field textarea,
      .feedback-field select {
        width: 100%;
        padding: 10px;
        border: 1px solid #dee2e6;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
        transition: border-color 0.2s;
      }
      
      .feedback-field input[type="text"]:focus,
      .feedback-field textarea:focus,
      .feedback-field select:focus {
        outline: none;
        border-color: #5e72e4;
      }
      
      .feedback-field textarea {
        resize: vertical;
        min-height: 100px;
      }
      
      .character-count {
        text-align: right;
        font-size: 12px;
        color: #6c757d;
        margin-top: 4px;
      }
      
      .feedback-type-selector {
        margin-bottom: 20px;
      }
      
      .feedback-type-selector label {
        display: inline-block;
        margin-right: 10px;
        font-weight: 600;
      }
      
      .feedback-type-selector select {
        width: auto;
        display: inline-block;
      }
      
      .star-rating {
        display: flex;
        gap: 10px;
        font-size: 30px;
      }
      
      .star {
        cursor: pointer;
        transition: color 0.2s;
        user-select: none;
      }
      
      .star:hover,
      .star.selected {
        color: #ffc107;
      }
      
      .feedback-privacy {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 6px;
        margin-top: 20px;
        font-size: 13px;
        line-height: 1.5;
      }
      
      .feedback-privacy p {
        margin: 5px 0;
      }
      
      .feedback-footer {
        padding: 20px;
        border-top: 1px solid #e9ecef;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      
      .feedback-footer button {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .feedback-cancel {
        background: #e9ecef;
        color: #495057;
      }
      
      .feedback-cancel:hover {
        background: #dee2e6;
      }
      
      .feedback-submit {
        background: #5e72e4;
        color: white;
      }
      
      .feedback-submit:hover {
        background: #4c63d2;
      }
      
      .feedback-submit:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      
      .feedback-error {
        background: #f8d7da;
        color: #721c24;
        padding: 10px 15px;
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 14px;
      }
      
      .feedback-success {
        text-align: center;
        padding: 40px 20px;
      }
      
      .success-icon {
        font-size: 60px;
        margin-bottom: 20px;
      }
      
      .feedback-success h3 {
        margin: 0 0 10px;
        font-size: 24px;
        color: #28a745;
      }
      
      .feedback-success p {
        margin: 5px 0;
        color: #666;
      }
      
      @media (max-width: 600px) {
        .feedback-modal {
          max-height: 100vh;
          border-radius: 0;
        }
      }
    `;
    
    document.head.appendChild(styles);
  }
}

// Export singleton
export const feedbackDialog = new FeedbackDialog();