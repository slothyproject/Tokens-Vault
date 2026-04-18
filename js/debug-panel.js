/**
 * debug-panel.js - Real-time debugging and status panel
 * Shows live status of all systems
 */

const DebugPanel = {
    config: {
        visible: true,
        position: 'bottom-right',
        updateInterval: 2000
    },

    state: {
        initialized: false,
        errors: [],
        warnings: [],
        logs: [],
        systems: {}
    },

    /**
     * Initialize the debug panel
     */
    init() {
        if (this.state.initialized) return;

        console.log('[DebugPanel] 🔍 Initializing debug panel...');

        // Create the panel
        this.createPanel();

        // Start monitoring
        this.startMonitoring();

        // Add global error handler
        this.setupErrorHandler();

        this.state.initialized = true;
        console.log('[DebugPanel] ✅ Debug panel initialized');
    },

    /**
     * Create the debug panel UI
     */
    createPanel() {
        // Remove existing panel if any
        const existing = document.getElementById('debug-panel');
        if (existing) existing.remove();

        // Create panel container
        const panel = document.createElement('div');
        panel.id = 'debug-panel';
        panel.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 400px;
            max-height: 600px;
            background: rgba(15, 23, 42, 0.98);
            border: 1px solid var(--accent-purple);
            border-radius: 12px;
            padding: 15px;
            z-index: 99999;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            color: #fff;
            box-shadow: 0 10px 40px rgba(0,0,0,0.5);
            overflow: auto;
        `;

        // Header
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        `;
        header.innerHTML = `
            <span style="font-weight: bold; color: var(--accent-purple);">🔍 Debug Panel</span>
            <button onclick="DebugPanel.toggle()" style="background: none; border: none; color: #fff; cursor: pointer;"><span id="debug-toggle">−</span></button>
        `;
        panel.appendChild(header);

        // Content area
        const content = document.createElement('div');
        content.id = 'debug-content';
        panel.appendChild(content);

        // Add to body
        document.body.appendChild(panel);

        // Initial render
        this.updateDisplay();
    },

    /**
     * Update the display
     */
    updateDisplay() {
        const content = document.getElementById('debug-content');
        if (!content) return;

        let html = '';

        // System Status Section
        html += '<div style="margin-bottom: 15px;">';
        html += '<div style="font-weight: bold; color: #888; margin-bottom: 5px;">System Status</div>';

        const systems = [
            { name: 'Vault Core', check: () => typeof VaultCore !== 'undefined' && VaultCore.initialized },
            { name: 'Vault UI', check: () => typeof VaultUI !== 'undefined' },
            { name: 'Auto Heal', check: () => typeof AutoHealSystem !== 'undefined' && AutoHealSystem.state.initialized },
            { name: 'Ollama', check: () => typeof OllamaCloudIntegration !== 'undefined' }
        ];

        systems.forEach(sys => {
            const status = sys.check();
            const icon = status ? '✅' : '❌';
            const color = status ? '#22c55e' : '#ef4444';
            html += `
                <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                    <span>${sys.name}</span>
                    <span style="color: ${color};">${icon}</span>
                </div>
            `;
        });

        html += '</div>';

        // Ollama Status
        if (typeof OllamaCloudIntegration !== 'undefined') {
            html += '<div style="margin-bottom: 15px;">';
            html += '<div style="font-weight: bold; color: #888; margin-bottom: 5px;">Ollama</div>';
            
            const connected = OllamaCloudIntegration.state.connected;
            const model = OllamaCloudIntegration.config?.defaultModel || 'Not set';
            
            html += `
                <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                    <span>Connection</span>
                    <span style="color: ${connected ? '#22c55e' : '#ef4444'};">${connected ? '✅ Connected' : '❌ Disconnected'}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 3px 0;">
                    <span>Model</span>
                    <span style="color: #3b82f6;">${model}</span>
                </div>
            `;
            
            html += '</div>';
        }

        // Recent Errors
        if (this.state.errors.length > 0) {
            html += '<div style="margin-bottom: 15px;">';
            html += '<div style="font-weight: bold; color: #ef4444; margin-bottom: 5px;">Recent Errors (' + this.state.errors.length + ')</div>';
            
            this.state.errors.slice(-3).forEach(err => {
                html += `
                    <div style="color: #fca5a5; font-size: 11px; margin: 3px 0; padding: 5px; background: rgba(239,68,68,0.2); border-radius: 4px;">
                        ${err.message}
                    </div>
                `;
            });
            
            html += '</div>';
        }

        // Action Buttons
        html += '<div style="display: flex; gap: 8px; flex-wrap: wrap;">';
        html += '<button onclick="DebugPanel.testOllama()" style="padding: 5px 10px; background: var(--accent-purple); border: none; border-radius: 4px; color: #fff; cursor: pointer; font-size: 11px;">Test Ollama</button>';
        html += '<button onclick="DebugPanel.fixAll()" style="padding: 5px 10px; background: var(--accent-green); border: none; border-radius: 4px; color: #fff; cursor: pointer; font-size: 11px;">🔧 Auto-Fix All</button>';
        html += '<button onclick="DebugPanel.clearErrors()" style="padding: 5px 10px; background: #6b7280; border: none; border-radius: 4px; color: #fff; cursor: pointer; font-size: 11px;">Clear Errors</button>';
        html += '</div>';

        // Logs
        if (this.state.logs.length > 0) {
            html += '<div style="margin-top: 15px;">';
            html += '<div style="font-weight: bold; color: #888; margin-bottom: 5px;">Recent Logs</div>';
            
            this.state.logs.slice(-5).forEach(log => {
                const color = log.type === 'error' ? '#ef4444' : log.type === 'warning' ? '#f59e0b' : '#9ca3af';
                html += `
                    <div style="color: ${color}; font-size: 10px; margin: 2px 0;">
                        [${log.time}] ${log.message}
                    </div>
                `;
            });
            
            html += '</div>';
        }

        content.innerHTML = html;
    },

    /**
     * Start monitoring systems
     */
    startMonitoring() {
        setInterval(() => {
            this.updateDisplay();
        }, this.config.updateInterval);
    },

    /**
     * Setup global error handler
     */
    setupErrorHandler() {
        window.addEventListener('error', (event) => {
            this.logError({
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                stack: event.error?.stack
            });
        });

        window.addEventListener('unhandledrejection', (event) => {
            this.logError({
                message: `Unhandled Promise Rejection: ${event.reason}`,
                stack: event.reason?.stack
            });
        });
    },

    /**
     * Log an error
     */
    logError(error) {
        this.state.errors.push({
            ...error,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 errors
        if (this.state.errors.length > 50) {
            this.state.errors.shift();
        }

        this.log('error', error.message);
        console.error('[DebugPanel]', error);
    },

    /**
     * Log a message
     */
    log(type, message) {
        this.state.logs.push({
            type,
            message,
            time: new Date().toLocaleTimeString()
        });

        // Keep only last 100 logs
        if (this.state.logs.length > 100) {
            this.state.logs.shift();
        }
    },

    /**
     * Test Ollama connection
     */
    async testOllama() {
        this.log('info', 'Testing Ollama connection...');
        
        if (typeof OllamaCloudIntegration === 'undefined') {
            this.logError({ message: 'OllamaCloudIntegration not loaded' });
            return;
        }

        try {
            const connected = await OllamaCloudIntegration.testConnection();
            if (connected) {
                this.log('info', '✅ Ollama connection successful');
                alert('✅ Ollama is connected and working!');
            } else {
                this.logError({ message: 'Ollama connection failed' });
                alert('❌ Ollama connection failed. Try clicking "Auto-Fix All"');
            }
        } catch (err) {
            this.logError({ message: `Ollama test error: ${err.message}` });
            alert(`❌ Ollama error: ${err.message}`);
        }
    },

    /**
     * Fix all issues
     */
    async fixAll() {
        this.log('info', '🔧 Starting auto-fix...');
        
        const fixes = [];

        // Fix 1: Reload modules
        if (typeof AutoHealSystem !== 'undefined') {
            fixes.push('Running AutoHealSystem...');
            try {
                await AutoHealSystem.applyImmediateFixes();
                await AutoHealSystem.runFullDiagnostics();
                this.log('info', '✅ AutoHeal completed');
            } catch (err) {
                this.logError({ message: `AutoHeal failed: ${err.message}` });
            }
        }

        // Fix 2: Fix Ollama
        if (typeof OllamaCloudIntegration !== 'undefined') {
            fixes.push('Fixing Ollama...');
            try {
                // Reset config
                if (OllamaCloudIntegration.resetConfig) {
                    OllamaCloudIntegration.resetConfig();
                }
                
                // Re-initialize
                await OllamaCloudIntegration.init();
                
                // Test connection
                const connected = await OllamaCloudIntegration.testConnection();
                if (connected) {
                    this.log('info', '✅ Ollama fixed and connected');
                } else {
                    // Try different models
                    this.log('info', 'Trying fallback models...');
                    const fallbackModels = ['gemma3:27b', 'gemma3:4b', 'deepseek-v3.2'];
                    for (const model of fallbackModels) {
                        try {
                            OllamaCloudIntegration.config.defaultModel = model;
                            const test = await OllamaCloudIntegration.generateCompletion('test', { model, maxRetries: 1 });
                            if (test?.response) {
                                this.log('info', `✅ Model ${model} works!`);
                                localStorage.setItem('ollama_default_model', model);
                                break;
                            }
                        } catch (e) {
                            this.log('warning', `Model ${model} failed: ${e.message}`);
                        }
                    }
                }
            } catch (err) {
                this.logError({ message: `Ollama fix failed: ${err.message}` });
            }
        }

        // Fix 3: Reset UI
        if (typeof VaultUI !== 'undefined' && typeof VaultCore !== 'undefined') {
            fixes.push('Reloading UI...');
            try {
                VaultUI.vaultData = VaultCore.loadVaultData();
                if (VaultUI.renderServices) {
                    VaultUI.renderServices();
                }
                this.log('info', '✅ UI refreshed');
            } catch (err) {
                this.logError({ message: `UI refresh failed: ${err.message}` });
            }
        }

        alert(`🔧 Auto-fix complete!\n\nActions taken:\n${fixes.join('\n')}\n\nCheck the debug panel for details.`);
        this.updateDisplay();
    },

    /**
     * Clear errors
     */
    clearErrors() {
        this.state.errors = [];
        this.log('info', 'Errors cleared');
        this.updateDisplay();
    },

    /**
     * Toggle panel visibility
     */
    toggle() {
        const content = document.getElementById('debug-content');
        const toggle = document.getElementById('debug-toggle');
        
        if (content.style.display === 'none') {
            content.style.display = 'block';
            toggle.textContent = '−';
        } else {
            content.style.display = 'none';
            toggle.textContent = '+';
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => DebugPanel.init());
} else {
    DebugPanel.init();
}

// Export for global access
window.DebugPanel = DebugPanel;
