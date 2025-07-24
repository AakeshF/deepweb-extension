/**
 * Feedback Integration
 * Integrates feedback collection throughout the extension
 */

import { feedbackManager, FEEDBACK_TYPES } from './FeedbackManager.js';
import { feedbackDialog } from '../../content/components/FeedbackDialog.js';

/**
 * Initialize feedback integration
 */
export async function initializeFeedback() {
  // Initialize feedback manager
  await feedbackManager.init();
  
  // Add feedback button to chat interface
  addFeedbackButton();
  
  // Listen for feedback triggers
  setupFeedbackListeners();
  
  // Track user satisfaction
  trackUserSatisfaction();
}

/**
 * Add feedback button to chat interface
 */
function addFeedbackButton() {
  // Wait for chat container to be available
  const observer = new MutationObserver((mutations, obs) => {
    const chatContainer = document.querySelector('.deepweb-chat-container');
    if (chatContainer && !chatContainer.querySelector('.feedback-trigger')) {
      const feedbackBtn = document.createElement('button');
      feedbackBtn.className = 'feedback-trigger';
      feedbackBtn.innerHTML = '💬';
      feedbackBtn.title = 'Send Feedback';
      feedbackBtn.setAttribute('aria-label', 'Send Feedback');
      
      // Add to header or footer
      const header = chatContainer.querySelector('.deepweb-header');
      if (header) {
        header.appendChild(feedbackBtn);
      }
      
      // Add click handler
      feedbackBtn.addEventListener('click', () => {
        feedbackDialog.open(FEEDBACK_TYPES.GENERAL_FEEDBACK);
      });
      
      obs.disconnect();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

/**
 * Setup feedback listeners
 */
function setupFeedbackListeners() {
  // Listen for error events
  window.addEventListener('deepweb-error', (event) => {
    const error = event.detail;
    
    // For critical errors, prompt for feedback
    if (error.severity === 'critical') {
      promptErrorFeedback(error);
    }
  });
  
  // Listen for performance issues
  window.addEventListener('deepweb-performance-issue', (event) => {
    const issue = event.detail;
    
    // Track performance feedback
    feedbackManager.collectFeedback(FEEDBACK_TYPES.PERFORMANCE_ISSUE, {
      issue: issue.type,
      duration: issue.duration,
      automatic: true
    });
  });
  
  // Listen for feature usage
  window.addEventListener('deepweb-feature-used', (event) => {
    const feature = event.detail;
    
    // Track feature satisfaction after N uses
    trackFeatureSatisfaction(feature);
  });
}

/**
 * Prompt for error feedback
 */
function promptErrorFeedback(error) {
  // Create inline prompt
  const prompt = document.createElement('div');
  prompt.className = 'deepweb-error-feedback-prompt';
  prompt.innerHTML = `
    <p>😕 We noticed you encountered an error. Would you like to report it?</p>
    <button class="report-error">Report Error</button>
    <button class="dismiss">No Thanks</button>
  `;
  
  // Add to chat or show as notification
  const chatContainer = document.querySelector('.deepweb-chat-container');
  if (chatContainer) {
    chatContainer.appendChild(prompt);
    
    // Handle buttons
    prompt.querySelector('.report-error').addEventListener('click', () => {
      feedbackDialog.open(FEEDBACK_TYPES.BUG_REPORT);
      prompt.remove();
    });
    
    prompt.querySelector('.dismiss').addEventListener('click', () => {
      prompt.remove();
    });
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => prompt.remove(), 10000);
  }
}

/**
 * Track user satisfaction
 */
async function trackUserSatisfaction() {
  // Check usage stats
  const stats = await browser.storage.local.get(['usageStats', 'lastSatisfactionPrompt']);
  const usage = stats.usageStats || { messageCount: 0, sessionCount: 0 };
  const lastPrompt = stats.lastSatisfactionPrompt || 0;
  
  // Prompt for rating after significant usage
  const shouldPrompt = (
    usage.messageCount > 50 &&
    usage.sessionCount > 5 &&
    Date.now() - lastPrompt > 7 * 24 * 60 * 60 * 1000 // 7 days
  );
  
  if (shouldPrompt) {
    setTimeout(() => {
      promptForRating();
    }, 5000); // Wait 5 seconds after session start
  }
}

/**
 * Prompt for rating
 */
function promptForRating() {
  const prompt = document.createElement('div');
  prompt.className = 'deepweb-rating-prompt';
  prompt.innerHTML = `
    <div class="rating-content">
      <p>Enjoying DeepWeb? We'd love your feedback!</p>
      <div class="rating-actions">
        <button class="rate-now">⭐ Rate DeepWeb</button>
        <button class="rate-later">Maybe Later</button>
        <button class="rate-never">Don't Ask Again</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(prompt);
  
  // Handlers
  prompt.querySelector('.rate-now').addEventListener('click', async () => {
    feedbackDialog.open(FEEDBACK_TYPES.RATING);
    prompt.remove();
    await browser.storage.local.set({ lastSatisfactionPrompt: Date.now() });
  });
  
  prompt.querySelector('.rate-later').addEventListener('click', async () => {
    prompt.remove();
    await browser.storage.local.set({ lastSatisfactionPrompt: Date.now() });
  });
  
  prompt.querySelector('.rate-never').addEventListener('click', async () => {
    prompt.remove();
    await browser.storage.local.set({ 
      lastSatisfactionPrompt: Date.now(),
      neverAskRating: true 
    });
  });
  
  // Add styles
  if (!document.getElementById('rating-prompt-styles')) {
    const styles = document.createElement('style');
    styles.id = 'rating-prompt-styles';
    styles.textContent = `
      .deepweb-rating-prompt {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        padding: 20px;
        max-width: 300px;
        z-index: 999998;
        animation: slideIn 0.3s ease-out;
      }
      
      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      .rating-content p {
        margin: 0 0 15px;
        font-size: 14px;
        color: #333;
      }
      
      .rating-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .rating-actions button {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      .rate-now {
        background: #5e72e4;
        color: white;
      }
      
      .rate-now:hover {
        background: #4c63d2;
      }
      
      .rate-later {
        background: #e9ecef;
        color: #495057;
      }
      
      .rate-later:hover {
        background: #dee2e6;
      }
      
      .rate-never {
        background: none;
        color: #6c757d;
        font-size: 12px;
      }
      
      .rate-never:hover {
        text-decoration: underline;
      }
      
      .deepweb-error-feedback-prompt {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 15px;
        margin: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      
      .deepweb-error-feedback-prompt p {
        margin: 0;
        flex: 1;
        font-size: 14px;
      }
      
      .deepweb-error-feedback-prompt button {
        padding: 6px 12px;
        border: none;
        border-radius: 4px;
        font-size: 13px;
        cursor: pointer;
      }
      
      .report-error {
        background: #dc3545;
        color: white;
      }
      
      .dismiss {
        background: #e9ecef;
        color: #495057;
      }
    `;
    document.head.appendChild(styles);
  }
}

/**
 * Track feature satisfaction
 */
async function trackFeatureSatisfaction(feature) {
  const stats = await browser.storage.local.get('featureUsage');
  const usage = stats.featureUsage || {};
  
  // Increment usage count
  usage[feature.name] = (usage[feature.name] || 0) + 1;
  
  // Prompt for feedback after using feature N times
  if (usage[feature.name] === 10) {
    setTimeout(() => {
      promptFeatureFeedback(feature);
    }, 2000);
  }
  
  await browser.storage.local.set({ featureUsage: usage });
}

/**
 * Prompt for feature feedback
 */
function promptFeatureFeedback(feature) {
  const prompt = document.createElement('div');
  prompt.className = 'deepweb-feature-feedback';
  // Create paragraph
  const p = document.createElement('p');
  p.textContent = `How's the ${feature.displayName} feature working for you?`;
  prompt.appendChild(p);
  
  // Create feedback buttons container
  const quickFeedback = document.createElement('div');
  quickFeedback.className = 'quick-feedback';
  
  // Create buttons
  const buttons = [
    { sentiment: 'positive', text: '👍 Great!' },
    { sentiment: 'neutral', text: '😐 It\'s OK' },
    { sentiment: 'negative', text: '👎 Needs Work' }
  ];
  
  buttons.forEach(({ sentiment, text }) => {
    const button = document.createElement('button');
    button.setAttribute('data-sentiment', sentiment);
    button.textContent = text;
    quickFeedback.appendChild(button);
  });
  
  prompt.appendChild(quickFeedback);
  
  const chatContainer = document.querySelector('.deepweb-chat-container');
  if (chatContainer) {
    chatContainer.appendChild(prompt);
    
    // Handle quick feedback
    prompt.querySelectorAll('.quick-feedback button').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sentiment = btn.dataset.sentiment;
        
        // Collect quick feedback
        await feedbackManager.collectFeedback(FEEDBACK_TYPES.FEATURE_FEEDBACK, {
          feature: feature.name,
          sentiment,
          automatic: true
        });
        
        // Thank user
        prompt.innerHTML = '<p>Thanks for your feedback! 🙏</p>';
        setTimeout(() => prompt.remove(), 2000);
        
        // If negative, offer detailed feedback
        if (sentiment === 'negative') {
          setTimeout(() => {
            feedbackDialog.open(FEEDBACK_TYPES.FEATURE_REQUEST);
          }, 2500);
        }
      });
    });
    
    // Auto-remove after 30 seconds
    setTimeout(() => prompt.remove(), 30000);
  }
}

/**
 * Add feedback option to context menu
 */
export function addFeedbackToContextMenu() {
  if (browser.contextMenus) {
    browser.contextMenus.create({
      id: 'deepweb-feedback',
      title: 'Send Feedback about DeepWeb',
      contexts: ['all']
    });
    
    browser.contextMenus.onClicked.addListener((info, tab) => {
      if (info.menuItemId === 'deepweb-feedback') {
        // Send message to content script
        browser.tabs.sendMessage(tab.id, {
          action: 'openFeedback',
          type: FEEDBACK_TYPES.GENERAL_FEEDBACK
        });
      }
    });
  }
}

/**
 * Handle feedback keyboard shortcut
 */
export function setupFeedbackShortcut() {
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + Shift + F for feedback
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
      e.preventDefault();
      feedbackDialog.open(FEEDBACK_TYPES.GENERAL_FEEDBACK);
    }
  });
}