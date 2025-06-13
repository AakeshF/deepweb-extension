/**
 * Test helper utilities for Firefox extension testing
 */

/**
 * Waits for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Maximum wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<void>}
 */
async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  throw new Error('Timeout waiting for condition');
}

/**
 * Creates a mock DOM element with Firefox extension context
 * @param {string} html - HTML string
 * @returns {Object} Mock document object
 */
function createMockDocument(html = '') {
  const dom = new JSDOM(html);
  global.document = dom.window.document;
  global.window = dom.window;
  return dom.window.document;
}

/**
 * Simulates a user event
 * @param {Element} element - Target element
 * @param {string} eventType - Event type
 * @param {Object} eventData - Additional event data
 */
function simulateEvent(element, eventType, eventData = {}) {
  const event = new Event(eventType, { bubbles: true, cancelable: true });
  Object.assign(event, eventData);
  element.dispatchEvent(event);
}

/**
 * Creates a mock API response
 * @param {any} data - Response data
 * @param {number} status - HTTP status code
 * @returns {Response} Mock response object
 */
function createMockResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: jest.fn(() => Promise.resolve(data)),
    text: jest.fn(() => Promise.resolve(JSON.stringify(data))),
    headers: new Map([['content-type', 'application/json']])
  };
}

/**
 * Creates a mock fetch function with predefined responses
 * @param {Object} responses - Map of URL patterns to responses
 * @returns {Function} Mock fetch function
 */
function createMockFetch(responses = {}) {
  return jest.fn((url, options) => {
    for (const [pattern, response] of Object.entries(responses)) {
      if (url.includes(pattern)) {
        return Promise.resolve(createMockResponse(response));
      }
    }
    return Promise.reject(new Error('Network error'));
  });
}

/**
 * Loads extension manifest for testing
 * @param {string} path - Path to manifest file
 * @returns {Object} Parsed manifest
 */
function loadManifest(path = './manifest.json') {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to load manifest: ${error.message}`);
  }
}

/**
 * Creates a test extension context
 * @param {Object} options - Context options
 * @returns {Object} Test context
 */
function createTestContext(options = {}) {
  const browser = createMockBrowser();
  const document = createMockDocument(options.html || '');
  const fetch = createMockFetch(options.fetchResponses || {});
  
  global.browser = browser;
  global.fetch = fetch;
  
  return {
    browser,
    document,
    fetch,
    cleanup: () => {
      delete global.browser;
      delete global.document;
      delete global.window;
      delete global.fetch;
    }
  };
}

module.exports = {
  waitFor,
  createMockDocument,
  simulateEvent,
  createMockResponse,
  createMockFetch,
  loadManifest,
  createTestContext
};