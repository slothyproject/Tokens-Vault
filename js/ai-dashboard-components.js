/**
 * ai-dashboard-components.js - Modern Dashboard UI Components
 * Service cards, health visualizations, metric displays
 * 
 * @version 4.1
 */

const AIDashboardComponents = {
    /**
     * Create a modern service card
     * @param {Object} service - Service data
     * @returns {HTMLElement}
     */
    createServiceCard(service) {
        const card = document.createElement('div');
        card.className = `service-card-modern ${service.status || 'unknown'}`;
        card.dataset.serviceId = service.id;
        
        const health = service.health || {};
        const statusClass = this.getStatusClass(health.status);
        const statusText = this.getStatusText(health.status);
        
        card.innerHTML = `
            <div class="service-card-header">
                <div class="service-icon" style="background: ${service.color || '#6366f1'}">
                    ${service.icon || '⚙️'}
                </div>
                <div class="service-info">
                    <h4 class="service-name">${this.escapeHtml(service.name)}</h4>
                    <span class="status-indicator ${statusClass}">
                        <span class="status-dot"></span>
                        ${statusText}
                    </span>
                </div>
                <button class="service-menu-btn" aria-label="Service options">
                    ⋮
                </button>
            </div>
            
            <div class="service-card-body">
                ${service.description ? `
                    <p class="service-description">${this.escapeHtml(service.description)}</p>
                ` : ''}
                
                <div class="service-metrics">
                    ${health.responseTime ? `
                        <div class="metric">
                            <span class="metric-label">Response</span>
                            <span class="metric-value ${this.getResponseTimeClass(health.responseTime)}">
                                ${Math.round(health.responseTime)}ms
                            </span>
                        </div>
                    ` : ''}
                    
                    ${health.uptime ? `
                        <div class="metric">
                            <span class="metric-label">Uptime</span>
                            <span class="metric-value">${health.uptime.toFixed(2)}%</span>
                        </div>
                    ` : ''}
                    
                    <div class="metric">
                        <span class="metric-label">Variables</span>
                        <span class="metric-value">${service.variableCount || 0}</span>
                    </div>
                </div>
                
                ${service.dependencies?.length > 0 ? `
                    <div class="service-dependencies">
                        <span class="deps-label">Dependencies:</span>
                        ${service.dependencies.map(dep => `
                            <span class="dep-badge">${this.escapeHtml(dep)}</span>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            
            <div class="service-card-footer">
                <button class="btn-action" data-action="deploy" title="Deploy">
                    🚀 Deploy
                </button>
                <button class="btn-action" data-action="logs" title="View logs">
                    📄 Logs
                </button>
                <button class="btn-action" data-action="settings" title="Settings">
                    ⚙️
                </button>
            </div>
            
            ${health.status === 'degraded' || health.status === 'unhealthy' ? `
                <div class="service-alert">
                    <span class="alert-icon">⚠️</span>
                    <span class="alert-text">${this.escapeHtml(health.error || 'Service issue detected')}</span>
                    <button class="btn-heal" data-action="heal">Auto-Heal</button>
                </div>
            ` : ''}
        `;
        
        // Add event listeners
        this.attachCardListeners(card, service);
        
        return card;
    },
    
    /**
     * Create health dashboard summary
     * @param {Object} stats - Health statistics
     * @returns {HTMLElement}
     */
    createHealthSummary(stats) {
        const container = document.createElement('div');
        container.className = 'health-summary';
        
        const total = stats.total || 0;
        const healthy = stats.healthy || 0;
        const warning = stats.warning || 0;
        const error = stats.error || 0;
        
        const healthPercentage = total > 0 ? Math.round((healthy / total) * 100) : 0;
        
        container.innerHTML = `
            <div class="health-gauge">
                <div class="gauge-circle ${this.getHealthLevel(healthPercentage)}">
                    <span class="gauge-value">${healthPercentage}%</span>
                    <span class="gauge-label">Healthy</span>
                </div>
            </div>
            
            <div class="health-breakdown">
                <div class="breakdown-item healthy">
                    <span class="breakdown-count">${healthy}</span>
                    <span class="breakdown-label">Healthy</span>
                </div>
                <div class="breakdown-item warning">
                    <span class="breakdown-count">${warning}</span>
                    <span class="breakdown-label">Warning</span>
                </div>
                <div class="breakdown-item error">
                    <span class="breakdown-count">${error}</span>
                    <span class="breakdown-label">Error</span>
                </div>
            </div>
        `;
        
        return container;
    },
    
    /**
     * Create metric card
     * @param {Object} metric - Metric data
     * @returns {HTMLElement}
     */
    createMetricCard(metric) {
        const card = document.createElement('div');
        card.className = 'metric-card';
        
        const trend = metric.trend || 'neutral';
        const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
        const trendClass = trend === 'up' ? 'trend-up' : trend === 'down' ? 'trend-down' : 'trend-neutral';
        
        card.innerHTML = `
            <div class="metric-header">
                <span class="metric-title">${this.escapeHtml(metric.title)}</span>
                <span class="metric-icon">${metric.icon || '📊'}</span>
            </div>
            <div class="metric-body">
                <span class="metric-value-large">${metric.value}</span>
                <span class="metric-unit">${metric.unit || ''}</span>
            </div>
            <div class="metric-footer">
                <span class="metric-trend ${trendClass}">
                    ${trendIcon} ${Math.abs(metric.change || 0)}%
                </span>
                <span class="metric-period">${metric.period || 'vs last hour'}</span>
            </div>
            
            ${metric.sparkline ? `
                <div class="metric-sparkline">
                    ${this.createSparkline(metric.sparkline)}
                </div>
            ` : ''}
        `;
        
        return card;
    },
    
    /**
     * Create notification toast
     * @param {Object} notification - Notification data
     * @returns {HTMLElement}
     */
    createNotificationToast(notification) {
        const toast = document.createElement('div');
        toast.className = `notification-toast ${notification.type || 'info'}`;
        toast.dataset.notificationId = notification.id;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.innerHTML = `
            <div class="notification-icon">${icons[notification.type] || 'ℹ️'}</div>
            <div class="notification-content">
                <div class="notification-title">${this.escapeHtml(notification.title)}</div>
                <div class="notification-message">${this.escapeHtml(notification.message)}</div>
                ${notification.actions ? `
                    <div class="notification-actions">
                        ${notification.actions.map(action => `
                            <button class="btn-notification-action" data-action="${action.action}">
                                ${this.escapeHtml(action.label)}
                            </button>
                        `).join('')}
                    </div>
                ` : ''}
            </div>
            <button class="notification-close" aria-label="Close notification">✕</button>
            <div class="notification-progress"></div>
        `;
        
        // Auto-dismiss after delay
        if (notification.autoDismiss !== false) {
            this.setupAutoDismiss(toast, notification.duration || 5000);
        }
        
        return toast;
    },
    
    /**
     * Create loading skeleton
     * @param {string} type - Skeleton type (card, text, circle)
     * @returns {HTMLElement}
     */
    createSkeleton(type = 'card') {
        const skeleton = document.createElement('div');
        skeleton.className = `skeleton skeleton-${type}`;
        
        if (type === 'card') {
            skeleton.style.cssText = `
                height: 200px;
                border-radius: var(--radius-lg);
            `;
        } else if (type === 'text') {
            skeleton.style.cssText = `
                height: 1em;
                width: 100%;
                border-radius: var(--radius-sm);
            `;
        } else if (type === 'circle') {
            skeleton.style.cssText = `
                width: 48px;
                height: 48px;
                border-radius: 50%;
            `;
        }
        
        return skeleton;
    },
    
    /**
     * Create mini chart/sparkline
     * @param {Array<number>} data - Data points
     * @returns {string} - SVG string
     */
    createSparkline(data) {
        if (!data || data.length === 0) return '';
        
        const width = 100;
        const height = 30;
        const padding = 2;
        
        const min = Math.min(...data);
        const max = Math.max(...data);
        const range = max - min || 1;
        
        const points = data.map((value, index) => {
            const x = (index / (data.length - 1)) * (width - 2 * padding) + padding;
            const y = height - ((value - min) / range) * (height - 2 * padding) - padding;
            return `${x},${y}`;
        }).join(' ');
        
        return `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <polyline
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    points="${points}"
                />
            </svg>
        `;
    },
    
    /**
     * Create theme toggle button with modern styling
     * @returns {HTMLElement}
     */
    createThemeToggle() {
        const toggle = AIThemeManager.createToggle();
        toggle.className = 'theme-toggle-modern';
        
        // Add modern styling
        toggle.style.cssText = `
            background: var(--glass-bg);
            border: 1px solid var(--glass-border);
            border-radius: var(--radius-full);
            width: 44px;
            height: 44px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 1.25rem;
            cursor: pointer;
            transition: all var(--transition-base);
            backdrop-filter: var(--glass-blur);
        `;
        
        toggle.addEventListener('mouseenter', () => {
            toggle.style.transform = 'scale(1.1)';
            toggle.style.boxShadow = 'var(--shadow-glow)';
        });
        
        toggle.addEventListener('mouseleave', () => {
            toggle.style.transform = 'scale(1)';
            toggle.style.boxShadow = 'none';
        });
        
        return toggle;
    },
    
    /**
     * Helper: Get status CSS class
     */
    getStatusClass(status) {
        const map = {
            'online': 'status-online',
            'healthy': 'status-online',
            'degraded': 'status-warning',
            'offline': 'status-error',
            'unhealthy': 'status-error',
            'unknown': 'status-offline'
        };
        return map[status] || 'status-offline';
    },
    
    /**
     * Helper: Get status text
     */
    getStatusText(status) {
        const map = {
            'online': 'Online',
            'healthy': 'Healthy',
            'degraded': 'Degraded',
            'offline': 'Offline',
            'unhealthy': 'Unhealthy',
            'unknown': 'Unknown'
        };
        return map[status] || 'Unknown';
    },
    
    /**
     * Helper: Get health level
     */
    getHealthLevel(percentage) {
        if (percentage >= 95) return 'excellent';
        if (percentage >= 80) return 'good';
        if (percentage >= 60) return 'fair';
        return 'poor';
    },
    
    /**
     * Helper: Get response time class
     */
    getResponseTimeClass(ms) {
        if (ms < 100) return 'excellent';
        if (ms < 500) return 'good';
        if (ms < 1000) return 'fair';
        return 'poor';
    },
    
    /**
     * Helper: Escape HTML
     */
    escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    },
    
    /**
     * Attach event listeners to card
     */
    attachCardListeners(card, service) {
        // Action buttons
        card.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleCardAction(action, service);
            });
        });
        
        // Menu button
        const menuBtn = card.querySelector('.service-menu-btn');
        if (menuBtn) {
            menuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showServiceMenu(service, menuBtn);
            });
        }
    },
    
    /**
     * Handle card action
     */
    handleCardAction(action, service) {
        switch (action) {
            case 'deploy':
                if (typeof VaultRailwayDeploy !== 'undefined') {
                    VaultRailwayDeploy.deployService(service.id);
                }
                break;
            case 'logs':
                if (typeof VaultLogs !== 'undefined') {
                    VaultLogs.startStream(service.id);
                }
                break;
            case 'heal':
                if (typeof AIHealingEngine !== 'undefined') {
                    AIHealingEngine.handleIssue({
                        serviceId: service.id,
                        type: 'service_degraded',
                        severity: 'critical'
                    });
                }
                break;
            default:
                console.log(`[AIDashboard] Action: ${action} for ${service.id}`);
        }
    },
    
    /**
     * Setup auto-dismiss for toast
     */
    setupAutoDismiss(toast, duration) {
        const progress = toast.querySelector('.notification-progress');
        
        if (progress) {
            progress.style.animation = `shrink ${duration}ms linear forwards`;
        }
        
        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    /**
     * Show service menu
     */
    showServiceMenu(service, trigger) {
        // Implementation for dropdown menu
        console.log(`[AIDashboard] Show menu for ${service.id}`);
    }
};

// Auto-export
window.AIDashboardComponents = AIDashboardComponents;
