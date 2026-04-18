/**
 * script-loader.js - Ensures all scripts load correctly with fallbacks
 */

(function() {
    'use strict';

    console.log('[ScriptLoader] 🚀 Starting script loader...');

    // Track loaded scripts
    const loadedScripts = new Set();
    const failedScripts = new Set();

    // Critical scripts that must load
    const criticalScripts = [
        { name: 'CryptoJS', check: () => typeof CryptoJS !== 'undefined', required: true },
        { name: 'VaultCore', check: () => typeof VaultCore !== 'undefined', required: true },
        { name: 'VaultUI', check: () => typeof VaultUI !== 'undefined', required: true }
    ];

    // Check if all critical scripts loaded
    function checkCriticalScripts() {
        const missing = [];
        
        criticalScripts.forEach(script => {
            if (script.required && !script.check()) {
                missing.push(script.name);
            }
        });

        if (missing.length > 0) {
            console.error('[ScriptLoader] ❌ Critical scripts missing:', missing);
            showLoadingError(missing);
            return false;
        }

        console.log('[ScriptLoader] ✅ All critical scripts loaded');
        return true;
    }

    // Show error to user
    function showLoadingError(missingScripts) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: #111827;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 999999;
            font-family: system-ui, sans-serif;
            padding: 20px;
            text-align: center;
        `;
        
        errorDiv.innerHTML = `
            <h1 style="color: #ef4444; margin-bottom: 20px;">⚠️ Loading Error</h1>
            <p style="font-size: 18px; margin-bottom: 10px;">Failed to load required components:</p>
            <ul style="list-style: none; padding: 0; margin: 20px 0;">
                ${missingScripts.map(s => `<li style="color: #fca5a5; margin: 5px 0;">❌ ${s}</li>`).join('')}
            </ul>
            <button onclick="location.reload()" 
                    style="padding: 12px 24px; background: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; margin-top: 20px;">
                🔄 Reload Page
            </button>
            <p style="color: #9ca3af; margin-top: 20px; font-size: 14px;">
                If this persists, try clearing your browser cache (Ctrl+Shift+R)
            </p>
        `;
        
        document.body.appendChild(errorDiv);
    }

    // Wait for scripts to load
    function waitForScripts(maxAttempts = 50) {
        return new Promise((resolve, reject) => {
            let attempts = 0;
            
            const check = () => {
                attempts++;
                
                if (checkCriticalScripts()) {
                    resolve(true);
                    return;
                }
                
                if (attempts >= maxAttempts) {
                    reject(new Error('Timeout waiting for scripts'));
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    async function init() {
        console.log('[ScriptLoader] ⏳ Waiting for scripts...');
        
        try {
            await waitForScripts();
            console.log('[ScriptLoader] ✅ All scripts ready');
            
            // Initialize vault
            if (typeof VaultCore !== 'undefined' && VaultCore.init) {
                await VaultCore.init();
                console.log('[ScriptLoader] ✅ VaultCore initialized');
            }
            
            if (typeof VaultUI !== 'undefined' && VaultUI.init) {
                await VaultUI.init();
                console.log('[ScriptLoader] ✅ VaultUI initialized');
            }
            
        } catch (err) {
            console.error('[ScriptLoader] ❌ Initialization failed:', err);
        }
    }

    // Global error handler
    window.addEventListener('error', (e) => {
        console.error('[ScriptLoader] Script error:', e.message, 'in', e.filename);
        if (e.filename?.includes('vault-core.js')) {
            console.error('[ScriptLoader] VaultCore failed to load!');
        }
    });

})();
