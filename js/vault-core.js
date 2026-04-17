/**
 * vault-core.js - Core encryption and storage module with Brave browser compatibility
 */

const VaultCore = {
    // In-memory fallback for Brave/restricted browsers
    memoryStorage: {
        vault_session_key: null,
        dissident_vault_data: null,
        dissident_vault_meta: null
    },

    // Storage detection and fallback
    storageAvailable(type) {
        try {
            const storage = window[type];
            const test = '__storage_test__';
            storage.setItem(test, test);
            storage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    },

    getStorage() {
        return {
            local: this.storageAvailable('localStorage'),
            session: this.storageAvailable('sessionStorage')
        };
    },

    // Safe storage getters/setters
    safeSet(key, value, type = 'local') {
        const storage = type === 'session' ? 'sessionStorage' : 'localStorage';
        try {
            if (this.storageAvailable(storage)) {
                window[storage].setItem(key, value);
                return true;
            }
        } catch (e) {
            console.warn(`${storage} not available, using memory fallback`);
        }
        // Fallback to memory
        this.memoryStorage[key] = value;
        return true;
    },

    safeGet(key, type = 'local') {
        const storage = type === 'session' ? 'sessionStorage' : 'localStorage';
        try {
            if (this.storageAvailable(storage)) {
                return window[storage].getItem(key);
            }
        } catch (e) {
            console.warn(`${storage} not available, using memory fallback`);
        }
        // Fallback to memory
        return this.memoryStorage[key] || null;
    },

    safeRemove(key, type = 'local') {
        const storage = type === 'session' ? 'sessionStorage' : 'localStorage';
        try {
            if (this.storageAvailable(storage)) {
                window[storage].removeItem(key);
                return;
            }
        } catch (e) {
            console.warn(`${storage} not available, using memory fallback`);
        }
        // Fallback to memory
        delete this.memoryStorage[key];
    },

    // Encryption/Decryption
    encrypt(data, key) {
        try {
            return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
        } catch (e) {
            console.error('Encryption failed:', e);
            return null;
        }
    },

    decrypt(encryptedData, key) {
        try {
            if (!encryptedData || !key) return null;
            const bytes = CryptoJS.AES.decrypt(encryptedData, key);
            const decrypted = bytes.toString(CryptoJS.enc.Utf8);
            if (!decrypted) return null;
            return JSON.parse(decrypted);
        } catch (e) {
            console.error('Decryption failed:', e);
            return null;
        }
    },

    // Session key management
    getSessionKey() {
        return this.safeGet('vault_session_key', 'session');
    },

    setSessionKey(key) {
        this.safeSet('vault_session_key', key, 'session');
    },

    clearSession() {
        this.safeRemove('vault_session_key', 'session');
        // Clear memory fallback too
        this.memoryStorage.vault_session_key = null;
    },

    // Vault data management
    loadVaultData() {
        const key = this.getSessionKey();
        if (!key) return null;

        const encrypted = this.safeGet('dissident_vault_data', 'local');
        if (!encrypted) {
            return { 
                services: {}, 
                history: [], 
                railwayToken: null, 
                githubToken: null, 
                autoDeploy: false 
            };
        }

        const decrypted = this.decrypt(encrypted, key);
        if (!decrypted) {
            console.error('Failed to decrypt vault data');
            return null;
        }

        return decrypted;
    },

    saveVaultData(data) {
        const key = this.getSessionKey();
        if (!key) {
            console.error('No session key available');
            return false;
        }

        const encrypted = this.encrypt(data, key);
        if (!encrypted) {
            console.error('Encryption failed');
            return false;
        }

        this.safeSet('dissident_vault_data', encrypted, 'local');
        
        // Update metadata
        const metaStr = this.safeGet('dissident_vault_meta', 'local');
        const meta = metaStr ? JSON.parse(metaStr) : {};
        meta.lastAccessed = new Date().toISOString();
        this.safeSet('dissident_vault_meta', JSON.stringify(meta), 'local');
        
        return true;
    },

    vaultExists() {
        return !!this.safeGet('dissident_vault_meta', 'local');
    },

    // Initialize new vault
    initialize(password) {
        if (!password || password.length < 1) {
            return { success: false, error: 'Password required' };
        }

        try {
            const salt = CryptoJS.lib.WordArray.random(128/8).toString();
            const key = CryptoJS.PBKDF2(password, salt, { 
                keySize: 256/32, 
                iterations: 10000 
            }).toString();
            const keyHash = CryptoJS.SHA256(key).toString();

            const meta = {
                version: '2.0.0',
                salt: salt,
                keyHash: keyHash,
                createdAt: new Date().toISOString(),
                lastAccessed: new Date().toISOString()
            };

            this.safeSet('dissident_vault_meta', JSON.stringify(meta), 'local');
            this.setSessionKey(key);

            const initialData = { 
                services: {}, 
                history: [], 
                railwayToken: null, 
                githubToken: null, 
                autoDeploy: false 
            };
            
            this.saveVaultData(initialData);
            return { success: true, data: initialData };
        } catch (e) {
            console.error('Initialization failed:', e);
            return { success: false, error: 'Initialization failed: ' + e.message };
        }
    },

    // Unlock existing vault
    unlock(password) {
        if (!password) {
            return { success: false, error: 'Password required' };
        }

        const metaStr = this.safeGet('dissident_vault_meta', 'local');
        if (!metaStr) {
            return { success: false, error: 'Vault not initialized' };
        }

        try {
            const meta = JSON.parse(metaStr);
            if (!meta.salt) {
                return { success: false, error: 'Invalid vault metadata' };
            }

            const key = CryptoJS.PBKDF2(password, meta.salt, { 
                keySize: 256/32, 
                iterations: 10000 
            });
            const keyHash = CryptoJS.SHA256(key.toString()).toString();

            if (keyHash !== meta.keyHash) {
                return { success: false, error: 'Invalid password' };
            }

            this.setSessionKey(key.toString());
            
            // Update last accessed
            meta.lastAccessed = new Date().toISOString();
            this.safeSet('dissident_vault_meta', JSON.stringify(meta), 'local');

            return { success: true, data: this.loadVaultData() };
        } catch (e) {
            console.error('Unlock failed:', e);
            return { success: false, error: 'Unlock failed: ' + e.message };
        }
    },

    // Security features
    lock() {
        this.clearSession();
        // Clear sensitive memory
        this.memoryStorage = {
            vault_session_key: null,
            dissident_vault_data: null,
            dissident_vault_meta: null
        };
    },

    changePassword(currentPassword, newPassword) {
        // First unlock with current password
        const unlockResult = this.unlock(currentPassword);
        if (!unlockResult.success) {
            return unlockResult;
        }

        const data = unlockResult.data;
        
        // Create new key with new password
        const salt = CryptoJS.lib.WordArray.random(128/8).toString();
        const key = CryptoJS.PBKDF2(newPassword, salt, { 
            keySize: 256/32, 
            iterations: 10000 
        }).toString();
        const keyHash = CryptoJS.SHA256(key).toString();

        const meta = {
            version: '2.0.0',
            salt: salt,
            keyHash: keyHash,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };

        this.safeSet('dissident_vault_meta', JSON.stringify(meta), 'local');
        this.setSessionKey(key);

        // Re-encrypt data with new key
        this.saveVaultData(data);
        
        return { success: true };
    },

    // History management
    addHistory(serviceId, action, details) {
        const data = this.loadVaultData();
        if (!data) return;

        if (!data.history) data.history = [];
        
        data.history.unshift({
            serviceId,
            action,
            details,
            timestamp: new Date().toISOString()
        });

        // Keep only last 100 entries
        if (data.history.length > 100) {
            data.history = data.history.slice(0, 100);
        }

        this.saveVaultData(data);
    },

    // Diagnostics
    getDiagnostics() {
        const storage = this.getStorage();
        return {
            localStorage: storage.local ? 'Available' : 'Unavailable',
            sessionStorage: storage.session ? 'Available' : 'Unavailable',
            usingMemoryFallback: !storage.local || !storage.session,
            vaultExists: this.vaultExists(),
            hasSessionKey: !!this.getSessionKey(),
            cryptoJsLoaded: typeof CryptoJS !== 'undefined'
        };
    }
};

window.VaultCore = VaultCore;

// Auto-detect and log on load
console.log('VaultCore loaded. Storage status:', VaultCore.getDiagnostics());
