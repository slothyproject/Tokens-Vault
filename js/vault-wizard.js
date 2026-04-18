/**
 * vault-wizard.js - First-run Setup Wizard
 * Guides users through configuring all 4 services
 */

const VaultWizard = {
    // State
    currentStep: 0,
    totalSteps: 5,
    wizardData: {},
    
    // Check if wizard should show
    shouldShow() {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData) return true;
        
        // Count total variables across all services
        let totalVars = 0;
        Object.values(vaultData.services || {}).forEach(serviceVars => {
            totalVars += Object.keys(serviceVars).length;
        });
        
        // Show wizard if no variables set up yet
        return totalVars === 0 && !localStorage.getItem('vaultWizardCompleted');
    },
    
    // Initialize and show wizard
    init() {
        if (!this.shouldShow()) {
            console.log('[VaultWizard] Skipping wizard - vault already configured');
            return;
        }
        
        console.log('[VaultWizard] Starting setup wizard');
        this.currentStep = 1;
        this.wizardData = {};
        this.showWizard();
    },
    
    // Show wizard modal
    showWizard() {
        let modal = document.getElementById('setupWizard');
        if (!modal) {
            this.createWizardHTML();
            modal = document.getElementById('setupWizard');
        }
        
        this.renderStep();
        modal.classList.remove('hidden');
    },
    
    // Create wizard HTML structure
    createWizardHTML() {
        const html = `
            <div id="setupWizard" class="wizard-overlay hidden">
                <div class="wizard-container">
                    <div class="wizard-header">
                        <h2>🔐 Dissident Token Vault Setup</h2>
                        <div class="wizard-progress-container">
                            <div class="wizard-progress-bar" id="wizardProgressBar"></div>
                        </div>
                        <span class="wizard-step-indicator" id="wizardStepIndicator">Step 1 of 5</span>
                    </div>
                    
                    <div class="wizard-body" id="wizardBody">
                        <!-- Step content rendered here -->
                    </div>
                    
                    <div class="wizard-footer">
                        <button class="btn-secondary" id="wizardBackBtn" onclick="VaultWizard.prevStep()" disabled>Back</button>
                        <button class="btn-primary" id="wizardNextBtn" onclick="VaultWizard.nextStep()">Next</button>
                        <button class="btn-text" id="wizardSkipBtn" onclick="VaultWizard.skipWizard()">Skip Setup</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', html);
    },
    
    // Render current step
    renderStep() {
        const body = document.getElementById('wizardBody');
        const progressBar = document.getElementById('wizardProgressBar');
        const stepIndicator = document.getElementById('wizardStepIndicator');
        const backBtn = document.getElementById('wizardBackBtn');
        const nextBtn = document.getElementById('wizardNextBtn');
        const skipBtn = document.getElementById('wizardSkipBtn');
        
        // Update progress
        const progress = (this.currentStep / this.totalSteps) * 100;
        progressBar.style.width = `${progress}%`;
        stepIndicator.textContent = `Step ${this.currentStep} of ${this.totalSteps}`;
        
        // Update buttons
        backBtn.disabled = this.currentStep === 1;
        
        if (this.currentStep === this.totalSteps) {
            nextBtn.textContent = 'Complete Setup';
            skipBtn.style.display = 'none';
        } else {
            nextBtn.textContent = 'Next';
            skipBtn.style.display = 'inline-block';
        }
        
        // Render step content
        switch (this.currentStep) {
            case 1:
                body.innerHTML = this.renderWelcomeStep();
                break;
            case 2:
                body.innerHTML = this.renderBackendStep();
                break;
            case 3:
                body.innerHTML = this.renderWebsiteStep();
                break;
            case 4:
                body.innerHTML = this.renderDiscordBotStep();
                break;
            case 5:
                body.innerHTML = this.renderVaultStep();
                break;
        }
        
        // Restore saved data if any
        this.restoreStepData();
    },
    
    // Step 1: Welcome
    renderWelcomeStep() {
        return `
            <div class="wizard-step welcome-step">
                <div class="step-icon">👋</div>
                <h3>Welcome to Your Token Vault</h3>
                <p>This wizard will help you configure environment variables for all your Dissident services.</p>
                
                <div class="setup-overview">
                    <h4>We'll set up:</h4>
                    <ul>
                        <li><span class="service-dot backend"></span> Dissident API Backend</li>
                        <li><span class="service-dot website"></span> Dissident Website</li>
                        <li><span class="service-dot bot"></span> Discord Bot</li>
                        <li><span class="service-dot vault"></span> Token Vault</li>
                    </ul>
                </div>
                
                <div class="time-estimate">
                    ⏱️ Estimated time: 3-5 minutes
                </div>
                
                <p class="privacy-note">
                    🔒 Your secrets are encrypted in your browser. They never leave your device unencrypted.
                </p>
            </div>
        `;
    },
    
    // Step 2: Backend API
    renderBackendStep() {
        return `
            <div class="wizard-step">
                <div class="step-header">
                    <span class="service-icon backend">⚙️</span>
                    <h3>Configure Backend API</h3>
                    <p>The backend handles Discord OAuth and database connections.</p>
                </div>
                
                <div class="form-sections">
                    <div class="form-section">
                        <h4>Discord OAuth</h4>
                        <p class="section-help">From <a href="https://discord.com/developers/applications" target="_blank">Discord Developer Portal</a></p>
                        
                        <div class="form-group">
                            <label>DISCORD_CLIENT_ID</label>
                            <input type="text" class="wizard-input" data-service="dissident-backend" data-key="DISCORD_CLIENT_ID" placeholder="1493639167526174830">
                        </div>
                        
                        <div class="form-group">
                            <label>DISCORD_CLIENT_SECRET</label>
                            <input type="password" class="wizard-input" data-service="dissident-backend" data-key="DISCORD_CLIENT_SECRET" placeholder="From Discord Developer Portal">
                            <span class="input-hint">Keep this secret! Never share it.</span>
                        </div>
                        
                        <div class="form-group">
                            <label>DISCORD_BOT_TOKEN</label>
                            <input type="password" class="wizard-input" data-service="dissident-backend" data-key="DISCORD_BOT_TOKEN" placeholder="Bot token from Discord">
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Security</h4>
                        
                        <div class="form-group">
                            <label>JWT_SECRET</label>
                            <div class="input-with-action">
                                <input type="password" class="wizard-input" data-service="dissident-backend" data-key="JWT_SECRET" id="jwtSecretInput" placeholder="Click Generate">
                                <button type="button" class="btn-secondary btn-small" onclick="VaultWizard.generateJWTSecret()">Generate</button>
                            </div>
                            <span class="input-hint">Used to sign authentication tokens</span>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>URLs</h4>
                        
                        <div class="form-group">
                            <label>FRONTEND_URL</label>
                            <input type="url" class="wizard-input" data-service="dissident-backend" data-key="FRONTEND_URL" value="https://dissident.mastertibbles.co.uk">
                        </div>
                        
                        <div class="form-group">
                            <label>DATABASE_URL (optional)</label>
                            <input type="text" class="wizard-input" data-service="dissident-backend" data-key="DATABASE_URL" placeholder="PostgreSQL connection string">
                            <span class="input-hint">Railway provides this automatically</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Step 3: Website
    renderWebsiteStep() {
        return `
            <div class="wizard-step">
                <div class="step-header">
                    <span class="service-icon website">🌐</span>
                    <h3>Configure Website</h3>
                    <p>Static frontend website configuration.</p>
                </div>
                
                <div class="form-sections">
                    <div class="form-section">
                        <h4>URLs</h4>
                        
                        <div class="form-group">
                            <label>FRONTEND_URL</label>
                            <input type="url" class="wizard-input" data-service="dissident-website" data-key="FRONTEND_URL" value="https://dissident.mastertibbles.co.uk">
                            <span class="input-hint">Your website's public URL</span>
                        </div>
                        
                        <div class="form-group">
                            <label>API_BASE_URL</label>
                            <input type="url" class="wizard-input" data-service="dissident-website" data-key="API_BASE_URL" value="https://dissident-api-backend-production.up.railway.app">
                            <span class="input-hint">Backend API URL for website to connect to</span>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>Environment</h4>
                        
                        <div class="form-group">
                            <label>NODE_ENV</label>
                            <select class="wizard-input" data-service="dissident-website" data-key="NODE_ENV">
                                <option value="production" selected>production</option>
                                <option value="development">development</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>PORT</label>
                            <input type="number" class="wizard-input" data-service="dissident-website" data-key="PORT" value="8080">
                        </div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Step 4: Discord Bot
    renderDiscordBotStep() {
        return `
            <div class="wizard-step">
                <div class="step-header">
                    <span class="service-icon bot">🤖</span>
                    <h3>Configure Discord Bot</h3>
                    <p>Bot-specific configuration (shares backend service).</p>
                </div>
                
                <div class="form-sections">
                    <div class="form-section">
                        <h4>Bot Token</h4>
                        
                        <div class="form-group">
                            <label>BOT_TOKEN</label>
                            <input type="password" class="wizard-input" data-service="discord-bot" data-key="BOT_TOKEN" placeholder="Same as DISCORD_BOT_TOKEN or separate bot account">
                            <span class="input-hint">Usually the same as backend DISCORD_BOT_TOKEN</span>
                        </div>
                        
                        <div class="form-group">
                            <label>CLIENT_ID</label>
                            <input type="text" class="wizard-input" data-service="discord-bot" data-key="CLIENT_ID" value="1493639167526174830">
                        </div>
                    </div>
                </div>
                
                <div class="info-box">
                    <p>ℹ️ The Discord Bot runs in the same service as the Backend API on Railway.</p>
                </div>
            </div>
        `;
    },
    
    // Step 5: Token Vault
    renderVaultStep() {
        return `
            <div class="wizard-step">
                <div class="step-header">
                    <span class="service-icon vault">🔐</span>
                    <h3>Configure Token Vault</h3>
                    <p>This vault service itself.</p>
                </div>
                
                <div class="form-sections">
                    <div class="form-section">
                        <h4>Basic Settings</h4>
                        
                        <div class="form-group">
                            <label>NODE_ENV</label>
                            <select class="wizard-input" data-service="tokens-vault" data-key="NODE_ENV">
                                <option value="production" selected>production</option>
                                <option value="development">development</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label>PORT</label>
                            <input type="number" class="wizard-input" data-service="tokens-vault" data-key="PORT" value="8080">
                        </div>
                    </div>
                </div>
                
                <div class="completion-summary" id="completionSummary">
                    <h4>📋 Summary</h4>
                    <div id="wizardSummaryContent"></div>
                </div>
            </div>
        `;
    },
    
    // Save current step data
    saveStepData() {
        const inputs = document.querySelectorAll('#wizardBody .wizard-input');
        inputs.forEach(input => {
            const service = input.dataset.service;
            const key = input.dataset.key;
            if (service && key) {
                if (!this.wizardData[service]) {
                    this.wizardData[service] = {};
                }
                this.wizardData[service][key] = input.value;
            }
        });
    },
    
    // Restore saved data to inputs
    restoreStepData() {
        Object.entries(this.wizardData).forEach(([service, vars]) => {
            Object.entries(vars).forEach(([key, value]) => {
                const input = document.querySelector(`#wizardBody .wizard-input[data-service="${service}"][data-key="${key}"]`);
                if (input && value) {
                    input.value = value;
                }
            });
        });
        
        // Update completion summary on last step
        if (this.currentStep === this.totalSteps) {
            this.renderCompletionSummary();
        }
    },
    
    // Navigation
    nextStep() {
        if (this.currentStep < this.totalSteps) {
            this.saveStepData();
            this.currentStep++;
            this.renderStep();
        } else {
            this.completeWizard();
        }
    },
    
    prevStep() {
        if (this.currentStep > 1) {
            this.saveStepData();
            this.currentStep--;
            this.renderStep();
        }
    },
    
    // Generate JWT secret
    generateJWTSecret() {
        const secret = VaultIntelligence?.generateJWTSecret() || 
            btoa(String.fromCharCode.apply(null, crypto.getRandomValues(new Uint8Array(32))));
        document.getElementById('jwtSecretInput').value = secret;
        this.saveStepData();
    },
    
    // Render completion summary
    renderCompletionSummary() {
        const content = document.getElementById('wizardSummaryContent');
        let summary = '';
        
        Object.entries(this.wizardData).forEach(([service, vars]) => {
            const count = Object.keys(vars).filter(k => vars[k]).length;
            if (count > 0) {
                summary += `
                    <div class="summary-item">
                        <span class="service-name">${service}</span>
                        <span class="var-count">${count} variables</span>
                    </div>
                `;
            }
        });
        
        content.innerHTML = summary || '<p>No variables configured yet. You can add them later.</p>';
    },
    
    // Complete wizard
    completeWizard() {
        this.saveStepData();
        
        // Save all data to vault
        const vaultData = VaultCore.loadVaultData();
        
        Object.entries(this.wizardData).forEach(([serviceId, vars]) => {
            if (!vaultData.services[serviceId]) {
                vaultData.services[serviceId] = {};
            }
            Object.entries(vars).forEach(([key, value]) => {
                if (value) {
                    vaultData.services[serviceId][key] = value;
                }
            });
        });
        
        VaultCore.saveVaultData(vaultData);
        localStorage.setItem('vaultWizardCompleted', Date.now().toString());
        
        // Close wizard
        document.getElementById('setupWizard').classList.add('hidden');
        
        // Show success message
        VaultUI.showToast('🎉 Setup complete! Your vault is ready.', 'success');
        
        // Refresh UI
        VaultUI.vaultData = vaultData;
        VaultUI.renderServices();
    },
    
    // Skip wizard
    skipWizard() {
        if (confirm('Skip the setup wizard? You can configure variables manually later.')) {
            localStorage.setItem('vaultWizardCompleted', Date.now().toString());
            document.getElementById('setupWizard').classList.add('hidden');
        }
    }
};

// Make available globally
window.VaultWizard = VaultWizard;

console.log('[VaultWizard] Wizard module loaded');