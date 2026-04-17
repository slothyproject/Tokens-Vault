// vault-data.js - Encryption and data management for Token Vault

const VaultData = {
    // Encryption/decryption functions
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

    // Generate encryption key from password
    deriveKey(password, salt) {
        return CryptoJS.PBKDF2(password, salt, {
            keySize: 256 / 32,
            iterations: 10000
        }).toString();
    },

    // Generate random salt
    generateSalt() {
        return CryptoJS.lib.WordArray.random(128 / 8).toString();
    },

    // Hash password for verification
    hashPassword(password, salt) {
        const key = this.deriveKey(password, salt);
        return CryptoJS.SHA256(key).toString();
    },

    // Initialize vault metadata
    initMetadata(password) {
        const salt = this.generateSalt();
        const keyHash = this.hashPassword(password, salt);
        
        return {
            version: '2.0.0',
            salt: salt,
            keyHash: keyHash,
            createdAt: new Date().toISOString(),
            lastAccessed: new Date().toISOString()
        };
    },

    // Verify password
    verifyPassword(password, metadata) {
        const keyHash = this.hashPassword(password, metadata.salt);
        return keyHash === metadata.keyHash;
    },

    // Get session key
    getSessionKey() {
        return sessionStorage.getItem('vault_session_key');
    },

    // Set session key
    setSessionKey(key) {
        sessionStorage.setItem('vault_session_key', key);
    },

    // Clear session
    clearSession() {
        sessionStorage.removeItem('vault_session_key');
    },

    // Load vault data
    loadVaultData() {
        const key = this.getSessionKey();
        if (!key) return null;

        const encrypted = localStorage.getItem('dissident_vault_data');
        if (!encrypted) return { services: {}, history: [], railwayToken: null };

        return this.decrypt(encrypted, key) || { services: {}, history: [], railwayToken: null };
    },

    // Save vault data
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

    // Update metadata
    updateMetadata(callback) {
        const meta = JSON.parse(localStorage.getItem('dissident_vault_meta') || '{}');
        if (callback) callback(meta);
        localStorage.setItem('dissident_vault_meta', JSON.stringify(meta));
    },

    // Check if vault exists
    vaultExists() {
        return !!localStorage.getItem('dissident_vault_meta');
    },

    // Initialize vault
    initialize(password) {
        const metadata = this.initMetadata(password);
        localStorage.setItem('dissident_vault_meta', JSON.stringify(metadata));
        
        const key = this.deriveKey(password, metadata.salt);
        this.setSessionKey(key);
        
        const initialData = { services: {}, history: [], railwayToken: null };
        this.saveVaultData(initialData);
        
        return { success: true, key };
    },

    // Unlock vault
    unlock(password) {
        const meta = JSON.parse(localStorage.getItem('dissident_vault_meta') || '{}');
        if (!meta.salt) return { success: false, error: 'Vault not initialized' };

        if (!this.verifyPassword(password, meta)) {
            return { success: false, error: 'Invalid password' };
        }

        const key = this.deriveKey(password, meta.salt);
        this.setSessionKey(key);
        
        // Update last accessed
        this.updateMetadata(m => m.lastAccessed = new Date().toISOString());
        
        return { success: true, key };
    },

    // Lock vault
    lock() {
        this.clearSession();
    },

    // Export service data
    exportService(serviceId, servicesConfig) {
        const data = this.loadVaultData();
        if (!data || !data.services[serviceId]) return null;

        const service = servicesConfig.services.find(s => s.id === serviceId);
        if (!service) return null;

        let envContent = `# ${service.name} Environment Variables\n`;
        envContent += `# Generated: ${new Date().toISOString()}\n\n`;
        
        Object.entries(data.services[serviceId]).forEach(([key, value]) => {
            if (value) {
                envContent += `${key}=${value}\n`;
            }
        });

        return {
            content: envContent,
            filename: `${serviceId}.env`
        };
    },

    // Export all services
    exportAllServices(servicesConfig) {
        const data = this.loadVaultData();
        if (!data) return null;

        let allContent = `# Dissident Platform - All Services\n`;
        allContent += `# Generated: ${new Date().toISOString()}\n\n`;
        
        servicesConfig.services.forEach(service => {
            if (data.services[service.id]) {
                allContent += `# === ${service.name} ===\n`;
                
                Object.entries(data.services[service.id]).forEach(([key, value]) => {
                    if (value) {
                        allContent += `${key}=${value}\n`;
                    }
                });
                allContent += '\n';
            }
        });

        return {
            content: allContent,
            filename: 'dissident-all-services.env'
        };
    },

    // Import from tokens.env format
    importFromTokensEnv(content, servicesConfig) {
        const lines = content.split('\n');
        const data = this.loadVaultData() || { services: {}, history: [], railwayToken: null };
        let imported = 0;
        const mappings = [];

        lines.forEach(line => {
            const match = line.match(/^([^:]+):\s*(.+)$/);
            if (match) {
                const name = match[1].trim();
                const value = match[2].trim();
                
                // Map to appropriate service
                if (name.toLowerCase().includes('discord')) {
                    if (!data.services['dissident-backend']) data.services['dissident-backend'] = {};
                    
                    if (name.toLowerCase().includes('token')) {
                        data.services['dissident-backend']['DISCORD_BOT_TOKEN'] = value;
                        mappings.push({ service: 'dissident-backend', key: 'DISCORD_BOT_TOKEN', value });
                    }
                    imported++;
                } else if (name.toLowerCase().includes('client')) {
                    if (name.toLowerCase().includes('secret')) {
                        if (!data.services['dissident-backend']) data.services['dissident-backend'] = {};
                        data.services['dissident-backend']['DISCORD_CLIENT_SECRET'] = value;
                        mappings.push({ service: 'dissident-backend', key: 'DISCORD_CLIENT_SECRET', value });
                        imported++;
                    } else if (name.toLowerCase().includes('id')) {
                        if (!data.services['dissident-backend']) data.services['dissident-backend'] = {};
                        data.services['dissident-backend']['DISCORD_CLIENT_ID'] = value;
                        mappings.push({ service: 'dissident-backend', key: 'DISCORD_CLIENT_ID', value });
                        imported++;
                    }
                } else if (name.toLowerCase().includes('jwt')) {
                    if (!data.services['dissident-backend']) data.services['dissident-backend'] = {};
                    data.services['dissident-backend']['JWT_SECRET'] = value;
                    mappings.push({ service: 'dissident-backend', key: 'JWT_SECRET', value });
                    imported++;
                } else if (name.toLowerCase().includes('railway')) {
                    // Railway token stored at top level
                    data.railwayToken = value;
                    mappings.push({ service: 'global', key: 'RAILWAY_TOKEN', value });
                    imported++;
                }
            }
        });

        // Add history entry
        if (!data.history) data.history = [];
        data.history.unshift({
            timestamp: new Date().toISOString(),
            service: 'IMPORT',
            variable: 'tokens.env',
            action: `imported ${imported} variables`
        });

        this.saveVaultData(data);

        return { success: true, imported, mappings };
    },

    // Add history entry
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

        // Keep only last 50 entries
        if (data.history.length > 50) {
            data.history = data.history.slice(0, 50);
        }

        return this.saveVaultData(data);
    },

    // Clear history
    clearHistory() {
        const data = this.loadVaultData();
        if (!data) return false;
        
        data.history = [];
        return this.saveVaultData(data);
    },

    // Save Railway token
    saveRailwayToken(token) {
        const data = this.loadVaultData();
        if (!data) return false;
        
        data.railwayToken = token;
        return this.saveVaultData(data);
    },

    // Get Railway token
    getRailwayToken() {
        const data = this.loadVaultData();
        return data?.railwayToken;
    },

    // Update service variable
    updateVariable(serviceId, key, value) {
        const data = this.loadVaultData();
        if (!data) return false;

        if (!data.services[serviceId]) {
            data.services[serviceId] = {};
        }

        const oldValue = data.services[serviceId][key];
        data.services[serviceId][key] = value;

        // Add history
        this.addHistory(serviceId, key, oldValue ? 'updated' : 'created');

        return this.saveVaultData(data);
    },

    // Get service variables
    getServiceVariables(serviceId) {
        const data = this.loadVaultData();
        return data?.services?.[serviceId] || {};
    },

    // Create backup
    createBackup() {
        const data = this.loadVaultData();
        if (!data) return null;

        const backup = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            data: data
        };

        const backups = JSON.parse(localStorage.getItem('dissident_vault_backups') || '[]');
        backups.unshift(backup);
        
        // Keep only last 10 backups
        if (backups.length > 10) {
            backups.pop();
        }

        localStorage.setItem('dissident_vault_backups', JSON.stringify(backups));
        return backup;
    },

    // Restore from backup
    restoreFromBackup(index) {
        const backups = JSON.parse(localStorage.getItem('dissident_vault_backups') || '[]');
        if (index >= backups.length) return false;

        const backup = backups[index];
        return this.saveVaultData(backup.data);
    },

    // Get backups
    getBackups() {
        return JSON.parse(localStorage.getItem('dissident_vault_backups') || '[]');
    },

    // Generate secure random secret
    generateSecret(length = 64) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VaultData;
}
