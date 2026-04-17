/**
 * vault-ui.js - UI management module
 */

const VaultUI = {
    servicesConfig: null,
    vaultData: null,
    currentService: null,

    async init() {
        await this.loadServicesConfig();
        this.vaultData = VaultCore.loadVaultData();
        this.renderServices();
    },

    async loadServicesConfig() {
        try {
            const response = await fetch('vault-services.json');
            this.servicesConfig = await response.json();
        } catch (e) {
            console.error('Failed to load services:', e);
        }
    },

    renderServices() {
        if (!this.servicesConfig) return;

        const container = document.getElementById('serviceList');
        if (!container) return;

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
        const icons = { 'static': '🌐', 'node': '⚙️', 'discord-bot': '🤖', 'database': '🗄️' };
        return icons[type] || '📦';
    },

    selectService(serviceId) {
        this.currentService = serviceId;
        this.renderServices();

        const service = this.servicesConfig.services.find(s => s.id === serviceId);
        if (!service) return;

        const serviceData = this.vaultData?.services?.[serviceId] || {};
        
        // Hide welcome, show content
        document.getElementById('welcomeScreen')?.classList.add('hidden');
        document.getElementById('serviceContent')?.classList.remove('hidden');

        // Build content
        let html = `
            <div class="service-header">
                <div class="service-title">
                    <h2>${service.name}</h2>
                    <p>${service.description}</p>
                </div>
                <button class="btn-primary" onclick="VaultUI.deployService('${serviceId}')">
                    🚀 Deploy to Railway
                </button>
            </div>
        `;

        // Render categories
        service.categories.forEach(category => {
            const vars = service.variables.filter(v => v.category === category.id);
            if (vars.length === 0) return;

            html += `
                <div class="category-section">
                    <h3 class="category-title">${category.name}</h3>
                    <div class="variables-grid">
            `;

            vars.forEach(variable => {
                const value = serviceData[variable.key] || '';
                const isSecret = variable.type === 'secret';

                html += `
                    <div class="variable-card">
                        <div class="variable-header">
                            <label>${variable.key}</label>
                            ${variable.required ? '<span class="badge required">Required</span>' : ''}
                        </div>
                        <p class="variable-desc">${variable.description}</p>
                        <div class="variable-input">
                            <input type="${isSecret ? 'password' : 'text'}" 
                                   value="${value}"
                                   placeholder="${variable.default || ''}"
                                   onchange="VaultUI.updateVariable('${serviceId}', '${variable.key}', this.value)"
                            >
                        </div>
                    </div>
                `;
            });

            html += '</div></div>';
        });

        // Custom variables section
        html += `
            <div class="custom-variables">
                <button class="btn-secondary" onclick="VaultUI.addCustomVariable('${serviceId}')">
                    + Add Custom Variable
                </button>
            </div>
        `;

        const contentEl = document.getElementById('serviceContent');
        if (contentEl) contentEl.innerHTML = html;
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
        this.updateVariable(serviceId, name.toUpperCase(), value);
        this.selectService(serviceId);
    },

    deployService(serviceId) {
        const token = VaultCore.getRailwayToken();
        if (!token) {
            this.showToast('Railway token not configured', 'error');
            return;
        }
        this.showToast('Deploying...', 'info');
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;

        container.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }
};

window.VaultUI = VaultUI;
