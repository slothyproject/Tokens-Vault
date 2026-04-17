/**
 * vault-ui.js - UI management module with Brave compatibility
 */

const VaultUI = {
    servicesConfig: null,
    vaultData: null,
    currentService: null,

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
        this.currentService = serviceId;
        this.renderServices();

        const service = this.servicesConfig.services.find(s => s.id === serviceId);
        if (!service) return;

        // Use merged variables (shared + local, local wins)
        const serviceData = VaultCore.getServiceVariables(serviceId);
        const localData = this.vaultData?.services?.[serviceId] || {};
        
        // Hide welcome, show content
        const welcomeScreen = document.getElementById('welcomeScreen');
        const serviceContent = document.getElementById('serviceContent');
        
        if (welcomeScreen) welcomeScreen.classList.add('hidden');
        if (serviceContent) serviceContent.classList.remove('hidden');

        // Build content
        let html = `
            <div class="service-header">
                <div class="service-title">
                    <h2>${service.name}</h2>
                    <p>${service.description || 'No description available'}</p>
                </div>
                <div class="service-actions">
                    <button class="btn-secondary" onclick="VaultUI.showSharedVariables()">
                        🔗 Manage Shared Variables
                    </button>
                    <button class="btn-primary" onclick="VaultUI.deployService('${serviceId}')">
                        🚀 Deploy to Railway
                    </button>
                </div>
            </div>
        `;

        // Show shared variables section if any inherited
        const sharedVars = this.getSharedVariablesForService(serviceId);
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
                        <div class="variable-card">
                            <div class="variable-header">
                                <label>${variable.key}</label>
                                ${variable.required ? '<span class="badge required">Required</span>' : ''}
                            </div>
                            <p class="variable-desc">${variable.description || ''}</p>
                            <div class="variable-input">
                                <input type="${isSecret ? 'password' : 'text'}" 
                                       value="${this.escapeHtml(value)}"
                                       placeholder="${variable.default || ''}"
                                       onchange="VaultUI.updateVariable('${serviceId}', '${variable.key}', this.value)"
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
                    <div class="variable-card ${!validation.valid ? 'invalid' : validation.warning ? 'warning' : ''}">
                        <div class="variable-header">
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
                                       onchange="VaultUI.updateVariable('${serviceId}', '${variable.key}', this.value)"
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
                    <div class="variable-card">
                        <div class="variable-header">
                            <label>${key}</label>
                            <button class="btn-icon" onclick="VaultUI.deleteCustomVariable('${serviceId}', '${key}')" title="Delete">🗑️</button>
                        </div>
                        <div class="variable-input">
                            <input type="text" 
                                   value="${this.escapeHtml(value)}"
                                   onchange="VaultUI.updateVariable('${serviceId}', '${key}', this.value)"
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
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    updateVariable(serviceId, key, value) {
        if (!this.vaultData.services[serviceId]) {
            this.vaultData.services[serviceId] = {};
        }

        this.vaultData.services[serviceId][key] = value;
        VaultCore.saveVaultData(this.vaultData);
        VaultCore.addHistory(serviceId, key, 'updated');

        this.showToast(`${key} updated`, 'success');
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

    async deployService(serviceId) {
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

    // Initialize Quick Search
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
    
    // Perform search
    performQuickSearch(query) {
        if (!query || query.length < 2) {
            document.getElementById('quickSearchResults').innerHTML = '';
            return;
        },
        
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
                        isSecret: this.isSecretVariable(key)
                    });
                }
            });
        });
        
        // Also search variable definitions from config
        if (this.servicesConfig.services) {
            this.servicesConfig.services.forEach(service => {
                if (service.variables) {
                    service.variables.forEach(variable => {
                        if (variable.key.toLowerCase().includes(searchTerm) ||
                            (variable.description && variable.description.toLowerCase().includes(searchTerm))) {
                            // Check if not already in results
                            const exists = results.find(r => 
                                r.serviceId === service.id && r.key === variable.key
                            );
                            if (!exists) {
                                const currentValue = this.vaultData.services[service.id]?.[variable.key] || '';
                                results.push({
                                    serviceId: service.id,
                                    serviceName: service.name,
                                    key: variable.key,
                                    value: currentValue,
                                    isSecret: variable.type === 'secret' || variable.sensitive,
                                    description: variable.description
                                });
                            }
                        }
                    });
                }
            });
        }
        
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
                                ${v.isSecret ? '••••••••' : this.truncateValue(v.value)}
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
    }
};

window.VaultUI = VaultUI;

// Initialize on page load if vault page
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        VaultUI.init();
    });
}
