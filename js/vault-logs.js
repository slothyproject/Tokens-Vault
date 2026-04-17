/**
 * vault-logs.js - Real-time log streaming from Railway
 * Live logs, filtering, export, and monitoring
 */

const VaultLogs = {
    // Active log streams
    streams: {},
    
    // Log history per service
    history: {},
    
    // Max lines to keep in memory
    maxHistoryLines: 10000,
    
    // Initialize
    init() {
        console.log('[VaultLogs] Log module initialized');
        this.loadLogHistory();
    },
    
    // Load log history from localStorage
    loadLogHistory() {
        const history = localStorage.getItem('vault_log_history');
        if (history) {
            try {
                this.history = JSON.parse(history);
            } catch (e) {
                console.error('[VaultLogs] Failed to load history:', e);
                this.history = {};
            }
        }
    },
    
    // Save log history
    saveLogHistory() {
        try {
            // Limit history per service
            Object.keys(this.history).forEach(serviceId => {
                if (this.history[serviceId].length > this.maxHistoryLines) {
                    this.history[serviceId] = this.history[serviceId].slice(-this.maxHistoryLines);
                }
            });
            localStorage.setItem('vault_log_history', JSON.stringify(this.history));
        } catch (e) {
            console.error('[VaultLogs] Failed to save history:', e);
        }
    },
    
    // Start log stream for a service
    async startStream(serviceId, options = {}) {
        console.log(`[VaultLogs] Starting log stream for ${serviceId}`);
        
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData?.railwayToken) {
            VaultUI.showToast('Railway token required for logs', 'error');
            return false;
        }
        
        // Get service configuration
        const service = this.getServiceConfig(serviceId);
        if (!service?.railwayService) {
            VaultUI.showToast('Service not configured for Railway', 'error');
            return false;
        }
        
        // Stop existing stream
        this.stopStream(serviceId);
        
        // Initialize history
        if (!this.history[serviceId]) {
            this.history[serviceId] = [];
        }
        
        // Show log viewer
        this.showLogViewer(serviceId, service.name);
        
        // Fetch initial logs
        await this.fetchLogs(serviceId, vaultData.railwayToken, options);
        
        // Start polling for new logs
        const pollInterval = options.realtime !== false ? 3000 : null;
        
        if (pollInterval) {
            this.streams[serviceId] = {
                interval: setInterval(() => {
                    this.fetchLogs(serviceId, vaultData.railwayToken, { ...options, since: this.getLastTimestamp(serviceId) });
                }, pollInterval),
                startTime: Date.now()
            };
        }
        
        this.updateStreamStatus(serviceId, 'streaming');
        return true;
    },
    
    // Stop log stream
    stopStream(serviceId) {
        if (this.streams[serviceId]) {
            clearInterval(this.streams[serviceId].interval);
            delete this.streams[serviceId];
            this.updateStreamStatus(serviceId, 'stopped');
            console.log(`[VaultLogs] Stopped stream for ${serviceId}`);
        }
    },
    
    // Stop all streams
    stopAllStreams() {
        Object.keys(this.streams).forEach(serviceId => {
            this.stopStream(serviceId);
        });
    },
    
    // Fetch logs from Railway API
    async fetchLogs(serviceId, token, options = {}) {
        try {
            const service = this.getServiceConfig(serviceId);
            const deploymentId = options.deploymentId || service.currentDeployment;
            
            if (!deploymentId) {
                this.appendToViewer(serviceId, {
                    timestamp: new Date().toISOString(),
                    level: 'warn',
                    message: 'No active deployment. Start a deployment to see logs.'
                });
                return;
            }
            
            // Build query parameters
            const params = new URLSearchParams();
            if (options.limit) params.append('limit', options.limit);
            if (options.since) params.append('since', options.since);
            if (options.filter) params.append('filter', options.filter);
            
            const response = await fetch(
                `https://backboard.railway.app/graphql`,
                {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        query: `
                            query GetDeploymentLogs($deploymentId: String!) {
                                deploymentLogs(deploymentId: $deploymentId) {
                                    timestamp
                                    message
                                    severity
                                    attributes {
                                        key
                                        value
                                    }
                                }
                            }
                        `,
                        variables: { deploymentId }
                    })
                }
            );
            
            if (!response.ok) {
                const error = await response.text();
                throw new Error(`Failed to fetch logs: ${response.status} - ${error}`);
            }
            
            const data = await response.json();
            
            if (data.errors) {
                throw new Error(data.errors[0].message);
            }
            
            const logs = data.data?.deploymentLogs || [];
            
            // Process and display logs
            logs.forEach(log => {
                const logEntry = {
                    timestamp: log.timestamp,
                    message: log.message,
                    level: this.mapSeverity(log.severity),
                    attributes: log.attributes
                };
                
                this.addToHistory(serviceId, logEntry);
                this.appendToViewer(serviceId, logEntry);
            });
            
            this.saveLogHistory();
            
        } catch (error) {
            console.error(`[VaultLogs] Failed to fetch logs for ${serviceId}:`, error);
            this.appendToViewer(serviceId, {
                timestamp: new Date().toISOString(),
                level: 'error',
                message: `Failed to fetch logs: ${error.message}`
            });
        }
    },
    
    // Map Railway severity to standard levels
    mapSeverity(severity) {
        const mapping = {
            'CRITICAL': 'error',
            'ERROR': 'error',
            'WARNING': 'warn',
            'INFO': 'info',
            'DEBUG': 'debug',
            'TRACE': 'debug'
        };
        return mapping[severity] || 'info';
    },
    
    // Add log to history
    addToHistory(serviceId, logEntry) {
        if (!this.history[serviceId]) {
            this.history[serviceId] = [];
        }
        
        // Avoid duplicates
        const lastLog = this.history[serviceId][this.history[serviceId].length - 1];
        if (lastLog && lastLog.timestamp === logEntry.timestamp && lastLog.message === logEntry.message) {
            return;
        }
        
        this.history[serviceId].push(logEntry);
        
        // Trim if too large
        if (this.history[serviceId].length > this.maxHistoryLines) {
            this.history[serviceId] = this.history[serviceId].slice(-this.maxHistoryLines);
        }
    },
    
    // Get last timestamp for polling
    getLastTimestamp(serviceId) {
        const history = this.history[serviceId];
        if (history && history.length > 0) {
            return history[history.length - 1].timestamp;
        }
        return null;
    },
    
    // Show log viewer modal
    showLogViewer(serviceId, serviceName) {
        const modal = document.createElement('div');
        modal.className = 'modal log-viewer-modal';
        modal.id = `logViewer-${serviceId}`;
        
        modal.innerHTML = `
            <div class="modal-content log-viewer-content">
                <div class="modal-header">
                    <h3>📋 Logs: ${serviceName}</h3>
                    <div class="log-controls">
                        <button class="btn-icon" onclick="VaultLogs.togglePause('${serviceId}')" title="Pause/Resume">
                            <span id="pauseBtn-${serviceId}">⏸️</span>
                        </button>
                        <button class="btn-icon" onclick="VaultLogs.clearLogs('${serviceId}')" title="Clear">
                            🗑️
                        </button>
                        <button class="btn-icon" onclick="VaultLogs.downloadLogs('${serviceId}')" title="Download">
                            💾
                        </button>
                        <button class="btn-icon" onclick="VaultLogs.closeLogViewer('${serviceId}')" title="Close">
                            ✕
                        </button>
                    </div>
                </div>
                
                <div class="log-toolbar">
                    <div class="log-filters">
                        <label class="log-filter">
                            <input type="checkbox" checked onchange="VaultLogs.filterLogs('${serviceId}')" data-level="error">
                            <span class="filter-dot error"></span> Error
                        </label>
                        <label class="log-filter">
                            <input type="checkbox" checked onchange="VaultLogs.filterLogs('${serviceId}')" data-level="warn">
                            <span class="filter-dot warn"></span> Warning
                        </label>
                        <label class="log-filter">
                            <input type="checkbox" checked onchange="VaultLogs.filterLogs('${serviceId}')" data-level="info">
                            <span class="filter-dot info"></span> Info
                        </label>
                        <label class="log-filter">
                            <input type="checkbox" checked onchange="VaultLogs.filterLogs('${serviceId}')" data-level="debug">
                            <span class="filter-dot debug"></span> Debug
                        </label>
                    </div>
                    
                    <div class="log-search">
                        <input type="text" 
                               id="logSearch-${serviceId}" 
                               placeholder="Search logs..."
                               oninput="VaultLogs.searchLogs('${serviceId}')">
                    </div>
                    
                    <div class="log-stream-status" id="streamStatus-${serviceId}">
                        <span class="status-indicator streaming"></span>
                        Live
                    </div>
                </div>
                
                <div class="log-container" id="logContainer-${serviceId}">
                    <div class="log-content" id="logContent-${serviceId}"></div>
                </div>
                
                <div class="log-footer">
                    <span id="logStats-${serviceId}">0 lines</span>
                    <button class="btn-text" onclick="VaultLogs.scrollToBottom('${serviceId}')">
                        Scroll to Bottom ↓
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Load existing history
        if (this.history[serviceId]) {
            this.history[serviceId].forEach(log => {
                this.appendToViewer(serviceId, log, false);
            });
            this.scrollToBottom(serviceId);
        }
        
        // Close on escape
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeLogViewer(serviceId);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Auto-scroll to bottom
        setTimeout(() => this.scrollToBottom(serviceId), 100);
    },
    
    // Append log to viewer
    appendToViewer(serviceId, logEntry, autoScroll = true) {
        const container = document.getElementById(`logContent-${serviceId}`);
        if (!container) return;
        
        const logLine = document.createElement('div');
        logLine.className = `log-line ${logEntry.level}`;
        
        const timestamp = new Date(logEntry.timestamp).toLocaleTimeString();
        const levelIcon = this.getLevelIcon(logEntry.level);
        
        // Escape HTML in message
        const escapedMessage = logEntry.message
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br>');
        
        logLine.innerHTML = `
            <span class="log-timestamp">${timestamp}</span>
            <span class="log-level-icon">${levelIcon}</span>
            <span class="log-message">${escapedMessage}</span>
        `;
        
        container.appendChild(logLine);
        
        // Update stats
        this.updateStats(serviceId);
        
        // Auto-scroll if at bottom
        if (autoScroll) {
            const logContainer = document.getElementById(`logContainer-${serviceId}`);
            const isAtBottom = logContainer.scrollHeight - logContainer.scrollTop <= logContainer.clientHeight + 100;
            if (isAtBottom) {
                this.scrollToBottom(serviceId);
            }
        }
        
        // Limit visible lines
        while (container.children.length > 1000) {
            container.removeChild(container.firstChild);
        }
    },
    
    // Get icon for log level
    getLevelIcon(level) {
        const icons = {
            error: '🔴',
            warn: '🟡',
            info: '🔵',
            debug: '⚪'
        };
        return icons[level] || '⚪';
    },
    
    // Update stream status
    updateStreamStatus(serviceId, status) {
        const indicator = document.querySelector(`#streamStatus-${serviceId} .status-indicator`);
        if (indicator) {
            indicator.className = `status-indicator ${status}`;
        }
    },
    
    // Update log stats
    updateStats(serviceId) {
        const stats = document.getElementById(`logStats-${serviceId}`);
        const container = document.getElementById(`logContent-${serviceId}`);
        if (stats && container) {
            const visibleLines = container.querySelectorAll('.log-line:not(.hidden)').length;
            const totalLines = this.history[serviceId]?.length || 0;
            stats.textContent = `${visibleLines} visible / ${totalLines} total`;
        }
    },
    
    // Filter logs by level
    filterLogs(serviceId) {
        const container = document.getElementById(`logContent-${serviceId}`);
        if (!container) return;
        
        const checkboxes = document.querySelectorAll(`#logViewer-${serviceId} .log-filter input`);
        const enabledLevels = Array.from(checkboxes)
            .filter(cb => cb.checked)
            .map(cb => cb.dataset.level);
        
        container.querySelectorAll('.log-line').forEach(line => {
            const level = line.className.replace('log-line ', '');
            line.classList.toggle('hidden', !enabledLevels.includes(level));
        });
        
        this.updateStats(serviceId);
    },
    
    // Search logs
    searchLogs(serviceId) {
        const searchTerm = document.getElementById(`logSearch-${serviceId}`)?.value.toLowerCase();
        const container = document.getElementById(`logContent-${serviceId}`);
        if (!container || !searchTerm) {
            container?.querySelectorAll('.log-line').forEach(line => {
                line.classList.remove('search-hidden');
            });
            return;
        }
        
        container.querySelectorAll('.log-line').forEach(line => {
            const message = line.querySelector('.log-message')?.textContent.toLowerCase() || '';
            line.classList.toggle('search-hidden', !message.includes(searchTerm));
        });
    },
    
    // Toggle pause/resume
    togglePause(serviceId) {
        const btn = document.getElementById(`pauseBtn-${serviceId}`);
        if (this.streams[serviceId]) {
            this.stopStream(serviceId);
            btn.textContent = '▶️';
        } else {
            const vaultData = VaultCore.loadVaultData();
            this.startStream(serviceId, { railwayToken: vaultData?.railwayToken });
            btn.textContent = '⏸️';
        }
    },
    
    // Clear logs from viewer
    clearLogs(serviceId) {
        const container = document.getElementById(`logContent-${serviceId}`);
        if (container) {
            container.innerHTML = '';
            this.updateStats(serviceId);
        }
    },
    
    // Download logs as file
    downloadLogs(serviceId) {
        const history = this.history[serviceId] || [];
        if (history.length === 0) {
            VaultUI.showToast('No logs to download', 'warn');
            return;
        }
        
        const content = history.map(log => 
            `[${new Date(log.timestamp).toISOString()}] [${log.level.toUpperCase()}] ${log.message}`
        ).join('\n');
        
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `logs-${serviceId}-${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        VaultUI.showToast(`Downloaded ${history.length} log lines`, 'success');
    },
    
    // Scroll to bottom
    scrollToBottom(serviceId) {
        const container = document.getElementById(`logContainer-${serviceId}`);
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    },
    
    // Close log viewer
    closeLogViewer(serviceId) {
        this.stopStream(serviceId);
        const modal = document.getElementById(`logViewer-${serviceId}`);
        if (modal) {
            modal.remove();
        }
    },
    
    // Get service configuration
    getServiceConfig(serviceId) {
        // Try to get from vault services
        if (typeof vaultServices !== 'undefined' && vaultServices[serviceId]) {
            return vaultServices[serviceId];
        }
        
        // Fallback: check deployment history
        const deployHistory = VaultRailwayDeploy?.deployments?.[serviceId];
        if (deployHistory) {
            const lastDeploy = deployHistory[deployHistory.length - 1];
            return {
                id: serviceId,
                name: serviceId,
                railwayService: lastDeploy.railwayService
            };
        }
        
        return null;
    },
    
    // Get logs summary for dashboard
    getLogsSummary(serviceId, minutes = 5) {
        const history = this.history[serviceId] || [];
        const cutoff = Date.now() - (minutes * 60 * 1000);
        
        const recent = history.filter(log => new Date(log.timestamp).getTime() > cutoff);
        
        const errors = recent.filter(log => log.level === 'error').length;
        const warnings = recent.filter(log => log.level === 'warn').length;
        
        return {
            total: recent.length,
            errors,
            warnings,
            hasIssues: errors > 0 || warnings > 5
        };
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    VaultLogs.init();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    VaultLogs.stopAllStreams();
});
