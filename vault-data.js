// vault-data.js - Complete Encryption and Storage Management

const VaultData = {
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

    // Session management
    getSessionKey() {
        return sessionStorage.getItem('vault_session_key');
    },

    setSessionKey(key) {
        sessionStorage.setItem('vault_session_key', key);
    },

    clearSession() {
        sessionStorage.removeItem('vault_session_key');
    },

    // Vault data operations
    loadVaultData() {
        const key = this.getSessionKey();
        if (!key) return null;

        const encrypted = localStorage.getItem('dissident_vault_data');
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
        localStorage.setItem('dissident_vault_data', encrypted);
        
        // Update metadata
        const meta = JSON.parse(localStorage.getItem('dissident_vault_meta') || '{}');
        meta.lastAccessed = new Date().toISOString();
        localStorage.setItem('dissident_vault_meta', JSON.stringify(meta));
        
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

    // Initialize vault
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

        localStorage.setItem('dissident_vault_meta', JSON.stringify(meta));
        
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

    // Verify password
    verifyPassword(password) {
        const meta = JSON.parse(localStorage.getItem('dissident_vault_meta') || '{}');
        if (!meta.salt) return false;

        const keyHash = this.hashPassword(password, meta.salt);
        return keyHash === meta.keyHash;
    },

    // Unlock vault
    unlock(password) {
        if (!this.verifyPassword(password)) {
            return { success: false, error: 'Invalid password' };
        }

        const meta = JSON.parse(localStorage.getItem('dissident_vault_meta') || '{}');
        const key = this.deriveKey(password, meta.salt);
        this.setSessionKey(key);
        
        meta.lastAccessed = new Date().toISOString();
        localStorage.setItem('dissident_vault_meta', JSON.stringify(meta));
        
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
