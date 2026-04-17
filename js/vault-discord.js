/**
 * vault-discord.js - Discord webhook notifications for Dissident Token Vault
 * Sends notifications for vault events, deployments, and security alerts
 */

const VaultDiscord = {
    // Configuration
    webhookUrl: null,
    
    // Event types
    events: {
        VAULT_UNLOCKED: { 
            emoji: '🔓', 
            color: 0x3b82f6, 
            title: 'Vault Accessed' 
        },
        VAULT_LOCKED: { 
            emoji: '🔒', 
            color: 0x9ca3af, 
            title: 'Vault Locked' 
        },
        VARIABLE_CHANGED: { 
            emoji: '✏️', 
            color: 0xf59e0b, 
            title: 'Variable Updated' 
        },
        VARIABLE_ADDED: { 
            emoji: '➕', 
            color: 0x10b981, 
            title: 'Variable Added' 
        },
        VARIABLE_DELETED: { 
            emoji: '🗑️', 
            color: 0xef4444, 
            title: 'Variable Deleted' 
        },
        DEPLOYMENT_STARTED: { 
            emoji: '🚀', 
            color: 0x667eea, 
            title: 'Deployment Started' 
        },
        DEPLOYMENT_SUCCESS: { 
            emoji: '✅', 
            color: 0x10b981, 
            title: 'Deployment Successful' 
        },
        DEPLOYMENT_FAILED: { 
            emoji: '❌', 
            color: 0xef4444, 
            title: 'Deployment Failed' 
        },
        BACKUP_CREATED: { 
            emoji: '💾', 
            color: 0x3b82f6, 
            title: 'Backup Created' 
        },
        BACKUP_RESTORED: { 
            emoji: '📥', 
            color: 0x10b981, 
            title: 'Backup Restored' 
        },
        SECURITY_ALERT: { 
            emoji: '⚠️', 
            color: 0xdc2626, 
            title: 'Security Alert' 
        },
        SYNC_COMPLETED: { 
            emoji: '🔄', 
            color: 0x10b981, 
            title: 'Sync Completed' 
        },
        DRIFT_DETECTED: { 
            emoji: '⚡', 
            color: 0xf59e0b, 
            title: 'Configuration Drift Detected' 
        }
    },

    // Initialize
    init(webhookUrl = null) {
        if (webhookUrl) {
            this.webhookUrl = webhookUrl;
            this.validateWebhook();
        } else {
            // Try to load from vault data
            const vaultData = VaultCore.loadVaultData();
            if (vaultData && vaultData.discordWebhook) {
                this.webhookUrl = vaultData.discordWebhook;
            }
        }
        
        if (this.webhookUrl) {
            console.log('[VaultDiscord] Initialized with webhook');
        } else {
            console.log('[VaultDiscord] Initialized - no webhook configured (logging to console)');
        }
    },

    // Set webhook URL
    setWebhook(url) {
        this.webhookUrl = url;
        // Save to vault data
        const vaultData = VaultCore.loadVaultData();
        if (vaultData) {
            vaultData.discordWebhook = url;
            VaultCore.saveVaultData(vaultData);
        }
        console.log('[VaultDiscord] Webhook URL set');
    },

    // Validate webhook URL format
    validateWebhook() {
        if (!this.webhookUrl) return false;
        const webhookPattern = /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/;
        return webhookPattern.test(this.webhookUrl);
    },

    // Send notification
    async notify(eventType, data = {}) {
        const event = this.events[eventType];
        if (!event) {
            console.error(`[VaultDiscord] Unknown event type: ${eventType}`);
            return;
        }

        // Build embed
        const embed = this.buildEmbed(event, eventType, data);
        
        // If webhook configured, send to Discord
        if (this.webhookUrl && this.validateWebhook()) {
            try {
                await this.sendWebhook(embed);
                console.log(`[VaultDiscord] Notification sent: ${eventType}`);
            } catch (error) {
                console.error('[VaultDiscord] Failed to send webhook:', error);
                // Fallback to console
                this.logToConsole(event, data);
            }
        } else {
            // Log to console
            this.logToConsole(event, data);
        }
    },

    // Build Discord embed
    buildEmbed(event, eventType, data) {
        const embed = {
            title: `${event.emoji} ${event.title}`,
            color: event.color,
            timestamp: new Date().toISOString(),
            fields: []
        };

        // Add event-specific fields
        switch (eventType) {
            case 'VAULT_UNLOCKED':
                embed.fields.push(
                    { name: 'Browser', value: navigator.userAgent.split(')')[0] + ')', inline: true },
                    { name: 'Time', value: new Date().toLocaleString(), inline: true }
                );
                break;

            case 'VAULT_LOCKED':
                embed.fields.push(
                    { name: 'Session Duration', value: data.duration || 'Unknown', inline: true },
                    { name: 'Time', value: new Date().toLocaleString(), inline: true }
                );
                break;

            case 'VARIABLE_CHANGED':
            case 'VARIABLE_ADDED':
            case 'VARIABLE_DELETED':
                embed.fields.push(
                    { name: 'Service', value: data.service || 'Unknown', inline: true },
                    { name: 'Variable', value: data.variable || 'Unknown', inline: true }
                );
                if (data.oldValue) {
                    embed.fields.push({ 
                        name: 'Old Value', 
                        value: this.maskSecret(data.oldValue), 
                        inline: false 
                    });
                }
                if (data.newValue) {
                    embed.fields.push({ 
                        name: 'New Value', 
                        value: this.maskSecret(data.newValue), 
                        inline: false 
                    });
                }
                break;

            case 'DEPLOYMENT_STARTED':
            case 'DEPLOYMENT_SUCCESS':
            case 'DEPLOYMENT_FAILED':
                embed.fields.push(
                    { name: 'Service', value: data.service || 'Unknown', inline: true },
                    { name: 'Environment', value: data.environment || 'production', inline: true }
                );
                if (data.error) {
                    embed.fields.push({ 
                        name: 'Error', 
                        value: data.error.substring(0, 1024), 
                        inline: false 
                    });
                }
                if (data.duration) {
                    embed.fields.push({ 
                        name: 'Duration', 
                        value: data.duration, 
                        inline: true 
                    });
                }
                break;

            case 'BACKUP_CREATED':
            case 'BACKUP_RESTORED':
                embed.fields.push(
                    { name: 'Size', value: data.size || 'Unknown', inline: true },
                    { name: 'Time', value: new Date().toLocaleString(), inline: true }
                );
                break;

            case 'SECURITY_ALERT':
                embed.fields.push(
                    { name: 'Alert Type', value: data.alertType || 'Unknown', inline: true },
                    { name: 'Details', value: data.details || 'No details', inline: false }
                );
                if (data.ip) {
                    embed.fields.push({ name: 'IP Address', value: data.ip, inline: true });
                }
                break;

            case 'SYNC_COMPLETED':
                embed.fields.push(
                    { name: 'Service', value: data.service || 'All services', inline: true },
                    { name: 'Variables Synced', value: data.count?.toString() || 'Unknown', inline: true }
                );
                break;

            case 'DRIFT_DETECTED':
                embed.fields.push(
                    { name: 'Service', value: data.service || 'Unknown', inline: true },
                    { name: 'Differences', value: data.differences?.toString() || 'Unknown', inline: true }
                );
                break;
        }

        // Add footer
        embed.footer = {
            text: 'Dissident Token Vault',
            icon_url: 'https://cdn.discordapp.com/embed/avatars/0.png'
        };

        return embed;
    },

    // Send webhook to Discord
    async sendWebhook(embed) {
        const payload = {
            embeds: [embed]
        };

        const response = await fetch(this.webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Discord webhook error: ${response.status}`);
        }
    },

    // Log to console (fallback)
    logToConsole(event, data) {
        console.log(`[Discord Notification] ${event.title}`, {
            event: event,
            data: data,
            timestamp: new Date().toISOString()
        });
    },

    // Mask secret values
    maskSecret(value) {
        if (!value) return 'Empty';
        if (value.length <= 8) return '••••';
        return value.substring(0, 4) + '••••' + value.substring(value.length - 4);
    },

    // Convenience methods for common events
    vaultUnlocked() {
        return this.notify('VAULT_UNLOCKED');
    },

    vaultLocked(duration) {
        return this.notify('VAULT_LOCKED', { duration });
    },

    variableChanged(service, variable, oldValue, newValue) {
        return this.notify('VARIABLE_CHANGED', { service, variable, oldValue, newValue });
    },

    variableAdded(service, variable, newValue) {
        return this.notify('VARIABLE_ADDED', { service, variable, newValue });
    },

    variableDeleted(service, variable) {
        return this.notify('VARIABLE_DELETED', { service, variable });
    },

    deploymentStarted(service, environment = 'production') {
        return this.notify('DEPLOYMENT_STARTED', { service, environment });
    },

    deploymentSuccess(service, environment = 'production', duration) {
        return this.notify('DEPLOYMENT_SUCCESS', { service, environment, duration });
    },

    deploymentFailed(service, environment = 'production', error) {
        return this.notify('DEPLOYMENT_FAILED', { service, environment, error });
    },

    backupCreated(size) {
        return this.notify('BACKUP_CREATED', { size });
    },

    backupRestored(size) {
        return this.notify('BACKUP_RESTORED', { size });
    },

    securityAlert(alertType, details, ip) {
        return this.notify('SECURITY_ALERT', { alertType, details, ip });
    },

    syncCompleted(service, count) {
        return this.notify('SYNC_COMPLETED', { service, count });
    },

    driftDetected(service, differences) {
        return this.notify('DRIFT_DETECTED', { service, differences });
    }
};

// Make available globally
window.VaultDiscord = VaultDiscord;

// Auto-initialize if vault page loaded
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => VaultDiscord.init(), 200);
    });
}