/**
 * vault-core.js - Core encryption and storage module with Brave browser compatibility
 */

const VaultCore = {
    // Configuration
    config: {
        sessionTimeoutMinutes: 15, // Auto-lock after 15 minutes of inactivity
        warningMinutes: 1 // Show warning 1 minute before lock
    },

    // Session timeout tracking
    sessionTimeout: {
        lastActivity: Date.now(),
        warningShown: false,
        checkInterval: null,
        isLocked: false
    },

    // Activity listeners for cleanup
    _activityListeners: [],

    // Event system for reactive updates
    events: {
        listeners: {},
        
        on(event, callback) {
            if (!this.listeners[event]) this.listeners[event] = [];
            this.listeners[event].push(callback);
        },
        
        off(event, callback) {
            if (this.listeners[event]) {
                this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
            }
        },
        
        emit(event, data) {
            if (this.listeners[event]) {
                this.listeners[event].forEach(callback => {
                    try {
                        callback(data);
                    } catch (e) {
                        console.error('[VaultCore] Event handler error:', e);
                    }
                });
            }
        }
    },

    // Subscribe to an event
    on(event, callback) {
        this.events.on(event, callback);
    },
    
    // Unsubscribe from an event
    off(event, callback) {
        this.events.off(event, callback);
    },

    // Start session timeout monitoring
    startSessionTimeout() {
        // Reset last activity
        this.resetSessionTimeout();
        
        // Clear any existing listeners first (prevent duplicates)
        this.clearSessionListeners();
        
        // Track listeners for cleanup
        this._activityListeners = [];
        
        // Add event listeners for activity
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        events.forEach(event => {
            const listener = () => this.resetSessionTimeout();
            this._activityListeners.push({ event, listener });
            document.addEventListener(event, listener, { passive: true });
        });
        
        // Clear existing interval first
        if (this.sessionTimeout.checkInterval) {
            clearInterval(this.sessionTimeout.checkInterval);
        }
        
        // Start checking interval
        this.sessionTimeout.checkInterval = setInterval(() => {
            this.checkSessionTimeout();
        }, 10000); // Check every 10 seconds
        
        console.log('[VaultCore] Session timeout monitoring started');
    },
    
    // Clear session event listeners
    clearSessionListeners() {
        if (this._activityListeners) {
            this._activityListeners.forEach(({ event, listener }) => {
                document.removeEventListener(event, listener);
            });
            this._activityListeners = [];
        }
    },
    
    // Reset session timeout on activity
    resetSessionTimeout() {
        this.sessionTimeout.lastActivity = Date.now();
        this.sessionTimeout.warningShown = false;
        
        // Hide warning if shown
        const warningEl = document.getElementById('timeoutWarning');
        if (warningEl) warningEl.classList.add('hidden');
    },
    
    // Check if session should timeout
    checkSessionTimeout() {
        if (this.sessionTimeout.isLocked) return;
        
        const inactiveTime = Date.now() - this.sessionTimeout.lastActivity;
        const timeoutMs = this.config.sessionTimeoutMinutes * 60 * 1000;
        const warningMs = (this.config.sessionTimeoutMinutes - this.config.warningMinutes) * 60 * 1000;
        
        // Show warning 1 minute before timeout
        if (inactiveTime > warningMs && !this.sessionTimeout.warningShown) {
            this.showTimeoutWarning();
            this.sessionTimeout.warningShown = true;
        }
        
        // Lock if timeout reached
        if (inactiveTime > timeoutMs) {
            this.lockDueToTimeout();
        }
    },
    
    // Show timeout warning modal
    showTimeoutWarning() {
        const warningHtml = `
            <div id="timeoutWarning" class="timeout-warning">
                <div class="timeout-content">
                    <h3>⏰ Session Timeout Warning</h3>
                    <p>Your vault will lock in ${this.config.warningMinutes} minute(s) due to inactivity.</p>
                    <button class="btn-primary" onclick="VaultCore.dismissTimeoutWarning()">
                        Continue Session
                    </button>
                </div>
            </div>
        `;
        
        // Append to body if not exists
        if (!document.getElementById('timeoutWarning')) {
            document.body.insertAdjacentHTML('beforeend', warningHtml);
        } else {
            document.getElementById('timeoutWarning').classList.remove('hidden');
        }
    },
    
    // Dismiss timeout warning
    dismissTimeoutWarning() {
        this.resetSessionTimeout();
        const warningEl = document.getElementById('timeoutWarning');
        if (warningEl) warningEl.classList.add('hidden');
    },
    
    // Lock vault due to timeout
    lockDueToTimeout() {
        this.sessionTimeout.isLocked = true;
        
        // Clear interval
        if (this.sessionTimeout.checkInterval) {
            clearInterval(this.sessionTimeout.checkInterval);
            this.sessionTimeout.checkInterval = null;
        }
        
        // Clear event listeners
        this.clearSessionListeners();
        
        // Clear session
        this.lock();
        
        // Redirect to login
        window.location.href = 'login.html?timeout=true';
    },
    
    // Stop session timeout monitoring
    stopSessionTimeout() {
        if (this.sessionTimeout.checkInterval) {
            clearInterval(this.sessionTimeout.checkInterval);
            this.sessionTimeout.checkInterval = null;
        }
        
        // Clear event listeners
        this.clearSessionListeners();
        
        console.log('[VaultCore] Session timeout monitoring stopped');
    },

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
                shared: {},         // NEW: Shared variables across all services
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

        // Ensure shared section exists (migration for existing vaults)
        if (!decrypted.shared) {
            decrypted.shared = {};
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
                iterations: 100000  // Increased from 10000 for better security
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
                shared: {},         // NEW: Shared variables across all services
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

    // Unlock existing vault with backward compatibility
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

            let key, keyHash;
            let usedIterations = 100000;
            let isLegacy = false;

            // Try new secure format first (100,000 iterations)
            key = CryptoJS.PBKDF2(password, meta.salt, { 
                keySize: 256/32, 
                iterations: 100000 
            });
            keyHash = CryptoJS.SHA256(key.toString()).toString();

            // Check if matches new format
            if (keyHash === meta.keyHash) {
                console.log('[VaultCore] Unlocked with enhanced security (100k iterations)');
                usedIterations = 100000;
                isLegacy = false;
            } else {
                // Try legacy format (10,000 iterations) for backward compatibility
                console.log('[VaultCore] New format failed, trying legacy format...');
                
                key = CryptoJS.PBKDF2(password, meta.salt, { 
                    keySize: 256/32, 
                    iterations: 10000 
                });
                keyHash = CryptoJS.SHA256(key.toString()).toString();

                if (keyHash === meta.keyHash) {
                    console.log('[VaultCore] Unlocked with legacy format (10k iterations)');
                    usedIterations = 10000;
                    isLegacy = true;
                    
                    // Optionally upgrade to new format on successful unlock
                    // This happens automatically on next save
                } else {
                    // Neither worked - wrong password
                    return { success: false, error: 'Invalid password' };
                }
            }

            this.setSessionKey(key.toString());
            
            // Update last accessed
            meta.lastAccessed = new Date().toISOString();
            this.safeSet('dissident_vault_meta', JSON.stringify(meta), 'local');

            const result = { 
                success: true, 
                data: this.loadVaultData(),
                security: isLegacy ? 'legacy' : 'enhanced',
                iterations: usedIterations
            };

            if (isLegacy) {
                console.log('[VaultCore] Note: Vault is using legacy security. Consider re-saving to upgrade.');
            }

            return result;
            
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

    // Shared Variables Management
    
    // Get variable value (resolves shared vs local priority)
    getVariable(serviceId, key) {
        const data = this.loadVaultData();
        if (!data) return null;
        
        // Priority: Local service variable > Shared variable
        const serviceVars = data.services[serviceId] || {};
        if (key in serviceVars) {
            return serviceVars[key];
        }
        
        // Fall back to shared
        return data.shared[key] || null;
    },
    
    // Get all variables for a service (merged shared + local)
    getServiceVariables(serviceId) {
        const data = this.loadVaultData();
        if (!data) return {};
        
        const serviceVars = data.services[serviceId] || {};
        
        // Merge: service vars override shared
        return {
            ...data.shared,
            ...serviceVars
        };
    },
    
    // Check if variable is inherited from shared
    isSharedVariable(serviceId, key) {
        const data = this.loadVaultData();
        if (!data) return false;
        
        const serviceVars = data.services[serviceId] || {};
        return (key in data.shared) && !(key in serviceVars);
    },
    
    // Save shared variable
    saveSharedVariable(key, value) {
        const data = this.loadVaultData();
        if (!data) return false;
        
        if (!data.shared) data.shared = {};
        
        const oldValue = data.shared[key];
        data.shared[key] = value;
        
        this.saveVaultData(data);
        
        // Emit event for reactive updates
        this.events.emit('sharedVariableChanged', {
            key,
            value,
            oldValue,
            isNew: !oldValue,
            affectedServices: this.getServicesUsingVariable(key)
        });
        
        // Add to history
        this.addHistory('shared', oldValue ? 'updated' : 'created', { 
            key, 
            oldValue, 
            newValue: value 
        });
        
        return true;
    },
    
    // Delete shared variable
    deleteSharedVariable(key) {
        const data = this.loadVaultData();
        if (!data || !data.shared) return false;
        
        const oldValue = data.shared[key];
        delete data.shared[key];
        
        this.saveVaultData(data);
        
        // Emit event for reactive updates
        this.events.emit('sharedVariableDeleted', {
            key,
            oldValue,
            affectedServices: this.getServicesUsingVariable(key)
        });
        
        this.addHistory('shared', 'deleted', { key, oldValue });
        
        return true;
    },
    
    // Get all services that use a specific variable
    getServicesUsingVariable(key) {
        const data = this.loadVaultData();
        if (!data) return [];
        
        const services = [];
        
        // Check each service
        Object.entries(data.services || {}).forEach(([serviceId, variables]) => {
            // Service has this variable locally OR inherits from shared
            if (variables[key] || data.shared?.[key]) {
                services.push(serviceId);
            }
        });
        
        return services;
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
