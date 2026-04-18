/**
 * ai-theme-manager.js - Theme Management System
 * Handles dark/light mode, system preference detection, persistence
 * 
 * @version 4.1
 */

const AIThemeManager = {
    // State
    currentTheme: 'dark',
    systemPreference: null,
    
    // Configuration
    config: {
        storageKey: 'ai_theme_preference',
        themes: ['dark', 'light', 'auto']
    },
    
    /**
     * Initialize theme manager
     */
    init() {
        console.log('[AIThemeManager] Initializing...');
        
        // Detect system preference
        this.detectSystemPreference();
        
        // Load saved preference
        this.loadPreference();
        
        // Listen for system changes
        this.setupSystemListener();
        
        // Apply initial theme
        this.applyTheme();
        
        console.log(`[AIThemeManager] Current theme: ${this.currentTheme}`);
    },
    
    /**
     * Detect system color scheme preference
     */
    detectSystemPreference() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            this.systemPreference = mediaQuery.matches ? 'light' : 'dark';
        } else {
            this.systemPreference = 'dark';
        }
    },
    
    /**
     * Setup listener for system preference changes
     */
    setupSystemListener() {
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
            mediaQuery.addEventListener('change', (e) => {
                this.systemPreference = e.matches ? 'light' : 'dark';
                if (this.currentTheme === 'auto') {
                    this.applyTheme();
                }
            });
        }
    },
    
    /**
     * Load saved preference from storage
     */
    loadPreference() {
        try {
            const saved = localStorage.getItem(this.config.storageKey);
            if (saved && this.config.themes.includes(saved)) {
                this.currentTheme = saved;
            }
        } catch (e) {
            console.warn('[AIThemeManager] Could not load preference:', e);
        }
    },
    
    /**
     * Save preference to storage
     */
    savePreference() {
        try {
            localStorage.setItem(this.config.storageKey, this.currentTheme);
        } catch (e) {
            console.warn('[AIThemeManager] Could not save preference:', e);
        }
    },
    
    /**
     * Get effective theme (resolve 'auto')
     * @returns {string} 'dark' or 'light'
     */
    getEffectiveTheme() {
        if (this.currentTheme === 'auto') {
            return this.systemPreference || 'dark';
        }
        return this.currentTheme;
    },
    
    /**
     * Apply theme to document
     */
    applyTheme() {
        const theme = this.getEffectiveTheme();
        
        // Remove both classes
        document.documentElement.removeAttribute('data-theme');
        document.body.classList.remove('dark-mode', 'light-mode');
        
        // Apply new theme
        if (theme === 'light') {
            document.documentElement.setAttribute('data-theme', 'light');
            document.body.classList.add('light-mode');
        } else {
            document.documentElement.removeAttribute('data-theme');
            document.body.classList.add('dark-mode');
        }
        
        // Update meta theme-color
        this.updateMetaTheme(theme);
        
        // Emit event
        this.emit('themeChanged', { theme, effective: this.getEffectiveTheme() });
    },
    
    /**
     * Update meta theme-color for mobile browsers
     * @param {string} theme - Current theme
     */
    updateMetaTheme(theme) {
        let meta = document.querySelector('meta[name="theme-color"]');
        if (!meta) {
            meta = document.createElement('meta');
            meta.name = 'theme-color';
            document.head.appendChild(meta);
        }
        meta.content = theme === 'light' ? '#ffffff' : '#0f0f23';
    },
    
    /**
     * Set theme
     * @param {string} theme - Theme name
     */
    setTheme(theme) {
        if (!this.config.themes.includes(theme)) {
            console.error(`[AIThemeManager] Invalid theme: ${theme}`);
            return;
        }
        
        this.currentTheme = theme;
        this.savePreference();
        this.applyTheme();
        
        console.log(`[AIThemeManager] Theme set to: ${theme}`);
    },
    
    /**
     * Toggle between dark and light
     */
    toggle() {
        const current = this.getEffectiveTheme();
        const next = current === 'dark' ? 'light' : 'dark';
        this.setTheme(next);
    },
    
    /**
     * Create theme toggle button
     * @returns {HTMLElement}
     */
    createToggle() {
        const button = document.createElement('button');
        button.className = 'theme-toggle';
        button.setAttribute('aria-label', 'Toggle theme');
        button.setAttribute('title', 'Toggle dark/light mode');
        
        this.updateToggleIcon(button);
        
        button.addEventListener('click', () => {
            this.toggle();
            this.updateToggleIcon(button);
        });
        
        // Listen for theme changes
        this.on('themeChanged', () => {
            this.updateToggleIcon(button);
        });
        
        return button;
    },
    
    /**
     * Update toggle button icon
     * @param {HTMLElement} button - Toggle button
     */
    updateToggleIcon(button) {
        const theme = this.getEffectiveTheme();
        if (theme === 'dark') {
            button.innerHTML = '🌙'; // Moon
        } else {
            button.innerHTML = '☀️'; // Sun
        }
    },
    
    /**
     * Create theme selector dropdown
     * @returns {HTMLElement}
     */
    createSelector() {
        const select = document.createElement('select');
        select.className = 'theme-selector';
        
        this.config.themes.forEach(theme => {
            const option = document.createElement('option');
            option.value = theme;
            option.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
            option.selected = theme === this.currentTheme;
            select.appendChild(option);
        });
        
        select.addEventListener('change', (e) => {
            this.setTheme(e.target.value);
        });
        
        return select;
    },
    
    /**
     * Event system (simple implementation)
     */
    events: {},
    
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    },
    
    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => {
                try { cb(data); } catch (e) {}
            });
        }
    },
    
    /**
     * Get current theme info
     * @returns {Object}
     */
    getInfo() {
        return {
            current: this.currentTheme,
            effective: this.getEffectiveTheme(),
            system: this.systemPreference,
            available: this.config.themes
        };
    }
};

// Auto-initialize
window.AIThemeManager = AIThemeManager;

document.addEventListener('DOMContentLoaded', () => {
    AIThemeManager.init();
});
