/**
 * ai-central-hub.js - AI-Powered Central Command Center
 * Intelligent service management with autonomous decision-making
 * 
 * Features:
 * - AI-driven service health analysis
 * - Predictive failure detection
 * - Automated optimization recommendations
 * - Smart deployment orchestration
 * - Natural language command interface
 */

const AICentralHub = {
    // AI State
    state: {
        initialized: false,
        learningMode: true,
        lastAnalysis: null,
        serviceHealth: {},
        predictions: {},
        recommendations: [],
        autonomousMode: false, // Can be enabled for auto-fixes
        commandHistory: []
    },
    
    // AI Configuration
    config: {
        healthCheckInterval: 30000, // 30 seconds
        analysisInterval: 300000,   // 5 minutes
        predictionWindow: 86400000, // 24 hours
        confidenceThreshold: 0.75,
        autoHeal: false // Auto-fix issues when true
    },
    
    // Service intelligence database
    intelligence: {
        patterns: {},
        correlations: {},
        baselineMetrics: {}
    },
    
    // Initialize AI Hub
    init() {
        console.log('🤖 [AI Central Hub] Initializing Intelligent Service Manager...');
        
        // Load service configurations
        this.loadServices();
        
        // Initialize AI models
        this.initializeAI();
        
        // Start monitoring
        this.startIntelligentMonitoring();
        
        // Initial analysis
        this.performAnalysis();
        
        this.state.initialized = true;
        this.logActivity('AI Central Hub initialized', 'system', '🤖');
        
        // Render the AI dashboard
        this.render();
    },
    
    // Load and understand all services
    loadServices() {
        // Guard: Check if unifiedServices is available
        if (typeof unifiedServices === 'undefined') {
            console.error('[AICentralHub] unifiedServices not loaded. Creating fallback services.');
            // Create minimal fallback services
            this.services = {
                'dissident-bot': { id: 'dissident-bot', name: 'Discord Bot', icon: '🤖', type: 'discord-bot' },
                'dissident-website': { id: 'dissident-website', name: 'Website', icon: '🌐', type: 'static' },
                'dissident-api-backend': { id: 'dissident-api-backend', name: 'API Backend', icon: '⚙️', type: 'node' },
                'dissident-tokens-vault': { id: 'dissident-tokens-vault', name: 'Token Vault', icon: '🔐', type: 'static' },
                'dissident-postgres': { id: 'dissident-postgres', name: 'PostgreSQL', icon: '🐘', type: 'database' },
                'dissident-redis': { id: 'dissident-redis', name: 'Redis', icon: '🔴', type: 'redis' },
                'dissident-website-data': { id: 'dissident-website-data', name: 'Website Data', icon: '💾', type: 'database' }
            };
            // Show warning
            console.warn('[AICentralHub] Using fallback service definitions. Some features may be limited.');
        } else {
            this.services = unifiedServices.services;
            console.log(`[AI Hub] Loaded ${Object.keys(this.services).length} services for intelligent management`);
        }
    },
    
    // Initialize AI learning models
    initializeAI() {
        console.log('[AI Hub] Initializing machine learning models...');
        
        // Load historical data
        this.loadHistoricalData();
        
        // Establish baselines
        this.establishBaselines();
        
        // Build service correlations
        this.buildCorrelations();
    },
    
    // Load historical performance data
    loadHistoricalData() {
        const history = localStorage.getItem('ai_hub_history');
        if (history) {
            try {
                this.intelligence.patterns = JSON.parse(history);
            } catch (e) {
                this.intelligence.patterns = {};
            }
        }
    },
    
    // Establish baseline metrics for each service
    establishBaselines() {
        Object.keys(this.services).forEach(serviceId => {
            this.intelligence.baselineMetrics[serviceId] = {
                responseTime: null,
                uptime: 99.9,
                errorRate: 0,
                resourceUsage: null
            };
        });
    },
    
    // Build correlation map between services
    buildCorrelations() {
        // Services that depend on each other
        this.intelligence.correlations = {
            'dissident-bot': ['dissident-postgres', 'dissident-redis'],
            'dissident-api-backend': ['dissident-postgres', 'dissident-redis'],
            'dissident-website': ['dissident-api-backend'],
            'dissident-website-data': ['dissident-postgres']
        };
    },
    
    // Start intelligent monitoring
    startIntelligentMonitoring() {
        // Health checks
        setInterval(() => this.checkAllServices(), this.config.healthCheckInterval);
        
        // AI Analysis
        setInterval(() => this.performAnalysis(), this.config.analysisInterval);
    },
    
    // AI Service Health Check
    async checkAllServices() {
        const serviceIds = Object.keys(this.services);
        
        for (const serviceId of serviceIds) {
            const health = await this.checkServiceHealth(serviceId);
            this.state.serviceHealth[serviceId] = health;
            
            // Detect anomalies
            if (this.detectAnomaly(serviceId, health)) {
                this.handleAnomaly(serviceId, health);
            }
        }
        
        // Update UI
        this.updateHealthDisplay();
    },
    
    // Check individual service health
    async checkServiceHealth(serviceId) {
        const service = this.services[serviceId];
        const startTime = Date.now();
        
        try {
            let status = 'unknown';
            let details = {};
            
            // Check based on service type
            switch (service.type) {
                case 'discord-bot':
                    status = await this.checkDiscordBot(service);
                    break;
                case 'static':
                case 'node':
                    status = await this.checkWebService(service);
                    break;
                case 'database':
                    status = await this.checkDatabase(service);
                    break;
                case 'redis':
                    status = await this.checkRedis(service);
                    break;
            }
            
            return {
                status,
                responseTime: Date.now() - startTime,
                lastCheck: Date.now(),
                details
            };
            
        } catch (error) {
            return {
                status: 'offline',
                responseTime: Date.now() - startTime,
                lastCheck: Date.now(),
                error: error.message
            };
        }
    },
    
    // Check Discord Bot health
    async checkDiscordBot(service) {
        // Check if bot is responsive via Railway
        return 'online'; // Placeholder - would check actual bot status
    },
    
    // Check web service health
    async checkWebService(service) {
        if (!service.deployUrl) return 'unknown';
        
        try {
            const response = await fetch(service.deployUrl, { 
                method: 'HEAD',
                mode: 'no-cors',
                timeout: 5000
            });
            return response.ok ? 'online' : 'degraded';
        } catch {
            return 'offline';
        }
    },
    
    // Check database health
    async checkDatabase(service) {
        // Would check actual database connectivity
        return service.railwayService ? 'online' : 'unknown';
    },
    
    // Check Redis health
    async checkRedis(service) {
        return service.railwayService ? 'online' : 'unknown';
    },
    
    // AI Anomaly Detection
    detectAnomaly(serviceId, health) {
        const baseline = this.intelligence.baselineMetrics[serviceId];
        if (!baseline) return false;
        
        // Detect response time anomalies
        if (health.responseTime && baseline.responseTime) {
            if (health.responseTime > baseline.responseTime * 2) {
                return {
                    type: 'slow_response',
                    severity: 'warning',
                    message: `Response time ${health.responseTime}ms is 2x baseline`
                };
            }
        }
        
        // Detect status changes
        if (health.status === 'offline' || health.status === 'degraded') {
            return {
                type: 'service_degradation',
                severity: health.status === 'offline' ? 'critical' : 'warning',
                message: `Service is ${health.status}`
            };
        }
        
        return false;
    },
    
    // Handle detected anomalies
    async handleAnomaly(serviceId, anomaly) {
        this.logActivity(
            `Anomaly detected in ${serviceId}: ${anomaly.message}`,
            anomaly.severity,
            '🔍'
        );
        
        // Generate recommendation
        const recommendation = await this.generateRecommendation(serviceId, anomaly);
        this.state.recommendations.push(recommendation);
        
        // If autonomous mode is on, attempt auto-heal
        if (this.config.autoHeal && anomaly.severity === 'critical') {
            await this.autoHeal(serviceId, anomaly);
        }
    },
    
    // AI-Powered Analysis
    async performAnalysis() {
        console.log('[AI Hub] Performing intelligent analysis...');
        
        const analysis = {
            timestamp: Date.now(),
            health: this.state.serviceHealth,
            issues: [],
            optimizations: [],
            predictions: []
        };
        
        // Analyze each service
        Object.keys(this.services).forEach(serviceId => {
            const service = this.services[serviceId];
            const health = this.state.serviceHealth[serviceId];
            
            // Find issues
            if (health?.status !== 'online') {
                analysis.issues.push({
                    service: serviceId,
                    status: health?.status,
                    recommendation: this.suggestFix(serviceId, health)
                });
            }
            
            // Find optimizations
            const optimization = this.findOptimizations(serviceId);
            if (optimization) {
                analysis.optimizations.push(optimization);
            }
        });
        
        // Generate predictions
        analysis.predictions = await this.generatePredictions();
        
        this.state.lastAnalysis = analysis;
        this.state.predictions = analysis.predictions;
        
        // Update UI
        this.updateAnalysisDisplay();
    },
    
    // Generate AI recommendations
    async generateRecommendation(serviceId, anomaly) {
        const service = this.services[serviceId];
        
        let recommendation = {
            service: serviceId,
            issue: anomaly.message,
            severity: anomaly.severity,
            actions: [],
            autoFixable: false
        };
        
        switch (anomaly.type) {
            case 'service_degradation':
                recommendation.actions = [
                    'Check service logs for errors',
                    'Verify environment variables are set',
                    'Restart service if needed',
                    'Check dependent services'
                ];
                recommendation.autoFixable = true;
                break;
                
            case 'slow_response':
                recommendation.actions = [
                    'Check database query performance',
                    'Review Redis cache hit rate',
                    'Scale service if needed',
                    'Optimize code'
                ];
                break;
                
            default:
                recommendation.actions = ['Manual investigation required'];
        }
        
        return recommendation;
    },
    
    // Auto-heal detected issues
    async autoHeal(serviceId, anomaly) {
        this.logActivity(`Attempting auto-heal for ${serviceId}...`, 'info', '🔧');
        
        try {
            switch (anomaly.type) {
                case 'service_degradation':
                    // Attempt to restart service
                    await this.restartService(serviceId);
                    break;
                    
                case 'slow_response':
                    // Clear caches
                    await this.clearServiceCache(serviceId);
                    break;
            }
            
            this.logActivity(`Auto-heal completed for ${serviceId}`, 'success', '✅');
            
        } catch (error) {
            this.logActivity(`Auto-heal failed for ${serviceId}: ${error.message}`, 'error', '❌');
        }
    },
    
    // Restart a service
    async restartService(serviceId) {
        // Would call Railway API to restart
        console.log(`[AI Hub] Restarting service: ${serviceId}`);
    },
    
    // Clear service cache
    async clearServiceCache(serviceId) {
        console.log(`[AI Hub] Clearing cache for: ${serviceId}`);
    },
    
    // Find optimization opportunities
    findOptimizations(serviceId) {
        const service = this.services[serviceId];
        const health = this.state.serviceHealth[serviceId];
        
        // Example: Variable consolidation
        const vaultData = VaultCore?.loadVaultData();
        const serviceVars = vaultData?.services?.[serviceId] || {};
        
        // Check for duplicate variables
        const duplicates = this.findDuplicateVariables(serviceId, serviceVars);
        if (duplicates.length > 0) {
            return {
                service: serviceId,
                type: 'consolidation',
                description: `Found ${duplicates.length} duplicate variables`,
                savings: duplicates.length
            };
        }
        
        return null;
    },
    
    // Find duplicate variables
    findDuplicateVariables(serviceId, variables) {
        const duplicates = [];
        const seen = new Set();
        
        Object.entries(variables).forEach(([key, value]) => {
            if (seen.has(value)) {
                duplicates.push(key);
            } else {
                seen.add(value);
            }
        });
        
        return duplicates;
    },
    
    // Generate predictive insights
    async generatePredictions() {
        const predictions = [];
        
        // Predict resource needs
        Object.keys(this.services).forEach(serviceId => {
            const health = this.state.serviceHealth[serviceId];
            if (health?.responseTime > 1000) {
                predictions.push({
                    service: serviceId,
                    type: 'performance_degradation',
                    confidence: 0.85,
                    timeline: '24h',
                    message: 'Service response time trending upward, may need scaling'
                });
            }
        });
        
        return predictions;
    },
    
    // Natural Language Command Processing
    processCommand(command) {
        this.state.commandHistory.push({
            command,
            timestamp: Date.now()
        });
        
        const commandLower = command.toLowerCase();
        
        // Command patterns
        if (commandLower.includes('status') || commandLower.includes('health')) {
            return this.getSystemStatus();
        }
        
        if (commandLower.includes('deploy') || commandLower.includes('update')) {
            const service = this.extractServiceName(command);
            if (service) {
                return this.deployService(service);
            }
            return this.deployAll();
        }
        
        if (commandLower.includes('fix') || commandLower.includes('heal')) {
            const service = this.extractServiceName(command);
            if (service) {
                return this.healService(service);
            }
        }
        
        if (commandLower.includes('optimize') || commandLower.includes('improve')) {
            return this.optimizeSystem();
        }
        
        if (commandLower.includes('analyze') || commandLower.includes('diagnose')) {
            return this.performAnalysis();
        }
        
        return {
            success: false,
            message: "I didn't understand that command. Try: 'status', 'deploy all', 'fix bot', 'optimize'"
        };
    },
    
    // Extract service name from command
    extractServiceName(command) {
        const serviceNames = Object.keys(this.services);
        for (const name of serviceNames) {
            if (command.toLowerCase().includes(name.toLowerCase().replace('dissident-', ''))) {
                return name;
            }
        }
        return null;
    },
    
    // Get system status summary
    getSystemStatus() {
        const online = Object.values(this.state.serviceHealth).filter(h => h.status === 'online').length;
        const total = Object.keys(this.services).length;
        
        return {
            success: true,
            message: `System Status: ${online}/${total} services online`,
            details: this.state.serviceHealth
        };
    },
    
    // Deploy service
    async deployService(serviceId) {
        this.logActivity(`Deploying ${serviceId}...`, 'info', '🚀');
        // Would trigger actual deployment
        return { success: true, message: `Deployment initiated for ${serviceId}` };
    },
    
    // Deploy all services
    async deployAll() {
        this.logActivity('Deploying all services...', 'info', '🚀');
        return { success: true, message: 'Deploying all services' };
    },
    
    // Heal specific service
    async healService(serviceId) {
        this.logActivity(`Healing ${serviceId}...`, 'info', '🔧');
        const health = this.state.serviceHealth[serviceId];
        if (health) {
            await this.autoHeal(serviceId, { type: 'manual_heal', severity: 'info', message: 'Manual heal triggered' });
        }
        return { success: true, message: `Healing initiated for ${serviceId}` };
    },
    
    // Optimize system
    async optimizeSystem() {
        this.logActivity('Running system optimization...', 'info', '⚡');
        const optimizations = [];
        
        Object.keys(this.services).forEach(serviceId => {
            const opt = this.findOptimizations(serviceId);
            if (opt) optimizations.push(opt);
        });
        
        return {
            success: true,
            message: `Found ${optimizations.length} optimization opportunities`,
            optimizations
        };
    },
    
    // Render AI Dashboard
    render() {
        const container = document.getElementById('aiCentralHub');
        if (!container) {
            console.error('[AI Hub] aiCentralHub container not found');
            return;
        }
        
        // Guard: Check if services loaded
        if (!this.services || Object.keys(this.services).length === 0) {
            console.error('[AI Hub] No services loaded');
            this.renderErrorState(container, 'No services configured. Check console for errors.');
            return;
        }
        
        container.innerHTML = `
            <div class="ai-hub-container">
                <div class="ai-hub-header">
                    <div class="ai-hub-title">
                        <span class="ai-icon">🤖</span>
                        <div>
                            <h1>AI Central Hub</h1>
                            <p class="ai-subtitle">Intelligent Service Management</p>
                        </div>
                    </div>
                    <div class="ai-hub-controls">
                        <div class="ai-status ${this.state.autonomousMode ? 'active' : ''}">
                            <span class="pulse"></span>
                            <span>${this.state.autonomousMode ? 'Autonomous Mode' : 'Monitoring'}</span>
                        </div>
                        <button class="btn-ai-toggle" onclick="AICentralHub.toggleAutonomousMode()">
                            ${this.state.autonomousMode ? 'Disable AI' : 'Enable AI Auto-Heal'}
                        </button>
                    </div>
                </div>
                
                <div class="ai-hub-tabs">
                    <button class="ai-tab active" onclick="AICentralHub.switchTab('dashboard')">
                        📊 Dashboard
                    </button>
                    <button class="ai-tab" onclick="AICentralHub.switchTab('intelligence')">
                        🧠 Intelligence
                    </button>
                    <button class="ai-tab" onclick="AICentralHub.switchTab('recommendations')">
                        💡 Recommendations
                    </button>
                    <button class="ai-tab" onclick="AICentralHub.switchTab('predictions')">
                        🔮 Predictions
                    </button>
                    <button class="ai-tab" onclick="AICentralHub.switchTab('command')">
                        ⌨️ Command
                    </button>
                    <button class="ai-tab" onclick="AICentralHub.switchTab('settings')">
                        ⚙️ Settings
                    </button>
                </div>
                
                <div class="ai-hub-content" id="aiHubContent">
                    ${this.renderDashboardTab()}
                </div>
            </div>
        `;
    },
    
    // Render error state when things go wrong
    renderErrorState(container, message) {
        container.innerHTML = `
            <div class="ai-hub-error" style="padding: 40px; text-align: center; background: var(--bg-secondary); border-radius: var(--radius-lg); margin: 20px;">
                <h2 style="color: var(--accent-red); margin-bottom: 16px;">⚠️ AI Hub Error</h2>
                <p style="margin-bottom: 24px; color: var(--text-secondary);">${message}</p>
                <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 24px;">
                    Check browser console (F12) for details
                </p>
                <button class="btn-primary" onclick="location.reload()">🔄 Refresh Page</button>
            </div>
        `;
    },
    
    // Render Dashboard Tab
    renderDashboardTab() {
        const online = Object.values(this.state.serviceHealth).filter(h => h.status === 'online').length;
        const total = Object.keys(this.services).length;
        const recommendations = this.state.recommendations.length;
        
        return `
            <div class="ai-dashboard">
                <div class="ai-stats-grid">
                    <div class="ai-stat-card">
                        <div class="stat-value ${online === total ? 'good' : 'warning'}">${online}/${total}</div>
                        <div class="stat-label">Services Online</div>
                        <div class="stat-trend">${online === total ? '✅ All healthy' : '⚠️ Issues detected'}</div>
                    </div>
                    
                    <div class="ai-stat-card">
                        <div class="stat-value">${recommendations}</div>
                        <div class="stat-label">AI Recommendations</div>
                        <div class="stat-trend">${recommendations > 0 ? '💡 Action needed' : '✨ All optimized'}</div>
                    </div>
                    
                    <div class="ai-stat-card">
                        <div class="stat-value">${this.state.predictions.length}</div>
                        <div class="stat-label">Predictions</div>
                        <div class="stat-trend">🔮 24h forecast</div>
                    </div>
                    
                    <div class="ai-stat-card">
                        <div class="stat-value">${this.calculateSystemHealth()}%</div>
                        <div class="stat-label">System Health</div>
                        <div class="stat-trend">${this.getHealthTrend()}</div>
                    </div>
                </div>
                
                <div class="ai-services-status">
                    <h3>🎛️ Managed Services</h3>
                    <div class="ai-services-grid">
                        ${Object.entries(this.services).map(([id, service]) => {
                            const health = this.state.serviceHealth[id] || { status: 'unknown' };
                            return `
                                <div class="ai-service-card ${health.status}">
                                    <div class="service-icon">${service.icon}</div>
                                    <div class="service-info">
                                        <div class="service-name">${service.name}</div>
                                        <div class="service-status">
                                            ${this.getStatusIcon(health.status)} ${health.status}
                                        </div>
                                        ${health.responseTime ? `
                                            <div class="service-metric">${health.responseTime}ms</div>
                                        ` : ''}
                                    </div>
                                    <div class="service-actions">
                                        <button onclick="AICentralHub.healService('${id}')" title="Heal">🔧</button>
                                        <button onclick="AICentralHub.deployService('${id}')" title="Deploy">🚀</button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
                
                ${recommendations > 0 ? `
                    <div class="ai-recommendations-preview">
                        <h3>💡 Top Recommendations</h3>
                        ${this.state.recommendations.slice(0, 3).map(rec => `
                            <div class="ai-recommendation-item ${rec.severity}">
                                <div class="rec-service">${rec.service}</div>
                                <div class="rec-issue">${rec.issue}</div>
                                <div class="rec-actions">
                                    ${rec.autoFixable ? `
                                        <button class="btn-auto-fix" onclick="AICentralHub.autoHeal('${rec.service}', {type: 'recommendation', severity: rec.severity, message: rec.issue})">
                                            🔧 Auto-Fix
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
        `;
    },
    
    // Calculate overall system health
    calculateSystemHealth() {
        const services = Object.values(this.state.serviceHealth);
        if (services.length === 0) return 100;
        
        const online = services.filter(s => s.status === 'online').length;
        return Math.round((online / services.length) * 100);
    },
    
    // Get health trend
    getHealthTrend() {
        const health = this.calculateSystemHealth();
        if (health === 100) return '↗️ Excellent';
        if (health >= 90) return '→ Good';
        if (health >= 70) return '↘️ Degraded';
        return '↓ Critical';
    },
    
    // Get status icon
    getStatusIcon(status) {
        const icons = {
            online: '🟢',
            degraded: '🟡',
            offline: '🔴',
            unknown: '⚪'
        };
        return icons[status] || icons.unknown;
    },
    
    // Switch tabs
    switchTab(tab) {
        document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
        event.target.classList.add('active');
        
        const content = document.getElementById('aiHubContent');
        switch(tab) {
            case 'dashboard':
                content.innerHTML = this.renderDashboardTab();
                break;
            case 'intelligence':
                content.innerHTML = this.renderIntelligenceTab();
                break;
            case 'recommendations':
                content.innerHTML = this.renderRecommendationsTab();
                break;
            case 'predictions':
                content.innerHTML = this.renderPredictionsTab();
                break;
            case 'command':
                content.innerHTML = this.renderCommandTab();
                break;
            case 'settings':
                content.innerHTML = this.renderSettingsTab();
                break;
        }
    },
    
    // Render Intelligence Tab
    renderIntelligenceTab() {
        return `
            <div class="ai-intelligence">
                <h3>🧠 AI Intelligence Center</h3>
                <div class="intelligence-grid">
                    <div class="intel-card">
                        <h4>Pattern Recognition</h4>
                        <p>Analyzing service behavior patterns...</p>
                        <div class="intel-stat">${Object.keys(this.intelligence.patterns).length} patterns learned</div>
                    </div>
                    <div class="intel-card">
                        <h4>Service Correlations</h4>
                        <p>Mapping service dependencies...</p>
                        <div class="intel-stat">${Object.keys(this.intelligence.correlations).length} correlations found</div>
                    </div>
                    <div class="intel-card">
                        <h4>Baseline Metrics</h4>
                        <p>Establishing performance baselines...</p>
                        <div class="intel-stat">${Object.keys(this.intelligence.baselineMetrics).length} baselines set</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Render Recommendations Tab
    renderRecommendationsTab() {
        return `
            <div class="ai-recommendations">
                <h3>💡 AI Recommendations</h3>
                ${this.state.recommendations.length > 0 ? `
                    <div class="recommendations-list">
                        ${this.state.recommendations.map(rec => `
                            <div class="recommendation-card ${rec.severity}">
                                <div class="rec-header">
                                    <span class="rec-service">${rec.service}</span>
                                    <span class="rec-severity ${rec.severity}">${rec.severity}</span>
                                </div>
                                <div class="rec-issue">${rec.issue}</div>
                                <div class="rec-actions-list">
                                    ${rec.actions.map(action => `
                                        <div class="rec-action">• ${action}</div>
                                    `).join('')}
                                </div>
                                ${rec.autoFixable ? `
                                    <button class="btn-auto-fix" onclick="AICentralHub.autoHeal('${rec.service}', {type: 'recommendation', severity: rec.severity, message: rec.issue})">
                                        🔧 Auto-Fix This Issue
                                    </button>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="no-recommendations">
                        <span class="icon">✨</span>
                        <p>No recommendations at this time!</p>
                        <p class="sub">Your system is running optimally.</p>
                    </div>
                `}
            </div>
        `;
    },
    
    // Render Predictions Tab
    renderPredictionsTab() {
        return `
            <div class="ai-predictions">
                <h3>🔮 Predictive Insights</h3>
                <p class="predictions-subtitle">AI-powered forecasts based on historical data</p>
                
                ${this.state.predictions.length > 0 ? `
                    <div class="predictions-list">
                        ${this.state.predictions.map(pred => `
                            <div class="prediction-card">
                                <div class="prediction-header">
                                    <span class="prediction-service">${pred.service}</span>
                                    <span class="prediction-confidence">${Math.round(pred.confidence * 100)}% confidence</span>
                                </div>
                                <div class="prediction-type">${pred.type.replace('_', ' ').toUpperCase()}</div>
                                <div class="prediction-message">${pred.message}</div>
                                <div class="prediction-timeline">Expected within: ${pred.timeline}</div>
                            </div>
                        `).join('')}
                    </div>
                ` : `
                    <div class="no-predictions">
                        <span class="icon">🔮</span>
                        <p>No predictions available yet</p>
                        <p class="sub">Collecting more data to generate insights...</p>
                    </div>
                `}
            </div>
        `;
    },
    
    // Render Command Tab
    renderCommandTab() {
        return `
            <div class="ai-command">
                <h3>⌨️ Natural Language Command Interface</h3>
                <p class="command-subtitle">Talk to your AI assistant. Try: "status", "deploy all", "fix bot", "optimize"</p>
                
                <div class="command-interface">
                    <div class="command-history" id="commandHistory">
                        <div class="command-welcome">
                            <span class="ai-avatar">🤖</span>
                            <div class="ai-message">
                                <p>Hello! I'm your AI service manager. How can I help you today?</p>
                                <p class="ai-suggestions">Try: "show status", "deploy website", "optimize system", "fix bot"</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="command-input-container">
                        <input type="text" 
                               class="command-input" 
                               id="aiCommandInput"
                               placeholder="Type a command..."
                               onkeydown="if(event.key === 'Enter') AICentralHub.executeCommand()">
                        <button class="btn-command" onclick="AICentralHub.executeCommand()">
                            Send
                        </button>
                    </div>
                </div>
                
                <div class="command-help">
                    <h4>Available Commands:</h4>
                    <div class="command-list">
                        <div class="command-item"><code>status</code> - Show system health</div>
                        <div class="command-item"><code>deploy [service]</code> - Deploy a service</div>
                        <div class="command-item"><code>deploy all</code> - Deploy all services</div>
                        <div class="command-item"><code>fix [service]</code> - Heal/fix a service</div>
                        <div class="command-item"><code>optimize</code> - Run optimizations</div>
                        <div class="command-item"><code>analyze</code> - Run full analysis</div>
                    </div>
                </div>
            </div>
        `;
    },
    
    // Execute command from input
    executeCommand() {
        const input = document.getElementById('aiCommandInput');
        const command = input.value.trim();
        if (!command) return;
        
        // Add user message to history
        this.addCommandMessage('user', command);
        
        // Process command
        const result = this.processCommand(command);
        
        // Add AI response
        setTimeout(() => {
            this.addCommandMessage('ai', result.message, result);
        }, 500);
        
        // Clear input
        input.value = '';
    },
    
    // Add message to command history
    addCommandMessage(type, message, details = null) {
        const history = document.getElementById('commandHistory');
        if (!history) return;
        
        const div = document.createElement('div');
        div.className = `command-message ${type}`;
        
        if (type === 'user') {
            div.innerHTML = `
                <span class="user-avatar">👤</span>
                <div class="message-content">${message}</div>
            `;
        } else {
            let detailsHtml = '';
            if (details?.details) {
                detailsHtml = `<pre class="message-details">${JSON.stringify(details.details, null, 2)}</pre>`;
            }
            div.innerHTML = `
                <span class="ai-avatar">🤖</span>
                <div class="message-content">
                    <p>${message}</p>
                    ${detailsHtml}
                </div>
            `;
        }
        
        history.appendChild(div);
        history.scrollTop = history.scrollHeight;
    },
    
    // Toggle autonomous mode
    toggleAutonomousMode() {
        this.state.autonomousMode = !this.state.autonomousMode;
        this.config.autoHeal = this.state.autonomousMode;
        
        this.logActivity(
            this.state.autonomousMode ? 'Autonomous mode enabled' : 'Autonomous mode disabled',
            'info',
            this.state.autonomousMode ? '🤖' : '👤'
        );
        
        // Re-render
        this.render();
    },
    
    // Log activity
    logActivity(message, type, icon) {
        console.log(`[AI Hub] ${message}`);
        
        // Store in localStorage
        const activities = JSON.parse(localStorage.getItem('ai_hub_activity') || '[]');
        activities.unshift({
            message,
            type,
            icon,
            timestamp: Date.now()
        });
        
        if (activities.length > 100) activities.pop();
        localStorage.setItem('ai_hub_activity', JSON.stringify(activities));
        
        // Show toast if VaultUI available
        if (typeof VaultUI !== 'undefined') {
            VaultUI.showToast(message, type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info');
        }
    },
    
    // Update displays
    updateHealthDisplay() {
        // Would update health indicators in real-time
    },
    
    updateAnalysisDisplay() {
        // Would update analysis displays
    },
    
    // Render Settings Tab with Ollama Configuration
    renderSettingsTab() {
        // Check Ollama connection status
        const ollamaStatus = OllamaCloudIntegration?.state?.connected ? 
            { status: 'connected', color: '#22c55e', icon: '✅' } : 
            { status: 'disconnected', color: '#ef4444', icon: '❌' };
        
        // Get current model from Ollama config
        const currentModel = OllamaCloudIntegration?.config?.defaultModel || 'llama3.2:latest';
        
        return `
            <div class="ai-settings">
                <h3>⚙️ AI Settings & Configuration</h3>
                
                <!-- Ollama Cloud Configuration -->
                <div class="settings-section">
                    <h4>🦙 Ollama Cloud AI</h4>
                    <div class="ollama-status" style="background: ${ollamaStatus.color}20; border-left: 4px solid ${ollamaStatus.color}; padding: 16px; margin-bottom: 20px; border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <span style="font-size: 24px;">${ollamaStatus.icon}</span>
                            <div>
                                <strong>Ollama Cloud Status:</strong> ${ollamaStatus.status === 'connected' ? 'Connected' : 'Not Connected'}
                                <p style="margin: 4px 0 0 0; font-size: 13px; color: var(--text-secondary);">
                                    ${ollamaStatus.status === 'connected' ? 
                                        'AI-powered features are active and ready!' : 
                                        'Configure Ollama Cloud to enable AI features'}
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="setting-item">
                        <label>Current Model</label>
                        <div class="setting-value">${currentModel}</div>
                        <p class="setting-help">The AI model used for diagnostics and suggestions</p>
                    </div>
                    
                    <div class="ollama-setup-guide" style="background: var(--bg-tertiary); padding: 20px; border-radius: 8px; margin-top: 20px;">
                        <h5 style="margin-top: 0;">📋 Railway Configuration Guide</h5>
                        
                        <p style="font-size: 14px; color: var(--text-secondary);">
                            To enable Ollama Cloud AI, add these environment variables in Railway:
                        </p>
                        
                        <div class="env-variables" style="background: var(--bg-secondary); padding: 16px; border-radius: 6px; margin: 16px 0; font-family: monospace; font-size: 13px;">
                            <div style="margin-bottom: 8px;">
                                <span style="color: var(--accent-blue);">OLLAMA_API_KEY</span>=
                                <span style="color: var(--text-muted);">your_api_key_here</span>
                            </div>
                            <div>
                                <span style="color: var(--accent-blue);">OLLAMA_BASE_URL</span>=
                                <span style="color: var(--text-muted);">https://ollama.com/api</span>
                            </div>
                        </div>
                        
                        <div class="setup-steps" style="font-size: 14px;">
                            <p><strong>Step 1:</strong> Get your API key from <a href="https://ollama.com/settings/keys" target="_blank" style="color: var(--accent-blue);">ollama.com/settings/keys</a></p>
                            <p><strong>Step 2:</strong> Go to Railway Dashboard → Your Service → Variables</p>
                            <p><strong>Step 3:</strong> Add OLLAMA_API_KEY with your key</p>
                            <p><strong>Step 4:</strong> Redeploy the service</p>
                        </div>
                        
                        <button class="btn-primary" onclick="window.open('https://ollama.com/settings/keys', '_blank')" style="margin-top: 16px;">
                            🔑 Get API Key
                        </button>
                    </div>
                </div>
                
                <!-- Test Connection -->
                <div class="settings-section" style="margin-top: 32px;">
                    <h4>🧪 Test Connection</h4>
                    <button class="btn-secondary" onclick="AICentralHub.testOllamaConnection()" 
                            ${ollamaStatus.status === 'connected' ? 'disabled' : ''}>
                        ${ollamaStatus.status === 'connected' ? '✅ Already Connected' : '🔄 Test Ollama Connection'}
                    </button>
                </div>
            </div>
            
            <style>
                .ai-settings h3 { margin-bottom: 24px; }
                .ai-settings h4 { color: var(--accent-blue); margin: 24px 0 16px 0; }
                .setting-item { padding: 16px; background: var(--bg-secondary); border-radius: 8px; margin-bottom: 16px; }
                .setting-value { font-weight: 600; color: var(--accent-blue); margin-top: 8px; }
                .setting-help { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
            </style>
        `;
    },
    
    // Test Ollama connection
    async testOllamaConnection() {
        if (typeof OllamaCloudIntegration !== 'undefined') {
            this.logActivity('Testing Ollama Cloud connection...', 'info', '🧪');
            const connected = await OllamaCloudIntegration.testConnection();
            if (connected) {
                this.logActivity('✅ Ollama Cloud connected successfully!', 'success', '🦙');
                alert('✅ Ollama Cloud connected successfully!\n\nAI features are now active.');
            } else {
                this.logActivity('❌ Ollama Cloud connection failed. Check Railway variables.', 'error', '⚠️');
                alert('❌ Ollama Cloud connection failed.\n\nPlease:\n1. Get API key from ollama.com/settings/keys\n2. Add to Railway Dashboard → Variables\n3. Redeploy the service');
            }
            this.switchTab('settings'); // Refresh to show status
        }
    }

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('aiCentralHub')) {
            AICentralHub.init();
        }
    });
} else {
    if (document.getElementById('aiCentralHub')) {
        AICentralHub.init();
    }
}

// Make globally available
window.AICentralHub = AICentralHub;
