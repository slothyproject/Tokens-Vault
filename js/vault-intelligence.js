/**
 * vault-intelligence.js - Intelligent Variable Management
 * Smart detection, validation, templates, and suggestions
 */

const VaultIntelligence = {
    // Variable type patterns for auto-detection
    patterns: {
        url: {
            regex: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
            test: (key, value) => key.includes('URL') || key.includes('URI') || key.includes('ENDPOINT') || value?.startsWith('http'),
            validate: (value) => {
                try {
                    new URL(value);
                    return { valid: true };
                } catch {
                    return { valid: false, error: 'Invalid URL format' };
                }
            },
            defaultValue: 'https://',
            icon: '🌐',
            description: 'URL/Endpoint'
        },
        
        port: {
            regex: /^\d{1,5}$/,
            test: (key, value) => key.includes('PORT') || key === 'PORT',
            validate: (value) => {
                const port = parseInt(value);
                if (isNaN(port)) return { valid: false, error: 'Must be a number' };
                if (port < 1 || port > 65535) return { valid: false, error: 'Port must be 1-65535' };
                return { valid: true };
            },
            defaultValue: '8080',
            suggestions: ['3000', '8080', '5000', '443', '80'],
            icon: '🔌',
            description: 'Network Port'
        },
        
        token: {
            test: (key, value) => key.includes('TOKEN') || key.includes('API_KEY') || key.includes('SECRET') || key.includes('KEY'),
            validate: (value) => {
                if (!value || value.length < 8) {
                    return { valid: false, error: 'Token should be at least 8 characters', warning: true };
                }
                if (value.length < 16) {
                    return { valid: true, warning: 'Consider using a longer token (16+ chars)' };
                }
                return { valid: true };
            },
            generator: () => VaultIntelligence.generateSecureToken(32),
            isSecret: true,
            icon: '🔐',
            description: 'Secret Token/Key'
        },
        
        database: {
            test: (key, value) => key.includes('DATABASE') || key.includes('DB_') || key.includes('POSTGRES') || key.includes('MONGO') || key.includes('REDIS'),
            validate: (value) => {
                if (key.includes('URL')) {
                    // Validate connection string
                    if (!value || value.length < 10) {
                        return { valid: false, error: 'Invalid connection string' };
                    }
                }
                return { valid: true };
            },
            icon: '🗄️',
            description: 'Database Connection'
        },
        
        email: {
            regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            test: (key, value) => key.includes('EMAIL') || key.includes('MAIL') || key.includes('ADMIN_EMAIL'),
            validate: (value) => {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(value)) {
                    return { valid: false, error: 'Invalid email format' };
                }
                return { valid: true };
            },
            icon: '📧',
            description: 'Email Address'
        },
        
        boolean: {
            test: (key, value) => key.startsWith('ENABLE') || key.startsWith('DISABLE') || key.startsWith('IS_') || key.startsWith('USE_'),
            validate: (value) => {
                const valid = ['true', 'false', '1', '0', 'yes', 'no'].includes(value.toLowerCase());
                return { valid, error: valid ? null : 'Must be: true/false, 1/0, yes/no' };
            },
            defaultValue: 'true',
            suggestions: ['true', 'false'],
            icon: '☐',
            description: 'Boolean Flag'
        },
        
        node_env: {
            test: (key, value) => key === 'NODE_ENV',
            validate: (value) => {
                const valid = ['development', 'production', 'test', 'staging'].includes(value.toLowerCase());
                return { valid, error: valid ? null : 'Should be: development, production, test, or staging' };
            },
            defaultValue: 'production',
            suggestions: ['development', 'production', 'staging', 'test'],
            icon: '⚙️',
            description: 'Environment'
        },
        
        jwt_secret: {
            test: (key, value) => key.includes('JWT') || key.includes('SECRET') && key.includes('SIGN'),
            generator: () => VaultIntelligence.generateJWTSecret(),
            isSecret: true,
            icon: '🔑',
            description: 'JWT Secret Key'
        },
        
        discord: {
            test: (key, value) => key.includes('DISCORD'),
            validate: (value) => {
                if (key.includes('CLIENT_ID')) {
                    // Discord client IDs are 18-19 digits
                    if (!/^\d{17,20}$/.test(value)) {
                        return { valid: false, warning: 'Discord Client ID should be 17-20 digits' };
                    }
                }
                if (key.includes('TOKEN')) {
                    if (!value || value.length < 50) {
                        return { valid: false, warning: 'Discord token should be longer (50+ chars)' };
                    }
                }
                return { valid: true };
            },
            icon: '💬',
            description: 'Discord Configuration'
        }
    },

    // Variable templates for quick setup
    templates: {
        'discord-bot': {
            name: 'Discord Bot',
            icon: '🤖',
            description: 'Standard Discord bot configuration',
            variables: [
                { key: 'DISCORD_BOT_TOKEN', type: 'token', required: true },
                { key: 'DISCORD_CLIENT_ID', type: 'discord', required: true },
                { key: 'DISCORD_CLIENT_SECRET', type: 'token', required: true },
                { key: 'BOT_PREFIX', type: 'text', default: '!', required: false },
                { key: 'BOT_STATUS', type: 'text', default: 'online', required: false }
            ]
        },
        
        'web-service': {
            name: 'Web Service',
            icon: '🌐',
            description: 'Standard web service configuration',
            variables: [
                { key: 'PORT', type: 'port', default: '8080', required: true },
                { key: 'NODE_ENV', type: 'node_env', default: 'production', required: true },
                { key: 'FRONTEND_URL', type: 'url', required: true },
                { key: 'API_BASE_URL', type: 'url', required: true },
                { key: 'SESSION_SECRET', type: 'jwt_secret', required: true },
                { key: 'CORS_ORIGIN', type: 'url', required: false }
            ]
        },
        
        'database': {
            name: 'Database Service',
            icon: '🗄️',
            description: 'Database connection configuration',
            variables: [
                { key: 'DATABASE_URL', type: 'database', required: true },
                { key: 'DB_HOST', type: 'text', default: 'localhost', required: false },
                { key: 'DB_PORT', type: 'port', default: '5432', required: false },
                { key: 'DB_USER', type: 'text', required: false },
                { key: 'DB_PASSWORD', type: 'token', required: false },
                { key: 'DB_NAME', type: 'text', required: false }
            ]
        },
        
        'oauth': {
            name: 'OAuth Provider',
            icon: '🔐',
            description: 'OAuth authentication setup',
            variables: [
                { key: 'OAUTH_CLIENT_ID', type: 'text', required: true },
                { key: 'OAUTH_CLIENT_SECRET', type: 'token', required: true },
                { key: 'OAUTH_REDIRECT_URI', type: 'url', required: true },
                { key: 'OAUTH_SCOPE', type: 'text', default: 'identify email', required: false }
            ]
        },
        
        'railway': {
            name: 'Railway Deployment',
            icon: '🚂',
            description: 'Railway-specific configuration',
            variables: [
                { key: 'RAILWAY_TOKEN', type: 'token', required: true },
                { key: 'RAILWAY_PROJECT_ID', type: 'text', required: true },
                { key: 'RAILWAY_ENVIRONMENT', type: 'text', default: 'production', required: false }
            ]
        }
    },

    // Detect variable type from key and value
    detectType(key, value = '') {
        for (const [type, config] of Object.entries(this.patterns)) {
            if (config.test(key, value)) {
                return type;
            }
        }
        return 'text';
    },

    // Get validation result for a variable
    validate(key, value) {
        const type = this.detectType(key, value);
        const config = this.patterns[type];
        
        if (config && config.validate) {
            const result = config.validate(value);
            return {
                ...result,
                type,
                key,
                value
            };
        }
        
        return { valid: true, type, key, value };
    },

    // Get smart suggestions for a variable
    getSuggestions(key) {
        const type = this.detectType(key);
        const config = this.patterns[type];
        
        return {
            type,
            icon: config?.icon || '📝',
            description: config?.description || 'Text',
            suggestions: config?.suggestions || [],
            defaultValue: config?.defaultValue || '',
            isSecret: config?.isSecret || false,
            generator: config?.generator
        };
    },

    // Generate secure random token
    generateSecureToken(length = 32) {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    },

    // Generate JWT secret (base64 encoded random bytes)
    generateJWTSecret() {
        const bytes = new Uint8Array(32);
        crypto.getRandomValues(bytes);
        return btoa(String.fromCharCode.apply(null, bytes));
    },

    // Apply template to service
    applyTemplate(templateId, serviceId) {
        const template = this.templates[templateId];
        if (!template) {
            console.error(`[VaultIntelligence] Template not found: ${templateId}`);
            return null;
        }

        const vaultData = VaultCore.loadVaultData();
        if (!vaultData) return null;

        // Initialize service if needed
        if (!vaultData.services[serviceId]) {
            vaultData.services[serviceId] = {};
        }

        const added = [];
        const skipped = [];

        template.variables.forEach(variable => {
            if (vaultData.services[serviceId][variable.key]) {
                skipped.push(variable.key);
                return;
            }

            let value = variable.default || '';
            
            // Generate value if generator exists
            const typeConfig = this.patterns[variable.type];
            if (typeConfig && typeConfig.generator && !value) {
                value = typeConfig.generator();
            }

            vaultData.services[serviceId][variable.key] = value;
            added.push({ key: variable.key, value });
        });

        VaultCore.saveVaultData(vaultData);
        
        return {
            template: template.name,
            service: serviceId,
            added,
            skipped
        };
    },

    // Find similar variables across services
    findSimilarVariables() {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData || !vaultData.services) return [];

        const occurrences = {};

        // Count occurrences of each variable name
        Object.entries(vaultData.services).forEach(([serviceId, variables]) => {
            Object.keys(variables).forEach(key => {
                if (!occurrences[key]) {
                    occurrences[key] = [];
                }
                occurrences[key].push(serviceId);
            });
        });

        // Also check shared variables
        Object.keys(vaultData.shared || {}).forEach(key => {
            if (!occurrences[key]) {
                occurrences[key] = ['shared'];
            } else if (!occurrences[key].includes('shared')) {
                occurrences[key].push('shared');
            }
        });

        // Return variables that appear in multiple services
        return Object.entries(occurrences)
            .filter(([key, services]) => services.length > 1)
            .map(([key, services]) => ({
                key,
                services,
                count: services.length
            }))
            .sort((a, b) => b.count - a.count);
    },

    // Suggest variables that should be shared
    suggestSharedVariables() {
        const similar = this.findSimilarVariables();
        
        return similar
            .filter(item => !item.services.includes('shared'))
            .filter(item => {
                // Check if values are the same across services
                const vaultData = VaultCore.loadVaultData();
                const values = item.services.map(serviceId => 
                    vaultData.services[serviceId][item.key]
                );
                return new Set(values).size === 1; // All same value
            })
            .map(item => ({
                ...item,
                suggestion: `Move ${item.key} to shared variables (same value in ${item.count} services)`
            }));
    },

    // Analyze service configuration for issues
    analyzeService(serviceId) {
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData || !vaultData.services[serviceId]) return null;

        const variables = vaultData.services[serviceId];
        const issues = [];
        const warnings = [];
        const info = [];

        Object.entries(variables).forEach(([key, value]) => {
            const validation = this.validate(key, value);

            if (!validation.valid) {
                issues.push({
                    key,
                    value,
                    message: validation.error,
                    type: validation.warning ? 'warning' : 'error'
                });
            } else if (validation.warning) {
                warnings.push({
                    key,
                    value,
                    message: validation.warning
                });
            }
        });

        // Check for missing common variables
        const commonVars = ['NODE_ENV', 'PORT'];
        commonVars.forEach(varName => {
            if (!variables[varName] && !vaultData.shared[varName]) {
                info.push({
                    key: varName,
                    message: `Consider adding ${varName} (common for most services)`
                });
            }
        });

        return { issues, warnings, info };
    },

    // Get smart defaults for new variable
    getSmartDefaults(key) {
        const suggestions = this.getSuggestions(key);
        
        const defaults = {
            type: suggestions.type,
            value: suggestions.defaultValue,
            icon: suggestions.icon,
            isSecret: suggestions.isSecret
        };

        // Check if there's a similar variable elsewhere
        const similar = this.findSimilarVariables().find(item => item.key === key);
        if (similar && similar.services.includes('shared')) {
            const vaultData = VaultCore.loadVaultData();
            defaults.value = vaultData.shared[key];
            defaults.note = 'Using shared value';
        }

        return defaults;
    },

    // Real-time validation as user types
    validateAsYouType(key, value) {
        const result = this.validate(key, value);
        
        return {
            ...result,
            icon: this.patterns[result.type]?.icon || '📝',
            formattedValue: this.formatValuePreview(value, result.type)
        };
    },

    // Format value for preview (mask secrets)
    formatValuePreview(value, type) {
        if (!value) return '';
        
        const config = this.patterns[type];
        if (config && config.isSecret) {
            return value.substring(0, 4) + '••••' + value.substring(value.length - 4);
        }
        
        if (value.length > 50) {
            return value.substring(0, 47) + '...';
        }
        
        return value;
    }
};

window.VaultIntelligence = VaultIntelligence;

console.log('[VaultIntelligence] Loaded with', Object.keys(VaultIntelligence.patterns).length, 'variable types');
console.log('[VaultIntelligence] Templates available:', Object.keys(VaultIntelligence.templates));