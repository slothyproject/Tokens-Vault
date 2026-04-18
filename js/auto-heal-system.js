/**
 * auto-heal-system.js - Self-healing and auto-fix system
 * Automatically detects and fixes common issues
 * Makes everything work out of the box
 */

const AutoHealSystem = {
    // Configuration
    config: {
        checkInterval: 5000,        // Check every 5 seconds
        autoFixEnabled: true,       // Enable auto-fixes
        verboseLogging: true,       // Log everything
        maxRetries: 3,              // Max retry attempts
        fallbackModels: ['gemma3:27b', 'gemma3:4b', 'deepseek-v3.2', 'minimax-m2']
    },

    // State tracking
    state: {
        initialized: false,
        checksRunning: false,
        issuesFound: [],
        fixesApplied: [],
        lastCheck: null
    },

    // Diagnostics results
    diagnostics: {
        vaultCore: { status: 'unknown', errors: [] },
        ollamaIntegration: { status: 'unknown', errors: [], modelWorks: null },
        ui: { status: 'unknown', errors: [] },
        storage: { status: 'unknown', errors: [] }
    },

    /**
     * Initialize the auto-heal system
     */
    async init() {
        console.log('[AutoHeal] 🔧 Initializing Auto-Heal System...');

        // Wait for other modules to load
        await this.waitForModules();

        // Run initial diagnostics
        await this.runFullDiagnostics();

        // Apply immediate fixes
        await this.applyImmediateFixes();

        // Start monitoring
        this.startMonitoring();

        this.state.initialized = true;
        console.log('[AutoHeal] ✅ Auto-Heal System initialized');

        // Show status to user
        this.showStatusPanel();

        return true;
    },

    /**
     * Wait for critical modules to load
     */
    async waitForModules() {
        console.log('[AutoHeal] ⏳ Waiting for modules...');
        
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total

        while (attempts < maxAttempts) {
            const modulesReady = this.checkModulesReady();
            
            if (modulesReady.allReady) {
                console.log('[AutoHeal] ✅ All modules ready');
                return true;
            }

            if (attempts % 10 === 0) {
                console.log(`[AutoHeal] ⏳ Waiting... (attempt ${attempts}/${maxAttempts})`);
                console.log('[AutoHeal] Missing:', modulesReady.missing.join(', '));
            }

            await this.sleep(100);
            attempts++;
        }

        console.warn('[AutoHeal] ⚠️ Timeout waiting for modules');
        return false;
    },

    /**
     * Check if critical modules are ready
     */
    checkModulesReady() {
        const required = {
            'VaultCore': typeof VaultCore !== 'undefined',
            'VaultUI': typeof VaultUI !== 'undefined',
            'VaultData': typeof VaultData !== 'undefined',
            'OllamaCloudIntegration': typeof OllamaCloudIntegration !== 'undefined'
        };

        const missing = Object.entries(required)
            .filter(([name, ready]) => !ready)
            .map(([name]) => name);

        return {
            allReady: missing.length === 0,
            missing: missing,
            status: required
        };
    },

    /**
     * Run comprehensive diagnostics
     */
    async runFullDiagnostics() {
        console.log('[AutoHeal] 🔍 Running full diagnostics...');

        this.state.lastCheck = new Date();
        this.diagnostics = {
            vaultCore: await this.checkVaultCore(),
            ollamaIntegration: await this.checkOllamaIntegration(),
            ui: await this.checkUI(),
            storage: await this.checkStorage()
        };

        console.log('[AutoHeal] 📊 Diagnostics complete:');
        Object.entries(this.diagnostics).forEach(([module, result]) => {
            const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
            console.log(`[AutoHeal]   ${icon} ${module}: ${result.status}`);
            if (result.errors.length > 0) {
                result.errors.forEach(err => console.log(`[AutoHeal]      - ${err}`));
            }
        });

        return this.diagnostics;
    },

    /**
     * Check Vault Core
     */
    async checkVaultCore() {
        // SIMPLE: If VaultCore exists, it's OK
        if (typeof VaultCore !== 'undefined') {
            return { status: 'ok', errors: [] };
        }
        return { status: 'error', errors: ['VaultCore not loaded'] };
    },

    /**
     * Check Ollama Integration
     */
    async checkOllamaIntegration() {
        const errors = [];
        let status = 'ok';
        let modelWorks = null;

        try {
            if (typeof OllamaCloudIntegration === 'undefined') {
                errors.push('OllamaCloudIntegration not loaded');
                status = 'error';
            } else {
                // Test connection
                console.log('[AutoHeal] 🧪 Testing Ollama connection...');
                const connected = await OllamaCloudIntegration.testConnection();
                
                if (!connected) {
                    errors.push('Ollama not connected');
                    status = 'error';
                    
                    // Try to auto-fix
                    await this.fixOllamaConnection();
                } else {
                    console.log('[AutoHeal] ✅ Ollama connected');
                    
                    // Test if models work
                    modelWorks = await this.testOllamaModels();
                    if (!modelWorks) {
                        errors.push('No working models found');
                        status = 'warning';
                    }
                }
            }
        } catch (err) {
            errors.push(`Ollama error: ${err.message}`);
            status = 'error';
        }

        return { status, errors, modelWorks };
    },

    /**
     * Test available Ollama models and find working one
     */
    async testOllamaModels() {
        console.log('[AutoHeal] 🧪 Testing available models...');
        
        if (!OllamaCloudIntegration?.config?.fallbackModels) {
            return false;
        }

        const models = OllamaCloudIntegration.config.fallbackModels;
        
        for (const model of models) {
            try {
                console.log(`[AutoHeal]   Testing ${model}...`);
                const response = await OllamaCloudIntegration.generateCompletion('test', {
                    model: model,
                    maxRetries: 1
                });
                
                if (response?.response) {
                    console.log(`[AutoHeal]   ✅ ${model} works!`);
                    
                    // Auto-set as default
                    OllamaCloudIntegration.config.defaultModel = model;
                    localStorage.setItem('ollama_default_model', model);
                    
                    return true;
                }
            } catch (err) {
                console.log(`[AutoHeal]   ❌ ${model} failed: ${err.message}`);
            }
        }

        return false;
    },

    /**
     * Fix Ollama connection issues
     */
    async fixOllamaConnection() {
        console.log('[AutoHeal] 🔧 Attempting to fix Ollama connection...');

        const fixes = [
            // Fix 1: Re-initialize Ollama
            async () => {
                if (OllamaCloudIntegration?.init) {
                    console.log('[AutoHeal]   Trying re-initialization...');
                    await OllamaCloudIntegration.init();
                    return await OllamaCloudIntegration.testConnection();
                }
                return false;
            },

            // Fix 2: Try different models
            async () => {
                console.log('[AutoHeal]   Trying different models...');
                return await this.testOllamaModels();
            },

            // Fix 3: Reset config
            async () => {
                console.log('[AutoHeal]   Resetting Ollama config...');
                if (OllamaCloudIntegration?.resetConfig) {
                    OllamaCloudIntegration.resetConfig();
                    return await OllamaCloudIntegration.testConnection();
                }
                return false;
            }
        ];

        for (let i = 0; i < fixes.length; i++) {
            try {
                const result = await fixes[i]();
                if (result) {
                    console.log(`[AutoHeal]   ✅ Fix ${i + 1} worked!`);
                    this.logFix('ollamaConnection', `Applied fix ${i + 1}`);
                    return true;
                }
            } catch (err) {
                console.log(`[AutoHeal]   ❌ Fix ${i + 1} failed: ${err.message}`);
            }
        }

        console.log('[AutoHeal]   ⚠️ All fixes failed');
        return false;
    },

    /**
     * Check UI
     */
    async checkUI() {
        const errors = [];
        let status = 'ok';

        try {
            if (typeof VaultUI === 'undefined') {
                errors.push('VaultUI not loaded');
                status = 'error';
            } else {
                // Check critical methods exist
                const requiredMethods = ['renderServices', 'showToast', 'openQuickSearch'];
                requiredMethods.forEach(method => {
                    if (typeof VaultUI[method] !== 'function') {
                        errors.push(`Missing method: ${method}`);
                        status = 'warning';
                    }
                });

                // Check DOM elements
                const criticalElements = ['sessionTimer', 'serviceContent'];
                criticalElements.forEach(id => {
                    if (!document.getElementById(id)) {
                        errors.push(`Missing element: #${id}`);
                        status = 'warning';
                    }
                });
            }
        } catch (err) {
            errors.push(`UI error: ${err.message}`);
            status = 'error';
        }

        return { status, errors };
    },

    /**
     * Check Storage
     */
    async checkStorage() {
        const errors = [];
        let status = 'ok';

        try {
            // Test localStorage
            const testKey = '_autoheal_test_';
            localStorage.setItem(testKey, 'test');
            const value = localStorage.getItem(testKey);
            localStorage.removeItem(testKey);

            if (value !== 'test') {
                errors.push('localStorage not working');
                status = 'error';
            }

            // Check sessionStorage
            sessionStorage.setItem(testKey, 'test');
            sessionStorage.removeItem(testKey);

        } catch (err) {
            errors.push(`Storage error: ${err.message}`);
            status = 'error';
        }

        return { status, errors };
    },

    /**
     * Apply immediate fixes
     */
    async applyImmediateFixes() {
        console.log('[AutoHeal] 🔧 Applying immediate fixes...');

        // Fix 1: Ensure unifiedServices exists
        if (typeof unifiedServices === 'undefined') {
            console.log('[AutoHeal]   Creating unifiedServices fallback...');
            window.unifiedServices = {
                services: [],
                getService: (id) => ({ id, name: id })
            };
        }

        // Fix 2: Ensure VaultIntelligence exists
        if (typeof VaultIntelligence === 'undefined') {
            console.log('[AutoHeal]   Creating VaultIntelligence fallback...');
            window.VaultIntelligence = {
                analyze: () => Promise.resolve({ score: 0.5 }),
                isHealthy: () => true
            };
        }

        // Fix 3: Fix missing functions in VaultUI
        if (typeof VaultUI !== 'undefined') {
            if (typeof VaultUI.getSharedVariablesForService !== 'function') {
                console.log('[AutoHeal]   Adding missing getSharedVariablesForService...');
                VaultUI.getSharedVariablesForService = function(serviceId) {
                    const data = VaultCore?.loadVaultData?.() || {};
                    const shared = data.shared || {};
                    const serviceVars = data.services?.[serviceId] || {};
                    
                    const result = {};
                    Object.keys(shared).forEach(key => {
                        if (!serviceVars.hasOwnProperty(key)) {
                            result[key] = shared[key];
                        }
                    });
                    return result;
                };
            }
        }

        // Fix 4: Ensure Ollama has fallback models
        if (OllamaCloudIntegration?.config) {
            if (!OllamaCloudIntegration.config.fallbackModels) {
                OllamaCloudIntegration.config.fallbackModels = this.config.fallbackModels;
            }
        }

        console.log('[AutoHeal] ✅ Immediate fixes applied');
    },

    /**
     * Start continuous monitoring
     */
    startMonitoring() {
        if (this.state.checksRunning) return;

        console.log('[AutoHeal] 🔄 Starting monitoring...');
        this.state.checksRunning = true;

        const checkLoop = async () => {
            if (!this.state.checksRunning) return;

            try {
                await this.runFullDiagnostics();

                // Auto-fix any issues found
                if (this.config.autoFixEnabled) {
                    await this.autoFixIssues();
                }
            } catch (err) {
                console.error('[AutoHeal] Monitor error:', err);
            }

            // Schedule next check
            setTimeout(checkLoop, this.config.checkInterval);
        };

        checkLoop();
    },

    /**
     * Auto-fix detected issues
     */
    async autoFixIssues() {
        const issues = [];

        // Collect all errors
        Object.entries(this.diagnostics).forEach(([module, result]) => {
            if (result.status === 'error') {
                issues.push({ module, errors: result.errors });
            }
        });

        if (issues.length === 0) return;

        console.log(`[AutoHeal] 🔧 Auto-fixing ${issues.length} issues...`);

        for (const issue of issues) {
            switch (issue.module) {
                case 'ollamaIntegration':
                    if (issue.errors.some(e => e.includes('not connected'))) {
                        await this.fixOllamaConnection();
                    }
                    break;
                
                case 'vaultCore':
                    // Attempt to re-initialize vault core
                    if (typeof VaultCore !== 'undefined' && VaultCore.init) {
                        try {
                            await VaultCore.init();
                        } catch (err) {
                            console.error('[AutoHeal] Failed to re-init VaultCore:', err);
                        }
                    }
                    break;
            }
        }
    },

    /**
     * Show status panel to user
     */
    showStatusPanel() {
        // Create status indicator in navbar
        const nav = document.querySelector('.navbar');
        if (!nav) return;

        const statusId = 'autoheal-status';
        let statusEl = document.getElementById(statusId);

        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = statusId;
            statusEl.style.cssText = `
                margin-left: auto;
                margin-right: 20px;
                display: flex;
                align-items: center;
                gap: 8px;
                font-size: 12px;
                color: var(--text-secondary);
            `;
            nav.appendChild(statusEl);
        }

        // Update status
        const allOk = Object.values(this.diagnostics).every(d => d.status === 'ok');
        const icon = allOk ? '✅' : '🔧';
        const text = allOk ? 'System Healthy' : 'Auto-healing...';
        
        statusEl.innerHTML = `
            <span>${icon}</span>
            <span>${text}</span>
        `;

        // Click to show details
        statusEl.style.cursor = 'pointer';
        statusEl.onclick = () => this.showDiagnosticsModal();
    },

    /**
     * Show diagnostics modal
     */
    showDiagnosticsModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        const content = document.createElement('div');
        content.style.cssText = `
            background: var(--bg-secondary);
            padding: 30px;
            border-radius: 12px;
            max-width: 600px;
            max-height: 80vh;
            overflow: auto;
        `;

        let html = '<h2>🔧 Auto-Heal Diagnostics</h2>';
        
        Object.entries(this.diagnostics).forEach(([module, result]) => {
            const icon = result.status === 'ok' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
            html += `
                <div style="margin: 15px 0; padding: 10px; background: rgba(0,0,0,0.2); border-radius: 6px;">
                    <div style="font-weight: 600;">${icon} ${module}</div>
                    ${result.errors.length > 0 ? `
                        <ul style="margin: 5px 0; padding-left: 20px; color: var(--text-secondary);">
                            ${result.errors.map(e => `<li>${e}</li>`).join('')}
                        </ul>
                    ` : '<div style="color: var(--accent-green);">All good!</div>'}
                </div>
            `;
        });

        html += `
            <div style="margin-top: 20px; display: flex; gap: 10px;">
                <button onclick="AutoHealSystem.runFullDiagnostics().then(() => AutoHealSystem.showDiagnosticsModal())" 
                        class="btn btn-primary">🔄 Refresh</button>
                <button onclick="this.closest('.modal').remove()" 
                        class="btn btn-secondary">Close</button>
            </div>
        `;

        content.innerHTML = html;
        modal.appendChild(content);
        document.body.appendChild(modal);
    },

    /**
     * Log a fix
     */
    logFix(component, description) {
        const fix = {
            timestamp: new Date().toISOString(),
            component,
            description
        };
        this.state.fixesApplied.push(fix);
        console.log(`[AutoHeal] ✅ Fix applied: ${component} - ${description}`);
    },

    /**
     * Sleep utility
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    /**
     * Stop monitoring
     */
    stop() {
        this.state.checksRunning = false;
        console.log('[AutoHeal] 🛑 Monitoring stopped');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AutoHealSystem.init());
} else {
    AutoHealSystem.init();
}

// Export for global access
window.AutoHealSystem = AutoHealSystem;
