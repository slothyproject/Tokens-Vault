/**
 * ai-cleanup-manager.js - Resource Cleanup Manager
 * Manages intervals, timeouts, event listeners, and memory
 * Prevents memory leaks
 * 
 * @version 4.1
 */

const AICleanupManager = {
    // Track all resources
    resources: {
        intervals: new Map(),
        timeouts: new Map(),
        listeners: new Map(),
        observers: new Map(),
        contexts: new Map()
    },
    
    /**
     * Register an interval
     * @param {string} scope - Resource scope
     * @param {number} id - Interval ID
     * @param {string} description - Description
     */
    registerInterval(scope, id, description = '') {
        if (!this.resources.intervals.has(scope)) {
            this.resources.intervals.set(scope, []);
        }
        this.resources.intervals.get(scope).push({ id, description, created: Date.now() });
    },
    
    /**
     * Clear all intervals for a scope
     * @param {string} scope - Scope name
     */
    clearIntervals(scope) {
        const intervals = this.resources.intervals.get(scope);
        if (intervals) {
            intervals.forEach(({ id }) => {
                clearInterval(id);
            });
            this.resources.intervals.delete(scope);
        }
    },
    
    /**
     * Register a timeout
     * @param {string} scope - Resource scope
     * @param {number} id - Timeout ID
     * @param {string} description - Description
     */
    registerTimeout(scope, id, description = '') {
        if (!this.resources.timeouts.has(scope)) {
            this.resources.timeouts.set(scope, []);
        }
        this.resources.timeouts.get(scope).push({ id, description, created: Date.now() });
    },
    
    /**
     * Clear all timeouts for a scope
     * @param {string} scope - Scope name
     */
    clearTimeouts(scope) {
        const timeouts = this.resources.timeouts.get(scope);
        if (timeouts) {
            timeouts.forEach(({ id }) => {
                clearTimeout(id);
            });
            this.resources.timeouts.delete(scope);
        }
    },
    
    /**
     * Register an event listener
     * @param {string} scope - Resource scope
     * @param {EventTarget} element - Element
     * @param {string} event - Event name
     * @param {Function} handler - Handler function
     * @param {Object} options - Options
     */
    registerListener(scope, element, event, handler, options = {}) {
        if (!this.resources.listeners.has(scope)) {
            this.resources.listeners.set(scope, []);
        }
        this.resources.listeners.get(scope).push({ element, event, handler, options });
    },
    
    /**
     * Remove all listeners for a scope
     * @param {string} scope - Scope name
     */
    clearListeners(scope) {
        const listeners = this.resources.listeners.get(scope);
        if (listeners) {
            listeners.forEach(({ element, event, handler, options }) => {
                element.removeEventListener(event, handler, options);
            });
            this.resources.listeners.delete(scope);
        }
    },
    
    /**
     * Register a mutation observer
     * @param {string} scope - Resource scope
     * @param {MutationObserver} observer - Observer instance
     */
    registerObserver(scope, observer) {
        if (!this.resources.observers.has(scope)) {
            this.resources.observers.set(scope, []);
        }
        this.resources.observers.get(scope).push({ observer, created: Date.now() });
    },
    
    /**
     * Disconnect all observers for a scope
     * @param {string} scope - Scope name
     */
    clearObservers(scope) {
        const observers = this.resources.observers.get(scope);
        if (observers) {
            observers.forEach(({ observer }) => {
                observer.disconnect();
            });
            this.resources.observers.delete(scope);
        }
    },
    
    /**
     * Register an audio context
     * @param {string} scope - Resource scope
     * @param {AudioContext} context - Audio context
     */
    registerAudioContext(scope, context) {
        if (!this.resources.contexts.has(scope)) {
            this.resources.contexts.set(scope, []);
        }
        this.resources.contexts.get(scope).push({ context, created: Date.now() });
    },
    
    /**
     * Close all audio contexts for a scope
     * @param {string} scope - Scope name
     */
    clearAudioContexts(scope) {
        const contexts = this.resources.contexts.get(scope);
        if (contexts) {
            contexts.forEach(({ context }) => {
                if (context.state !== 'closed') {
                    context.close();
                }
            });
            this.resources.contexts.delete(scope);
        }
    },
    
    /**
     * Clean up all resources for a scope
     * @param {string} scope - Scope name
     */
    cleanup(scope) {
        console.log(`[AICleanupManager] Cleaning up scope: ${scope}`);
        
        this.clearIntervals(scope);
        this.clearTimeouts(scope);
        this.clearListeners(scope);
        this.clearObservers(scope);
        this.clearAudioContexts(scope);
    },
    
    /**
     * Clean up all resources
     */
    cleanupAll() {
        console.log('[AICleanupManager] Cleaning up all resources');
        
        // Get all unique scopes
        const scopes = new Set([
            ...this.resources.intervals.keys(),
            ...this.resources.timeouts.keys(),
            ...this.resources.listeners.keys(),
            ...this.resources.observers.keys(),
            ...this.resources.contexts.keys()
        ]);
        
        scopes.forEach(scope => this.cleanup(scope));
    },
    
    /**
     * Get resource statistics
     * @returns {Object}
     */
    getStats() {
        const stats = {
            intervals: 0,
            timeouts: 0,
            listeners: 0,
            observers: 0,
            contexts: 0
        };
        
        for (const list of this.resources.intervals.values()) {
            stats.intervals += list.length;
        }
        for (const list of this.resources.timeouts.values()) {
            stats.timeouts += list.length;
        }
        for (const list of this.resources.listeners.values()) {
            stats.listeners += list.length;
        }
        for (const list of this.resources.observers.values()) {
            stats.observers += list.length;
        }
        for (const list of this.resources.contexts.values()) {
            stats.contexts += list.length;
        }
        
        return stats;
    }
};

// Auto-export
window.AICleanupManager = AICleanupManager;

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
    AICleanupManager.cleanupAll();
});
