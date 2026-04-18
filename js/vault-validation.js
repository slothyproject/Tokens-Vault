/**
 * vault-validation.js - Input Validation Engine
 * Validates variables before deployment to prevent errors
 */

const VaultValidation = {
    // Validation rules
    rules: {
        // URL validation
        url: {
            validate: (value) => {
                if (!value) return { valid: true }; // Empty is ok for optional
                try {
                    new URL(value);
                    return { valid: true };
                } catch {
                    return { 
                        valid: false, 
                        error: "Invalid URL format. Must start with http:// or https://" 
                    };
                }
            },
            pattern: /^https?:\/\/.+/,
            description: "Valid URL starting with http:// or https://"
        },
        
        // Discord token validation
        discordToken: {
            validate: (value) => {
                if (!value) return { valid: false, error: "Discord token is required" };
                if (value.length < 59) {
                    return { 
                        valid: false, 
                        error: `Token too short (${value.length}/59+ characters required)` 
                    };
                }
                // Discord tokens start with MTE or MTA (base64 encoded)
                if (!/^M[TA][A-Za-z0-9_-]{56,}$/.test(value)) {
                    return { 
                        valid: false, 
                        error: "Invalid Discord token format. Should start with MTE... or MTA..." 
                    };
                }
                return { valid: true };
            },
            pattern: /^M[TA][A-Za-z0-9_-]{56,}$/,
            description: "Discord bot token (59+ characters, starts with MTE or MTA)"
        },
        
        // Database URL validation
        databaseUrl: {
            validate: (value) => {
                if (!value) return { valid: true };
                const patterns = {
                    postgresql: /^postgresql:\/\//,
                    mysql: /^mysql:\/\//,
                    sqlite: /^sqlite:\/\//,
                    mongo: /^mongodb:\/\//
                };
                
                const matches = Object.entries(patterns).filter(([_, pattern]) => pattern.test(value));
                if (matches.length === 0) {
                    return { 
                        valid: false, 
                        error: "Invalid database URL. Must start with postgresql://, mysql://, sqlite://, or mongodb://" 
                    };
                }
                return { valid: true };
            },
            pattern: /^(postgresql|mysql|sqlite|mongodb):\/\//,
            description: "Database connection URL (e.g., postgresql://user:pass@host:port/db)"
        },
        
        // Port validation
        port: {
            validate: (value) => {
                if (!value) return { valid: true };
                const port = parseInt(value);
                if (isNaN(port)) {
                    return { valid: false, error: "Port must be a number" };
                }
                if (port < 1024) {
                    return { valid: false, error: "Port must be ≥ 1024 (reserved ports below 1024)" };
                }
                if (port > 65535) {
                    return { valid: false, error: "Port must be ≤ 65535" };
                }
                return { valid: true };
            },
            min: 1024,
            max: 65535,
            description: "Port number (1024-65535)"
        },
        
        // Email validation
        email: {
            validate: (value) => {
                if (!value) return { valid: true };
                const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!pattern.test(value)) {
                    return { valid: false, error: "Invalid email format" };
                }
                return { valid: true };
            },
            pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
            description: "Valid email address"
        },
        
        // Number validation
        number: {
            validate: (value) => {
                if (!value) return { valid: true };
                if (isNaN(parseFloat(value))) {
                    return { valid: false, error: "Must be a valid number" };
                }
                return { valid: true };
            },
            description: "Numeric value"
        },
        
        // Boolean validation
        boolean: {
            validate: (value) => {
                if (!value) return { valid: true };
                const validValues = ['true', 'false', '1', '0', 'yes', 'no', 'on', 'off'];
                if (!validValues.includes(value.toLowerCase())) {
                    return { 
                        valid: false, 
                        error: "Must be true/false, 1/0, yes/no, or on/off" 
                    };
                }
                return { valid: true };
            },
            validValues: ['true', 'false', '1', '0', 'yes', 'no'],
            description: "Boolean value (true/false, 1/0, yes/no)"
        },
        
        // Required validation
        required: {
            validate: (value) => {
                if (!value || value.toString().trim() === '') {
                    return { valid: false, error: "This field is required" };
                }
                return { valid: true };
            },
            description: "Required field"
        },
        
        // JWT Secret validation
        jwtSecret: {
            validate: (value) => {
                if (!value) return { valid: false, error: "JWT secret is required" };
                if (value.length < 32) {
                    return { 
                        valid: false, 
                        error: `JWT secret too weak (${value.length}/32+ characters required)` 
                    };
                }
                return { valid: true };
            },
            minLength: 32,
            description: "JWT signing secret (32+ characters recommended)"
        },
        
        // Redis URL validation
        redisUrl: {
            validate: (value) => {
                if (!value) return { valid: true };
                if (!/^redis:\/\//.test(value) && !/^rediss:\/\//.test(value)) {
                    return { valid: false, error: "Must start with redis:// or rediss://" };
                }
                return { valid: true };
            },
            pattern: /^redis(s)?:\/\//,
            description: "Redis connection URL (e.g., redis://host:port)"
        },
        
        // GitHub token validation
        githubToken: {
            validate: (value) => {
                if (!value) return { valid: true };
                // GitHub tokens are typically 40 hex characters or ghp_ prefixed
                if (!/^[a-f0-9]{40}$/.test(value) && !/^ghp_[a-zA-Z0-9]{36}$/.test(value) && 
                    !/^github_pat_[a-zA-Z0-9]{22}_[a-zA-Z0-9]{59}$/.test(value)) {
                    return { 
                        valid: false, 
                        error: "Invalid GitHub token format" 
                    };
                }
                return { valid: true };
            },
            description: "GitHub personal access token"
        },
        
        // Webhook URL validation
        webhookUrl: {
            validate: (value) => {
                if (!value) return { valid: true };
                try {
                    const url = new URL(value);
                    if (!url.href.includes('discord.com/api/webhooks')) {
                        return { 
                            valid: true, 
                            warning: "URL doesn't appear to be a Discord webhook" 
                        };
                    }
                    return { valid: true };
                } catch {
                    return { valid: false, error: "Invalid webhook URL" };
                }
            },
            description: "Webhook URL (typically Discord webhook)"
        }
    },
    
    // Validate a single value
    validate(value, validationType, options = {}) {
        const rule = this.rules[validationType];
        if (!rule) {
            console.warn(`[VaultValidation] Unknown validation type: ${validationType}`);
            return { valid: true };
        }
        
        // Check required first
        if (options.required) {
            const requiredResult = this.rules.required.validate(value);
            if (!requiredResult.valid) {
                return requiredResult;
            }
        }
        
        // Run the specific validation
        const result = rule.validate(value);
        
        // Add metadata
        return {
            ...result,
            type: validationType,
            description: rule.description
        };
    },
    
    // Validate a variable against its configuration
    validateVariable(key, value, config) {
        const results = [];
        let isValid = true;
        
        // Check required
        if (config.required) {
            const required = this.validate(value, 'required');
            if (!required.valid) {
                results.push(required);
                isValid = false;
            }
        }
        
        // If value is empty and not required, skip other validations
        if (!value && !config.required) {
            return { valid: true, results: [] };
        }
        
        // Check type-specific validation
        if (config.validation) {
            const typeValidation = this.validate(value, config.validation);
            if (!typeValidation.valid) {
                results.push(typeValidation);
                isValid = false;
            }
        }
        
        // Check type
        if (config.type) {
            let typeResult;
            switch (config.type) {
                case 'url':
                    typeResult = this.validate(value, 'url');
                    break;
                case 'email':
                    typeResult = this.validate(value, 'email');
                    break;
                case 'number':
                    typeResult = this.validate(value, 'number');
                    break;
                case 'boolean':
                    typeResult = this.validate(value, 'boolean');
                    break;
                default:
                    typeResult = { valid: true };
            }
            if (!typeResult.valid) {
                results.push(typeResult);
                isValid = false;
            }
        }
        
        // Check select options
        if (config.type === 'select' && config.options) {
            if (value && !config.options.includes(value)) {
                results.push({
                    valid: false,
                    error: `Must be one of: ${config.options.join(', ')}`
                });
                isValid = false;
            }
        }
        
        return {
            valid: isValid,
            results,
            key,
            value
        };
    },
    
    // Validate all variables for a service
    validateServiceVariables(serviceId, variables) {
        const service = unifiedServices?.getService(serviceId);
        if (!service) {
            return { valid: false, errors: ['Service not found'] };
        }
        
        const results = [];
        let validCount = 0;
        let errorCount = 0;
        
        service.variables?.forEach(config => {
            const value = variables[config.key];
            const result = this.validateVariable(config.key, value, config);
            results.push(result);
            
            if (result.valid) {
                validCount++;
            } else {
                errorCount++;
            }
        });
        
        return {
            valid: errorCount === 0,
            total: service.variables?.length || 0,
            validCount,
            errorCount,
            results,
            serviceName: service.name
        };
    },
    
    // Create validation UI for an input
    createValidationUI(input, validationType, options = {}) {
        // Create validation indicator
        let indicator = input.parentElement.querySelector('.validation-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'validation-indicator';
            input.parentElement.appendChild(indicator);
        }
        
        // Create error message element
        let errorMsg = input.parentElement.querySelector('.validation-error');
        if (!errorMsg) {
            errorMsg = document.createElement('div');
            errorMsg.className = 'validation-error';
            input.parentElement.appendChild(errorMsg);
        }
        
        // Add input event listener
        input.addEventListener('input', () => {
            const result = this.validate(input.value, validationType, options);
            this.updateValidationUI(indicator, errorMsg, result);
        });
        
        // Initial validation
        if (input.value) {
            const result = this.validate(input.value, validationType, options);
            this.updateValidationUI(indicator, errorMsg, result);
        }
    },
    
    // Update validation UI
    updateValidationUI(indicator, errorMsg, result) {
        indicator.className = 'validation-indicator';
        errorMsg.className = 'validation-error';
        
        if (result.valid) {
            indicator.textContent = '✓';
            indicator.classList.add('valid');
            errorMsg.textContent = '';
            errorMsg.style.display = 'none';
        } else {
            indicator.textContent = '✗';
            indicator.classList.add('invalid');
            errorMsg.textContent = result.error;
            errorMsg.style.display = 'block';
        }
    },
    
    // Show validation summary modal
    showValidationSummary(validationResult) {
        const html = `
            <div class="modal validation-summary-modal" id="validationSummaryModal">
                <div class="modal-overlay" onclick="VaultValidation.closeSummary()"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${validationResult.valid ? '✅ Validation Passed' : '❌ Validation Failed'}</h2>
                        <button class="btn-close" onclick="VaultValidation.closeSummary()">✕</button>
                    </div>
                    <div class="modal-body">
                        <div class="validation-stats">
                            <div class="stat">
                                <span class="stat-value good">${validationResult.validCount}</span>
                                <span class="stat-label">Valid</span>
                            </div>
                            <div class="stat">
                                <span class="stat-value ${validationResult.errorCount > 0 ? 'bad' : ''}">${validationResult.errorCount}</span>
                                <span class="stat-label">Errors</span>
                            </div>
                        </div>
                        
                        ${validationResult.errorCount > 0 ? `
                            <div class="validation-errors">
                                <h3>Issues Found:</h3>
                                ${validationResult.results.filter(r => !r.valid).map(r => `
                                    <div class="validation-error-item">
                                        <strong>${r.key}</strong>: 
                                        ${r.results.map(e => e.error).join(', ')}
                                    </div>
                                `).join('')}
                            </div>
                        ` : ''}
                        
                        <div class="validation-actions">
                            ${validationResult.valid ? `
                                <button class="btn-primary" onclick="VaultValidation.proceedWithDeployment()">
                                    Proceed with Deployment
                                </button>
                            ` : `
                                <button class="btn-secondary" onclick="VaultValidation.closeSummary()">
                                    Fix Errors First
                                </button>
                            `}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', html);
    },
    
    closeSummary() {
        const modal = document.getElementById('validationSummaryModal');
        if (modal) modal.remove();
    },
    
    proceedWithDeployment() {
        this.closeSummary();
        // Trigger deployment
        if (typeof VaultUI !== 'undefined') {
            VaultUI.deployService(this.currentServiceId);
        }
    },
    
    // Quick validation check
    quickValidate(value, type) {
        const result = this.validate(value, type);
        return result.valid;
    }
};

// Add CSS for validation UI
const validationStyles = `
    .validation-indicator {
        position: absolute;
        right: 40px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 16px;
        font-weight: bold;
    }
    
    .validation-indicator.valid {
        color: var(--accent-green);
    }
    
    .validation-indicator.invalid {
        color: var(--accent-red);
    }
    
    .validation-error {
        margin-top: 8px;
        padding: 8px 12px;
        background: rgba(239, 68, 68, 0.1);
        border-left: 3px solid var(--accent-red);
        border-radius: var(--radius-sm);
        font-size: 13px;
        color: var(--accent-red);
        display: none;
    }
    
    .validation-summary-modal .validation-stats {
        display: flex;
        gap: 40px;
        justify-content: center;
        margin-bottom: 24px;
        padding-bottom: 24px;
        border-bottom: 1px solid var(--border-color);
    }
    
    .validation-summary-modal .stat {
        text-align: center;
    }
    
    .validation-summary-modal .stat-value {
        display: block;
        font-size: 36px;
        font-weight: 700;
    }
    
    .validation-summary-modal .stat-value.good {
        color: var(--accent-green);
    }
    
    .validation-summary-modal .stat-value.bad {
        color: var(--accent-red);
    }
    
    .validation-summary-modal .stat-label {
        font-size: 14px;
        color: var(--text-secondary);
    }
    
    .validation-errors {
        margin-bottom: 24px;
    }
    
    .validation-errors h3 {
        margin-bottom: 12px;
        color: var(--accent-red);
    }
    
    .validation-error-item {
        padding: 10px 14px;
        margin-bottom: 8px;
        background: rgba(239, 68, 68, 0.05);
        border: 1px solid rgba(239, 68, 68, 0.2);
        border-radius: var(--radius-md);
        font-size: 14px;
    }
`;

// Inject styles
const styleEl = document.createElement('style');
styleEl.textContent = validationStyles;
document.head.appendChild(styleEl);

// Make globally available
window.VaultValidation = VaultValidation;