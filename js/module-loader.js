/**
 * module-loader.js - Robust Module Loading with Error Recovery
 * Ensures all modules load with fallback handling
 */

const ModuleLoader = {
    // Configuration
    config: {
        retryAttempts: 3,
        retryDelay: 500,
        timeout: 10000
    },

    // Track loading status
    modules: {},
    errors: [],

    /**
     * Initialize module loading
     */
    async init() {
        console.log('[ModuleLoader] Initializing...');

        // Define module load order
        const moduleOrder = [
            { name: 'VaultCore', required: true },
            { name: 'VaultUI', required: true },
            { name: 'AutoHealSystem', required: false },
            { name: 'OllamaCloudIntegration', required: false }
        ];

        for (const mod of moduleOrder) {
            await this.loadModule(mod.name, mod.required);
        }

        // Hide bootstrap loader when done
        if (typeof window.hideBootstrapLoader === 'function') {
            window.hideBootstrapLoader();
        }
    },

    /**
     * Load a module with retry and fallback
     */
    async loadModule(name, required = false) {
        console.log(`[ModuleLoader] Loading ${name}...`);

        // Check if already loaded
        if (this.isModuleLoaded(name)) {
            console.log(`[ModuleLoader] ${name} already loaded`);
            this.modules[name] = { status: 'loaded', source: 'existing' };
            return true;
        }

        // Try loading with retries
        for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
            try {
                if (this.isModuleLoaded(name)) {
                    this.modules[name] = { status: 'loaded', attempt };
                    console.log(`[ModuleLoader] ${name} loaded on attempt ${attempt}`);
                    return true;
                }

                if (attempt < this.config.retryAttempts) {
                    await this.sleep(this.config.retryDelay * attempt);
                }
            } catch (err) {
                console.warn(`[ModuleLoader] ${name} attempt ${attempt} failed:`, err);
            }
        }

        // Module failed to load
        if (required) {
            console.error(`[ModuleLoader] ${name} failed to load after ${this.config.retryAttempts} attempts`);
            this.errors.push({ module: name, error: 'Failed to load' });

            // Create stub for required modules
            this.createStub(name);
        } else {
            console.warn(`[ModuleLoader] ${name} optional module not loaded`);
            this.modules[name] = { status: 'skipped' };
        }

        return false;
    },

    /**
     * Check if module is loaded
     */
    isModuleLoaded(name) {
        switch (name) {
            case 'VaultCore':
                return typeof VaultCore !== 'undefined' &&
                       typeof VaultCore.loadVaultData === 'function';
            case 'VaultUI':
                return typeof VaultUI !== 'undefined';
            case 'AutoHealSystem':
                return typeof AutoHealSystem !== 'undefined';
            case 'OllamaCloudIntegration':
                return typeof OllamaCloudIntegration !== 'undefined';
            default:
                return typeof window[name] !== 'undefined';
        }
    },

    /**
     * Create stub for failed required module
     */
    createStub(name) {
        console.log(`[ModuleLoader] Creating stub for ${name}`);

        switch (name) {
            case 'VaultCore':
                window.VaultCore = this.createVaultCoreStub();
                break;
            case 'VaultUI':
                window.VaultUI = this.createVaultUIStub();
                break;
        }

        this.modules[name] = { status: 'stub' };
    },

    /**
     * VaultCore stub
     */
    createVaultCoreStub() {
        return {
            _stub: true,
            config: { sessionTimeoutMinutes: 15 },
            sessionTimeout: { lastActivity: Date.now() },

            loadVaultData() {
                console.warn('[VaultCore Stub] loadVaultData called');
                return { services: {}, shared: {}, history: [] };
            },

            saveVaultData() {
                console.warn('[VaultCore Stub] saveVaultData called');
                return true;
            },

            getStorage() {
                return {
                    getItem: () => null,
                    setItem: () => {},
                    removeItem: () => {}
                };
            },

            vaultExists() {
                return false;
            },

            unlock() {
                return { success: false, error: 'VaultCore not properly loaded' };
            },

            init() {
                console.log('[VaultCore Stub] Initialized in stub mode');
                return Promise.resolve();
            }
        };
    },

    /**
     * VaultUI stub
     */
    createVaultUIStub() {
        return {
            _stub: true,

            init() {
                console.log('[VaultUI Stub] Initialized in stub mode');
            },

            showToast(message, type = 'info') {
                console.log(`[Toast] ${message}`);
                alert(message);
            },

            renderServices() {
                console.warn('[VaultUI Stub] renderServices called');
            }
        };
    },

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Get loading status
     */
    getStatus() {
        return {
            modules: this.modules,
            errors: this.errors,
            allLoaded: Object.values(this.modules).every(m =>
                m.status === 'loaded' || m.status === 'skipped'
            )
        };
    }
};

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ModuleLoader.init());
} else {
    ModuleLoader.init();
}

// Export
window.ModuleLoader = ModuleLoader;
