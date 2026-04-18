/**
 * ai-notification-center.js - Dashboard Notification System
 * In-app notifications, action approvals, and real-time updates
 * 
 * Features:
 * - Real-time notification stream
 * - Action approval workflows
 * - Notification persistence
 * - Interactive action buttons
 * - Severity-based styling
 * 
 * @version 4.0
 * @author AI Agent
 */

const AINotificationCenter = {
    // Configuration
    config: {
        maxNotifications: 100,
        autoDismissDelay: 5000, // 5 seconds for info/success
        persistence: true, // Store in Railway DB
        categories: {
            INFO: { color: 'blue', icon: 'ℹ️', autoDismiss: true },
            SUCCESS: { color: 'green', icon: '✅', autoDismiss: true },
            WARNING: { color: 'yellow', icon: '⚠️', autoDismiss: false },
            CRITICAL: { color: 'red', icon: '🚨', autoDismiss: false },
            AUTO_REMEDIATION: { color: 'purple', icon: '🤖', autoDismiss: false },
            SUGGESTION: { color: 'orange', icon: '💡', autoDismiss: false },
            LEARNING: { color: 'cyan', icon: '🧠', autoDismiss: true }
        }
    },
    
    // State
    state: {
        initialized: false,
        notifications: [],
        unreadCount: 0,
        notificationId: 0,
        container: null,
        panel: null,
        approvalCallbacks: new Map()
    },
    
    /**
     * Initialize notification center
     */
    async init() {
        console.log('[AINotificationCenter] Initializing...');
        
        // Create UI
        this.createNotificationUI();
        
        // Load persisted notifications
        if (this.config.persistence) {
            await this.loadNotifications();
        }
        
        this.state.initialized = true;
        console.log('[AINotificationCenter] Initialized');
    },
    
    /**
     * Create notification UI elements
     */
    createNotificationUI() {
        // Create floating notification container
        const container = document.createElement('div');
        container.id = 'ai-notification-container';
        container.className = 'ai-notification-container';
        container.innerHTML = `
            <div class="ai-notification-badge" id="ai-notification-badge" style="display: none;">
                <span class="ai-notification-count">0</span>
            </div>
            <div class="ai-notification-panel hidden" id="ai-notification-panel">
                <div class="ai-notification-header">
                    <h3>🤖 AI Agent Notifications</h3>
                    <div class="ai-notification-actions">
                        <button onclick="AINotificationCenter.markAllRead()">Mark All Read</button>
                        <button onclick="AINotificationCenter.clearAll()">Clear All</button>
                    </div>
                </div>
                <div class="ai-notification-list" id="ai-notification-list">
                    <!-- Notifications appear here -->
                </div>
            </div>
        `;
        
        document.body.appendChild(container);
        
        // Store references
        this.state.container = container;
        this.state.panel = document.getElementById('ai-notification-panel');
        this.state.badge = document.getElementById('ai-notification-badge');
        
        // Add click handler to badge
        this.state.badge.addEventListener('click', () => {
            this.togglePanel();
        });
        
        // Add styles
        this.addStyles();
    },
    
    /**
     * Show a notification
     */
    async show(notification) {
        const id = ++this.state.notificationId;
        
        const notificationRecord = {
            id: id,
            type: notification.type || 'INFO',
            title: notification.title || notification.message,
            message: notification.message,
            service: notification.service,
            severity: notification.severity || 'info',
            timestamp: Date.now(),
            read: false,
            actions: notification.actions || [],
            requiresApproval: notification.requiresApproval || false,
            remediationId: notification.remediationId,
            progress: notification.progress,
            details: notification.details || {}
        };
        
        // Add to state
        this.state.notifications.unshift(notificationRecord);
        
        // Trim if needed
        if (this.state.notifications.length > this.config.maxNotifications) {
            this.state.notifications = this.state.notifications.slice(0, this.config.maxNotifications);
        }
        
        // Update badge
        this.updateBadge();
        
        // Show toast
        this.showToast(notificationRecord);
        
        // Add to panel
        this.addToPanel(notificationRecord);
        
        // Persist if configured
        if (this.config.persistence) {
            await this.persistNotification(notificationRecord);
        }
        
        // Setup approval callback if needed
        if (notification.requiresApproval && notification.remediationId) {
            this.state.approvalCallbacks.set(notification.remediationId, {
                resolve: null,
                reject: null
            });
        }
        
        // Auto-dismiss if configured
        const category = this.config.categories[notification.type];
        if (category?.autoDismiss) {
            setTimeout(() => {
                this.dismissToast(id);
            }, this.config.autoDismissDelay);
        }
        
        return id;
    },
    
    /**
     * Show toast notification
     */
    showToast(notification) {
        const category = this.config.categories[notification.type] || this.config.categories.INFO;
        
        const toast = document.createElement('div');
        toast.id = `ai-toast-${notification.id}`;
        toast.className = `ai-toast ai-toast-${category.color}`;
        toast.innerHTML = `
            <div class="ai-toast-icon">${category.icon}</div>
            <div class="ai-toast-content">
                <div class="ai-toast-title">${this.escapeHtml(notification.title)}</div>
                ${notification.message ? `<div class="ai-toast-message">${this.escapeHtml(notification.message)}</div>` : ''}
                ${notification.progress ? `<div class="ai-toast-progress">
                    <div class="ai-toast-progress-bar" style="width: ${notification.progress}%"></div>
                </div>` : ''}
                ${notification.actions.length > 0 ? `<div class="ai-toast-actions">
                    ${notification.actions.map(action => `
                        <button class="${action.primary ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="AINotificationCenter.handleAction(${notification.id}, '${action.action}')"
                                data-action="${action.action}"
                                data-remediation="${notification.remediationId || ''}">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>` : ''}
            </div>
            <button class="ai-toast-close" onclick="AINotificationCenter.dismissToast(${notification.id})">✕</button>
        `;
        
        // Add to container
        const container = document.getElementById('ai-notification-container');
        container.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('ai-toast-visible');
        });
        
        // Play sound for critical notifications
        if (notification.severity === 'critical' || notification.severity === 'error') {
            this.playAlertSound();
        }
    },
    
    /**
     * Add notification to panel
     */
    addToPanel(notification) {
        const list = document.getElementById('ai-notification-list');
        if (!list) return;
        
        const category = this.config.categories[notification.type] || this.config.categories.INFO;
        
        const item = document.createElement('div');
        item.id = `ai-panel-item-${notification.id}`;
        item.className = `ai-panel-item ${notification.read ? 'read' : 'unread'} ai-panel-${category.color}`;
        item.innerHTML = `
            <div class="ai-panel-icon">${category.icon}</div>
            <div class="ai-panel-content">
                <div class="ai-panel-title">${this.escapeHtml(notification.title)}</div>
                <div class="ai-panel-meta">
                    <span class="ai-panel-service">${notification.service || 'System'}</span>
                    <span class="ai-panel-time">${this.formatTime(notification.timestamp)}</span>
                </div>
                ${notification.actions.length > 0 ? `<div class="ai-panel-actions">
                    ${notification.actions.map(action => `
                        <button class="${action.primary ? 'btn-primary' : 'btn-secondary'}" 
                                onclick="AINotificationCenter.handleAction(${notification.id}, '${action.action}')">
                            ${action.label}
                        </button>
                    `).join('')}
                </div>` : ''}
            </div>
        `;
        
        // Click to mark as read
        item.addEventListener('click', (e) => {
            if (!e.target.matches('button')) {
                this.markAsRead(notification.id);
                item.classList.remove('unread');
                item.classList.add('read');
            }
        });
        
        list.insertBefore(item, list.firstChild);
    },
    
    /**
     * Handle action button click
     */
    async handleAction(notificationId, action) {
        console.log('[AINotificationCenter] Action:', action, 'for notification:', notificationId);
        
        const notification = this.state.notifications.find(n => n.id === notificationId);
        if (!notification) return;
        
        // Find callback for this remediation
        if (notification.remediationId) {
            const callback = this.state.approvalCallbacks.get(notification.remediationId);
            if (callback) {
                if (action === 'approve') {
                    // Update remediation to approved
                    const remediation = AIHealingEngine?.state?.activeRemediations?.get(notification.remediationId);
                    if (remediation) {
                        remediation.approved = true;
                    }
                    
                    // Show approval notification
                    this.show({
                        type: 'SUCCESS',
                        title: 'Remediation Approved',
                        message: `Approved ${notification.title}`,
                        service: notification.service
                    });
                } else if (action === 'dismiss') {
                    // Cancel remediation
                    const remediation = AIHealingEngine?.state?.activeRemediations?.get(notification.remediationId);
                    if (remediation) {
                        remediation.status = 'cancelled';
                    }
                    
                    this.show({
                        type: 'INFO',
                        title: 'Remediation Dismissed',
                        message: `Dismissed ${notification.title}`,
                        service: notification.service
                    });
                } else if (action === 'details') {
                    this.showDetails(notification);
                } else if (action === 'rollback') {
                    // Trigger rollback
                    await AIHealingEngine?.rollback(notification.service);
                }
            }
        }
        
        // Dismiss toast
        this.dismissToast(notificationId);
    },
    
    /**
     * Show notification details
     */
    showDetails(notification) {
        const modal = document.createElement('div');
        modal.className = 'ai-details-modal';
        modal.innerHTML = `
            <div class="ai-details-overlay" onclick="this.parentElement.remove()"></div>
            <div class="ai-details-content">
                <div class="ai-details-header">
                    <h3>${this.escapeHtml(notification.title)}</h3>
                    <button onclick="this.closest('.ai-details-modal').remove()">✕</button>
                </div>
                <div class="ai-details-body">
                    <p><strong>Service:</strong> ${notification.service || 'N/A'}</p>
                    <p><strong>Type:</strong> ${notification.type}</p>
                    <p><strong>Severity:</strong> ${notification.severity}</p>
                    <p><strong>Time:</strong> ${new Date(notification.timestamp).toLocaleString()}</p>
                    ${Object.keys(notification.details).length > 0 ? `
                        <div class="ai-details-section">
                            <h4>Details:</h4>
                            <pre>${JSON.stringify(notification.details, null, 2)}</pre>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    },
    
    /**
     * Dismiss toast notification
     */
    dismissToast(id) {
        const toast = document.getElementById(`ai-toast-${id}`);
        if (toast) {
            toast.classList.remove('ai-toast-visible');
            setTimeout(() => toast.remove(), 300);
        }
    },
    
    /**
     * Mark notification as read
     */
    markAsRead(id) {
        const notification = this.state.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.updateBadge();
        }
    },
    
    /**
     * Mark all notifications as read
     */
    markAllRead() {
        this.state.notifications.forEach(n => n.read = true);
        this.updateBadge();
        
        // Update panel UI
        document.querySelectorAll('.ai-panel-item').forEach(item => {
            item.classList.remove('unread');
            item.classList.add('read');
        });
    },
    
    /**
     * Clear all notifications
     */
    clearAll() {
        this.state.notifications = [];
        this.updateBadge();
        
        // Clear panel
        const list = document.getElementById('ai-notification-list');
        if (list) {
            list.innerHTML = '';
        }
    },
    
    /**
     * Toggle notification panel
     */
    togglePanel() {
        if (this.state.panel) {
            this.state.panel.classList.toggle('hidden');
        }
    },
    
    /**
     * Update badge count
     */
    updateBadge() {
        const unreadCount = this.state.notifications.filter(n => !n.read).length;
        this.state.unreadCount = unreadCount;
        
        if (this.state.badge) {
            const countEl = this.state.badge.querySelector('.ai-notification-count');
            if (countEl) {
                countEl.textContent = unreadCount;
            }
            
            this.state.badge.style.display = unreadCount > 0 ? 'flex' : 'none';
        }
    },
    
    /**
     * Play alert sound for critical notifications
     */
    playAlertSound() {
        // Create simple beep using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
        } catch (e) {
            // Audio not supported
        }
    },
    
    /**
     * Format timestamp
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        if (diff < 60000) {
            return 'Just now';
        } else if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}m ago`;
        } else if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    },
    
    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Persist notification to storage
     */
    async persistNotification(notification) {
        // Store in Railway DB via AILearning
        // For now, use localStorage
        try {
            const key = 'ai_notifications';
            let notifications = JSON.parse(localStorage.getItem(key) || '[]');
            notifications.push(notification);
            
            // Keep only last 100
            if (notifications.length > 100) {
                notifications = notifications.slice(-100);
            }
            
            localStorage.setItem(key, JSON.stringify(notifications));
        } catch (e) {
            console.warn('[AINotificationCenter] Failed to persist:', e);
        }
    },
    
    /**
     * Load persisted notifications
     */
    async loadNotifications() {
        try {
            const key = 'ai_notifications';
            const notifications = JSON.parse(localStorage.getItem(key) || '[]');
            
            // Restore notifications from last 24 hours only
            const cutoff = Date.now() - (24 * 60 * 60 * 1000);
            this.state.notifications = notifications.filter(n => n.timestamp > cutoff);
            
            // Update badge
            this.updateBadge();
            
            // Add to panel
            this.state.notifications.forEach(n => {
                this.addToPanel(n);
            });
        } catch (e) {
            console.warn('[AINotificationCenter] Failed to load:', e);
        }
    },
    
    /**
     * Add notification styles
     */
    addStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            /* Notification Container */
            .ai-notification-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                pointer-events: none;
            }
            
            /* Badge */
            .ai-notification-badge {
                position: fixed;
                top: 80px;
                right: 20px;
                width: 24px;
                height: 24px;
                background: #ef4444;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
                pointer-events: auto;
                box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                transition: transform 0.2s;
            }
            
            .ai-notification-badge:hover {
                transform: scale(1.1);
            }
            
            .ai-notification-count {
                color: white;
                font-size: 12px;
                font-weight: bold;
            }
            
            /* Toast Notifications */
            .ai-toast {
                background: var(--bg-secondary, #1e1e2e);
                border: 1px solid var(--border-color, #313244);
                border-radius: 8px;
                padding: 16px;
                margin-bottom: 12px;
                display: flex;
                align-items: flex-start;
                gap: 12px;
                max-width: 400px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.4);
                pointer-events: auto;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            }
            
            .ai-toast-visible {
                opacity: 1;
                transform: translateX(0);
            }
            
            .ai-toast-icon {
                font-size: 24px;
                flex-shrink: 0;
            }
            
            .ai-toast-content {
                flex: 1;
                min-width: 0;
            }
            
            .ai-toast-title {
                font-weight: 600;
                margin-bottom: 4px;
                color: var(--text-primary, #cdd6f4);
            }
            
            .ai-toast-message {
                font-size: 13px;
                color: var(--text-secondary, #9399b2);
                margin-bottom: 8px;
            }
            
            .ai-toast-close {
                background: none;
                border: none;
                color: var(--text-secondary, #9399b2);
                cursor: pointer;
                padding: 4px;
                margin: -4px;
                opacity: 0.7;
                transition: opacity 0.2s;
            }
            
            .ai-toast-close:hover {
                opacity: 1;
            }
            
            /* Color variants */
            .ai-toast-blue { border-left: 3px solid #3b82f6; }
            .ai-toast-green { border-left: 3px solid #22c55e; }
            .ai-toast-yellow { border-left: 3px solid #eab308; }
            .ai-toast-red { border-left: 3px solid #ef4444; }
            .ai-toast-purple { border-left: 3px solid #8b5cf6; }
            .ai-toast-orange { border-left: 3px solid #f97316; }
            .ai-toast-cyan { border-left: 3px solid #06b6d4; }
            
            /* Progress bar */
            .ai-toast-progress {
                height: 4px;
                background: var(--bg-tertiary, #313244);
                border-radius: 2px;
                margin-top: 8px;
                overflow: hidden;
            }
            
            .ai-toast-progress-bar {
                height: 100%;
                background: var(--accent-blue, #3b82f6);
                transition: width 0.3s;
            }
            
            /* Actions */
            .ai-toast-actions, .ai-panel-actions {
                display: flex;
                gap: 8px;
                margin-top: 12px;
            }
            
            .ai-toast-actions button, .ai-panel-actions button {
                padding: 6px 12px;
                border-radius: 4px;
                border: none;
                font-size: 12px;
                cursor: pointer;
                transition: opacity 0.2s;
            }
            
            .ai-toast-actions button:hover, .ai-panel-actions button:hover {
                opacity: 0.9;
            }
            
            /* Notification Panel */
            .ai-notification-panel {
                position: fixed;
                top: 100px;
                right: 20px;
                width: 400px;
                max-height: 600px;
                background: var(--bg-secondary, #1e1e2e);
                border: 1px solid var(--border-color, #313244);
                border-radius: 8px;
                box-shadow: 0 8px 24px rgba(0,0,0,0.4);
                display: flex;
                flex-direction: column;
                pointer-events: auto;
                z-index: 9999;
            }
            
            .ai-notification-panel.hidden {
                display: none;
            }
            
            .ai-notification-header {
                padding: 16px;
                border-bottom: 1px solid var(--border-color, #313244);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            
            .ai-notification-header h3 {
                margin: 0;
                font-size: 16px;
            }
            
            .ai-notification-actions {
                display: flex;
                gap: 8px;
            }
            
            .ai-notification-actions button {
                padding: 4px 8px;
                font-size: 12px;
                background: var(--bg-tertiary, #313244);
                border: 1px solid var(--border-color, #45475a);
                border-radius: 4px;
                color: var(--text-primary, #cdd6f4);
                cursor: pointer;
            }
            
            .ai-notification-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }
            
            /* Panel items */
            .ai-panel-item {
                display: flex;
                gap: 12px;
                padding: 12px;
                border-radius: 6px;
                margin-bottom: 8px;
                cursor: pointer;
                transition: background 0.2s;
            }
            
            .ai-panel-item:hover {
                background: var(--bg-tertiary, #313244);
            }
            
            .ai-panel-item.unread {
                background: rgba(59, 130, 246, 0.1);
            }
            
            .ai-panel-icon {
                font-size: 20px;
            }
            
            .ai-panel-content {
                flex: 1;
                min-width: 0;
            }
            
            .ai-panel-title {
                font-weight: 500;
                margin-bottom: 4px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }
            
            .ai-panel-meta {
                font-size: 12px;
                color: var(--text-secondary, #9399b2);
                display: flex;
                gap: 8px;
            }
            
            /* Details modal */
            .ai-details-modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 20000;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .ai-details-overlay {
                position: absolute;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.7);
            }
            
            .ai-details-content {
                position: relative;
                background: var(--bg-secondary, #1e1e2e);
                border: 1px solid var(--border-color, #313244);
                border-radius: 8px;
                width: 90%;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                padding: 24px;
            }
            
            .ai-details-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
            }
            
            .ai-details-header h3 {
                margin: 0;
            }
            
            .ai-details-section {
                margin-top: 16px;
            }
            
            .ai-details-section h4 {
                margin-bottom: 8px;
            }
            
            .ai-details-section pre {
                background: var(--bg-tertiary, #313244);
                padding: 12px;
                border-radius: 4px;
                overflow-x: auto;
                font-size: 12px;
            }
        `;
        
        document.head.appendChild(styles);
    }
};

// Auto-initialize
window.AINotificationCenter = AINotificationCenter;

document.addEventListener('DOMContentLoaded', () => {
    AINotificationCenter.init();
});
