/**
 * vault-timeline.js - Visual Change Timeline and History
 * Shows chronological changes, deployments, and events
 */

const VaultTimeline = {
    // Initialize
    init() {
        console.log('[VaultTimeline] Timeline system initialized');
    },

    // Get all timeline events
    getEvents(days = 7) {
        const data = VaultCore.loadVaultData();
        if (!data || !data.history) return [];
        
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        
        return data.history
            .filter(event => new Date(event.timestamp) > cutoff)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    },

    // Render timeline
    renderTimeline(containerId, days = 7) {
        const container = document.getElementById(containerId);
        if (!container) return;

        const events = this.getEvents(days);
        
        if (events.length === 0) {
            container.innerHTML = '<p class="no-events">No recent activity</p>';
            return;
        }

        // Group by date
        const grouped = this.groupByDate(events);
        
        let html = '<div class="timeline">';
        
        Object.entries(grouped).forEach(([date, dayEvents]) => {
            html += `
                <div class="timeline-date">
                    <div class="date-header">${this.formatDate(date)}</div>
                    <div class="timeline-events">
                        ${dayEvents.map(event => this.renderEvent(event)).join('')}
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        container.innerHTML = html;
    },

    // Group events by date
    groupByDate(events) {
        const grouped = {};
        
        events.forEach(event => {
            const date = new Date(event.timestamp).toDateString();
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(event);
        });
        
        return grouped;
    },

    // Render single event
    renderEvent(event) {
        const icons = {
            'updated': '✏️',
            'created': '➕',
            'deleted': '🗑️',
            'deploy': '🚀',
            'backup': '💾',
            'restored': '📥'
        };
        
        const time = new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        return `
            <div class="timeline-event">
                <div class="event-time">${time}</div>
                <div class="event-icon">${icons[event.action] || '📝'}</div>
                <div class="event-content">
                    <div class="event-title">${this.getEventTitle(event)}</div>
                    ${event.details ? `<div class="event-details">${this.formatDetails(event.details)}</div>` : ''}
                </div>
            </div>
        `;
    },

    // Get event title
    getEventTitle(event) {
        switch (event.action) {
            case 'updated':
                return `Updated ${event.details?.key || 'variable'} ${event.serviceId !== 'shared' ? `in ${event.serviceId}` : '(shared)'}`;
            case 'created':
                return `Added ${event.details?.key || 'variable'} ${event.serviceId !== 'shared' ? `to ${event.serviceId}` : '(shared)'}`;
            case 'deleted':
                return `Deleted ${event.details?.key || 'variable'}`;
            case 'deploy':
                return `Deployed ${event.serviceId}`;
            case 'backup':
                return 'Created backup';
            case 'restored':
                return 'Restored from backup';
            default:
                return `${event.action} ${event.serviceId || ''}`;
        }
    },

    // Format event details
    formatDetails(details) {
        if (typeof details === 'string') return details;
        
        if (details.key) {
            let text = details.key;
            if (details.oldValue && details.newValue) {
                text += `: "${this.truncate(details.oldValue)}" → "${this.truncate(details.newValue)}"`;
            }
            return text;
        }
        
        return JSON.stringify(details);
    },

    // Truncate long values
    truncate(value, max = 20) {
        if (!value) return '';
        if (value.length <= max) return value;
        return value.substring(0, max) + '...';
    },

    // Format date header
    formatDate(dateStr) {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (date.toDateString() === today.toDateString()) return 'Today';
        if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
        
        return date.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' });
    },

    // Add custom event
    addEvent(serviceId, action, details) {
        VaultCore.addHistory(serviceId, action, details);
    }
};

window.VaultTimeline = VaultTimeline;