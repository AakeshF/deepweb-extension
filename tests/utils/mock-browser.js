/**
 * Browser API mocks for testing Firefox extensions
 */

/**
 * Creates a mock storage API
 * @returns {Object} Mock storage API
 */
function createMockStorage() {
  const storage = new Map();
  
  return {
    local: {
      get: jest.fn((keys) => {
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: storage.get(keys) });
        }
        const result = {};
        keys.forEach(key => {
          result[key] = storage.get(key);
        });
        return Promise.resolve(result);
      }),
      set: jest.fn((items) => {
        Object.entries(items).forEach(([key, value]) => {
          storage.set(key, value);
        });
        return Promise.resolve();
      }),
      remove: jest.fn((keys) => {
        if (typeof keys === 'string') {
          storage.delete(keys);
        } else {
          keys.forEach(key => storage.delete(key));
        }
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      })
    }
  };
}

/**
 * Creates a mock tabs API
 * @returns {Object} Mock tabs API
 */
function createMockTabs() {
  return {
    query: jest.fn(() => Promise.resolve([
      { id: 1, url: 'https://example.com', active: true }
    ])),
    sendMessage: jest.fn(() => Promise.resolve()),
    create: jest.fn(() => Promise.resolve({ id: 2 })),
    update: jest.fn(() => Promise.resolve()),
    remove: jest.fn(() => Promise.resolve())
  };
}

/**
 * Creates a mock runtime API
 * @returns {Object} Mock runtime API
 */
function createMockRuntime() {
  const messageListeners = [];
  
  return {
    onMessage: {
      addListener: jest.fn((listener) => {
        messageListeners.push(listener);
      }),
      removeListener: jest.fn((listener) => {
        const index = messageListeners.indexOf(listener);
        if (index > -1) messageListeners.splice(index, 1);
      })
    },
    sendMessage: jest.fn((message) => Promise.resolve()),
    getManifest: jest.fn(() => ({
      manifest_version: 2,
      name: 'DeepWeb AI Assistant',
      version: '1.0'
    })),
    id: 'deepweb@assistant.ai',
    messageListeners
  };
}

/**
 * Creates a complete mock browser object
 * @returns {Object} Mock browser object
 */
function createMockBrowser() {
  return {
    storage: createMockStorage(),
    tabs: createMockTabs(),
    runtime: createMockRuntime(),
    contextMenus: {
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
      removeAll: jest.fn()
    },
    browserAction: {
      setBadgeText: jest.fn(),
      setBadgeBackgroundColor: jest.fn(),
      setIcon: jest.fn(),
      setTitle: jest.fn()
    }
  };
}

/**
 * Triggers a message event with given data
 * @param {Object} browser - Mock browser object
 * @param {any} message - Message to send
 * @param {Object} sender - Sender info
 * @returns {Promise} Response promise
 */
async function triggerMessage(browser, message, sender = {}) {
  const responses = [];
  
  for (const listener of browser.runtime.messageListeners) {
    const sendResponse = jest.fn();
    const result = listener(message, sender, sendResponse);
    
    if (result === true) {
      // Async response expected
      responses.push(new Promise(resolve => {
        sendResponse.mockImplementation(resolve);
      }));
    } else if (result !== undefined) {
      responses.push(result);
    }
  }
  
  return Promise.all(responses);
}

module.exports = {
  createMockStorage,
  createMockTabs,
  createMockRuntime,
  createMockBrowser,
  triggerMessage
};