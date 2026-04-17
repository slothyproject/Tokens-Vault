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

        const serviceData = this.vaultData?.services?.[serviceId] || {};
        
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
                <button class="btn-primary" onclick="VaultUI.deployService('${serviceId}')">
                    🚀 Deploy to Railway
                </button>
            </div>
        `;

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
    }
};

window.VaultUI = VaultUI;

// Initialize on page load if vault page
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        VaultUI.init();
    });
}
