/**
 * ai-test-service.js - Practice Environment for AI
 * Simulated service that can be broken and fixed
 * Allows AI to practice healing without affecting production
 * 
 * Features:
 * - Simulates failures (crashes, slowdowns, errors)
 * - Provides health endpoints for monitoring
 * - Logs actions for learning
 * - Safe experimentation environment
 * 
 * @version 4.0
 * @author AI Agent
 */

const AITestService = {
    // Configuration
    config: {
        enabled: true,
        serviceId: 'ai-test-service',
        name: 'AI Training Service',
        port: 3999,
        healthEndpoint: '/health',
        scenarios: [
            'slow_response',      // High latency
            'high_error_rate',    // 50% error rate
            'service_offline',    // Complete failure
            'memory_leak',        // Gradual degradation
            'database_timeout',   // DB connection issues
            'configuration_error' // Wrong env vars
        ]
    },
    
    // State
    state: {
        healthy: true,
        responseTime: 50,      // ms
        errorRate: 0,          // 0-100%
        memoryUsage: 100,      // MB
        scenario: null,
        scenarioStartTime: null,
        requestCount: 0,
        errorCount: 0,
        lastHealthCheck: Date.now()
    },
    
    // Scenario handlers
    scenarios: {
        slow_response: {
            name: 'Slow Response',
            description: 'Service responds slowly (2-5 seconds)',
            apply: () => {
                AITestService.state.responseTime = 2000 + Math.random() * 3000;
            },
            cleanup: () => {
                AITestService.state.responseTime = 50;
            }
        },
        
        high_error_rate: {
            name: 'High Error Rate',
            description: '50% of requests fail',
            apply: () => {
                AITestService.state.errorRate = 50;
            },
            cleanup: () => {
                AITestService.state.errorRate = 0;
            }
        },
        
        service_offline: {
            name: 'Service Offline',
            description: 'Complete service failure',
            apply: () => {
                AITestService.state.healthy = false;
            },
            cleanup: () => {
                AITestService.state.healthy = true;
            }
        },
        
        memory_leak: {
            name: 'Memory Leak',
            description: 'Gradual memory increase',
            apply: () => {
                AITestService.state.memoryUsage = 500; // Start high
            },
            cleanup: () => {
                AITestService.state.memoryUsage = 100;
            }
        },
        
        database_timeout: {
            name: 'Database Timeout',
            description: 'DB connections timeout',
            apply: () => {
                AITestService.state.dbHealthy = false;
            },
            cleanup: () => {
                AITestService.state.dbHealthy = true;
            }
        },
        
        configuration_error: {
            name: 'Configuration Error',
            description: 'Wrong environment variables',
            apply: () => {
                AITestService.state.configError = true;
            },
            cleanup: () => {
                AITestService.state.configError = false;
            }
        }
    },
    
    /**
     * Initialize test service
     */
    init() {
        console.log('[AITestService] Initializing practice environment...');
        
        // Register with health engine
        if (typeof AIHealthEngine !== 'undefined') {
            AIHealthEngine.serviceDefinitions[this.config.serviceId] = {
                name: this.config.name,
                url: `http://localhost:${this.config.port}`,
                healthEndpoint: this.config.healthEndpoint,
                type: 'test',
                critical: false,
                expectedStatus: 200,
                timeout: 5000
            };
        }
        
        // Create UI controls
        this.createUI();
        
        console.log('[AITestService] Practice environment ready');
        console.log('[AITestService] Available scenarios:', Object.keys(this.scenarios).join(', '));
    },
    
    /**
     * Create UI controls for manual testing
     */
    createUI() {
        // Only create if we're in the vault page
        if (!document.getElementById('aiCentralHub')) return;
        
        const panel = document.createElement('div');
        panel.id = 'ai-test-service-panel';
        panel.className = 'ai-test-panel';
        panel.innerHTML = `
            <div class="ai-test-header">
                <h4>🎓 AI Training Ground</h4>
                <span class="ai-test-status ${this.state.healthy ? 'healthy' : 'unhealthy'}">
                    ${this.state.healthy ? '🟢 Healthy' : '🔴 Unhealthy'}
                </span>
            </div>
            
            <div class="ai-test-metrics">
                <div class="ai-test-metric">
                    <span class="metric-label">Response Time</span>
                    <span class="metric-value" id="test-response-time">${this.state.responseTime}ms</span>
                </div>
                <div class="ai-test-metric">
                    <span class="metric-label">Error Rate</span>
                    <span class="metric-value" id="test-error-rate">${this.state.errorRate}%</span>
                </div>
                <div class="ai-test-metric">
                    <span class="metric-label">Memory</span>
                    <span class="metric-value" id="test-memory">${this.state.memoryUsage}MB</span>
                </div>
            </div>
            
            <div class="ai-test-scenarios">
                <h5>Inject Failure Scenario:</h5>
                <div class="ai-test-buttons">
                    ${Object.entries(this.scenarios).map(([key, scenario]) => `
                        <button class="btn-scenario" onclick="AITestService.injectScenario('${key}')"
                                title="${scenario.description}">
                            ${scenario.name}
                        </button>
                    `).join('')}
                </div>
            </div>
            
            ${this.state.scenario ? `
                <div class="ai-test-active">
                    <p>🧪 Active: ${this.scenarios[this.state.scenario].name}</p>
                    <button class="btn-heal" onclick="AITestService.heal()">
                        🔧 Let AI Heal
                    </button>
                    <button class="btn-stop" onclick="AITestService.stopScenario()">
                        ⏹ Stop Scenario
                    </button>
                </div>
            ` : ''}
            
            <div class="ai-test-history">
                <h5>Training History:</h5>
                <div id="ai-test-history-list">
                    <p class="empty">No training sessions yet</p>
                </div>
            </div>
        `;
        
        // Find a place to insert - prefer AI Central Hub
        const hub = document.getElementById('aiCentralHub');
        if (hub) {
            hub.appendChild(panel);
        } else {
            // Add to sidebar or bottom of page
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.appendChild(panel);
            }
        }
        
        // Add styles
        this.addStyles();
    },
    
    /**
     * Inject a failure scenario
     */
    injectScenario(scenarioKey) {
        const scenario = this.scenarios[scenarioKey];
        if (!scenario) {
            console.error('[AITestService] Unknown scenario:', scenarioKey);
            return;
        }
        
        console.log(`[AITestService] Injecting scenario: ${scenario.name}`);
        
        // Apply scenario
        scenario.apply();
        
        // Update state
        this.state.scenario = scenarioKey;
        this.state.scenarioStartTime = Date.now();
        
        // Log for learning
        this.logTrainingEvent({
            type: 'scenario_started',
            scenario: scenarioKey,
            timestamp: Date.now()
        });
        
        // Update UI
        this.updateUI();
        
        // Trigger health check
        if (typeof AIHealthEngine !== 'undefined') {
            AIHealthEngine.checkServiceHealth(this.config.serviceId);
        }
        
        // Show notification
        AINotificationCenter?.show({
            type: 'INFO',
            title: 'Training Scenario Started',
            message: `Injected ${scenario.name} into test service`,
            service: this.config.serviceId
        });
    },
    
    /**
     * Stop current scenario
     */
    stopScenario() {
        if (!this.state.scenario) return;
        
        const scenario = this.scenarios[this.state.scenario];
        console.log(`[AITestService] Stopping scenario: ${scenario.name}`);
        
        // Cleanup
        scenario.cleanup();
        
        // Log duration
        const duration = Date.now() - this.state.scenarioStartTime;
        
        // Log for learning
        this.logTrainingEvent({
            type: 'scenario_stopped',
            scenario: this.state.scenario,
            duration: duration,
            timestamp: Date.now()
        });
        
        // Reset state
        this.state.scenario = null;
        this.state.scenarioStartTime = null;
        
        // Update UI
        this.updateUI();
    },
    
    /**
     * Let AI heal the test service
     */
    async heal() {
        if (!this.state.scenario) {
            console.log('[AITestService] No active scenario to heal');
            return;
        }
        
        console.log('[AITestService] Triggering AI healing...');
        
        const startTime = Date.now();
        
        // Trigger healing
        if (typeof AIHealingEngine !== 'undefined') {
            const result = await AIHealingEngine.handleIssue({
                serviceId: this.config.serviceId,
                type: this.state.scenario,
                severity: 'training',
                timestamp: startTime,
                error: { message: `Training: ${this.scenarios[this.state.scenario].name}` }
            });
            
            // Log outcome
            const duration = Date.now() - startTime;
            
            this.logTrainingEvent({
                type: 'ai_healing_attempt',
                scenario: this.state.scenario,
                success: result?.success || false,
                duration: duration,
                timestamp: Date.now()
            });
            
            // Show result
            if (result?.success) {
                AINotificationCenter?.show({
                    type: 'SUCCESS',
                    title: 'AI Healing Successful',
                    message: `AI fixed ${this.scenarios[this.state.scenario].name} in ${duration}ms`,
                    service: this.config.serviceId
                });
            } else {
                AINotificationCenter?.show({
                    type: 'WARNING',
                    title: 'AI Healing Failed',
                    message: `AI could not fix ${this.scenarios[this.state.scenario].name}`,
                    service: this.config.serviceId
                });
            }
        }
        
        this.updateUI();
    },
    
    /**
     * Simulate health check endpoint
     */
    async handleHealthCheck() {
        // Update request count
        this.state.requestCount++;
        
        // Simulate error based on error rate
        const shouldError = Math.random() * 100 < this.state.errorRate;
        
        if (shouldError || !this.state.healthy) {
            this.state.errorCount++;
            
            return {
                status: 'unhealthy',
                statusCode: 500,
                responseTime: this.state.responseTime,
                error: 'Simulated error',
                scenario: this.state.scenario
            };
        }
        
        // Simulate slow response
        if (this.state.responseTime > 100) {
            await this.sleep(this.state.responseTime);
        }
        
        return {
            status: 'healthy',
            statusCode: 200,
            responseTime: this.state.responseTime,
            memory: this.state.memoryUsage,
            requests: this.state.requestCount,
            errors: this.state.errorCount,
            scenario: this.state.scenario
        };
    },
    
    /**
     * Log training event
     */
    logTrainingEvent(event) {
        // Store in localStorage
        const key = 'ai_training_history';
        let history = JSON.parse(localStorage.getItem(key) || '[]');
        history.push(event);
        
        // Keep last 100
        if (history.length > 100) {
            history = history.slice(-100);
        }
        
        localStorage.setItem(key, JSON.stringify(history));
        
        // Update UI
        this.updateHistoryUI();
    },
    
    /**
     * Update history UI
     */
    updateHistoryUI() {
        const historyList = document.getElementById('ai-test-history-list');
        if (!historyList) return;
        
        const history = JSON.parse(localStorage.getItem('ai_training_history') || '[]');
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="empty">No training sessions yet</p>';
            return;
        }
        
        historyList.innerHTML = history.slice(-10).reverse().map(event => {
            const time = new Date(event.timestamp).toLocaleTimeString();
            let icon = '⚪';
            let color = 'gray';
            
            if (event.type === 'scenario_started') {
                icon = '🧪';
                color = 'blue';
            } else if (event.type === 'ai_healing_attempt') {
                icon = event.success ? '✅' : '❌';
                color = event.success ? 'green' : 'red';
            } else if (event.type === 'scenario_stopped') {
                icon = '⏹';
                color = 'gray';
            }
            
            return `
                <div class="history-item ${color}">
                    <span class="history-icon">${icon}</span>
                    <span class="history-time">${time}</span>
                    <span class="history-type">${event.type}</span>
                    ${event.duration ? `<span class="history-duration">${event.duration}ms</span>` : ''}
                </div>
            `;
        }).join('');
    },
    
    /**
     * Update UI
     */
    updateUI() {
        // Re-create UI to show current state
        const panel = document.getElementById('ai-test-service-panel');
        if (panel) {
            panel.remove();
        }
        this.createUI();
    },
    
    /**
     * Get training stats
     */
    getTrainingStats() {
        const history = JSON.parse(localStorage.getItem('ai_training_history') || '[]');
        
        const scenarios = {};
        let healingAttempts = 0;
        let healingSuccesses = 0;
        let totalDuration = 0;
        
        history.forEach(event => {
            if (event.scenario) {
                scenarios[event.scenario] = (scenarios[event.scenario] || 0) + 1;
            }
            
            if (event.type === 'ai_healing_attempt') {
                healingAttempts++;
                if (event.success) healingSuccesses++;
                if (event.duration) totalDuration += event.duration;
            }
        });
        
        return {
            totalScenarios: Object.keys(scenarios).length,
            scenarioCounts: scenarios,
            healingAttempts,
            healingSuccesses,
            healingSuccessRate: healingAttempts > 0 ? (healingSuccesses / healingAttempts * 100).toFixed(1) : 0,
            avgHealingTime: healingAttempts > 0 ? Math.round(totalDuration / healingAttempts) : 0,
            totalEvents: history.length
        };
    },
    
    /**
     * Utility: sleep
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    /**
     * Add styles
     */
    addStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            .ai-test-panel {
                background: var(--bg-secondary, #1e1e2e);
                border: 1px solid var(--border-color, #313244);
                border-radius: 8px;
                padding: 16px;
                margin: 16px;
            }
            
            .ai-test-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .ai-test-header h4 {
                margin: 0;
            }
            
            .ai-test-status {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 12px;
                font-weight: 600;
            }
            
            .ai-test-status.healthy {
                background: rgba(34, 197, 94, 0.2);
                color: #22c55e;
            }
            
            .ai-test-status.unhealthy {
                background: rgba(239, 68, 68, 0.2);
                color: #ef4444;
            }
            
            .ai-test-metrics {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                gap: 8px;
                margin-bottom: 16px;
            }
            
            .ai-test-metric {
                background: var(--bg-tertiary, #313244);
                padding: 8px;
                border-radius: 6px;
                text-align: center;
            }
            
            .ai-test-metric .metric-label {
                display: block;
                font-size: 11px;
                color: var(--text-secondary, #9399b2);
                margin-bottom: 4px;
            }
            
            .ai-test-metric .metric-value {
                font-size: 16px;
                font-weight: 600;
            }
            
            .ai-test-scenarios {
                margin-bottom: 16px;
            }
            
            .ai-test-scenarios h5 {
                margin: 0 0 8px 0;
            }
            
            .ai-test-buttons {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
            }
            
            .btn-scenario {
                padding: 8px 12px;
                background: var(--bg-tertiary, #313244);
                border: 1px solid var(--border-color, #45475a);
                border-radius: 6px;
                color: var(--text-primary, #cdd6f4);
                font-size: 12px;
                cursor: pointer;
                transition: all 0.2s;
            }
            
            .btn-scenario:hover {
                background: var(--border-color, #45475a);
                border-color: var(--accent-blue, #3b82f6);
            }
            
            .ai-test-active {
                background: rgba(139, 92, 246, 0.1);
                border: 1px solid #8b5cf6;
                border-radius: 6px;
                padding: 12px;
                margin-bottom: 16px;
            }
            
            .ai-test-active p {
                margin: 0 0 12px 0;
                color: #8b5cf6;
            }
            
            .btn-heal {
                padding: 8px 16px;
                background: #8b5cf6;
                border: none;
                border-radius: 6px;
                color: white;
                font-size: 13px;
                cursor: pointer;
                margin-right: 8px;
            }
            
            .btn-heal:hover {
                background: #7c3aed;
            }
            
            .btn-stop {
                padding: 8px 16px;
                background: var(--bg-tertiary, #313244);
                border: 1px solid var(--border-color, #45475a);
                border-radius: 6px;
                color: var(--text-primary, #cdd6f4);
                font-size: 13px;
                cursor: pointer;
            }
            
            .ai-test-history {
                border-top: 1px solid var(--border-color, #313244);
                padding-top: 16px;
            }
            
            .ai-test-history h5 {
                margin: 0 0 8px 0;
            }
            
            .history-item {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px;
                border-radius: 4px;
                font-size: 12px;
            }
            
            .history-item.blue { background: rgba(59, 130, 246, 0.1); }
            .history-item.green { background: rgba(34, 197, 94, 0.1); }
            .history-item.red { background: rgba(239, 68, 68, 0.1); }
            .history-item.gray { background: var(--bg-tertiary, #313244); }
            
            .history-icon {
                font-size: 14px;
            }
            
            .history-time {
                color: var(--text-secondary, #9399b2);
                font-size: 11px;
            }
            
            .history-type {
                flex: 1;
            }
            
            .history-duration {
                color: var(--text-secondary, #9399b2);
                font-size: 11px;
            }
            
            .empty {
                color: var(--text-secondary, #9399b2);
                font-style: italic;
                text-align: center;
                padding: 16px;
            }
        `;
        
        document.head.appendChild(styles);
    }
};

// Auto-initialize
window.AITestService = AITestService;

document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if AI modules are loaded
    if (typeof AIHealthEngine !== 'undefined' || typeof AIHealingEngine !== 'undefined') {
        setTimeout(() => {
            AITestService.init();
        }, 2000); // Wait for other modules
    }
});
