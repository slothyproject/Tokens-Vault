/**
 * vault-core.js - Core encryption and storage module
 */

const VaultCore = {
    encrypt(data, key) {
        return CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
    },

    decrypt(encryptedData, key) {
        try {
            const bytes = CryptoJS.AES.decrypt(encryptedData, key);
            return JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
        } catch (e) {
            return null;
        }
    },

    getSessionKey() {
        return sessionStorage.getItem('vault_session_key');
    },

    setSessionKey(key) {
        sessionStorage.setItem('vault_session_key', key);
    },

    clearSession() {
        sessionStorage.removeItem('vault_session_key');
    },

    loadVaultData() {
        const key = this.getSessionKey();
        if (!key) return null;

        const encrypted = localStorage.getItem('dissident_vault_data');
        if (!encrypted) {
            return { services: {}, history: [], railwayToken: null, githubToken: null, autoDeploy: false };
        }

        return this.decrypt(encrypted, key) || { services: {}, history: [], railwayToken: null, githubToken: null, autoDeploy: false };
    },

    saveVaultData(data) {
        const key = this.getSessionKey();
        if (!key) return false;

        const encrypted = this.encrypt(data, key);
        localStorage.setItem('dissident_vault_data', encrypted);
        
        const meta = JSON.parse(localStorage.getItem('dissident_vault_meta') || '{}');
        meta.lastAccessed = new Date().toISOString();
        localStorage.setItem('dissident_vault_meta', JSON.stringify(meta));
        
        return true;
    },

    vaultExists() {
        return !!localStorage.getItem('dissident_vault_meta');
    },

    initialize(password) {
        const salt = CryptoJS.lib.WordArray.random(128/8).toString();
        const key = CryptoJS.PBKDF2(password, salt, { keySize: 256/32, iterations: 10000 }).toString();
        const keyHash = CryptoJS.SHA256(key).toString();

        const meta = {
            version: '2.0.0',
            salt: salt,
            keyHash: keyHash,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };

        localStorage.setItem('dissident_vault_meta', JSON.stringify(meta));
        this.setSessionKey(key);

        const initialData = { services: {}, history: [], railwayToken: null, githubToken: null, autoDeploy: false };
        this.saveVaultData(initialData);
        return initialData;
    },

    unlock(password) {
        const meta = JSON.parse(localStorage.getItem('dissident_vault_meta') || '{}');
        if (!meta.salt) return { success: false, error: 'Vault not initialized' };

        const key = CryptoJS.PBKDF2(password, meta.salt, { keySize: 256/32, iterations: 10000 });
        const keyHash = CryptoJS.SHA256(key.toString()).toString();

        if (keyHash !== meta.keyHash) {
            return { success: false, error: 'Invalid password' };
        }

        this.setSessionKey(key.toString());
        meta.lastAccessed = new Date().toISOString();
        localStorage.setItem('dissident_vault_meta', JSON.stringify(meta));

        return { success: true, data: this.loadVaultData() };
    }
};

window.VaultCore = VaultCore;
