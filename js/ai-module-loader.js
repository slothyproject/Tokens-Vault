/**
 * ai-module-loader.js - Dependency-based Module Loader
 * Resolves initialization order, prevents race conditions
 * 
 * Features:
 * - Dependency graph resolution
 * - Topological sort for load order
 * - Promise-based ready system
 * - Scoped initialization with error boundaries
 * 
 * @version 4.1
 * @author AI Agent
 */

const AIModuleLoader = {
    // Module registry
    modules: new Map(),
    loaded: new Set(),
    failed: new Set(),
    
    // Event system
    events: new Map(),
    
    // Configuration
    config: {
        timeout: 30000,           // 30 second initialization timeout
        retryAttempts: 3,
        retryDelay: 1000
    },
    
    /**
     * Register a module with dependencies
     * @param {string} name - Module name
     * @param {Object} module - Module object
     * @param {Array<string>} dependencies - Names of required modules
     * @param {Object} options - Additional options
     */
    register(name, module, dependencies = [], options = {}) {
        if (this.modules.has(name)) {
            console.warn(`[AIModuleLoader] Module ${name} already registered, overwriting`);
        }
        
        this.modules.set(name, {
            name,
            module,
            dependencies: new Set(dependencies),
            options: {
                critical: options.critical ?? true,
                timeout: options.timeout ?? this.config.timeout,
                retries: options.retries ?? this.config.retryAttempts
            },
            status: 'registered',
            error: null,
            initTime: null
        });
        
        console.log(`[AIModuleLoader] Registered ${name} with dependencies: [${dependencies.join(', ')}]`);
    },
    
    /**
     * Initialize all modules in dependency order
     * @returns {Promise<Object>} - Initialization results
     */
    async init() {
        console.log('[AIModuleLoader] Starting initialization...');
        const startTime = performance.now();
        
        // Resolve dependency order
        const loadOrder = this.resolveDependencies();
        
        if (!loadOrder) {
            throw new Error('Circular dependency detected');
        }
        
        console.log(`[AIModuleLoader] Load order: [${loadOrder.join(' → ')}]`);
        
        // Initialize modules in order
        const results = {
            success: [],
            failed: [],
            skipped: []
        };
        
        for (const name of loadOrder) {
            const result = await this.initModule(name);
            
            if (result.success) {
                results.success.push(name);
            } else if (result.critical) {
                results.failed.push({ name, error: result.error });
                // Stop if critical module fails
                throw new Error(`Critical module ${name} failed: ${result.error}`);
            } else {
                results.failed.push({ name, error: result.error });
            }
        }
        
        const duration = Math.round(performance.now() - startTime);
        console.log(`[AIModuleLoader] Initialization complete in ${duration}ms`);
        console.log(`[AIModuleLoader] Success: ${results.success.length}, Failed: ${results.failed.length}`);
        
        // Emit ready event
        this.emit('ready', { results, duration });
        
        return results;
    },
    
    /**
     * Initialize a single module with retry logic
     * @param {string} name - Module name
     * @returns {Promise<Object>} - Init result
     */
    async initModule(name) {
        const meta = this.modules.get(name);
        if (!meta) {
            return { success: false, error: 'Module not registered' };
        }
        
        // Skip if already loaded
        if (this.loaded.has(name)) {
            return { success: true, alreadyLoaded: true };
        }
        
        // Check if dependencies are loaded
        for (const dep of meta.dependencies) {
            if (!this.loaded.has(dep)) {
                return { 
                    success: false, 
                    error: `Dependency ${dep} not loaded`,
                    critical: meta.options.critical
                };
            }
        }
        
        // Initialize with retries
        let lastError = null;
        for (let attempt = 1; attempt <= meta.options.retries; attempt++) {
            try {
                console.log(`[AIModuleLoader] Initializing ${name} (attempt ${attempt}/${meta.options.retries})...`);
                
                const startTime = performance.now();
                
                // Call module init with timeout
                const initPromise = meta.module.init ? meta.module.init() : Promise.resolve();
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Timeout')), meta.options.timeout)
                );
                
                await Promise.race([initPromise, timeoutPromise]);
                
                const duration = Math.round(performance.now() - startTime);
                
                // Mark as loaded
                this.loaded.add(name);
                meta.status = 'loaded';
                meta.initTime = duration;
                
                console.log(`[AIModuleLoader] ✓ ${name} initialized in ${duration}ms`);
                
                // Emit event
                this.emit('moduleLoaded', { name, duration });
                
                return { success: true, duration };
                
            } catch (error) {
                lastError = error;
                console.warn(`[AIModuleLoader] ✗ ${name} failed (attempt ${attempt}): ${error.message}`);
                
                if (attempt < meta.options.retries) {
                    await this.sleep(meta.options.retryDelay * attempt);
                }
            }
        }
        
        // All retries failed
        meta.status = 'failed';
        meta.error = lastError;
        this.failed.add(name);
        
        this.emit('moduleFailed', { name, error: lastError.message });
        
        return { 
            success: false, 
            error: lastError.message,
            critical: meta.options.critical
        };
    },
    
    /**
     * Resolve dependencies using topological sort
     * @returns {Array<string>|null} - Load order or null if circular
     */
    resolveDependencies() {
        const visited = new Set();
        const temp = new Set();
        const order = [];
        
        const visit = (name) => {
            if (temp.has(name)) {
                console.error(`[AIModuleLoader] Circular dependency detected at ${name}`);
                return false;
            }
            
            if (visited.has(name)) {
                return true;
            }
            
            temp.add(name);
            
            const meta = this.modules.get(name);
            if (meta) {
                for (const dep of meta.dependencies) {
                    if (!this.modules.has(dep)) {
                        console.warn(`[AIModuleLoader] Missing dependency: ${dep} (required by ${name})`);
                        // Continue with other dependencies
                    }
                    if (!visit(dep)) {
                        return false;
                    }
                }
            }
            
            temp.delete(name);
            visited.add(name);
            order.push(name);
            
            return true;
        };
        
        for (const [name] of this.modules) {
            if (!visit(name)) {
                return null;
            }
        }
        
        return order;
    },
    
    /**
     * Check if a module is loaded
     * @param {string} name - Module name
     * @returns {boolean}
     */
    isLoaded(name) {
        return this.loaded.has(name);
    },
    
    /**
     * Wait for module(s) to be loaded
     * @param {Array<string>|string} names - Module name(s)
     * @param {number} timeout - Max wait time
     * @returns {Promise<boolean>}
     */
    async waitFor(names, timeout = 30000) {
        const moduleNames = Array.isArray(names) ? names : [names];
        
        return new Promise((resolve) => {
            const check = () => {
                const allLoaded = moduleNames.every(name => this.loaded.has(name));
                if (allLoaded) {
                    resolve(true);
                }
            };
            
            check();
            
            const interval = setInterval(check, 100);
            
            setTimeout(() => {
                clearInterval(interval);
                resolve(false);
            }, timeout);
        });
    },
    
    /**
     * Get module by name
     * @param {string} name - Module name
     * @returns {Object|null}
     */
    get(name) {
        const meta = this.modules.get(name);
        return meta ? meta.module : null;
    },
    
    /**
     * Get initialization status
     * @returns {Object}
     */
    getStatus() {
        const status = {};
        for (const [name, meta] of this.modules) {
            status[name] = {
                status: meta.status,
                dependencies: Array.from(meta.dependencies),
                initTime: meta.initTime,
                error: meta.error?.message
            };
        }
        return status;
    },
    
    /**
     * Event system
     */
    on(event, callback) {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event).push(callback);
    },
    
    emit(event, data) {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(cb => {
                try { cb(data); } catch (e) { console.error(e); }
            });
        }
    },
    
    /**
     * Reset loader (for testing)
     */
    reset() {
        this.modules.clear();
        this.loaded.clear();
        this.failed.clear();
        this.events.clear();
    },
    
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
};

// Auto-export
window.AIModuleLoader = AIModuleLoader;
