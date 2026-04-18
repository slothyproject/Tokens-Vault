/**
 * ai-event-bus.js - Centralized Event System
 * Reliable cross-module communication with guaranteed delivery
 * 
 * Features:
 * - Guaranteed event delivery
 * - Event queuing when no listeners
 * - Priority-based handlers
 * - Scoped event namespacing
 * - Error isolation
 * 
 * @version 4.1
 */

const AIEventBus = {
    // Event handlers by name
    handlers: new Map(),
    
    // Queued events for guaranteed delivery
    queued: new Map(),
    
    // Scoped handlers for cleanup
    scopes: new Map(),
    
    // Statistics
    stats: {
        emitted: 0,
        delivered: 0,
        failed: 0,
        queued: 0
    },
    
    config: {
        maxQueueSize: 100,
        defaultPriority: 0,
        propagateErrors: false
    },
    
    /**
     * Subscribe to an event
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @param {Object} options - { priority: number, scope: string }
     * @returns {Function} - Unsubscribe function
     */
    on(event, callback, options = {}) {
        if (typeof callback !== 'function') {
            console.error('[AIEventBus] Callback must be a function');
            return () => {};
        }
        
        const handler = {
            callback,
            priority: options.priority ?? this.config.defaultPriority,
            scope: options.scope,
            once: options.once ?? false
        };
        
        if (!this.handlers.has(event)) {
            this.handlers.set(event, []);
        }
        
        const handlers = this.handlers.get(event);
        handlers.push(handler);
        
        // Sort by priority (higher first)
        handlers.sort((a, b) => b.priority - a.priority);
        
        // Track scoped handlers
        if (options.scope) {
            if (!this.scopes.has(options.scope)) {
                this.scopes.set(options.scope, []);
            }
            this.scopes.get(options.scope).push({ event, handler });
        }
        
        // Process any queued events
        this.processQueue(event);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    },
    
    /**
     * Subscribe to event once
     * @param {string} event - Event name
     * @param {Function} callback - Event handler
     * @param {Object} options - { priority: number, scope: string }
     * @returns {Function} - Unsubscribe function
     */
    once(event, callback, options = {}) {
        return this.on(event, callback, { ...options, once: true });
    },
    
    /**
     * Unsubscribe from an event
     * @param {string} event - Event name
     * @param {Function} callback - Handler to remove
     */
    off(event, callback) {
        const handlers = this.handlers.get(event);
        if (!handlers) return;
        
        const index = handlers.findIndex(h => h.callback === callback);
        if (index > -1) {
            handlers.splice(index, 1);
        }
        
        // Clean up empty event arrays
        if (handlers.length === 0) {
            this.handlers.delete(event);
        }
    },
    
    /**
     * Emit an event
     * @param {string} event - Event name
     * @param {*} data - Event data
     * @param {Object} options - { queue: boolean, async: boolean }
     * @returns {boolean} - Whether event was delivered
     */
    emit(event, data, options = {}) {
        this.stats.emitted++;
        
        const handlers = this.handlers.get(event);
        
        // Queue if no handlers and queuing enabled
        if (!handlers || handlers.length === 0) {
            if (options.queue !== false) {
                this.queueEvent(event, data);
            }
            return false;
        }
        
        // Deliver to all handlers
        let delivered = 0;
        const toRemove = [];
        
        handlers.forEach((handler, index) => {
            try {
                if (options.async) {
                    setTimeout(() => handler.callback(data), 0);
                } else {
                    handler.callback(data);
                }
                
                delivered++;
                
                // Mark once handlers for removal
                if (handler.once) {
                    toRemove.push(index);
                }
            } catch (error) {
                this.stats.failed++;
                console.error(`[AIEventBus] Handler error for ${event}:`, error);
                
                if (this.config.propagateErrors) {
                    throw error;
                }
            }
        });
        
        // Remove once handlers (in reverse order)
        toRemove.reverse().forEach(index => {
            handlers.splice(index, 1);
        });
        
        this.stats.delivered += delivered;
        
        return delivered > 0;
    },
    
    /**
     * Queue event for later delivery
     * @param {string} event - Event name
     * @param {*} data - Event data
     */
    queueEvent(event, data) {
        if (!this.queued.has(event)) {
            this.queued.set(event, []);
        }
        
        const queue = this.queued.get(event);
        
        // Prevent unbounded growth
        if (queue.length >= this.config.maxQueueSize) {
            queue.shift(); // Remove oldest
        }
        
        queue.push({
            data,
            timestamp: Date.now()
        });
        
        this.stats.queued++;
    },
    
    /**
     * Process queued events for a specific event type
     * @param {string} event - Event name
     */
    processQueue(event) {
        const queue = this.queued.get(event);
        if (!queue || queue.length === 0) return;
        
        console.log(`[AIEventBus] Processing ${queue.length} queued events for ${event}`);
        
        // Process all queued events
        while (queue.length > 0) {
            const { data } = queue.shift();
            this.emit(event, data, { queue: false });
        }
    },
    
    /**
     * Remove all handlers for a scope
     * @param {string} scope - Scope name
     */
    removeScope(scope) {
        const scopeHandlers = this.scopes.get(scope);
        if (!scopeHandlers) return;
        
        scopeHandlers.forEach(({ event, handler }) => {
            const handlers = this.handlers.get(event);
            if (handlers) {
                const index = handlers.indexOf(handler);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        });
        
        this.scopes.delete(scope);
    },
    
    /**
     * Wait for an event (promise-based)
     * @param {string} event - Event name
     * @param {number} timeout - Max wait time
     * @returns {Promise<*>} - Event data
     */
    waitFor(event, timeout = 5000) {
        return new Promise((resolve, reject) => {
            let resolved = false;
            
            const handler = this.once(event, (data) => {
                resolved = true;
                resolve(data);
            });
            
            setTimeout(() => {
                if (!resolved) {
                    handler(); // Unsubscribe
                    reject(new Error(`Timeout waiting for ${event}`));
                }
            }, timeout);
        });
    },
    
    /**
     * Get event statistics
     * @returns {Object}
     */
    getStats() {
        return { ...this.stats };
    },
    
    /**
     * Clear all handlers and queues
     */
    clear() {
        this.handlers.clear();
        this.queued.clear();
        this.scopes.clear();
    },
    
    /**
     * Debug: List all active events
     * @returns {Object}
     */
    debug() {
        const events = {};
        for (const [name, handlers] of this.handlers) {
            events[name] = {
                handlers: handlers.length,
                queued: this.queued.get(name)?.length ?? 0
            };
        }
        return events;
    }
};

// Auto-export
window.AIEventBus = AIEventBus;
