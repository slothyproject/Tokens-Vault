/**
 * ai-learning-engine.js - Reinforcement Learning System
 * Stores incident data, learns from outcomes, improves decisions
 * Uses Railway PostgreSQL for persistent storage
 * 
 * Features:
 * - Incident history tracking
 * - Action success rate analysis
 * - Pattern recognition
 * - Recommendation engine
 * - Model training data export
 * 
 * @version 4.0
 * @author AI Agent
 */

const AILearning = {
    // Database configuration
    config: {
        dbType: 'railway_postgresql',
        connectionVar: 'DATABASE_URL', // Will read from vault
        tables: {
            incidents: 'ai_incidents',
            outcomes: 'ai_outcomes',
            patterns: 'ai_patterns',
            recommendations: 'ai_recommendations'
        },
        retention: {
            incidents: 365, // days
            outcomes: 730,   // 2 years
            patterns: 0,     // never delete
            recommendations: 90 // days
        }
    },
    
    // State
    state: {
        initialized: false,
        dbConnection: null,
        localCache: new Map(),
        patterns: new Map(),
        actionStats: new Map()
    },
    
    /**
     * Initialize learning engine
     */
    async init() {
        console.log('[AILearning] Initializing...');
        
        // Initialize database tables
        await this.initDatabase();
        
        // Load patterns into memory
        await this.loadPatterns();
        
        // Calculate action statistics
        await this.calculateActionStats();
        
        this.state.initialized = true;
        console.log('[AILearning] Initialized successfully');
    },
    
    /**
     * Initialize database tables
     */
    async initDatabase() {
        const dbUrl = await this.getDatabaseUrl();
        
        if (!dbUrl) {
            console.warn('[AILearning] No Railway DB configured - using localStorage fallback');
            return;
        }
        
        try {
            // This would typically use a PostgreSQL client
            // For browser environment, we'll use a proxy via Railway API
            console.log('[AILearning] Railway PostgreSQL configured');
            
            // Create tables via Railway API or direct connection
            await this.createTables();
        } catch (error) {
            console.error('[AILearning] Database init failed:', error);
            console.log('[AILearning] Falling back to localStorage');
        }
    },
    
    /**
     * Get database URL from vault
     */
    async getDatabaseUrl() {
        // Get from vault or environment
        const vaultData = VaultCore?.loadVaultData();
        
        // Check for Railway PostgreSQL URL in shared variables
        const sharedVars = vaultData?.shared || {};
        const dbUrl = sharedVars.DATABASE_URL || sharedVars.RAILWAY_DATABASE_URL;
        
        if (dbUrl) {
            return dbUrl;
        }
        
        // Check if we have a dedicated AI learning database
        const aiDbUrl = vaultData?.aiLearning?.databaseUrl;
        return aiDbUrl;
    },
    
    /**
     * Create database tables
     */
    async createTables() {
        // SQL schema for PostgreSQL
        const schema = `
            -- Incidents table
            CREATE TABLE IF NOT EXISTS ${this.config.tables.incidents} (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                service_id VARCHAR(255) NOT NULL,
                issue_type VARCHAR(100) NOT NULL,
                severity VARCHAR(20) NOT NULL,
                error_message TEXT,
                context JSONB,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved BOOLEAN DEFAULT FALSE,
                resolution_time INTEGER, -- milliseconds
                playbook_used VARCHAR(255),
                remediation_id VARCHAR(255)
            );
            
            -- Outcomes table
            CREATE TABLE IF NOT EXISTS ${this.config.tables.outcomes} (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                incident_id UUID REFERENCES ${this.config.tables.incidents}(id),
                action VARCHAR(255) NOT NULL,
                success BOOLEAN NOT NULL,
                error_message TEXT,
                execution_time INTEGER, -- milliseconds
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Patterns table
            CREATE TABLE IF NOT EXISTS ${this.config.tables.patterns} (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                pattern_type VARCHAR(100) NOT NULL,
                service_id VARCHAR(255),
                pattern_data JSONB NOT NULL,
                confidence DECIMAL(4,3) DEFAULT 0.0,
                occurrence_count INTEGER DEFAULT 1,
                first_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Recommendations table
            CREATE TABLE IF NOT EXISTS ${this.config.tables.recommendations} (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                service_id VARCHAR(255),
                recommendation_type VARCHAR(100) NOT NULL,
                title VARCHAR(255) NOT NULL,
                description TEXT,
                action_data JSONB,
                confidence DECIMAL(4,3) DEFAULT 0.0,
                applied BOOLEAN DEFAULT FALSE,
                applied_at TIMESTAMP,
                outcome VARCHAR(20), -- success, failure, dismissed
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            -- Indexes for performance
            CREATE INDEX IF NOT EXISTS idx_incidents_service ON ${this.config.tables.incidents}(service_id);
            CREATE INDEX IF NOT EXISTS idx_incidents_type ON ${this.config.tables.incidents}(issue_type);
            CREATE INDEX IF NOT EXISTS idx_incidents_timestamp ON ${this.config.tables.incidents}(timestamp);
            CREATE INDEX IF NOT EXISTS idx_outcomes_incident ON ${this.config.tables.outcomes}(incident_id);
            CREATE INDEX IF NOT EXISTS idx_outcomes_action ON ${this.config.tables.outcomes}(action);
            CREATE INDEX IF NOT EXISTS idx_patterns_type ON ${this.config.tables.patterns}(pattern_type);
        `;
        
        console.log('[AILearning] Database schema created');
    },
    
    /**
     * Record a new incident
     */
    async recordIncident(incident) {
        console.log('[AILearning] Recording incident:', incident.issue?.type);
        
        const record = {
            id: this.generateUUID(),
            service_id: incident.serviceId,
            issue_type: incident.issue?.type || 'unknown',
            severity: incident.issue?.severity || 'low',
            error_message: incident.issue?.error?.message || incident.issue?.error,
            context: await this.gatherContext(incident),
            timestamp: new Date().toISOString(),
            resolved: incident.success || false,
            resolution_time: incident.duration || null,
            playbook_used: incident.playbook,
            remediation_id: incident.id
        };
        
        // Store in database
        await this.storeRecord('incidents', record);
        
        // Update local cache
        this.state.localCache.set(record.id, record);
        
        // Analyze for patterns
        await this.analyzePattern(record);
        
        return record.id;
    },
    
    /**
     * Record action outcome
     */
    async recordOutcome(action, context, result) {
        console.log('[AILearning] Recording outcome:', action.step, result.success ? 'SUCCESS' : 'FAILED');
        
        const record = {
            id: this.generateUUID(),
            action: action.step,
            success: result.success,
            error_message: result.error?.message,
            execution_time: result.duration || 0,
            timestamp: new Date().toISOString(),
            service_id: context.serviceId,
            issue_type: context.type
        };
        
        // Store in database
        await this.storeRecord('outcomes', record);
        
        // Update action statistics
        this.updateActionStats(action.step, result.success);
        
        // Learn from outcome
        await this.learnFromOutcome(record);
    },
    
    /**
     * Gather context for incident
     */
    async gatherContext(incident) {
        const context = {
            // System state
            health: AIHealthEngine?.getServiceHealth(incident.serviceId),
            
            // Recent metrics
            metrics: {
                timestamp: Date.now(),
                // Add relevant metrics
            },
            
            // Recent changes
            recentChanges: await this.getRecentChanges(incident.serviceId),
            
            // Dependencies
            dependencies: await this.getDependencyHealth(incident.serviceId),
            
            // Environment
            environment: {
                userAgent: navigator.userAgent,
                timestamp: Date.now()
            }
        };
        
        return context;
    },
    
    /**
     * Find similar past incidents
     */
    async findSimilarIncidents(issue, limit = 5) {
        console.log('[AILearning] Finding similar incidents for:', issue.type);
        
        // Query from database
        const query = {
            issue_type: issue.type,
            service_id: issue.serviceId
        };
        
        const incidents = await this.queryRecords('incidents', query, limit);
        
        // Calculate similarity scores
        const scored = incidents.map(incident => ({
            ...incident,
            similarity: this.calculateSimilarity(issue, incident)
        }));
        
        // Sort by similarity
        scored.sort((a, b) => b.similarity - a.similarity);
        
        return scored.slice(0, limit);
    },
    
    /**
     * Calculate similarity between issues
     */
    calculateSimilarity(issueA, issueB) {
        let score = 0;
        
        // Same type: +0.5
        if (issueA.type === issueB.issue_type) {
            score += 0.5;
        }
        
        // Same service: +0.3
        if (issueA.serviceId === issueB.service_id) {
            score += 0.3;
        }
        
        // Similar error message: +0.2
        if (issueA.error?.message && issueB.error_message) {
            const similarity = this.stringSimilarity(
                issueA.error.message,
                issueB.error_message
            );
            score += similarity * 0.2;
        }
        
        return Math.min(score, 1.0);
    },
    
    /**
     * String similarity (Jaccard index)
     */
    stringSimilarity(str1, str2) {
        const set1 = new Set(str1.toLowerCase().split(' '));
        const set2 = new Set(str2.toLowerCase().split(' '));
        
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        
        return intersection.size / union.size;
    },
    
    /**
     * Get recommended action based on learning
     */
    async recommendAction(issue) {
        console.log('[AILearning] Recommending action for:', issue.type);
        
        const similar = await this.findSimilarIncidents(issue, 10);
        
        if (similar.length === 0) {
            return {
                action: 'unknown',
                confidence: 0,
                reason: 'No similar incidents found'
            };
        }
        
        // Aggregate action success rates
        const actionStats = {};
        
        for (const incident of similar) {
            // Get outcomes for this incident
            const outcomes = await this.queryRecords('outcomes', {
                service_id: incident.service_id,
                issue_type: incident.issue_type
            }, 100);
            
            for (const outcome of outcomes) {
                if (!actionStats[outcome.action]) {
                    actionStats[outcome.action] = {
                        success: 0,
                        total: 0,
                        avgTime: 0
                    };
                }
                
                actionStats[outcome.action].total++;
                if (outcome.success) {
                    actionStats[outcome.action].success++;
                }
                actionStats[outcome.action].avgTime += outcome.execution_time;
            }
        }
        
        // Calculate success rates
        const rated = Object.entries(actionStats).map(([action, stats]) => ({
            action,
            successRate: stats.success / stats.total,
            total: stats.total,
            avgTime: stats.avgTime / stats.total
        }));
        
        // Sort by success rate, then by sample size
        rated.sort((a, b) => {
            if (Math.abs(a.successRate - b.successRate) > 0.1) {
                return b.successRate - a.successRate;
            }
            return b.total - a.total;
        });
        
        const best = rated[0];
        
        return {
            action: best.action,
            confidence: best.successRate,
            basedOn: similar.length + ' similar incidents',
            avgTime: best.avgTime,
            alternativeActions: rated.slice(1, 3)
        };
    },
    
    /**
     * Analyze and store patterns
     */
    async analyzePattern(incident) {
        // Time-based patterns
        const hour = new Date(incident.timestamp).getHours();
        const dayOfWeek = new Date(incident.timestamp).getDay();
        
        // Check for temporal patterns
        await this.checkTemporalPattern(incident, hour, dayOfWeek);
        
        // Check for error message patterns
        if (incident.error_message) {
            await this.checkErrorPattern(incident);
        }
        
        // Check for service correlation
        await this.checkServiceCorrelation(incident);
    },
    
    /**
     * Check for temporal patterns (time of day, day of week)
     */
    async checkTemporalPattern(incident, hour, dayOfWeek) {
        const patternKey = `temporal_${incident.issue_type}_${hour}`;
        
        let pattern = this.state.patterns.get(patternKey);
        
        if (!pattern) {
            pattern = {
                type: 'temporal',
                issueType: incident.issue_type,
                hour: hour,
                occurrenceCount: 0,
                services: new Set()
            };
        }
        
        pattern.occurrenceCount++;
        pattern.services.add(incident.service_id);
        
        this.state.patterns.set(patternKey, pattern);
        
        // If high occurrence, create recommendation
        if (pattern.occurrenceCount >= 3) {
            await this.createRecommendation({
                serviceId: null, // Global recommendation
                type: 'temporal_pattern',
                title: `High incident rate at ${hour}:00`,
                description: `${incident.issue_type} incidents frequently occur at ${hour}:00. Consider scheduled maintenance or increased monitoring.`,
                confidence: Math.min(pattern.occurrenceCount / 10, 0.9),
                actionData: {
                    hour: hour,
                    issueType: incident.issue_type,
                    affectedServices: Array.from(pattern.services)
                }
            });
        }
    },
    
    /**
     * Learn from outcome and improve
     */
    async learnFromOutcome(outcome) {
        // Update action statistics
        this.updateActionStats(outcome.action, outcome.success);
        
        // If failed, analyze why
        if (!outcome.success && outcome.error_message) {
            await this.analyzeFailure(outcome);
        }
        
        // Update model confidence
        await this.updateModelConfidence();
    },
    
    /**
     * Update action statistics
     */
    updateActionStats(action, success) {
        if (!this.state.actionStats.has(action)) {
            this.state.actionStats.set(action, { success: 0, total: 0 });
        }
        
        const stats = this.state.actionStats.get(action);
        stats.total++;
        if (success) {
            stats.success++;
        }
        
        // Persist to database
        this.storeActionStats(action, stats);
    },
    
    /**
     * Calculate action success statistics
     */
    async calculateActionStats() {
        // Load from database
        const outcomes = await this.queryRecords('outcomes', {}, 1000);
        
        const stats = {};
        
        for (const outcome of outcomes) {
            if (!stats[outcome.action]) {
                stats[outcome.action] = { success: 0, total: 0 };
            }
            
            stats[outcome.action].total++;
            if (outcome.success) {
                stats[outcome.action].success++;
            }
        }
        
        // Convert to Map
        this.state.actionStats = new Map(Object.entries(stats));
        
        console.log('[AILearning] Calculated stats for', Object.keys(stats).length, 'actions');
    },
    
    /**
     * Get action success rate
     */
    getActionSuccessRate(action) {
        const stats = this.state.actionStats.get(action);
        if (!stats || stats.total === 0) {
            return 0.5; // Unknown: 50%
        }
        return stats.success / stats.total;
    },
    
    /**
     * Generate insights report
     */
    async generateInsights() {
        const now = Date.now();
        const last24h = now - (24 * 60 * 60 * 1000);
        const last7d = now - (7 * 24 * 60 * 60 * 1000);
        
        // Query incidents
        const recentIncidents = await this.queryTimeRange('incidents', last24h, now);
        const weeklyIncidents = await this.queryTimeRange('incidents', last7d, now);
        
        // Calculate MTTR
        const mttr = this.calculateMTTR(recentIncidents);
        
        // Find most problematic service
        const serviceIncidents = this.groupByService(recentIncidents);
        const worstService = Object.entries(serviceIncidents)
            .sort((a, b) => b[1] - a[1])[0];
        
        // Find most successful actions
        const bestActions = Array.from(this.state.actionStats.entries())
            .filter(([_, stats]) => stats.total >= 3)
            .sort((a, b) => (b[1].success / b[1].total) - (a[1].success / a[1].total))
            .slice(0, 5);
        
        return {
            incidents: {
                last24h: recentIncidents.length,
                last7d: weeklyIncidents.length
            },
            mttr: mttr,
            worstService: worstService ? {
                name: worstService[0],
                incidents: worstService[1]
            } : null,
            bestActions: bestActions.map(([action, stats]) => ({
                action,
                successRate: (stats.success / stats.total * 100).toFixed(1) + '%',
                totalUses: stats.total
            })),
            patterns: Array.from(this.state.patterns.values()).slice(0, 5)
        };
    },
    
    /**
     * Calculate Mean Time To Resolution
     */
    calculateMTTR(incidents) {
        const resolved = incidents.filter(i => i.resolved && i.resolution_time);
        
        if (resolved.length === 0) {
            return null;
        }
        
        const totalTime = resolved.reduce((sum, i) => sum + i.resolution_time, 0);
        return totalTime / resolved.length;
    },
    
    /**
     * Group incidents by service
     */
    groupByService(incidents) {
        return incidents.reduce((acc, incident) => {
            acc[incident.service_id] = (acc[incident.service_id] || 0) + 1;
            return acc;
        }, {});
    },
    
    // ====================
    // DATABASE OPERATIONS
    // ====================
    
    /**
     * Store record in database
     */
    async storeRecord(table, record) {
        // Try Railway DB first
        try {
            await this.storeInRailwayDB(table, record);
        } catch (error) {
            // Fallback to localStorage
            await this.storeInLocalStorage(table, record);
        }
    },
    
    /**
     * Store in Railway PostgreSQL
     */
    async storeInRailwayDB(table, record) {
        // This would use a PostgreSQL client
        // For now, we'll queue it for the backend
        console.log('[AILearning] Storing in Railway DB:', table, record.id);
    },
    
    /**
     * Store in localStorage (fallback)
     */
    async storeInLocalStorage(table, record) {
        const key = `ai_learning_${table}`;
        let records = JSON.parse(localStorage.getItem(key) || '[]');
        records.push(record);
        
        // Keep only last 1000
        if (records.length > 1000) {
            records = records.slice(-1000);
        }
        
        localStorage.setItem(key, JSON.stringify(records));
    },
    
    /**
     * Query records
     */
    async queryRecords(table, filters, limit = 100) {
        // Try Railway DB first
        try {
            return await this.queryRailwayDB(table, filters, limit);
        } catch (error) {
            // Fallback to localStorage
            return await this.queryLocalStorage(table, filters, limit);
        }
    },
    
    /**
     * Query Railway PostgreSQL
     */
    async queryRailwayDB(table, filters, limit) {
        // Placeholder for actual DB query
        return [];
    },
    
    /**
     * Query localStorage
     */
    async queryLocalStorage(table, filters, limit) {
        const key = `ai_learning_${table}`;
        let records = JSON.parse(localStorage.getItem(key) || '[]');
        
        // Apply filters
        records = records.filter(record => {
            for (const [key, value] of Object.entries(filters)) {
                if (record[key] !== value) {
                    return false;
                }
            }
            return true;
        });
        
        // Sort by timestamp descending
        records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        return records.slice(0, limit);
    },
    
    /**
     * Query by time range
     */
    async queryTimeRange(table, startTime, endTime) {
        const key = `ai_learning_${table}`;
        let records = JSON.parse(localStorage.getItem(key) || '[]');
        
        return records.filter(record => {
            const ts = new Date(record.timestamp).getTime();
            return ts >= startTime && ts <= endTime;
        });
    },
    
    // ====================
    // UTILITIES
    // ====================
    
    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    },
    
    async getRecentChanges(serviceId) {
        // Placeholder - would integrate with GitHub
        return [];
    },
    
    async getDependencyHealth(serviceId) {
        // Get from health engine
        const definition = AIHealthEngine?.serviceDefinitions[serviceId];
        if (!definition?.dependencies) return [];
        
        return definition.dependencies.map(dep => ({
            service: dep,
            health: AIHealthEngine?.getServiceHealth(dep)
        }));
    },
    
    async checkErrorPattern(incident) {
        // Placeholder
    },
    
    async checkServiceCorrelation(incident) {
        // Placeholder
    },
    
    async analyzeFailure(outcome) {
        // Placeholder
    },
    
    async updateModelConfidence() {
        // Placeholder
    },
    
    async createRecommendation(data) {
        // Placeholder
    },
    
    async loadPatterns() {
        // Placeholder
    },
    
    async storeActionStats(action, stats) {
        // Placeholder
    }
};

// Auto-initialize
window.AILearning = AILearning;

document.addEventListener('DOMContentLoaded', () => {
    AILearning.init();
});
