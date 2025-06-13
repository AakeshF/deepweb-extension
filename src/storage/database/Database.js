/**
 * IndexedDB Database Manager
 * Handles all database operations for the extension
 */

import { ValidationError } from '../../errors/index.js';

export default class Database {
  constructor() {
    this.dbName = 'DeepWebDB';
    this.version = 1;
    this.db = null;
    this.isInitialized = false;
    
    // Store definitions
    this.stores = {
      conversations: {
        name: 'conversations',
        keyPath: 'id',
        indexes: [
          { name: 'by_date', keyPath: 'updatedAt' },
          { name: 'by_url', keyPath: 'metadata.url' },
          { name: 'by_title', keyPath: 'title' }
        ]
      },
      messages: {
        name: 'messages',
        keyPath: 'id',
        indexes: [
          { name: 'by_conversation', keyPath: 'conversationId' },
          { name: 'by_timestamp', keyPath: 'timestamp' },
          { name: 'by_role', keyPath: 'role' }
        ]
      },
      settings: {
        name: 'settings',
        keyPath: 'key'
      }
    };
  }

  /**
   * Initialize the database
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      this.db = await this.openDatabase();
      this.isInitialized = true;
      console.log('[Database] Initialized successfully');
    } catch (error) {
      console.error('[Database] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Open IndexedDB connection
   * @private
   * @returns {Promise<IDBDatabase>}
   */
  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error(`Failed to open database: ${request.error}`));
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        this.createStores(db);
      };
    });
  }

  /**
   * Create object stores
   * @private
   * @param {IDBDatabase} db
   */
  createStores(db) {
    // Create conversations store
    if (!db.objectStoreNames.contains(this.stores.conversations.name)) {
      const conversationStore = db.createObjectStore(
        this.stores.conversations.name,
        { keyPath: this.stores.conversations.keyPath }
      );
      
      this.stores.conversations.indexes.forEach(index => {
        conversationStore.createIndex(index.name, index.keyPath, { unique: false });
      });
    }

    // Create messages store
    if (!db.objectStoreNames.contains(this.stores.messages.name)) {
      const messageStore = db.createObjectStore(
        this.stores.messages.name,
        { keyPath: this.stores.messages.keyPath }
      );
      
      this.stores.messages.indexes.forEach(index => {
        messageStore.createIndex(index.name, index.keyPath, { unique: false });
      });
    }

    // Create settings store
    if (!db.objectStoreNames.contains(this.stores.settings.name)) {
      db.createObjectStore(
        this.stores.settings.name,
        { keyPath: this.stores.settings.keyPath }
      );
    }
  }

  /**
   * Ensure database is initialized
   * @private
   */
  ensureInitialized() {
    if (!this.isInitialized || !this.db) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
  }

  /**
   * Execute a transaction
   * @private
   * @param {string|string[]} stores - Store name(s)
   * @param {string} mode - Transaction mode ('readonly' or 'readwrite')
   * @param {Function} callback - Transaction callback
   * @returns {Promise<any>}
   */
  transaction(stores, mode, callback) {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const storeNames = Array.isArray(stores) ? stores : [stores];
      const transaction = this.db.transaction(storeNames, mode);

      transaction.oncomplete = () => {
        resolve(transaction._result);
      };

      transaction.onerror = () => {
        reject(new Error(`Transaction failed: ${transaction.error}`));
      };

      transaction.onabort = () => {
        reject(new Error('Transaction aborted'));
      };

      try {
        const result = callback(transaction);
        transaction._result = result;
      } catch (error) {
        transaction.abort();
        reject(error);
      }
    });
  }

  /**
   * Add a record to a store
   * @param {string} storeName - Store name
   * @param {Object} data - Data to add
   * @returns {Promise<any>}
   */
  async add(storeName, data) {
    return this.transaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      return this.promisifyRequest(store.add(data));
    });
  }

  /**
   * Update a record in a store
   * @param {string} storeName - Store name
   * @param {Object} data - Data to update
   * @returns {Promise<any>}
   */
  async put(storeName, data) {
    return this.transaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      return this.promisifyRequest(store.put(data));
    });
  }

  /**
   * Get a record from a store
   * @param {string} storeName - Store name
   * @param {any} key - Record key
   * @returns {Promise<any>}
   */
  async get(storeName, key) {
    return this.transaction(storeName, 'readonly', (transaction) => {
      const store = transaction.objectStore(storeName);
      return this.promisifyRequest(store.get(key));
    });
  }

  /**
   * Get all records from a store
   * @param {string} storeName - Store name
   * @param {Object} options - Query options
   * @returns {Promise<Array>}
   */
  async getAll(storeName, options = {}) {
    return this.transaction(storeName, 'readonly', (transaction) => {
      const store = transaction.objectStore(storeName);
      
      let source = store;
      if (options.index) {
        source = store.index(options.index);
      }

      const range = this.createKeyRange(options);
      const direction = options.direction || 'next';
      
      return this.cursorToArray(source.openCursor(range, direction), options.limit);
    });
  }

  /**
   * Delete a record from a store
   * @param {string} storeName - Store name
   * @param {any} key - Record key
   * @returns {Promise<void>}
   */
  async delete(storeName, key) {
    return this.transaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      return this.promisifyRequest(store.delete(key));
    });
  }

  /**
   * Delete multiple records
   * @param {string} storeName - Store name
   * @param {Array} keys - Record keys
   * @returns {Promise<void>}
   */
  async deleteMany(storeName, keys) {
    return this.transaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      const promises = keys.map(key => this.promisifyRequest(store.delete(key)));
      return Promise.all(promises);
    });
  }

  /**
   * Count records in a store
   * @param {string} storeName - Store name
   * @param {Object} options - Query options
   * @returns {Promise<number>}
   */
  async count(storeName, options = {}) {
    return this.transaction(storeName, 'readonly', (transaction) => {
      const store = transaction.objectStore(storeName);
      
      let source = store;
      if (options.index) {
        source = store.index(options.index);
      }

      const range = this.createKeyRange(options);
      return this.promisifyRequest(source.count(range));
    });
  }

  /**
   * Clear all records from a store
   * @param {string} storeName - Store name
   * @returns {Promise<void>}
   */
  async clear(storeName) {
    return this.transaction(storeName, 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      return this.promisifyRequest(store.clear());
    });
  }

  /**
   * Search records using an index
   * @param {string} storeName - Store name
   * @param {string} indexName - Index name
   * @param {any} query - Search query
   * @returns {Promise<Array>}
   */
  async search(storeName, indexName, query) {
    return this.transaction(storeName, 'readonly', (transaction) => {
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      
      const range = IDBKeyRange.only(query);
      return this.cursorToArray(index.openCursor(range));
    });
  }

  /**
   * Create key range from options
   * @private
   * @param {Object} options
   * @returns {IDBKeyRange|undefined}
   */
  createKeyRange(options) {
    if (options.range) {
      const { start, end, startExclusive, endExclusive } = options.range;
      
      if (start !== undefined && end !== undefined) {
        return IDBKeyRange.bound(start, end, startExclusive, endExclusive);
      } else if (start !== undefined) {
        return IDBKeyRange.lowerBound(start, startExclusive);
      } else if (end !== undefined) {
        return IDBKeyRange.upperBound(end, endExclusive);
      }
    }
    
    return undefined;
  }

  /**
   * Convert cursor to array
   * @private
   * @param {IDBRequest} cursorRequest
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  cursorToArray(cursorRequest, limit) {
    return new Promise((resolve, reject) => {
      const results = [];
      
      cursorRequest.onsuccess = (event) => {
        const cursor = event.target.result;
        
        if (cursor && (!limit || results.length < limit)) {
          results.push(cursor.value);
          cursor.continue();
        } else {
          resolve(results);
        }
      };
      
      cursorRequest.onerror = () => {
        reject(new Error(`Cursor operation failed: ${cursorRequest.error}`));
      };
    });
  }

  /**
   * Promisify IndexedDB request
   * @private
   * @param {IDBRequest} request
   * @returns {Promise<any>}
   */
  promisifyRequest(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get database size
   * @returns {Promise<Object>}
   */
  async getSize() {
    if ('estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percent: estimate.quota ? (estimate.usage / estimate.quota) * 100 : 0
      };
    }
    
    // Fallback for older browsers
    return {
      usage: 0,
      quota: 0,
      percent: 0
    };
  }

  /**
   * Close database connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Delete the entire database
   * @returns {Promise<void>}
   */
  async deleteDatabase() {
    this.close();
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase(this.dbName);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete database: ${request.error}`));
    });
  }
}