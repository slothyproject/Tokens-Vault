/**
 * vault-ui.js - UI management module with Brave compatibility
 */

const VaultUI = {
    servicesConfig: null,
    vaultData: null,
    currentService: null,
    
    // Bulk edit mode state
    bulkEditMode: false,
    selectedVariables: [],

    async init() {
        // Check storage availability
        const diagnostics = VaultCore.getDiagnostics();
        console.log('Vault diagnostics:', diagnostics);

        if (diagnostics.usingMemoryFallback) {
            this.showToast('Running in private mode - data will not persist', 'warning');
        }

        if (!diagnostics.cryptoJsLoaded) {
            this.showToast('CryptoJS not loaded - encryption unavailable', 'error');
            return;
        }

        await this.loadServicesConfig();
        this.vaultData = VaultCore.loadVaultData();
        this.renderServices();
        this.initQuickSearch();
        
        // Subscribe to shared variable change events
        VaultCore.on('sharedVariableChanged', (data) => {
            this.handleSharedVariableChanged(data);
        });
        
        VaultCore.on('sharedVariableDeleted', (data) => {
            this.handleSharedVariableDeleted(data);
        });
    },

    async loadServicesConfig() {
        try {
            const response = await fetch('vault-services.json');
            if (!response.ok) throw new Error('Failed to load services');
            this.servicesConfig = await response.json();
        } catch (e) {
            console.error('Failed to load services:', e);
            this.showToast('Failed to load service configuration', 'error');
            // Fallback to default config
            this.servicesConfig = {
                services: []
            };
        }
    },

    renderServices() {
        if (!this.servicesConfig || !this.servicesConfig.services) return;

        const container = document.getElementById('serviceList');
        if (!container) return;

        if (this.servicesConfig.services.length === 0) {
            container.innerHTML = '<p style="padding: 20px; color: var(--text-secondary);">No services configured</p>';
            return;
        }

        container.innerHTML = this.servicesConfig.services.map(service => {
            const serviceData = this.vaultData?.services?.[service.id] || {};
            const varCount = Object.keys(serviceData).length;
            const icon = this.getServiceIcon(service.type);

            return `
                <button class="service-btn ${this.currentService === service.id ? 'active' : ''}" 
                        onclick="VaultUI.selectService('${service.id}')">
                    <span class="service-icon">${icon}</span>
                    <div class="service-info">
                        <span class="service-name">${service.name}</span>
                        <span class="service-count">${varCount} variables</span>
                    </div>
                </button>
            `;
        }).join('');
    },

    getServiceIcon(type) {
        const icons = { 
            'static': '🌐', 
            'node': '⚙️', 
            'discord-bot': '🤖', 
            'database': '🗄️',
            'api': '🔌',
            'web': '🌍',
            'default': '📦'
        };
        return icons[type] || icons['default'];
    },

    selectService(serviceId) {
        console.log('[VaultUI] ============================================');
        console.log('[VaultUI] selectService() called with serviceId:', serviceId);
        console.log('[VaultUI] ============================================');
        
        // COMPREHENSIVE DEBUG LOGGING
        try {
            // Check services config
            console.log('[VaultUI] servicesConfig:', this.servicesConfig);
            if (!this.servicesConfig) {
                console.error('[VaultUI] ERROR: servicesConfig is null or undefined');
                this.showErrorState('Failed to load services configuration. Please refresh the page.');
                return;
            }
            
            if (!this.servicesConfig.services || !Array.isArray(this.servicesConfig.services)) {
                console.error('[VaultUI] ERROR: servicesConfig.services is invalid:', this.servicesConfig.services);
                this.showErrorState('Services configuration is corrupted. Please check vault-services.json.');
                return;
            }
            
            console.log('[VaultUI] Available services:', this.servicesConfig.services.map(s => s.id));
            
            // Find service
            const service = this.servicesConfig.services.find(s => s.id === serviceId);
            console.log('[VaultUI] Found service:', service);
            
            if (!service) {
                console.error('[VaultUI] ERROR: Service not found:', serviceId);
                this.showErrorState(`Service "${serviceId}" not found in configuration.`);
                return;
            }
            
            // Check vault data
            console.log('[VaultUI] vaultData:', this.vaultData);
            if (!this.vaultData) {
                console.error('[VaultUI] ERROR: vaultData is null or undefined');
                this.vaultData = VaultCore.loadVaultData() || { services: {}, shared: {} };
                console.log('[VaultUI] Re-loaded vaultData:', this.vaultData);
            }
            
            // Check DOM elements
            const welcomeScreen = document.getElementById('welcomeScreen');
            const serviceContent = document.getElementById('serviceContent');
            
            console.log('[VaultUI] welcomeScreen element:', welcomeScreen);
            console.log('[VaultUI] serviceContent element:', serviceContent);
            
            if (!serviceContent) {
                console.error('[VaultUI] ERROR: serviceContent element not found in DOM');
                this.showErrorState('Page structure error. Please refresh the page.');
                return;
            }
            
            // SUCCESS - Continue with normal logic
            this.currentService = serviceId;
            this.renderServices();

            // Use merged variables (shared + local, local wins)
            let serviceData;
            let localData;
            
            try {
                serviceData = VaultCore.getServiceVariables(serviceId);
                localData = this.vaultData?.services?.[serviceId] || {};
                console.log('[VaultUI] serviceData:', serviceData);
                console.log('[VaultUI] localData:', localData);
            } catch (e) {
                console.error('[VaultUI] ERROR loading service variables:', e);
                serviceData = {};
                localData = {};
            }
            
            // Hide welcome, show content
            if (welcomeScreen) welcomeScreen.classList.add('hidden');
            serviceContent.classList.remove('hidden');

            // Build content
            this.buildServiceContent(serviceId, service, serviceData, localData);
            
            console.log('[VaultUI] Service rendered successfully');
            
        } catch (error) {
            console.error('[VaultUI] CRITICAL ERROR in selectService:', error);
            console.error('[VaultUI] Error stack:', error.stack);
            this.showErrorState(`Error loading service: ${error.message}. Check console for details.`);
        }
    },
    
    // Extract content building to separate function
    buildServiceContent(serviceId, service, serviceData, localData) {
        try {
            console.log('[VaultUI] Building content for:', service.name);
            
            let html = `
                <div class="service-header">
                    <div class="service-title">
                        <h2>${service.name}</h2>
                        <p>${service.description || 'No description available'}</p>
                    </div>
                    <div class="service-actions">
                        <button class="btn-secondary" onclick="VaultUI.toggleBulkEdit()">
                            ${this.bulkEditMode ? '✓ Done' : '☐ Bulk Edit'}
                        </button>
                        <button class="btn-secondary" onclick="VaultUI.showSharedVariables()">
                            🔗 Manage Shared Variables
                        </button>
                        <button class="btn-secondary sync-all-btn" id="syncAllBtn-${serviceId}" onclick="VaultUI.syncAllVariables('${serviceId}')" title="Sync all pending variables to Railway">
                            🔄 Sync All
                        </button>
                        <button class="btn-secondary" onclick="VaultUI.viewLogs('${serviceId}')" title="View Live Logs">
                            📋 View Logs
                        </button>
                        <button class="btn-primary" onclick="VaultUI.deployService('${serviceId}')">
                            🚀 Deploy to Railway
                        </button>
                    </div>
                </div>
            `;

            // Show shared variables section if any inherited
            const sharedVars = this.getSharedVariablesForService(serviceId);
            console.log('[VaultUI] sharedVars:', sharedVars);
            
            if (Object.keys(sharedVars).length > 0) {
                html += `
                    <div class="shared-section">
                        <h3 class="shared-title">📋 Inherited Shared Variables</h3>
                        <p class="shared-desc">These variables are shared across all services. Change in one place, updates everywhere.</p>
                        <div class="variables-grid shared-grid">
                `;
                
                Object.entries(sharedVars).forEach(([key, value]) => {
                    const isOverridden = key in localData;
                    html += `
                        <div class="variable-card shared-variable ${isOverridden ? 'overridden' : ''}">
                            <div class="variable-header">
                                <label>${key}</label>
                                ${isOverridden ? '<span class="badge overridden">Local Override</span>' : '<span class="badge shared">Shared</span>'}
                            </div>
                            <p class="variable-desc">${isOverridden ? 'Local value overrides shared' : 'Inherited from shared variables'}</p>
                            <div class="variable-input">
                                <input type="text" 
                                       value="${this.escapeHtml(value)}"
                                       ${isOverridden ? '' : 'disabled'}
                                       placeholder="${isOverridden ? 'Local override' : 'Edit in Shared Variables'}"
                                       onchange="${isOverridden ? `VaultUI.updateVariable('${serviceId}', '${key}', this.value)` : ''}"
                                >
                            </div>
                            ${isOverridden ? `
                                <button class="btn-link" onclick="VaultUI.removeLocalOverride('${serviceId}', '${key}')">
                                    ↩️ Revert to Shared Value
                                </button>
                            ` : ''}
                        </div>
                    `;
                });
                
                html += '</div></div>';
            }

            // Continue with variables rendering...
            html = this.renderVariablesSection(service, serviceData, serviceId, html);
            
        } catch (error) {
            console.error('[VaultUI] ERROR in buildServiceContent:', error);
            throw error; // Re-throw to be caught by parent
        }
    },

    // Render variables section - extracts the inline rendering code
    renderVariablesSection(service, serviceData, serviceId, html) {
        const vaultData = this.vaultData || VaultCore.loadVaultData() || { services: {} };
        const localData = vaultData.services?.[serviceId] || {};
        
        // Render categories if they exist
        if (service.categories && service.categories.length > 0) {
            service.categories.forEach(category => {
                const vars = service.variables ? service.variables.filter(v => v.category === category.id) : [];
                if (vars.length === 0) return;

                html += `
                    <div class="category-section">
                        <h3 class="category-title">${category.name}</h3>
                        <div class="variables-grid">
                `;

                vars.forEach(variable => {
                    const value = serviceData[variable.key] || '';
                    const isSecret = variable.type === 'secret' || variable.sensitive;

                    html += `
                        <div class="variable-card" data-service-id="${serviceId}" data-variable="${variable.key}">
                            <div class="variable-header">
                                <label>${variable.key}</label>
                                ${variable.required ? '<span class="badge required">Required</span>' : ''}
                            </div>
                            <p class="variable-desc">${variable.description || ''}</p>
                            <div class="variable-input">
                                <input type="${isSecret ? 'password' : 'text'}" 
                                       value="${this.escapeHtml(value)}"
                                       placeholder="${variable.default || ''}"
                                       onchange="VaultUI.updateVariableWithSync('${serviceId}', '${variable.key}', this.value)"
                                >
                            </div>
                        </div>
                    `;
                });

                html += '</div></div>';
            });
        } else if (service.variables && service.variables.length > 0) {
            // No categories, render all variables
            html += '<div class="variables-grid">';
            service.variables.forEach(variable => {
                // Use VaultIntelligence for smart detection
                const detectedType = VaultIntelligence?.detectType(variable.key, serviceData[variable.key]) || variable.type;
                const suggestions = VaultIntelligence?.getSuggestions(variable.key) || {};
                const validation = VaultIntelligence?.validate(variable.key, serviceData[variable.key] || '') || { valid: true };
                
                const value = serviceData[variable.key] || '';
                const isSecret = variable.type === 'secret' || variable.sensitive || suggestions.isSecret;
                const hasGenerator = suggestions.generator;

                html += `
                    <div class="variable-card ${!validation.valid ? 'invalid' : validation.warning ? 'warning' : ''} ${this.bulkEditMode && this.selectedVariables.includes(variable.key) ? 'selected' : ''}" data-service-id="${serviceId}" data-variable="${variable.key}">
                        <div class="variable-header">
                            ${this.bulkEditMode ? `
                                <label class="checkbox-label">
                                    <input type="checkbox" 
                                           ${this.selectedVariables.includes(variable.key) ? 'checked' : ''}
                                           onchange="VaultUI.toggleVariableSelection('${variable.key}')"
                                           class="bulk-checkbox">
                                    <span></span>
                                </label>
                            ` : ''}
                            <label>${suggestions.icon || '📝'} ${variable.key}</label>
                            <div class="variable-badges">
                                ${variable.required ? '<span class="badge required">Required</span>' : ''}
                                ${suggestions.type ? `<span class="badge type" title="${suggestions.description}">${suggestions.type}</span>` : ''}
                            </div>
                        </div>
                        <div class="variable-smart-input">
                            <div class="input-wrapper">
                                <input type="${isSecret ? 'password' : 'text'}" 
                                       id="var-${variable.key}"
                                       value="${this.escapeHtml(value)}"
                                       placeholder="${variable.default || suggestions.defaultValue || ''}"
                                       data-key="${variable.key}"
                                       data-service="${serviceId}"
                                       oninput="VaultUI.handleVariableInput(this)"
                                       onchange="VaultUI.updateVariableWithSync('${serviceId}', '${variable.key}', this.value)"
                                >
                                ${hasGenerator ? `
                                    <button class="btn-generate" onclick="VaultUI.generateValue('${serviceId}', '${variable.key}')" title="Generate secure value">
                                        🎲 Generate
                                    </button>
                                ` : ''}
                            </div>
                            
                            ${suggestions.suggestions?.length ? `
                                <div class="input-suggestions">
                                    ${suggestions.suggestions.map(s => `
                                        <button class="suggestion-chip" onclick="VaultUI.setVariableValue('${serviceId}', '${variable.key}', '${s}')">${s}</button>
                                    `).join('')}
                                </div>
                            ` : ''}
                        </div>
                        
                        ${!validation.valid || validation.warning ? `
                            <div class="validation-message ${!validation.valid ? 'error' : 'warning'}">
                                ${!validation.valid ? '❌' : '⚠️'} ${validation.error || validation.warning}
                            </div>
                        ` : ''}
                        
                        <p class="variable-desc">${variable.description || suggestions.description || ''}</p>
                    </div>
                `;
            });
            html += '</div>';
        }

        // Custom variables section
        const customVars = Object.entries(serviceData).filter(([key]) => {
            // Filter out known variables
            const knownKeys = service.variables ? service.variables.map(v => v.key) : [];
            return !knownKeys.includes(key);
        });

        if (customVars.length > 0) {
            html += `
                <div class="category-section">
                    <h3 class="category-title">Custom Variables</h3>
                    <div class="variables-grid">
            `;
            customVars.forEach(([key, value]) => {
                html += `
                    <div class="variable-card" data-service-id="${serviceId}" data-variable="${key}">
                        <div class="variable-header">
                            <label>${key}</label>
                            <button class="btn-icon" onclick="VaultUI.deleteCustomVariable('${serviceId}', '${key}')" title="Delete">🗑️</button>
                        </div>
                        <div class="variable-input">
                            <input type="text" 
                                   value="${this.escapeHtml(value)}"
                                   onchange="VaultUI.updateVariableWithSync('${serviceId}', '${key}', this.value)"
                            >
                        </div>
                    </div>
                `;
            });
            html += '</div></div>';
        }

        // Add custom variable button
        html += `
            <div class="custom-variables" style="margin-top: 24px;">
                <button class="btn-secondary" onclick="VaultUI.addCustomVariable('${serviceId}')">
                    + Add Custom Variable
                </button>
            </div>
        `;

        if (serviceContent) serviceContent.innerHTML = html;
        
        return html;
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Debounced save timeout
    saveTimeout: null,

    updateVariable(serviceId, key, value) {
        // Clear any pending save
        if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
        }

        if (!this.vaultData.services[serviceId]) {
            this.vaultData.services[serviceId] = {};
        }

        // Update immediately in memory
        this.vaultData.services[serviceId][key] = value;

        // Debounce the actual save (500ms)
        this.saveTimeout = setTimeout(() => {
            VaultCore.saveVaultData(this.vaultData);
            VaultCore.addHistory(serviceId, key, 'updated');
            this.showToast(`${key} updated`, 'success');
            this.renderServices();
        }, 500);
    },

    // Phase 1.1: Instant variable push with sync status
    async updateVariableWithSync(serviceId, key, value) {
        // Step 1: Save locally first (immediate feedback)
        if (!this.vaultData.services[serviceId]) {
            this.vaultData.services[serviceId] = {};
        }
        this.vaultData.services[serviceId][key] = value;
        VaultCore.saveVaultData(this.vaultData);
        VaultCore.addHistory(serviceId, key, 'updated');
        
        // Step 2: Show "Syncing..." status
        if (typeof VaultRailwaySync !== 'undefined') {
            VaultRailwaySync.setVariableSyncStatus(serviceId, key, 'syncing');
        }
        
        // Step 3: Push to Railway
        if (typeof VaultRailwaySync !== 'undefined') {
            try {
                const result = await VaultRailwaySync.pushVariable(serviceId, key, value);
                
                if (result.success) {
                    this.showToast(`${key} saved & synced to Railway`, 'success');
                } else if (result.conflict) {
                    // Conflict modal will be shown by pushVariable
                    this.showToast(`${key} conflict detected - needs resolution`, 'warning');
                } else {
                    this.showToast(`${key} saved locally but sync failed: ${result.error}`, 'error');
                }
            } catch (error) {
                console.error('[VaultUI] Sync failed:', error);
                this.showToast(`${key} saved locally - sync error`, 'error');
            }
        } else {
            // Railway sync not available, just show local save
            this.showToast(`${key} updated (local only)`, 'success');
        }
        
        // Step 4: Refresh UI
        this.renderServices();
    },

    addCustomVariable(serviceId) {
        const name = prompt('Variable name:');
        if (!name) return;

        const value = prompt('Variable value:');
        if (value === null) return;

        this.updateVariable(serviceId, name.toUpperCase().replace(/\s+/g, '_'), value);
        this.selectService(serviceId);
    },

    deleteCustomVariable(serviceId, key) {
        if (!confirm(`Delete variable ${key}?`)) return;

        if (this.vaultData.services[serviceId]) {
            delete this.vaultData.services[serviceId][key];
            VaultCore.saveVaultData(this.vaultData);
            this.selectService(serviceId);
            this.showToast(`${key} deleted`, 'success');
        }
    },

    // Phase 1.4: Sync all pending variables to Railway
    async syncAllVariables(serviceId) {
        if (typeof VaultRailwaySync === 'undefined') {
            this.showToast('Railway sync not available', 'error');
            return;
        }

        const btn = document.getElementById(`syncAllBtn-${serviceId}`);
        if (btn) {
            btn.classList.add('syncing');
            btn.disabled = true;
        }

        const serviceData = this.vaultData.services[serviceId] || {};
        const variables = Object.entries(serviceData);
        
        if (variables.length === 0) {
            this.showToast('No variables to sync', 'info');
            if (btn) {
                btn.classList.remove('syncing');
                btn.disabled = false;
            }
            return;
        }

        this.showToast(`Syncing ${variables.length} variables...`, 'info');
        
        let successCount = 0;
        let failCount = 0;
        let conflictCount = 0;

        for (const [key, value] of variables) {
            try {
                const result = await VaultRailwaySync.pushVariable(serviceId, key, value);
                if (result.success) {
                    successCount++;
                } else if (result.conflict) {
                    conflictCount++;
                } else {
                    failCount++;
                }
            } catch (error) {
                console.error(`[VaultUI] Failed to sync ${key}:`, error);
                failCount++;
            }
        }

        if (btn) {
            btn.classList.remove('syncing');
            btn.disabled = false;
        }

        // Show summary
        if (failCount === 0 && conflictCount === 0) {
            this.showToast(`✓ All ${successCount} variables synced successfully`, 'success');
        } else {
            this.showToast(`Synced: ${successCount}, Failed: ${failCount}, Conflicts: ${conflictCount}`, 'warning');
        }

        // Refresh UI
        this.selectService(serviceId);
    },

    async deployService(serviceId) {
        // Use new Railway deployment module
        if (typeof VaultRailwayDeploy !== 'undefined') {
            const result = await VaultRailwayDeploy.deployService(serviceId);
            if (result.success) {
                // Auto-start log stream if deployment successful
                setTimeout(() => {
                    if (typeof VaultLogs !== 'undefined') {
                        VaultLogs.startStream(serviceId);
                    }
                }, 2000);
            }
        } else {
            // Fallback to old implementation
            await this.deployServiceLegacy(serviceId);
        }
    },

    // Legacy deployment for backward compatibility
    async deployServiceLegacy(serviceId) {
        const token = this.vaultData?.railwayToken;
        if (!token) {
            this.showToast('Railway token not configured', 'error');
            this.openSettings();
            return;
        }

        const service = this.servicesConfig.services.find(s => s.id === serviceId);
        if (!service) return;

        const serviceData = this.vaultData.services[serviceId] || {};

        // Check required variables
        const requiredVars = service.variables?.filter(v => v.required) || [];
        const missing = requiredVars.filter(v => !serviceData[v.key]);

        if (missing.length > 0) {
            this.showToast(`Missing required variables: ${missing.map(v => v.key).join(', ')}`, 'error');
            return;
        }

        this.showToast('Deploying to Railway...', 'info');

        try {
            // Build environment variables payload
            const variables = {};
            Object.entries(serviceData).forEach(([key, value]) => {
                if (value) variables[key] = value;
            });

            // Make API call to Railway
            const response = await fetch('https://backboard.railway.app/graphql', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: `
                        mutation upsertVariables($input: VariableInput!) {
                            variableUpsert(input: $input) {
                                id
                                name
                                value
                            }
                        }
                    `,
                    variables: {
                        input: {
                            projectId: service.railwayProjectId,
                            serviceId: service.railwayServiceId,
                            variables: variables
                        }
                    }
                })
            });

            const result = await response.json();

            if (result.errors) {
                throw new Error(result.errors[0].message);
            }

            this.showToast('Deployed successfully!', 'success');
            VaultCore.addHistory(serviceId, 'deploy', 'success');

        } catch (e) {
            console.error('Deployment failed:', e);
            this.showToast('Deployment failed: ' + e.message, 'error');
            VaultCore.addHistory(serviceId, 'deploy', 'failed: ' + e.message);
        }
    },

    // View logs for a service
    viewLogs(serviceId) {
        if (typeof VaultLogs !== 'undefined') {
            VaultLogs.startStream(serviceId);
        } else {
            this.showToast('Log viewer not available', 'error');
        }
    },

    // Import/Export
    exportEnv(serviceId) {
        const serviceData = this.vaultData?.services?.[serviceId] || {};
        if (Object.keys(serviceData).length === 0) {
            this.showToast('No variables to export', 'warning');
            return;
        }

        let envContent = '# Dissident Token Vault Export\n';
        envContent += `# Service: ${serviceId}\n`;
        envContent += `# Exported: ${new Date().toISOString()}\n\n`;

        Object.entries(serviceData).forEach(([key, value]) => {
            if (value) {
                envContent += `${key}=${value}\n`;
            }
        });

        const blob = new Blob([envContent], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${serviceId}-env.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        this.showToast('Environment variables exported', 'success');
    },

    importEnv(serviceId, file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const lines = content.split('\n');
            let imported = 0;

            lines.forEach(line => {
                line = line.trim();
                if (!line || line.startsWith('#')) return;

                const match = line.match(/^([^=]+)=(.*)$/);
                if (match) {
                    const key = match[1].trim();
                    let value = match[2].trim();
                    
                    // Remove quotes if present
                    if ((value.startsWith('"') && value.endsWith('"')) ||
                        (value.startsWith("'") && value.endsWith("'"))) {
                        value = value.slice(1, -1);
                    }

                    if (!this.vaultData.services[serviceId]) {
                        this.vaultData.services[serviceId] = {};
                    }
                    this.vaultData.services[serviceId][key] = value;
                    imported++;
                }
            });

            VaultCore.saveVaultData(this.vaultData);
            this.selectService(serviceId);
            this.showToast(`Imported ${imported} variables`, 'success');
        };
        reader.readAsText(file);
    },

    // Settings modal
    openSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.remove('hidden');
    },

    closeSettings() {
        const modal = document.getElementById('settingsModal');
        if (modal) modal.classList.add('hidden');
    },

    saveSettings() {
        const railwayToken = document.getElementById('railwayToken')?.value;
        const githubToken = document.getElementById('githubToken')?.value;
        const autoDeploy = document.getElementById('autoDeploy')?.checked;

        if (this.vaultData) {
            if (railwayToken !== undefined) this.vaultData.railwayToken = railwayToken || null;
            if (githubToken !== undefined) this.vaultData.githubToken = githubToken || null;
            if (autoDeploy !== undefined) this.vaultData.autoDeploy = autoDeploy;
            VaultCore.saveVaultData(this.vaultData);
        }

        this.closeSettings();
        this.showToast('Settings saved', 'success');
    },

    // Lock vault
    lockVault() {
        VaultCore.lock();
        window.location.href = 'login.html';
    },

    // Toast notifications
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) {
            console.log(`[${type.toUpperCase()}]`, message);
            return;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.style.cssText = `
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            border-left: 4px solid ${type === 'success' ? 'var(--accent-green)' : type === 'error' ? 'var(--accent-red)' : type === 'warning' ? '#f59e0b' : 'var(--accent-blue)'};
            border-radius: var(--radius-md);
            padding: 16px 20px;
            margin-bottom: 8px;
            min-width: 300px;
            animation: slideIn 0.3s ease;
            color: white;
        `;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s';
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    },

    // Show error state when service fails to load
    showErrorState(message) {
        const serviceContent = document.getElementById('serviceContent');
        const welcomeScreen = document.getElementById('welcomeScreen');
        
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        if (serviceContent) {
            serviceContent.classList.remove('hidden');
            serviceContent.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">⚠️</div>
                    <h3>Error Loading Service</h3>
                    <p>${message}</p>
                    <div class="error-actions">
                        <button class="btn-primary" onclick="location.reload()">
                            🔄 Refresh Page
                        </button>
                        <button class="btn-secondary" onclick="VaultUI.showDebugModal()">
                            🔍 Show Debug Info
                        </button>
                    </div>
                    <div class="error-hint">
                        <p>If this persists, check:</p>
                        <ul>
                            <li>Browser console for errors (F12)</li>
                            <li>Vault is unlocked</li>
                            <li>vault-services.json is accessible</li>
                        </ul>
                    </div>
                </div>
            `;
        }
    },

    // Show debug information modal
    showDebugModal() {
        let modal = document.getElementById('debugModal');
        if (!modal) {
            const modalHtml = `
                <div id="debugModal" class="modal">
                    <div class="modal-overlay" onclick="VaultUI.closeDebugModal()"></div>
                    <div class="modal-content debug-modal">
                        <div class="modal-header">
                            <h2>🔍 Debug Information</h2>
                            <button class="btn-close" onclick="VaultUI.closeDebugModal()">✕</button>
                        </div>
                        <div class="modal-body" id="debugBody">
                            <!-- Populated dynamically -->
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="VaultUI.closeDebugModal()">Close</button>
                            <button class="btn-primary" onclick="VaultUI.copyDebugInfo()">📋 Copy to Clipboard</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('debugModal');
        }

        // Gather debug info
        const debugInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            vaultCore: {
                exists: typeof VaultCore !== 'undefined',
                vaultExists: VaultCore?.vaultExists(),
                hasSessionKey: !!VaultCore?.getSessionKey(),
                diagnostics: VaultCore?.getDiagnostics()
            },
            vaultUI: {
                servicesConfigLoaded: !!this.servicesConfig,
                servicesCount: this.servicesConfig?.services?.length || 0,
                vaultDataLoaded: !!this.vaultData,
                currentService: this.currentService
            },
            localStorage: {
                vaultMeta: !!localStorage.getItem('dissident_vault_meta'),
                vaultData: !!localStorage.getItem('dissident_vault_data')
            },
            sessionStorage: {
                sessionKey: !!sessionStorage.getItem('vault_session_key')
            },
            errors: window.vaultErrors || []
        };

        const body = document.getElementById('debugBody');
        body.innerHTML = `
            <pre class="debug-output">${JSON.stringify(debugInfo, null, 2)}</pre>
        `;
        
        modal.classList.remove('hidden');
    },

    closeDebugModal() {
        const modal = document.getElementById('debugModal');
        if (modal) modal.classList.add('hidden');
    },

    copyDebugInfo() {
        const debugOutput = document.querySelector('.debug-output');
        if (debugOutput) {
            navigator.clipboard.writeText(debugOutput.textContent)
                .then(() => this.showToast('Debug info copied!', 'success'))
                .catch(() => this.showToast('Failed to copy', 'error'));
        }
    },

    // Show quick add variable modal (standalone, no service selection required first)
    showQuickAddModal() {
        console.log('[VaultUI] Opening quick add modal');
        
        let modal = document.getElementById('quickAddModal');
        if (!modal) {
            const modalHtml = `
                <div id="quickAddModal" class="modal">
                    <div class="modal-overlay" onclick="VaultUI.closeQuickAddModal()"></div>
                    <div class="modal-content quick-add-modal">
                        <div class="modal-header">
                            <h2>Add Variable</h2>
                            <button class="btn-close" onclick="VaultUI.closeQuickAddModal()">✕</button>
                        </div>
                        <div class="modal-body">
                            <p class="quick-add-intro">Add a variable to any service.</p>
                            
                            <div class="form-group">
                                <label>Select Service</label>
                                <select id="quickAddService" class="form-select">
                                    <option value="">-- Choose a service --</option>
                                </select>
                            </div>
                            
                            <div class="form-group">
                                <label>Variable Name</label>
                                <input type="text" id="quickAddKey" placeholder="VARIABLE_NAME" class="form-input">
                            </div>
                            
                            <div class="form-group">
                                <label>Value</label>
                                <input type="text" id="quickAddValue" placeholder="Enter value" class="form-input">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="VaultUI.closeQuickAddModal()">Cancel</button>
                            <button class="btn-primary" onclick="VaultUI.quickAddVariable()">Add Variable</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('quickAddModal');
        }
        
        // Populate service dropdown
        const serviceSelect = document.getElementById('quickAddService');
        if (this.servicesConfig?.services) {
            serviceSelect.innerHTML = '<option value="">-- Choose a service --</option>' + 
                this.servicesConfig.services.map(s => 
                    `<option value="${s.id}">${s.name}</option>`
                ).join('');
        }
        
        // Clear previous values
        document.getElementById('quickAddKey').value = '';
        document.getElementById('quickAddValue').value = '';
        
        modal.classList.remove('hidden');
    },

    closeQuickAddModal() {
        const modal = document.getElementById('quickAddModal');
        if (modal) modal.classList.add('hidden');
    },

    quickAddVariable() {
        const serviceId = document.getElementById('quickAddService').value;
        const key = document.getElementById('quickAddKey').value.trim().toUpperCase().replace(/\s+/g, '_');
        const value = document.getElementById('quickAddValue').value;
        
        if (!serviceId) {
            this.showToast('Please select a service', 'error');
            return;
        }
        
        if (!key) {
            this.showToast('Variable name is required', 'error');
            return;
        }
        
        // Add the variable
        this.updateVariable(serviceId, key, value);
        
        this.closeQuickAddModal();
        this.showToast(`Added ${key} to ${serviceId}`, 'success');
        
        // If we're currently viewing that service, refresh it
        if (this.currentService === serviceId) {
            this.selectService(serviceId);
        }
    },

    initQuickSearch() {
        // Create search modal HTML if not exists
        if (!document.getElementById('quickSearchModal')) {
            const modalHtml = `
                <div id="quickSearchModal" class="modal hidden">
                    <div class="modal-overlay" onclick="VaultUI.closeQuickSearch()"></div>
                    <div class="modal-content quick-search-modal">
                        <div class="quick-search-header">
                            <input type="text" 
                                   id="quickSearchInput" 
                                   placeholder="Search variables (Ctrl+K)" 
                                   autocomplete="off">
                            <button class="btn-close" onclick="VaultUI.closeQuickSearch()">✕</button>
                        </div>
                        <div id="quickSearchResults" class="quick-search-results"></div>
                        <div class="quick-search-footer">
                            <span>↑↓ Navigate</span>
                            <span>↵ Select</span>
                            <span>Esc Close</span>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            
            // Add keyboard shortcut
            document.addEventListener('keydown', (e) => {
                // Ctrl/Cmd + K
                if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                    e.preventDefault();
                    this.openQuickSearch();
                }
                // Escape to close
                if (e.key === 'Escape' && !document.getElementById('quickSearchModal').classList.contains('hidden')) {
                    this.closeQuickSearch();
                }
            });
            
            // Add input handler
            document.getElementById('quickSearchInput').addEventListener('input', (e) => {
                this.performQuickSearch(e.target.value);
            });
            
            // Add keyboard navigation
            document.getElementById('quickSearchInput').addEventListener('keydown', (e) => {
                this.handleSearchNavigation(e);
            });
        }
    },
    
    // Open quick search modal
    openQuickSearch() {
        const modal = document.getElementById('quickSearchModal');
        const input = document.getElementById('quickSearchInput');
        
        modal.classList.remove('hidden');
        input.value = '';
        input.focus();
        
        // Clear previous results
        document.getElementById('quickSearchResults').innerHTML = '';
    },
    
    // Close quick search modal
    closeQuickSearch() {
        const modal = document.getElementById('quickSearchModal');
        modal.classList.add('hidden');
    },
    
    // Search filters
    searchFilters: {
        type: 'all',      // 'all' | 'shared' | 'secrets' | 'urls' | 'ports' | etc.
        service: 'all',   // 'all' | specific service
        date: 'all'       // 'all' | 'today' | 'week' | 'month'
    },

    // Perform search with filters
    performQuickSearch(query) {
        if (!query || query.length < 2) {
            document.getElementById('quickSearchResults').innerHTML = '';
            return;
        }
        
        let results = this.searchVariables(query);
        
        // Apply filters
        if (this.searchFilters.type !== 'all') {
            results = results.filter(r => {
                const type = VaultIntelligence?.detectType(r.key, r.value) || 'text';
                return type === this.searchFilters.type;
            });
        }
        
        if (this.searchFilters.service !== 'all') {
            results = results.filter(r => r.serviceId === this.searchFilters.service);
        }
        
        // Sort results
        results.sort((a, b) => {
            // Exact matches first
            const aExact = a.key.toLowerCase() === query.toLowerCase();
            const bExact = b.key.toLowerCase() === query.toLowerCase();
            if (aExact && !bExact) return -1;
            if (bExact && !aExact) return 1;
            
            // Then by service name
            return a.serviceName.localeCompare(b.serviceName);
        });
        
        this.renderSearchResults(results, query);
    },
    
    // Core search function
    searchVariables(query) {
        const results = [];
        const searchTerm = query.toLowerCase();
        
        // Search through all services
        Object.entries(this.vaultData.services || {}).forEach(([serviceId, variables]) => {
            const service = this.servicesConfig.services.find(s => s.id === serviceId);
            const serviceName = service ? service.name : serviceId;
            
            Object.entries(variables).forEach(([key, value]) => {
                if (key.toLowerCase().includes(searchTerm) || 
                    (value && value.toString().toLowerCase().includes(searchTerm))) {
                    results.push({
                        serviceId,
                        serviceName,
                        key,
                        value: value ? value.toString() : '',
                        isSecret: this.isSecretVariable(key),
                        type: VaultIntelligence?.detectType(key, value) || 'text'
                    });
                }
            });
        });
        
        // Search shared variables
        Object.entries(this.vaultData.shared || {}).forEach(([key, value]) => {
            if (key.toLowerCase().includes(searchTerm) || 
                (value && value.toString().toLowerCase().includes(searchTerm))) {
                results.push({
                    serviceId: 'shared',
                    serviceName: 'Shared Variables',
                    key,
                    value: value ? value.toString() : '',
                    isSecret: this.isSecretVariable(key),
                    type: VaultIntelligence?.detectType(key, value) || 'text',
                    isShared: true
                });
            }
        });
        
        return results;
    },
        
        this.renderSearchResults(results, query);
    },
    
    // Check if variable is secret
    isSecretVariable(key) {
        const secretPatterns = ['TOKEN', 'SECRET', 'PASSWORD', 'KEY', 'PRIVATE'];
        return secretPatterns.some(pattern => key.toUpperCase().includes(pattern));
    },
    
    // Render search results
    renderSearchResults(results, query) {
        const container = document.getElementById('quickSearchResults');
        
        if (results.length === 0) {
            container.innerHTML = '<div class="search-no-results">No variables found</div>';
            return;
        }
        
        // Group by service
        const grouped = results.reduce((acc, result) => {
            if (!acc[result.serviceId]) acc[result.serviceId] = [];
            acc[result.serviceId].push(result);
            return acc;
        }, {});
        
        let html = '';
        Object.entries(grouped).forEach(([serviceId, variables]) => {
            const service = this.servicesConfig.services.find(s => s.id === serviceId);
            html += `
                <div class="search-service-group">
                    <div class="search-service-header">${service?.name || serviceId}</div>
                    ${variables.map((v, index) => `
                        <div class="search-result-item" 
                             data-service-id="${v.serviceId}" 
                             data-variable="${v.key}"
                             tabindex="0">
                            <div class="search-result-key">${this.highlightMatch(v.key, query)}</div>
                            <div class="search-result-value">
                                ${v.isSecret ? '••••••••' : this.escapeHtml(this.truncateValue(v.value))}
                            </div>
                            ${v.description ? `<div class="search-result-desc">${v.description}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        });
        
        container.innerHTML = html;
        
        // Add click handlers
        container.querySelectorAll('.search-result-item').forEach(item => {
            item.addEventListener('click', () => {
                const serviceId = item.dataset.serviceId;
                const variable = item.dataset.variable;
                this.selectSearchResult(serviceId, variable);
            });
        });
        
        // Select first item
        const firstItem = container.querySelector('.search-result-item');
        if (firstItem) firstItem.classList.add('selected');
    },
    
    // Highlight matching text
    highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    },
    
    // Truncate long values
    truncateValue(value, maxLength = 50) {
        if (!value) return '';
        if (value.length <= maxLength) return value;
        return value.substring(0, maxLength) + '...';
    },
    
    // Handle keyboard navigation in search
    handleSearchNavigation(e) {
        const results = document.querySelectorAll('.search-result-item');
        if (results.length === 0) return;
        
        const current = document.querySelector('.search-result-item.selected');
        let currentIndex = current ? Array.from(results).indexOf(current) : -1;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            currentIndex = (currentIndex + 1) % results.length;
            this.selectSearchItem(results[currentIndex]);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            currentIndex = currentIndex <= 0 ? results.length - 1 : currentIndex - 1;
            this.selectSearchItem(results[currentIndex]);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (current) {
                const serviceId = current.dataset.serviceId;
                const variable = current.dataset.variable;
                this.selectSearchResult(serviceId, variable);
            }
        }
    },
    
    // Select search item
    selectSearchItem(item) {
        document.querySelectorAll('.search-result-item').forEach(el => {
            el.classList.remove('selected');
        });
        item.classList.add('selected');
        item.scrollIntoView({ block: 'nearest' });
    },
    
    // Select search result - navigate to service and highlight variable
    selectSearchResult(serviceId, variableKey) {
        this.closeQuickSearch();
        this.selectService(serviceId);
        
        // Highlight the variable after service loads
        setTimeout(() => {
            const inputs = document.querySelectorAll('.variable-card input');
            inputs.forEach(input => {
                const label = input.closest('.variable-card')?.querySelector('label');
                if (label && label.textContent === variableKey) {
                    input.focus();
                    input.select();
                    input.closest('.variable-card').classList.add('highlighted');
                    setTimeout(() => {
                        input.closest('.variable-card').classList.remove('highlighted');
                    }, 2000);
                }
            });
        }, 100);
    },

    // Get shared variables that apply to this service
    getSharedVariablesForService(serviceId) {
        const data = VaultCore.loadVaultData();
        if (!data || !data.shared) return {};
        
        // Filter shared vars that aren't overridden locally
        const serviceVars = data.services[serviceId] || {};
        const sharedVars = {};
        
        Object.entries(data.shared).forEach(([key, value]) => {
            // Include all shared vars, mark if overridden
            sharedVars[key] = value;
        });
        
        return sharedVars;
    },

    // Show shared variables management modal
    showSharedVariables() {
        const data = VaultCore.loadVaultData();
        if (!data) return;

        // Create or update modal
        let modal = document.getElementById('sharedVariablesModal');
        if (!modal) {
            const modalHtml = `
                <div id="sharedVariablesModal" class="modal">
                    <div class="modal-overlay" onclick="VaultUI.closeSharedVariables()"></div>
                    <div class="modal-content shared-variables-modal">
                        <div class="modal-header">
                            <h2>🔗 Shared Variables</h2>
                            <button class="btn-close" onclick="VaultUI.closeSharedVariables()">✕</button>
                        </div>
                        <div class="modal-body">
                            <p class="shared-intro">These variables are inherited by all services. Change them here to update everywhere.</p>
                            <div id="sharedVariablesList" class="shared-variables-list"></div>
                            <div class="add-shared-form">
                                <h4>Add New Shared Variable</h4>
                                <div class="form-row">
                                    <input type="text" id="newSharedKey" placeholder="VARIABLE_NAME">
                                    <input type="text" id="newSharedValue" placeholder="value">
                                    <button class="btn-primary" onclick="VaultUI.addSharedVariable()">Add</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('sharedVariablesModal');
        }

        // Populate list
        this.renderSharedVariablesList();
        
        modal.classList.remove('hidden');
    },

    // Render shared variables list
    renderSharedVariablesList() {
        const data = VaultCore.loadVaultData();
        const container = document.getElementById('sharedVariablesList');
        if (!container || !data) return;

        const shared = data.shared || {};
        
        if (Object.keys(shared).length === 0) {
            container.innerHTML = '<p class="no-shared">No shared variables yet. Add one below.</p>';
            return;
        }

        let html = '';
        Object.entries(shared).forEach(([key, value]) => {
            html += `
                <div class="shared-variable-item">
                    <div class="shared-var-info">
                        <code class="shared-key">${key}</code>
                        <span class="shared-value">${this.escapeHtml(value)}</span>
                    </div>
                    <div class="shared-var-actions">
                        <button class="btn-icon" onclick="VaultUI.editSharedVariable('${key}')" title="Edit">✏️</button>
                        <button class="btn-icon" onclick="VaultUI.deleteSharedVariable('${key}')" title="Delete">🗑️</button>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },

    // Add new shared variable
    addSharedVariable() {
        const keyInput = document.getElementById('newSharedKey');
        const valueInput = document.getElementById('newSharedValue');
        
        const key = keyInput.value.trim().toUpperCase();
        const value = valueInput.value.trim();
        
        if (!key) {
            this.showToast('Variable name required', 'error');
            return;
        }
        
        if (VaultCore.saveSharedVariable(key, value)) {
            this.showToast(`Shared variable ${key} added`, 'success');
            keyInput.value = '';
            valueInput.value = '';
            this.renderSharedVariablesList();
            
            // Refresh current service view if open
            if (this.currentService) {
                this.selectService(this.currentService);
            }
        }
    },

    // Edit shared variable
    editSharedVariable(key) {
        const data = VaultCore.loadVaultData();
        if (!data || !data.shared) return;
        
        const currentValue = data.shared[key];
        const newValue = prompt(`Edit ${key}:`, currentValue);
        
        if (newValue !== null && newValue !== currentValue) {
            if (VaultCore.saveSharedVariable(key, newValue)) {
                this.showToast(`Shared variable ${key} updated`, 'success');
                this.renderSharedVariablesList();
                
                // Refresh current service view
                if (this.currentService) {
                    this.selectService(this.currentService);
                }
            }
        }
    },

    // Delete shared variable
    deleteSharedVariable(key) {
        if (!confirm(`Delete shared variable ${key}? This will affect all services using it.`)) {
            return;
        }
        
        if (VaultCore.deleteSharedVariable(key)) {
            this.showToast(`Shared variable ${key} deleted`, 'success');
            this.renderSharedVariablesList();
            
            // Refresh current service view
            if (this.currentService) {
                this.selectService(this.currentService);
            }
        }
    },

    // Remove local override (revert to shared)
    removeLocalOverride(serviceId, key) {
        if (!confirm(`Remove local override for ${key}? Will use shared value.`)) {
            return;
        }
        
        const data = VaultCore.loadVaultData();
        if (data && data.services[serviceId]) {
            delete data.services[serviceId][key];
            VaultCore.saveVaultData(data);
            
            this.showToast(`Reverted ${key} to shared value`, 'success');
            this.selectService(serviceId);
        }
    },

    // Close shared variables modal
    closeSharedVariables() {
        const modal = document.getElementById('sharedVariablesModal');
        if (modal) modal.classList.add('hidden');
    },

    // Intelligent Variable Management
    
    // Handle variable input with real-time intelligence
    handleVariableInput(input) {
        const key = input.dataset.key;
        const serviceId = input.dataset.service;
        const value = input.value;
        
        if (!VaultIntelligence) return;
        
        const validation = VaultIntelligence.validateAsYouType(key, value);
        const card = input.closest('.variable-card');
        
        // Update validation styling
        card.classList.remove('invalid', 'warning');
        if (!validation.valid) {
            card.classList.add('invalid');
        } else if (validation.warning) {
            card.classList.add('warning');
        }
        
        // Update or create validation message
        let msgDiv = card.querySelector('.validation-message');
        if (!validation.valid || validation.warning) {
            if (!msgDiv) {
                msgDiv = document.createElement('div');
                msgDiv.className = 'validation-message';
                card.appendChild(msgDiv);
            }
            msgDiv.className = `validation-message ${!validation.valid ? 'error' : 'warning'}`;
            msgDiv.innerHTML = `${!validation.valid ? '❌' : '⚠️'} ${validation.error || validation.warning}`;
        } else if (msgDiv) {
            msgDiv.remove();
        }
    },
    
    // Generate secure value for variable
    generateValue(serviceId, key) {
        if (!VaultIntelligence) return;
        
        const suggestions = VaultIntelligence.getSuggestions(key);
        if (suggestions.generator) {
            const value = suggestions.generator();
            const input = document.getElementById(`var-${key}`);
            if (input) {
                input.value = value;
                input.type = suggestions.isSecret ? 'text' : input.type; // Show generated value temporarily
                this.updateVariable(serviceId, key, value);
                this.showToast(`Generated secure ${suggestions.type} for ${key}`, 'success');
                
                // Flash the input
                input.style.background = 'rgba(16, 185, 129, 0.2)';
                setTimeout(() => {
                    input.style.background = '';
                    if (suggestions.isSecret) input.type = 'password';
                }, 1000);
            }
        }
    },
    
    // Set variable value from suggestion
    setVariableValue(serviceId, key, value) {
        const input = document.getElementById(`var-${key}`);
        if (input) {
            input.value = value;
            this.updateVariable(serviceId, key, value);
        }
    },
    
    // Show template application modal
    showTemplateModal() {
        if (!VaultIntelligence) return;
        
        const templates = VaultIntelligence.templates;
        
        let modal = document.getElementById('templateModal');
        if (!modal) {
            const modalHtml = `
                <div id="templateModal" class="modal hidden">
                    <div class="modal-overlay" onclick="VaultUI.closeTemplateModal()"></div>
                    <div class="modal-content template-modal">
                        <div class="modal-header">
                            <h2>📋 Apply Variable Template</h2>
                            <button class="btn-close" onclick="VaultUI.closeTemplateModal()">✕</button>
                        </div>
                        <div class="modal-body">
                            <div class="template-list" id="templateList"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('templateModal');
        }
        
        // Render templates
        const list = document.getElementById('templateList');
        list.innerHTML = Object.entries(templates).map(([id, template]) => `
            <div class="template-item" onclick="VaultUI.applyTemplate('${id}')">
                <div class="template-icon">${template.icon}</div>
                <div class="template-info">
                    <h3>${template.name}</h3>
                    <p>${template.description}</p>
                    <span class="template-count">${template.variables.length} variables</span>
                </div>
                <button class="btn-apply">Apply</button>
            </div>
        `).join('');
        
        modal.classList.remove('hidden');
    },
    
    // Close template modal
    closeTemplateModal() {
        const modal = document.getElementById('templateModal');
        if (modal) modal.classList.add('hidden');
    },
    
    // Apply template to current service
    applyTemplate(templateId) {
        if (!VaultIntelligence || !this.currentService) return;
        
        const result = VaultIntelligence.applyTemplate(templateId, this.currentService);
        if (result) {
            const { added, skipped } = result;
            const msg = `Template applied: ${added.length} added, ${skipped.length} skipped`;
            this.showToast(msg, 'success');
            this.closeTemplateModal();
            this.selectService(this.currentService);
        }
    },
    
    // Analyze current service for issues
    analyzeService() {
        if (!VaultIntelligence || !this.currentService) return;
        
        const analysis = VaultIntelligence.analyzeService(this.currentService);
        if (!analysis) return;
        
        const { issues, warnings, info } = analysis;
        const total = issues.filter(i => i.type === 'error').length + warnings.length + info.length;
        
        if (total === 0) {
            this.showToast('No issues found! Service configuration looks good.', 'success');
            return;
        }
        
        // Show analysis modal
        let modal = document.getElementById('analysisModal');
        if (!modal) {
            const modalHtml = `
                <div id="analysisModal" class="modal hidden">
                    <div class="modal-overlay" onclick="VaultUI.closeAnalysisModal()"></div>
                    <div class="modal-content analysis-modal">
                        <div class="modal-header">
                            <h2>🔍 Service Analysis</h2>
                            <button class="btn-close" onclick="VaultUI.closeAnalysisModal()">✕</button>
                        </div>
                        <div class="modal-body" id="analysisBody"></div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('analysisModal');
        }
        
        const body = document.getElementById('analysisBody');
        let html = '';
        
        if (issues.filter(i => i.type === 'error').length > 0) {
            html += `<div class="analysis-section errors">
                <h3>❌ Errors (${issues.filter(i => i.type === 'error').length})</h3>
                ${issues.filter(i => i.type === 'error').map(i => `
                    <div class="analysis-item error">
                        <code>${i.key}</code>: ${i.message}
                    </div>
                `).join('')}
            </div>`;
        }
        
        if (warnings.length > 0) {
            html += `<div class="analysis-section warnings">
                <h3>⚠️ Warnings (${warnings.length})</h3>
                ${warnings.map(w => `
                    <div class="analysis-item warning">
                        <code>${w.key}</code>: ${w.message}
                    </div>
                `).join('')}
            </div>`;
        }
        
        if (info.length > 0) {
            html += `<div class="analysis-section info">
                <h3>ℹ️ Suggestions (${info.length})</h3>
                ${info.map(i => `
                    <div class="analysis-item info">
                        <span>${i.message}</span>
                    </div>
                `).join('')}
            </div>`;
        }
        
        body.innerHTML = html;
        modal.classList.remove('hidden');
    },
    
    // Close analysis modal
    closeAnalysisModal() {
        const modal = document.getElementById('analysisModal');
        if (modal) modal.classList.add('hidden');
    },
    
    // Show suggestions for shared variables
    showSharedSuggestions() {
        if (!VaultIntelligence) return;
        
        const suggestions = VaultIntelligence.suggestSharedVariables();
        if (suggestions.length === 0) {
            this.showToast('No shared variable suggestions found', 'info');
            return;
        }
        
        // Show suggestions in toast
        suggestions.slice(0, 3).forEach(s => {
            setTimeout(() => {
                this.showToast(s.suggestion, 'warning', 8000);
            }, 500);
        });
    },

    // Handle shared variable change events
    handleSharedVariableChanged(data) {
        console.log('[VaultUI] Shared variable changed:', data);
        
        // Refresh current service view if affected
        if (this.currentService && data.affectedServices.includes(this.currentService)) {
            // Check if this service doesn't have local override
            const hasLocalOverride = this.vaultData?.services?.[this.currentService]?.[data.key] !== undefined;
            
            if (!hasLocalOverride) {
                // Re-render service view
                this.selectService(this.currentService);
                
                // Visual feedback
                setTimeout(() => {
                    const card = document.querySelector(`#var-${data.key}`)?.closest('.variable-card');
                    if (card) {
                        card.classList.add('shared-updated');
                        setTimeout(() => card.classList.remove('shared-updated'), 2000);
                    }
                }, 100);
                
                // Show notification
                const otherServices = data.affectedServices.filter(s => s !== this.currentService).length;
                const msg = otherServices > 0 
                    ? `Updated ${data.key} (affects ${data.affectedServices.length} services)`
                    : `Updated ${data.key}`;
                this.showToast(msg, 'success');
            }
        }
        
        // Update sidebar to show affected services
        this.highlightAffectedServices(data.affectedServices);
    },
    
    // Handle shared variable deletion events
    handleSharedVariableDeleted(data) {
        console.log('[VaultUI] Shared variable deleted:', data);
        
        // Refresh current service view if affected
        if (this.currentService && data.affectedServices.includes(this.currentService)) {
            this.selectService(this.currentService);
            this.showToast(`${data.key} removed from shared variables`, 'info');
        }
    },
    
    // Highlight services affected by shared variable changes
    highlightAffectedServices(serviceIds) {
        serviceIds.forEach(serviceId => {
            const btn = document.querySelector(`[onclick="VaultUI.selectService('${serviceId}')"]`);
            if (btn && serviceId !== this.currentService) {
                btn.classList.add('has-updates');
                setTimeout(() => btn.classList.remove('has-updates'), 3000);
            }
        });
    },

    // Bulk Edit Mode Methods
    
    // Toggle bulk edit mode
    toggleBulkEdit() {
        this.bulkEditMode = !this.bulkEditMode;
        this.selectedVariables = [];
        
        // Re-render service content with checkboxes
        if (this.currentService) {
            this.selectService(this.currentService);
        }
        
        // Show/hide bulk edit controls
        this.renderBulkEditControls();
    },
    
    // Render bulk edit controls
    renderBulkEditControls() {
        let controls = document.getElementById('bulkEditControls');
        
        if (this.bulkEditMode) {
            if (!controls) {
                controls = document.createElement('div');
                controls.id = 'bulkEditControls';
                controls.className = 'bulk-edit-controls';
                
                const serviceContent = document.getElementById('serviceContent');
                if (serviceContent) {
                    serviceContent.insertBefore(controls, serviceContent.firstChild);
                }
            }
            
            controls.innerHTML = `
                <div class="bulk-edit-bar">
                    <span class="bulk-edit-title">Bulk Edit Mode</span>
                    <span class="bulk-edit-count" id="bulkEditCount">0 selected</span>
                    <div class="bulk-edit-actions">
                        <button class="btn-secondary" onclick="VaultUI.toggleBulkEdit()">Cancel</button>
                        <button class="btn-primary" id="bulkEditBtn" onclick="VaultUI.showBulkEditForm()" disabled>
                            Edit Selected
                        </button>
                    </div>
                </div>
            `;
            controls.classList.remove('hidden');
        } else if (controls) {
            controls.classList.add('hidden');
        }
    },
    
    // Toggle variable selection
    toggleVariableSelection(key) {
        if (this.selectedVariables.includes(key)) {
            this.selectedVariables = this.selectedVariables.filter(k => k !== key);
        } else {
            this.selectedVariables.push(key);
        }
        
        // Update UI
        this.updateBulkEditUI();
        
        // Re-render to show selection state
        if (this.currentService) {
            this.selectService(this.currentService);
        }
    },
    
    // Update bulk edit UI
    updateBulkEditUI() {
        const countEl = document.getElementById('bulkEditCount');
        const btn = document.getElementById('bulkEditBtn');
        
        if (countEl) {
            countEl.textContent = `${this.selectedVariables.length} selected`;
        }
        
        if (btn) {
            btn.disabled = this.selectedVariables.length === 0;
        }
    },
    
    // Show bulk edit form modal
    showBulkEditForm() {
        if (this.selectedVariables.length === 0) return;
        
        const serviceData = VaultCore.getServiceVariables(this.currentService);
        
        let modal = document.getElementById('bulkEditModal');
        if (!modal) {
            const modalHtml = `
                <div id="bulkEditModal" class="modal">
                    <div class="modal-overlay" onclick="VaultUI.closeBulkEditModal()"></div>
                    <div class="modal-content bulk-edit-modal">
                        <div class="modal-header">
                            <h2>Edit ${this.selectedVariables.length} Variables</h2>
                            <button class="btn-close" onclick="VaultUI.closeBulkEditModal()">✕</button>
                        </div>
                        <div class="modal-body" id="bulkEditBody"></div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="VaultUI.closeBulkEditModal()">Cancel</button>
                            <button class="btn-primary" onclick="VaultUI.saveBulkEdit()">Save All Changes</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            modal = document.getElementById('bulkEditModal');
        }
        
        // Populate form
        const body = document.getElementById('bulkEditBody');
        body.innerHTML = this.selectedVariables.map(key => {
            const value = serviceData[key] || '';
            const isSecret = VaultIntelligence?.getSuggestions(key)?.isSecret || false;
            
            return `
                <div class="bulk-edit-field">
                    <label for="bulk-${key}">${key}</label>
                    <input type="${isSecret ? 'password' : 'text'}" 
                           id="bulk-${key}" 
                           value="${this.escapeHtml(value)}"
                           class="bulk-edit-input">
                </div>
            `;
        }).join('');
        
        modal.classList.remove('hidden');
    },
    
    // Save bulk edits
    saveBulkEdit() {
        const updates = {};
        let updateCount = 0;
        
        this.selectedVariables.forEach(key => {
            const input = document.getElementById(`bulk-${key}`);
            if (input) {
                const newValue = input.value;
                const currentValue = VaultCore.getVariable(this.currentService, key);
                
                // Only update if changed
                if (newValue !== currentValue) {
                    updates[key] = newValue;
                    updateCount++;
                }
            }
        });
        
        if (updateCount > 0) {
            // Apply updates
            const data = VaultCore.loadVaultData();
            if (!data.services[this.currentService]) {
                data.services[this.currentService] = {};
            }
            
            Object.entries(updates).forEach(([key, value]) => {
                data.services[this.currentService][key] = value;
                VaultCore.addHistory(this.currentService, 'updated', { key, newValue: value });
            });
            
            VaultCore.saveVaultData(data);
            this.vaultData = data;
            
            this.showToast(`Updated ${updateCount} variables`, 'success');
        } else {
            this.showToast('No changes to save', 'info');
        }
        
        this.closeBulkEditModal();
        this.toggleBulkEdit(); // Exit bulk edit mode
        
        // Refresh view
        if (this.currentService) {
            this.selectService(this.currentService);
        }
    },
    
    // Close bulk edit modal
    closeBulkEditModal() {
        const modal = document.getElementById('bulkEditModal');
        if (modal) modal.classList.add('hidden');
    }
};

window.VaultUI = VaultUI;

// Initialize on page load if vault page
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        VaultUI.init();
    });
}
