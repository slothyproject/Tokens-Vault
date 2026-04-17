// vault-data.js - Complete Encryption and Storage Management (Brave Compatible)

const VaultData = {
    // Brave browser compatibility: Check storage availability
    storageAvailable(type) {
        try {
            const storage = window[type],
                x = '__storage_test__';
            storage.setItem(x, x);
            storage.removeItem(x);
            return true;
        } catch(e) {
            console.warn(`${type} not available in this browser:`, e);
            return false;
        }
    },

    // Get storage mechanism (with Brave fallback)
    getStorage(type) {
        if (type === 'local' && this.storageAvailable('localStorage')) {
            return localStorage;
        }
        if (type === 'session' && this.storageAvailable('sessionStorage')) {
            return sessionStorage;
        }
        // Fallback: memory storage for Brave strict mode
        if (!this._memoryStorage) {
            this._memoryStorage = {};
        }
        return {
            getItem: (key) => this._memoryStorage[key] || null,
            setItem: (key, value) => { this._memoryStorage[key] = value; },
            removeItem: (key) => { delete this._memoryStorage[key]; }
        };
    },

    // Show Brave warning if storage is limited
    checkBraveCompatibility() {
        const isBrave = navigator.brave && navigator.brave.isBrave;
        const localStorageWorks = this.storageAvailable('localStorage');
        
        if (isBrave && !localStorageWorks) {
            console.warn('Brave browser detected with strict storage settings. Using memory fallback.');
            return {
                isBrave: true,
                limitedStorage: true,
                message: 'Vault will work but data will not persist between sessions. Consider allowing localStorage for this site.'
            };
        }
        
        return { isBrave: isBrave || false, limitedStorage: false };
    },

    // Encryption/decryption
    encrypt(data, key) {
        return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    },

    decrypt(encryptedData, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    },

    // Key derivation
    deriveKey(password, salt) {
        return CryptoJS.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 10000
        }).toString();
    },

    generateSalt() {
        return CryptoJS.lib.WordArray.random(128 / 8).toString();
    },

    hashPassword(password, salt) {
        const key = this.deriveKey(password, salt);
        return CryptoJS.SHA256(key).toString();
    },

    // Session management (Brave compatible)
    getSessionKey() {
        const storage = this.getStorage('session');
        return storage.getItem('vault_session_key');
    },

    setSessionKey(key) {
        const storage = this.getStorage('session');
        storage.setItem('vault_session_key', key);
    },

    clearSession() {
        const storage = this.getStorage('session');
        storage.removeItem('vault_session_key');
    },

    // Vault data operations (Brave compatible)
    loadVaultData() {
        const key = this.getSessionKey();
        if (!key) return null;

        const storage = this.getStorage('local');
        const encrypted = storage.getItem('dissident_vault_data');
        if (!encrypted) {
            return { 
                services: {}, 
                history: [], 
                railwayToken: null, 
                githubToken: null,
                autoDeploy: false 
            };
        }

        return this.decrypt(encrypted, key) || { 
            services: {}, 
            history: [], 
            railwayToken: null, 
            githubToken: null,
            autoDeploy: false 
        };
    },

    saveVaultData(data) {
        const key = this.getSessionKey();
        if (!key) return false;

        const encrypted = this.encrypt(data, key);
        const storage = this.getStorage('local');
        storage.setItem('dissident_vault_data', encrypted);
        
        // Update metadata
        const metaStorage = this.getStorage('local');
        const metaStr = metaStorage.getItem('dissident_vault_meta');
        const meta = metaStr ? JSON.parse(metaStr) : {};
        meta.lastAccessed = new Date().toISOString();
        metaStorage.setItem('dissident_vault_meta', JSON.stringify(meta));
        
        return true;
    },

    // Token getters/setters
    getRailwayToken() {
        const data = this.loadVaultData();
        return data?.railwayToken;
    },

    setRailwayToken(token) {
        const data = this.loadVaultData();
        if (data) {
            data.railwayToken = token;
            this.saveVaultData(data);
        }
    },

    getGitHubToken() {
        const data = this.loadVaultData();
        return data?.githubToken;
    },

    setGitHubToken(token) {
        const data = this.loadVaultData();
        if (data) {
            data.githubToken = token;
            this.saveVaultData(data);
        }
    },

    // Auto-deploy setting
    getAutoDeploy() {
        const data = this.loadVaultData();
        return data?.autoDeploy || false;
    },

    setAutoDeploy(enabled) {
        const data = this.loadVaultData();
        if (data) {
            data.autoDeploy = enabled;
            this.saveVaultData(data);
        }
    },

    // Initialize vault (Brave compatible)
    initialize(password) {
        const salt = this.generateSalt();
        const keyHash = this.hashPassword(password, salt);
        
        const meta = {
            version: '2.0.0',
            salt: salt,
            keyHash: keyHash,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };

        const storage = this.getStorage('local');
        storage.setItem('dissident_vault_meta', JSON.stringify(meta));
        
        const key = this.deriveKey(password, salt);
        this.setSessionKey(key);
        
        const initialData = { 
            services: {}, 
            history: [], 
            railwayToken: null, 
            githubToken: null,
            autoDeploy: false 
        };
        
        this.saveVaultData(initialData);
        return initialData;
    },

    // Verify password (Brave compatible)
    verifyPassword(password) {
        const storage = this.getStorage('local');
        const metaStr = storage.getItem('dissident_vault_meta');
        const meta = metaStr ? JSON.parse(metaStr) : {};
        if (!meta.salt) return false;

        const keyHash = this.hashPassword(password, meta.salt);
        return keyHash === meta.keyHash;
    },

    // Unlock vault (Brave compatible)
    unlock(password) {
        if (!this.verifyPassword(password)) {
            return { success: false, error: 'Invalid password' };
        }

        const storage = this.getStorage('local');
        const metaStr = storage.getItem('dissident_vault_meta');
        const meta = metaStr ? JSON.parse(metaStr) : {};
        const key = this.deriveKey(password, meta.salt);
        this.setSessionKey(key);
        
        meta.lastAccessed = new Date().toISOString();
        storage.setItem('dissident_vault_meta', JSON.stringify(meta));
        
        return { success: true, data: this.loadVaultData() };
    },

    // Service operations
    getServiceVariables(serviceId) {
        const data = this.loadVaultData();
        return data?.services?.[serviceId] || {};
    },

    setServiceVariable(serviceId, key, value) {
        const data = this.loadVaultData();
        if (!data) return false;

        if (!data.services[serviceId]) {
            data.services[serviceId] = {};
        }

        data.services[serviceId][key] = value;
        return this.saveVaultData(data);
    },

    // History
    addHistory(service, variable, action) {
        const data = this.loadVaultData();
        if (!data) return false;

        if (!data.history) data.history = [];
        
        data.history.unshift({
            timestamp: new Date().toISOString(),
            service,
            variable,
            action
        });

        if (data.history.length > 50) {
            data.history = data.history.slice(0, 50);
        }

        return this.saveVaultData(data);
    },

    // Export/Import
    exportAll() {
        const data = this.loadVaultData();
        return {
            exportedAt: new Date().toISOString(),
            version: '2.0.0',
            data: data
        };
    },

    // Check if vault exists
    vaultExists() {
        return !!localStorage.getItem('dissident_vault_meta');
    }
};

// Export
window.VaultData = VaultData;
