/**
 * ai-variable-manager.js - Intelligent Variable Discovery & Management
 * Core engine for smart variable suggestions, validation, and sync
 */

const AIVariableManager = {
    // Configuration
    config: {
        suggestionThreshold: 0.7,
        validationEnabled: true,
        autoSyncShared: true,
        patternLearning: true
    },
    
    // State
    state: {
        initialized: false,
        serviceAnalysis: {},
        variablePatterns: {},
        lastScan: null
    },
    
    // Variable patterns for intelligent detection
    patterns: {
        // Discord-related
        discordToken: {
            regex: /^M[TA][A-Za-z0-9_-]{56,}$/,
            minLength: 59,
            type: 'secret',
            description: 'Discord bot token',
            services: ['dissident-bot', 'dissident-api-backend']
        },
        discordClientId: {
            regex: /^\d{17,19}$/,
            type: 'text',
            description: 'Discord OAuth client ID',
            services: ['dissident-bot', 'dissident-api-backend', 'dissident-website']
        },
        // Database URLs
        databaseUrl: {
            regex: /^(postgresql|mysql|sqlite|mongodb):\/\//,
            type: 'secret',
            description: 'Database connection URL',
            services: ['dissident-bot', 'dissident-api-backend', 'dissident-postgres', 'dissident-website-data']
        },
        // Redis
        redisUrl: {
            regex: /^redis(s)?:\/\//,
            type: 'secret',
            description: 'Redis connection URL',
            services: ['dissident-bot', 'dissident-api-backend', 'dissident-redis']
        },
        // URLs
        url: {
            regex: /^https?:\/\/.+/,
            type: 'url',
            description: 'Web URL'
        },
        // Ports
        port: {
            regex: /^\d{4,5}$/,
            min: 1024,
            max: 65535,
            type: 'number',
            description: 'Port number'
        },
        // JWT Secret
        jwtSecret: {
            minLength: 32,
            type: 'secret',
            description: 'JWT signing secret'
        },
        // GitHub Token
        githubToken: {
            regex: /^(ghp_[a-zA-Z0-9]{36}|github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}|[a-f0-9]{40})$/,
            type: 'secret',
            description: 'GitHub personal access token'
        }
    },
    
    // Smart templates for common setups
    templates: {
        'discord-bot-starter': {
            name: 'Discord Bot Starter',
            description: 'Complete Discord bot setup with database',
            variables: [
                { key: 'DISSIDENT_TOKEN', required: true, type: 'secret', generate: false },
                { key: 'DISCORD_CLIENT_ID', required: true, type: 'text' },
                { key: 'DISCORD_CLIENT_SECRET', required: true, type: 'secret' },
                { key: 'DATABASE_URL', required: true, type: 'secret', template: 'postgresql://user:pass@localhost:5432/bot' },
                { key: 'REDIS_URL', required: false, type: 'secret', template: 'redis://localhost:6379' },
                { key: 'ENABLE_MODERATION', required: false, type: 'boolean', default: 'true' },
                { key: 'ENABLE_VERIFICATION', required: false, type: 'boolean', default: 'true' },
                { key: 'ENABLE_ECONOMY', required: false, type: 'boolean', default: 'true' }
            ]
        },
        'website-fullstack': {
            name: 'Full Stack Website',
            description: 'Website + API + Database setup',
            variables: [
                { key: 'FRONTEND_URL', required: true, type: 'url', template: 'https://example.com' },
                { key: 'API_BASE_URL', required: true, type: 'url', template: 'https://api.example.com' },
                { key: 'DATABASE_URL', required: true, type: 'secret' },
                { key: 'NODE_ENV', required: true, type: 'select', options: ['development', 'production'], default: 'production' },
                { key: 'DISCORD_CLIENT_ID', required: true, type: 'text' },
                { key: 'PORT', required: false, type: 'number', default: '3000' }
            ]
        },
        'production-secure': {
            name: 'Production Hardened',
            description: 'Maximum security configuration',
            variables: [
                { key: 'NODE_ENV', required: true, type: 'select', options: ['production'], default: 'production' },
                { key: 'JWT_SECRET', required: true, type: 'secret', generate: true, minLength: 64 },
                { key: 'SESSION_SECRET', required: true, type: 'secret', generate: true },
                { key: 'DATABASE_URL', required: true, type: 'secret' },
                { key: 'REDIS_URL', required: true, type: 'secret' },
                { key: 'ENCRYPTION_KEY', required: true, type: 'secret', generate: true }
            ]
        }
    },
    
    // Initialize the manager
    init() {
        console.log('[AIVariableManager] Initializing intelligent variable management...');
        
        // Load saved patterns
        this.loadPatterns();
        
        // Analyze existing services
        this.analyzeAllServices();
        
        this.state.initialized = true;
        console.log('[AIVariableManager] Ready');
    },
    
    // Load learned patterns from storage
    loadPatterns() {
        const saved = localStorage.getItem('ai_variable_patterns');
        if (saved) {
            try {
                const patterns = JSON.parse(saved);
                this.state.variablePatterns = patterns;
            } catch (e) {
                console.warn('[AIVariableManager] Failed to load patterns');
            }
        }
    },
    
    // Save learned patterns
    savePatterns() {
        try {
            localStorage.setItem('ai_variable_patterns', JSON.stringify(this.state.variablePatterns));
        } catch (e) {
            console.warn('[AIVariableManager] Failed to save patterns');
        }
    },
    
    // ============================================
    // SERVICE ANALYSIS
    // ============================================
    
    // Analyze all services for variable completeness
    analyzeAllServices() {
        const vaultData = VaultCore?.loadVaultData();
        const services = unifiedServices?.services || this.getFallbackServices();
        
        Object.keys(services).forEach(serviceId => {
            this.state.serviceAnalysis[serviceId] = this.analyzeService(serviceId, services[serviceId], vaultData);
        });
        
        this.state.lastScan = Date.now();
    },
    
    // Analyze a single service
    analyzeService(serviceId, serviceConfig, vaultData) {
        const serviceData = vaultData?.services?.[serviceId] || {};
        const requiredVars = serviceConfig?.variables || [];
        
        const analysis = {
            serviceId,
            name: serviceConfig?.name || serviceId,
            totalVariables: requiredVars.length,
            setVariables: 0,
            missingRequired: [],
            missingOptional: [],
            setOptional: [],
            completionPercentage: 0,
            issues: [],
            recommendations: []
        };
        
        // Check each required variable
        requiredVars.forEach(variable => {
            const isSet = serviceData[variable.key] !== undefined && serviceData[variable.key] !== '';
            
            if (variable.required) {
                if (isSet) {
                    analysis.setVariables++;
                    
                    // Validate the value
                    const validation = this.validateVariable(variable, serviceData[variable.key]);
                    if (!validation.valid) {
                        analysis.issues.push({
                            key: variable.key,
                            issue: validation.error,
                            severity: 'warning'
                        });
                    }
                } else {
                    analysis.missingRequired.push({
                        key: variable.key,
                        description: variable.description,
                        type: variable.type,
                        hasDefault: !!variable.default,
                        defaultValue: variable.default
                    });
                }
            } else {
                // Optional variable
                if (isSet) {
                    analysis.setOptional.push(variable.key);
                } else {
                    analysis.missingOptional.push({
                        key: variable.key,
                        description: variable.description,
                        type: variable.type,
                        defaultValue: variable.default
                    });
                }
            }
        });
        
        // Calculate completion
        const requiredCount = requiredVars.filter(v => v.required).length;
        analysis.completionPercentage = requiredCount > 0 
            ? Math.round((analysis.setVariables / requiredCount) * 100)
            : 100;
        
        // Generate recommendations
        analysis.recommendations = this.generateRecommendations(serviceId, analysis);
        
        return analysis;
    },
    
    // Get fallback services if unifiedServices not available
    getFallbackServices() {
        return {
            'dissident-bot': {
                id: 'dissident-bot',
                name: 'Discord Bot',
                icon: '🤖',
                variables: [
                    { key: 'DISSIDENT_TOKEN', required: true, type: 'secret', description: 'Discord bot token' },
                    { key: 'DISCORD_CLIENT_ID', required: true, type: 'text', description: 'Discord OAuth client ID' },
                    { key: 'DISCORD_CLIENT_SECRET', required: true, type: 'secret', description: 'Discord OAuth client secret' },
                    { key: 'DATABASE_URL', required: true, type: 'secret', description: 'PostgreSQL connection URL' },
                    { key: 'REDIS_URL', required: false, type: 'secret', description: 'Redis connection URL' }
                ]
            },
            'dissident-website': {
                id: 'dissident-website',
                name: 'Website',
                icon: '🌐',
                variables: [
                    { key: 'FRONTEND_URL', required: true, type: 'url', description: 'Public URL of the website' },
                    { key: 'API_BASE_URL', required: true, type: 'url', description: 'Backend API base URL' },
                    { key: 'NODE_ENV', required: true, type: 'select', description: 'Node environment', default: 'production' }
                ]
            },
            'dissident-api-backend': {
                id: 'dissident-api-backend',
                name: 'API Backend',
                icon: '⚙️',
                variables: [
                    { key: 'PORT', required: true, type: 'number', description: 'Server port', default: '3000' },
                    { key: 'NODE_ENV', required: true, type: 'select', description: 'Node environment', default: 'production' },
                    { key: 'DATABASE_URL', required: true, type: 'secret', description: 'PostgreSQL database URL' },
                    { key: 'DISCORD_TOKEN', required: true, type: 'secret', description: 'Discord bot token' }
                ]
            },
            'dissident-postgres': {
                id: 'dissident-postgres',
                name: 'PostgreSQL',
                icon: '🐘',
                variables: [
                    { key: 'POSTGRES_USER', required: true, type: 'text', default: 'postgres' },
                    { key: 'POSTGRES_PASSWORD', required: true, type: 'secret' },
                    { key: 'POSTGRES_DB', required: true, type: 'text', default: 'dissident' },
                    { key: 'DATABASE_URL', required: true, type: 'secret' }
                ]
            },
            'dissident-redis': {
                id: 'dissident-redis',
                name: 'Redis',
                icon: '🔴',
                variables: [
                    { key: 'REDIS_URL', required: true, type: 'secret' },
                    { key: 'REDIS_HOST', required: false, type: 'text', default: 'localhost' },
                    { key: 'REDIS_PORT', required: false, type: 'number', default: '6379' }
                ]
            },
            'dissident-tokens-vault': {
                id: 'dissident-tokens-vault',
                name: 'AI Central Hub',
                icon: '🔐',
                variables: [
                    { key: 'RAILWAY_TOKEN', required: true, type: 'secret', description: 'Railway API token' },
                    { key: 'GITHUB_TOKEN', required: true, type: 'secret', description: 'GitHub token for syncing' }
                ]
            }
        };
    },
    
    // ============================================
    // VALIDATION
    // ============================================
    
    // Validate a variable value
    validateVariable(variable, value) {
        if (!value && variable.required) {
            return { valid: false, error: 'Required value is empty' };
        }
        
        if (!value && !variable.required) {
            return { valid: true }; // Optional empty is ok
        }
        
        // Check type-specific validation
        const pattern = this.patterns[variable.validation || variable.type];
        if (pattern) {
            // Check regex
            if (pattern.regex && !pattern.regex.test(value)) {
                return { 
                    valid: false, 
                    error: `Invalid ${variable.type} format`,
                    expected: pattern.description
                };
            }
            
            // Check length
            if (pattern.minLength && value.length < pattern.minLength) {
                return { 
                    valid: false, 
                    error: `Too short (${value.length}/${pattern.minLength} chars required)`
                };
            }
            
            // Check numeric range
            if (pattern.min !== undefined || pattern.max !== undefined) {
                const num = parseInt(value);
                if (isNaN(num)) {
                    return { valid: false, error: 'Must be a number' };
                }
                if (pattern.min !== undefined && num < pattern.min) {
                    return { valid: false, error: `Must be ≥ ${pattern.min}` };
                }
                if (pattern.max !== undefined && num > pattern.max) {
                    return { valid: false, error: `Must be ≤ ${pattern.max}` };
                }
            }
        }
        
        // Check select options
        if (variable.type === 'select' && variable.options) {
            if (!variable.options.includes(value)) {
                return { 
                    valid: false, 
                    error: `Must be one of: ${variable.options.join(', ')}`
                };
            }
        }
        
        return { valid: true };
    },
    
    // Detect variable type from value
    detectVariableType(key, value) {
        for (const [type, pattern] of Object.entries(this.patterns)) {
            if (pattern.regex && pattern.regex.test(value)) {
                return type;
            }
        }
        
        // Infer from key name
        if (key.includes('URL')) return 'url';
        if (key.includes('TOKEN')) return 'secret';
        if (key.includes('SECRET')) return 'secret';
        if (key.includes('PASSWORD')) return 'secret';
        if (key.includes('PORT')) return 'port';
        if (key.includes('KEY')) return 'secret';
        
        return 'text';
    },
    
    // ============================================
    // SMART SUGGESTIONS
    // ============================================
    
    // Generate smart value suggestions
    suggestValue(variable, serviceId, existingData) {
        const suggestions = [];
        
        // Suggest based on variable key patterns
        if (variable.key === 'PORT') {
            // Suggest free port
            const usedPorts = this.getUsedPorts();
            for (let port = 3000; port < 3100; port++) {
                if (!usedPorts.includes(port)) {
                    suggestions.push({
                        value: port.toString(),
                        reason: 'Port appears to be free',
                        confidence: 0.9
                    });
                    break;
                }
            }
        }
        
        if (variable.key.includes('URL')) {
            if (serviceId === 'dissident-website') {
                suggestions.push({
                    value: 'https://your-domain.com',
                    reason: 'Common website URL pattern',
                    confidence: 0.7
                });
            }
            if (serviceId === 'dissident-api-backend') {
                suggestions.push({
                    value: 'https://api.your-domain.com',
                    reason: 'Common API URL pattern',
                    confidence: 0.7
                });
            }
        }
        
        if (variable.key === 'NODE_ENV') {
            suggestions.push(
                { value: 'production', reason: 'Recommended for deployed services', confidence: 0.9 },
                { value: 'development', reason: 'For local development', confidence: 0.6 }
            );
        }
        
        if (variable.key === 'DATABASE_URL') {
            const dbName = serviceId.replace('dissident-', '');
            suggestions.push({
                value: `postgresql://user:password@localhost:5432/${dbName}`,
                reason: 'Standard PostgreSQL URL format',
                confidence: 0.8
            });
        }
        
        if (variable.key === 'REDIS_URL') {
            suggestions.push({
                value: 'redis://localhost:6379',
                reason: 'Standard Redis URL format',
                confidence: 0.9
            });
        }
        
        // Check for template default
        if (variable.default) {
            suggestions.unshift({
                value: variable.default,
                reason: 'Recommended default value',
                confidence: 0.95
            });
        }
        
        return suggestions;
    },
    
    // Get all used ports across services
    getUsedPorts() {
        const vaultData = VaultCore?.loadVaultData();
        const ports = [];
        
        Object.values(vaultData?.services || {}).forEach(service => {
            if (service.PORT) {
                const port = parseInt(service.PORT);
                if (!isNaN(port)) ports.push(port);
            }
        });
        
        return ports;
    },
    
    // ============================================
    // RECOMMENDATIONS
    // ============================================
    
    // Generate recommendations for a service
    generateRecommendations(serviceId, analysis) {
        const recommendations = [];
        
        // Recommend completing required variables
        if (analysis.missingRequired.length > 0) {
            recommendations.push({
                type: 'completion',
                priority: 'critical',
                message: `Complete ${analysis.missingRequired.length} required variables`,
                action: 'showSetup',
                details: analysis.missingRequired
            });
        }
        
        // Recommend optional variables that add value
        if (analysis.missingOptional.length > 0) {
            const highValueOptionals = analysis.missingOptional.filter(v => 
                v.key.includes('REDIS') || v.key.includes('CACHE') || v.key.includes('LOG')
            );
            if (highValueOptionals.length > 0) {
                recommendations.push({
                    type: 'optimization',
                    priority: 'medium',
                    message: `Add ${highValueOptionals.length} optional variables for better performance`,
                    action: 'showOptional',
                    details: highValueOptionals
                });
            }
        }
        
        // Recommend validation fixes
        const validationIssues = analysis.issues.filter(i => i.severity === 'warning');
        if (validationIssues.length > 0) {
            recommendations.push({
                type: 'fix',
                priority: 'high',
                message: `Fix ${validationIssues.length} validation issues`,
                action: 'showIssues',
                details: validationIssues
            });
        }
        
        // Recommend security improvements
        const secretVars = analysis.setOptional.filter(key => 
            key.includes('TOKEN') || key.includes('SECRET') || key.includes('PASSWORD')
        );
        if (secretVars.length > 0 && !analysis.setVariables.includes('ENCRYPTION_KEY')) {
            recommendations.push({
                type: 'security',
                priority: 'medium',
                message: 'Add encryption key for enhanced security',
                action: 'generateKey',
                details: { key: 'ENCRYPTION_KEY', generate: true }
            });
        }
        
        return recommendations;
    },
    
    // ============================================
    // TEMPLATES
    // ============================================
    
    // Apply a template to a service
    applyTemplate(serviceId, templateId) {
        const template = this.templates[templateId];
        if (!template) {
            return { success: false, error: 'Template not found' };
        }
        
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData.services[serviceId]) {
            vaultData.services[serviceId] = {};
        }
        
        const results = {
            applied: [],
            generated: [],
            skipped: [],
            errors: []
        };
        
        template.variables.forEach(variable => {
            // Skip if already set
            if (vaultData.services[serviceId][variable.key]) {
                results.skipped.push(variable.key);
                return;
            }
            
            // Generate if needed
            if (variable.generate) {
                const generated = this.generateSecureValue(variable);
                vaultData.services[serviceId][variable.key] = generated;
                results.generated.push({ key: variable.key, value: generated });
            } else if (variable.default) {
                // Apply default
                vaultData.services[serviceId][variable.key] = variable.default;
                results.applied.push({ key: variable.key, value: variable.default });
            } else if (variable.template) {
                // Apply template (user needs to customize)
                vaultData.services[serviceId][variable.key] = variable.template;
                results.applied.push({ key: variable.key, value: variable.template, needsCustomization: true });
            }
        });
        
        // Save changes
        VaultCore.saveVaultData(vaultData);
        
        // Re-analyze
        this.analyzeAllServices();
        
        return {
            success: true,
            template: template.name,
            results
        };
    },
    
    // Generate secure value
    generateSecureValue(variable) {
        const length = variable.minLength || 32;
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        
        return result;
    },
    
    // ============================================
    // CROSS-SERVICE SYNC
    // ============================================
    
    // Find shared variables across services
    findSharedVariables(variableKey) {
        const shared = [];
        const vaultData = VaultCore.loadVaultData();
        
        Object.entries(vaultData.services || {}).forEach(([serviceId, variables]) => {
            if (variables[variableKey] !== undefined) {
                shared.push({
                    serviceId,
                    value: variables[variableKey]
                });
            }
        });
        
        return shared;
    },
    
    // Sync a variable across services
    syncVariableAcrossServices(variableKey, value, targetServices) {
        const vaultData = VaultCore.loadVaultData();
        const results = [];
        
        targetServices.forEach(serviceId => {
            if (!vaultData.services[serviceId]) {
                vaultData.services[serviceId] = {};
            }
            
            const oldValue = vaultData.services[serviceId][variableKey];
            vaultData.services[serviceId][variableKey] = value;
            
            results.push({
                serviceId,
                updated: true,
                hadValue: !!oldValue
            });
        });
        
        VaultCore.saveVaultData(vaultData);
        this.analyzeAllServices();
        
        return results;
    },
    
    // Detect variable conflicts (same key, different values)
    detectConflicts() {
        const vaultData = VaultCore.loadVaultData();
        const conflicts = [];
        
        // Get all variable keys used across services
        const allKeys = new Set();
        Object.values(vaultData.services || {}).forEach(variables => {
            Object.keys(variables).forEach(key => allKeys.add(key));
        });
        
        // Check for conflicts
        allKeys.forEach(key => {
            const values = new Set();
            const services = [];
            
            Object.entries(vaultData.services || {}).forEach(([serviceId, variables]) => {
                if (variables[key] !== undefined) {
                    values.add(variables[key]);
                    services.push(serviceId);
                }
            });
            
            // Conflict: same key, different values
            if (values.size > 1) {
                conflicts.push({
                    key,
                    services,
                    values: Array.from(values)
                });
            }
        });
        
        return conflicts;
    },
    
    // ============================================
    // UI RENDERING
    // ============================================
    
    // Render service setup progress
    renderServiceSetupProgress(serviceId, container) {
        const analysis = this.state.serviceAnalysis[serviceId];
        if (!analysis) return;
        
        const html = `
            <div class="setup-progress">
                <div class="progress-header">
                    <h3>📋 ${analysis.name} Setup</h3>
                    <div class="progress-percentage">${analysis.completionPercentage}%</div>
                </div>
                
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${analysis.completionPercentage}%"></div>
                </div>
                
                ${analysis.missingRequired.length > 0 ? `
                    <div class="missing-required">
                        <h4>❌ Missing Required (${analysis.missingRequired.length})</h4>
                        ${analysis.missingRequired.map(v => `
                            <div class="missing-item">
                                <span class="key">${v.key}</span>
                                <span class="description">${v.description || ''}</span>
                                ${v.hasDefault ? `<span class="default">Default: ${v.defaultValue}</span>` : ''}
                                <button onclick="AIVariableManager.quickSet('${serviceId}', '${v.key}')">Set</button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                ${analysis.recommendations.length > 0 ? `
                    <div class="recommendations">
                        <h4>💡 Recommendations</h4>
                        ${analysis.recommendations.slice(0, 3).map(r => `
                            <div class="recommendation ${r.priority}">
                                <span class="icon">${this.getRecommendationIcon(r.type)}</span>
                                <span class="message">${r.message}</span>
                                <button onclick="AIVariableManager.applyRecommendation('${serviceId}', '${r.type}')">Fix</button>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
        
        if (container) {
            container.innerHTML = html;
        }
        
        return html;
    },
    
    getRecommendationIcon(type) {
        const icons = {
            completion: '📋',
            optimization: '⚡',
            fix: '🔧',
            security: '🔐'
        };
        return icons[type] || '💡';
    },
    
    // Quick set a variable
    quickSet(serviceId, key) {
        const services = unifiedServices?.services || this.getFallbackServices();
        const service = services[serviceId];
        const variable = service?.variables?.find(v => v.key === key);
        
        if (!variable) return;
        
        // Get suggestions
        const suggestions = this.suggestValue(variable, serviceId);
        
        // Show input modal
        let value = prompt(`Set ${key}:`, suggestions[0]?.value || variable.default || '');
        if (value !== null) {
            const vaultData = VaultCore.loadVaultData();
            if (!vaultData.services[serviceId]) vaultData.services[serviceId] = {};
            vaultData.services[serviceId][key] = value;
            VaultCore.saveVaultData(vaultData);
            
            // Re-analyze and refresh
            this.analyzeAllServices();
            VaultUI.showToast(`${key} set successfully`, 'success');
        }
    },
    
    // Apply a recommendation
    applyRecommendation(serviceId, recommendationType) {
        switch (recommendationType) {
            case 'completion':
                VaultUI.selectService(serviceId);
                break;
            case 'security':
                this.generateSecureVariable(serviceId, 'ENCRYPTION_KEY');
                break;
            default:
                VaultUI.selectService(serviceId);
        }
    },
    
    // Generate secure variable
    generateSecureVariable(serviceId, key) {
        const value = this.generateSecureValue({ minLength: 64 });
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData.services[serviceId]) vaultData.services[serviceId] = {};
        vaultData.services[serviceId][key] = value;
        VaultCore.saveVaultData(vaultData);
        
        this.analyzeAllServices();
        VaultUI.showToast(`Generated secure ${key}`, 'success');
    }
};

// Auto-initialize
window.AIVariableManager = AIVariableManager;

// Initialize when VaultCore is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof VaultCore !== 'undefined') {
            setTimeout(() => AIVariableManager.init(), 500);
        }
    });
} else {
    if (typeof VaultCore !== 'undefined') {
        setTimeout(() => AIVariableManager.init(), 500);
    }
}