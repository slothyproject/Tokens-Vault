/**
 * ai-security-utils.js - Security Utilities
 * XSS protection, input sanitization, CSRF protection
 * 
 * @version 4.1
 */

const AISecurityUtils = {
    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },
    
    /**
     * Escape HTML in object/array recursively
     * @param {*} data - Data to escape
     * @returns {*} - Escaped data
     */
    escapeHtmlDeep(data) {
        if (typeof data === 'string') {
            return this.escapeHtml(data);
        }
        if (Array.isArray(data)) {
            return data.map(item => this.escapeHtmlDeep(item));
        }
        if (data !== null && typeof data === 'object') {
            const escaped = {};
            for (const [key, value] of Object.entries(data)) {
                escaped[key] = this.escapeHtmlDeep(value);
            }
            return escaped;
        }
        return data;
    },
    
    /**
     * Sanitize URL to prevent javascript: protocol
     * @param {string} url - URL to sanitize
     * @returns {string|null} - Sanitized URL or null if unsafe
     */
    sanitizeUrl(url) {
        if (!url) return null;
        try {
            const parsed = new URL(url, window.location.origin);
            // Block javascript: and data: protocols
            if (['javascript:', 'data:', 'vbscript:', 'file:'].includes(parsed.protocol)) {
                return null;
            }
            return parsed.href;
        } catch {
            // Relative URL - check for protocol injection
            if (/^\s*(javascript|data|vbscript):/i.test(url)) {
                return null;
            }
            return url;
        }
    },
    
    /**
     * Generate CSRF token
     * @returns {string} - CSRF token
     */
    generateCSRFToken() {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * Store CSRF token
     */
    storeCSRFToken() {
        const token = this.generateCSRFToken();
        sessionStorage.setItem('csrf_token', token);
        return token;
    },
    
    /**
     * Get CSRF token
     * @returns {string|null} - CSRF token
     */
    getCSRFToken() {
        return sessionStorage.getItem('csrf_token') || this.storeCSRFToken();
    },
    
    /**
     * Validate CSRF token
     * @param {string} token - Token to validate
     * @returns {boolean} - Valid or not
     */
    validateCSRFToken(token) {
        const stored = sessionStorage.getItem('csrf_token');
        if (!stored || !token) return false;
        // Constant-time comparison to prevent timing attacks
        let result = 0;
        for (let i = 0; i < Math.max(stored.length, token.length); i++) {
            result |= (stored.charCodeAt(i) || 0) ^ (token.charCodeAt(i) || 0);
        }
        return result === 0;
    },
    
    /**
     * Add CSRF token to form data
     * @param {FormData} formData - Form data
     * @returns {FormData} - Form data with token
     */
    addCSRFToForm(formData) {
        formData.append('csrf_token', this.getCSRFToken());
        return formData;
    },
    
    /**
     * Validate input against common injection patterns
     * @param {string} input - Input to validate
     * @param {Object} options - Validation options
     * @returns {Object} - { valid: boolean, error: string|null }
     */
    validateInput(input, options = {}) {
        const { allowHtml = false, maxLength = 10000, pattern = null } = options;
        
        if (!input || typeof input !== 'string') {
            return { valid: false, error: 'Invalid input type' };
        }
        
        if (input.length > maxLength) {
            return { valid: false, error: `Input exceeds maximum length of ${maxLength}` };
        }
        
        // Check for dangerous patterns
        if (!allowHtml) {
            const dangerous = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi;
            if (dangerous.test(input)) {
                return { valid: false, error: 'Potentially dangerous content detected' };
            }
        }
        
        if (pattern && !pattern.test(input)) {
            return { valid: false, error: 'Input does not match required pattern' };
        }
        
        return { valid: true, error: null };
    },
    
    /**
     * Sanitize shell command argument
     * @param {string} arg - Argument to sanitize
     * @returns {string} - Sanitized argument
     */
    sanitizeShellArg(arg) {
        if (!arg) return '';
        // Remove dangerous characters
        return String(arg)
            .replace(/[;&|`$(){}[\]\\\n\r]/g, '')
            .replace(/'/g, "'\"'\"'")
            .trim();
    },
    
    /**
     * Generate secure random ID
     * @returns {string} - Random ID
     */
    generateSecureId() {
        return crypto.randomUUID?.() || 
            ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
                (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
            );
    },
    
    /**
     * Hash sensitive data
     * @param {string} data - Data to hash
     * @returns {Promise<string>} - SHA-256 hash
     */
    async hash(data) {
        const encoder = new TextEncoder();
        const buffer = encoder.encode(data);
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },
    
    /**
     * Content Security Policy generator
     * @returns {string} - CSP header value
     */
    generateCSP() {
        const policies = {
            'default-src': ["'self'"],
            'script-src': ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            'style-src': ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            'font-src': ["'self'", "https://fonts.gstatic.com"],
            'img-src': ["'self'", "data:", "https:"],
            'connect-src': ["'self'", "https://ollama-cloud.reddgr.com", "https://backboard.railway.app"],
            'frame-ancestors': ["'none'"],
            'base-uri': ["'self'"],
            'form-action': ["'self'"]
        };
        
        return Object.entries(policies)
            .map(([key, values]) => `${key} ${values.join(' ')}`)
            .join('; ');
    },
    
    /**
     * Apply security headers
     */
    applySecurityHeaders() {
        // Add CSP meta tag
        if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
            const meta = document.createElement('meta');
            meta.httpEquiv = 'Content-Security-Policy';
            meta.content = this.generateCSP();
            document.head.appendChild(meta);
        }
    },
    
    /**
     * Create safe HTML template
     * @param {TemplateStringsArray} strings - Template strings
     * @param {...*} values - Interpolated values
     * @returns {string} - Safe HTML
     */
    html(strings, ...values) {
        return strings.reduce((result, string, i) => {
            const value = values[i - 1];
            if (value !== undefined) {
                result += this.escapeHtml(String(value));
            }
            return result + string;
        });
    }
};

// Auto-export
window.AISecurityUtils = AISecurityUtils;
