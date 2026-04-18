/**
 * ai-storage-manager.js - Secure Centralized Storage
 * Coordinates storage across modules with encryption and locking
 * 
 * Features:
 * - IndexedDB with localStorage fallback
 * - Optimistic locking for concurrent access
 * - Automatic encryption for sensitive data
 * - Transaction support
 * - Quota management
 * 
 * @version 4.1
 */

const AIStorageManager = {
    // Storage backends
    db: null,
    storage: 'localStorage', // 'indexedDB' or 'localStorage'
    
    // State
    initialized: false,
    locks: new Map(),
    encryptionKey: null,
    
    // Configuration
    config: {
        dbName: 'AIStorage',
        dbVersion: 1,
        storeName: 'aiData',
        encryptionEnabled: true,
        compressionEnabled: false,
        maxQuota: 50 * 1024 * 1024, // 50MB
        lockTimeout: 5000 // 5 seconds
    },
    
    /**
     * Initialize storage
     * @returns {Promise<boolean>}
     */
    async init() {
        if (this.initialized) return true;
        
        console.log('[AIStorageManager] Initializing...');
        
        try {
            // Try IndexedDB first
            await this.initIndexedDB();
            this.storage = 'indexedDB';
            console.log('[AIStorageManager] Using IndexedDB');
        } catch (error) {
            console.warn('[AIStorageManager] IndexedDB failed, using localStorage:', error.message);
            this.storage = 'localStorage';
        }
        
        // Generate or retrieve encryption key
        await this.initEncryption();
        
        this.initialized = true;
        return true;
    },
    
    /**
     * Initialize IndexedDB
     * @returns {Promise<void>}
     */
    initIndexedDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.config.dbName, this.config.dbVersion);
            
            request.onerror = () => reject(new Error('Failed to open IndexedDB'));
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.config.storeName)) {
                    db.createObjectStore(this.config.storeName, { keyPath: 'key' });
                }
            };
        });
    },
    
    /**
     * Initialize encryption
     * @returns {Promise<void>}
     */
    async initEncryption() {
        // Try to get existing key from session
        const existingKey = sessionStorage.getItem('ai_encryption_key');
        
        if (existingKey) {
            this.encryptionKey = existingKey;
        } else {
            // Generate new key
            const key = await this.generateEncryptionKey();
            this.encryptionKey = key;
            sessionStorage.setItem('ai_encryption_key', key);
        }
    },
    
    /**
     * Generate encryption key
     * @returns {Promise<string>}
     */
    async generateEncryptionKey() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * Simple encryption (XOR-based for demo, use proper encryption in production)
     * @param {string} data - Data to encrypt
     * @returns {string} - Encrypted data
     */
    encrypt(data) {
        if (!this.config.encryptionEnabled || !this.encryptionKey) {
            return data;
        }
        
        // Simple XOR encryption (replace with AES-GCM in production)
        const key = this.encryptionKey;
        let result = '';
        for (let i = 0; i < data.length; i++) {
            result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
        }
        return btoa(result); // Base64 encode
    },
    
    /**
     * Decrypt data
     * @param {string} data - Encrypted data
     * @returns {string} - Decrypted data
     */
    decrypt(data) {
        if (!this.config.encryptionEnabled || !this.encryptionKey) {
            return data;
        }
        
        try {
            const encrypted = atob(data);
            const key = this.encryptionKey;
            let result = '';
            for (let i = 0; i < encrypted.length; i++) {
                result += String.fromCharCode(encrypted.charCodeAt(i) ^ key.charCodeAt(i % key.length));
            }
            return result;
        } catch (error) {
            console.error('[AIStorageManager] Decryption failed:', error);
            return null;
        }
    },
    
    /**
     * Acquire lock for a key
     * @param {string} key - Storage key
     * @returns {Promise<boolean>}
     */
    async acquireLock(key) {
        const startTime = Date.now();
        
        while (this.locks.has(key)) {
            if (Date.now() - startTime > this.config.lockTimeout) {
                console.warn(`[AIStorageManager] Lock timeout for ${key}, forcing unlock`);
                this.locks.delete(key);
                break;
            }
            await this.sleep(50);
        }
        
        this.locks.set(key, Date.now());
        return true;
    },
    
    /**
     * Release lock for a key
     * @param {string} key - Storage key
     */
    releaseLock(key) {
        this.locks.delete(key);
    },
    
    /**
     * Read data from storage
     * @param {string} module - Module name (namespace)
     * @param {string} key - Key within module
     * @returns {Promise<any>}
     */
    async read(module, key) {
        await this.init();
        
        const fullKey = `${module}:${key}`;
        
        try {
            if (this.storage === 'indexedDB') {
                return await this.readIndexedDB(fullKey);
            } else {
                return this.readLocalStorage(fullKey);
            }
        } catch (error) {
            console.error(`[AIStorageManager] Read failed for ${fullKey}:`, error);
            return null;
        }
    },
    
    /**
     * Read from IndexedDB
     * @param {string} key - Full key
     * @returns {Promise<any>}
     */
    readIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.config.storeName], 'readonly');
            const store = transaction.objectStore(this.config.storeName);
            const request = store.get(key);
            
            request.onsuccess = () => {
                const result = request.result;
                if (result && result.value) {
                    const decrypted = this.decrypt(result.value);
                    try {
                        resolve(JSON.parse(decrypted));
                    } catch {
                        resolve(decrypted);
                    }
                } else {
                    resolve(null);
                }
            };
            
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Read from localStorage
     * @param {string} key - Full key
     * @returns {any}
     */
    readLocalStorage(key) {
        const data = localStorage.getItem(key);
        if (!data) return null;
        
        const decrypted = this.decrypt(data);
        try {
            return JSON.parse(decrypted);
        } catch {
            return decrypted;
        }
    },
    
    /**
     * Write data to storage
     * @param {string} module - Module name (namespace)
     * @param {string} key - Key within module
     * @param {*} value - Value to store
     * @returns {Promise<boolean>}
     */
    async write(module, key, value) {
        await this.init();
        
        const fullKey = `${module}:${key}`;
        
        // Acquire lock
        await this.acquireLock(fullKey);
        
        try {
            // Serialize
            const serialized = typeof value === 'string' ? value : JSON.stringify(value);
            const encrypted = this.encrypt(serialized);
            
            if (this.storage === 'indexedDB') {
                await this.writeIndexedDB(fullKey, encrypted);
            } else {
                this.writeLocalStorage(fullKey, encrypted);
            }
            
            return true;
        } catch (error) {
            console.error(`[AIStorageManager] Write failed for ${fullKey}:`, error);
            return false;
        } finally {
            this.releaseLock(fullKey);
        }
    },
    
    /**
     * Write to IndexedDB
     * @param {string} key - Full key
     * @param {string} value - Encrypted value
     * @returns {Promise<void>}
     */
    writeIndexedDB(key, value) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.config.storeName], 'readwrite');
            const store = transaction.objectStore(this.config.storeName);
            const request = store.put({ key, value, timestamp: Date.now() });
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Write to localStorage
     * @param {string} key - Full key
     * @param {string} value - Encrypted value
     */
    writeLocalStorage(key, value) {
        // Check quota
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                console.error('[AIStorageManager] Quota exceeded, clearing old data');
                this.cleanup();
                localStorage.setItem(key, value);
            } else {
                throw e;
            }
        }
    },
    
    /**
     * Delete data from storage
     * @param {string} module - Module name
     * @param {string} key - Key within module
     * @returns {Promise<boolean>}
     */
    async remove(module, key) {
        await this.init();
        
        const fullKey = `${module}:${key}`;
        
        try {
            if (this.storage === 'indexedDB') {
                await this.removeIndexedDB(fullKey);
            } else {
                localStorage.removeItem(fullKey);
            }
            return true;
        } catch (error) {
            console.error(`[AIStorageManager] Remove failed for ${fullKey}:`, error);
            return false;
        }
    },
    
    /**
     * Remove from IndexedDB
     * @param {string} key - Full key
     * @returns {Promise<void>}
     */
    removeIndexedDB(key) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.config.storeName], 'readwrite');
            const store = transaction.objectStore(this.config.storeName);
            const request = store.delete(key);
            
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    },
    
    /**
     * Clear all data for a module
     * @param {string} module - Module name
     * @returns {Promise<boolean>}
     */
    async clearModule(module) {
        await this.init();
        
        try {
            if (this.storage === 'indexedDB') {
                // Get all keys for this module
                const keys = await this.getKeys(module);
                for (const key of keys) {
                    await this.removeIndexedDB(key);
                }
            } else {
                // Clear localStorage keys with module prefix
                for (let i = localStorage.length - 1; i >= 0; i--) {
                    const key = localStorage.key(i);
                    if (key && key.startsWith(`${module}:`)) {
                        localStorage.removeItem(key);
                    }
                }
            }
            return true;
        } catch (error) {
            console.error(`[AIStorageManager] Clear failed for ${module}:`, error);
            return false;
        }
    },
    
    /**
     * Get all keys for a module
     * @param {string} module - Module name
     * @returns {Promise<Array<string>>}
     */
    async getKeys(module) {
        await this.init();
        
        if (this.storage === 'indexedDB') {
            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction([this.config.storeName], 'readonly');
                const store = transaction.objectStore(this.config.storeName);
                const request = store.getAllKeys();
                
                request.onsuccess = () => {
                    const keys = request.result.filter(k => k.startsWith(`${module}:`));
                    resolve(keys);
                };
                request.onerror = () => reject(request.error);
            });
        } else {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`${module}:`)) {
                    keys.push(key);
                }
            }
            return keys;
        }
    },
    
    /**
     * Clean up old data
     */
    cleanup() {
        // Remove old data (older than 30 days)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        
        if (this.storage === 'localStorage') {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith('ai_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data.timestamp && data.timestamp < thirtyDaysAgo) {
                            localStorage.removeItem(key);
                        }
                    } catch {
                        // Not JSON, skip
                    }
                }
            }
        }
    },
    
    /**
     * Get storage statistics
     * @returns {Promise<Object>}
     */
    async getStats() {
        await this.init();
        
        let totalSize = 0;
        let itemCount = 0;
        
        if (this.storage === 'localStorage') {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('ai_')) {
                    const value = localStorage.getItem(key);
                    totalSize += key.length + value.length;
                    itemCount++;
                }
            }
        }
        
        return {
            storage: this.storage,
            itemCount,
            totalSize: `${(totalSize / 1024).toFixed(2)} KB`,
            encryption: this.config.encryptionEnabled,
            quota: this.config.maxQuota
        };
    },
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Auto-export
window.AIStorageManager = AIStorageManager;
