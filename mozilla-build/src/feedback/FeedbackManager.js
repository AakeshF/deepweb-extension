/**
 * Feedback Manager
 * Handles user feedback collection and submission
 */

export class FeedbackManager {
  constructor() {
    this.feedbackEndpoint = 'https://api.deepweb.ai/feedback'; // Replace with actual endpoint
    this.feedbackQueue = [];
    this.initialized = false;
  }

  /**
   * Initialize feedback system
   */
  async init() {
    if (this.initialized) return;

    try {
      // Load queued feedback
      const stored = await browser.storage.local.get('feedbackQueue');
      this.feedbackQueue = stored.feedbackQueue || [];

      // Process any queued feedback
      if (this.feedbackQueue.length > 0) {
        await this.processQueue();
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize feedback manager:', error);
    }
  }

  /**
   * Collect user feedback
   */
  async collectFeedback(type, data) {
    const feedback = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      version: browser.runtime.getManifest().version,
      userAgent: navigator.userAgent,
      locale: browser.i18n.getUILanguage()
    };

    // Add to queue
    this.feedbackQueue.push(feedback);
    await this.saveQueue();

    // Try to send immediately
    await this.sendFeedback(feedback);

    return feedback.id;
  }

  /**
   * Send feedback to server
   */
  async sendFeedback(feedback) {
    try {
      // Check if user has opted in
      const settings = await browser.storage.local.get('feedbackSettings');
      if (!settings.feedbackSettings?.enabled) {
        return;
      }

      // Anonymize feedback
      const anonymized = this.anonymizeFeedback(feedback);

      // Send to server (mock for now)
      if (this.feedbackEndpoint.startsWith('https://')) {
        const response = await fetch(this.feedbackEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Extension-Version': feedback.version
          },
          body: JSON.stringify(anonymized)
        });

        if (response.ok) {
          // Remove from queue
          this.feedbackQueue = this.feedbackQueue.filter(f => f.id !== feedback.id);
          await this.saveQueue();
        }
      }
    } catch (error) {
      console.error('Failed to send feedback:', error);
      // Keep in queue for retry
    }
  }

  /**
   * Process queued feedback
   */
  async processQueue() {
    const queue = [...this.feedbackQueue];
    for (const feedback of queue) {
      await this.sendFeedback(feedback);
    }
  }

  /**
   * Anonymize feedback data
   */
  anonymizeFeedback(feedback) {
    const anonymized = { ...feedback };
    
    // Remove any potential PII
    delete anonymized.data.email;
    delete anonymized.data.name;
    delete anonymized.data.apiKey;
    
    // Anonymize user agent
    anonymized.userAgent = this.generalizeUserAgent(anonymized.userAgent);
    
    return anonymized;
  }

  /**
   * Generalize user agent to protect privacy
   */
  generalizeUserAgent(ua) {
    // Extract only browser and OS info
    const firefox = ua.match(/Firefox\/(\d+)/);
    const os = ua.includes('Windows') ? 'Windows' :
               ua.includes('Mac') ? 'macOS' :
               ua.includes('Linux') ? 'Linux' : 'Other';
    
    return `Firefox/${firefox ? firefox[1] : 'Unknown'} ${os}`;
  }

  /**
   * Save feedback queue
   */
  async saveQueue() {
    await browser.storage.local.set({ feedbackQueue: this.feedbackQueue });
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get feedback statistics
   */
  async getStats() {
    const stored = await browser.storage.local.get('feedbackStats');
    return stored.feedbackStats || {
      totalSubmitted: 0,
      byType: {},
      lastSubmitted: null
    };
  }

  /**
   * Update statistics
   */
  async updateStats(type) {
    const stats = await this.getStats();
    
    stats.totalSubmitted++;
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.lastSubmitted = Date.now();
    
    await browser.storage.local.set({ feedbackStats: stats });
  }
}

// Feedback types
export const FEEDBACK_TYPES = {
  BUG_REPORT: 'bug_report',
  FEATURE_REQUEST: 'feature_request',
  GENERAL_FEEDBACK: 'general_feedback',
  RATING: 'rating',
  PERFORMANCE_ISSUE: 'performance_issue',
  UI_FEEDBACK: 'ui_feedback',
  MODEL_FEEDBACK: 'model_feedback',
  TEMPLATE_FEEDBACK: 'template_feedback'
};

// Export singleton
export const feedbackManager = new FeedbackManager();