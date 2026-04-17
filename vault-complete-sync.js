// vault-complete-sync.js - Phase 4: Complete Configuration Synchronization
// Keeps Vault, dissident-config.json, and Railway in sync

class VaultSyncManager {
    constructor() {
        this.configPath = 'dissident-config.json';
        this.backupCount = 10;
    }

    // Sync from Vault to dissident-config.json
    async syncToConfig(vaultData, servicesConfig) {
        const config = {
            project: {
                name: "Dissident",
                version: "2.0.0",
                description: "Discord Bot Management Platform"
            },
            components: {},
            discord: {
                applicationId: vaultData.services['dissident-backend']?.DISCORD_CLIENT_ID || "1493639167526174830",
                clientId: vaultData.services['dissident-backend']?.DISCORD_CLIENT_ID || "1493639167526174830",
                clientSecret: null,
                botToken: null,
                oauthRedirectUri: vaultData.services['dissident-backend']?.FRONTEND_URL 
                    ? `${vaultData.services['dissident-backend'].FRONTEND_URL}/api/auth/discord/callback`
                    : "https://dissident-api-backend-production.up.railway.app/api/auth/discord/callback",
                scopes: ["identify", "guilds", "email"]
            },
            railway: servicesConfig.railway,
            domains: {},
            features: servicesConfig.features
        };

        servicesConfig.services.forEach(service => {
            const serviceData = vaultData.services[service.id] || {};
            
            const component = {
                name: service.name,
                repo: `https://github.com/slothyproject/${service.id === 'tokens-vault' ? 'Tokens-Vault' : service.id === 'dissident-backend' ? 'Dissident-api-backend' : 'Dissident-Website'}`,
                deployUrl: serviceData.FRONTEND_URL || service.deployUrl,
                railwayUrl: service.railwayUrl,
                railwayService: service.railwayService,
                port: service.port,
                type: service.type
            };

            if (service.database) {
                component.database = service.database;
            }

            const componentKey = service.id === 'dissident-backend' ? 'backend' 
                : service.id === 'dissident-website' ? 'frontend'
                : service.id === 'discord-bot' ? 'bot'
                : service.id === 'tokens-vault' ? 'vault'
                : service.id;

            config.components[componentKey] = component;
            config.domains[componentKey === 'frontend' ? 'website' : componentKey] = component.deployUrl;
        });

        // Save config
        await this.saveConfig(config);
        
        return config;
    }

    // Save config to file (in browser, trigger download)
    async saveConfig(config) {
        const content = JSON.stringify(config, null, 2);
        
        // In browser, download the file
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dissident-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Also update localStorage for reference
        localStorage.setItem('dissident_config_cache', JSON.stringify(config));
        
        return true;
    }

    // Load config from localStorage cache
    loadConfigCache() {
        const cached = localStorage.getItem('dissident_config_cache');
        return cached ? JSON.parse(cached) : null;
    }

    // Generate .env file
    generateEnvFile(serviceId, vaultData, servicesConfig) {
        const service = servicesConfig.services.find(s => s.id === serviceId);
        if (!service) return null;

        const serviceData = vaultData.services[serviceId] || {};
        
        let content = `# ${service.name} Environment Variables\n`;
        content += `# Generated: ${new Date().toISOString()}\n\n`;
        
        service.variables.forEach(variable => {
            const value = serviceData[variable.key];
            if (value) {
                const needsQuotes = value.includes(' ') || value.includes('$') || value.includes('&');
                const formattedValue = needsQuotes ? `"${value}"` : value;
                content += `${variable.key}=${formattedValue}\n`;
            }
        });

        return { filename: `${serviceId}.env`, content };
    }

    // Generate Railway CLI commands
    generateRailwayCli(serviceId, vaultData, servicesConfig) {
        const service = servicesConfig.services.find(s => s.id === serviceId);
        if (!service) return null;

        const serviceData = vaultData.services[serviceId] || {};
        const projectId = servicesConfig.railway.projectId;
        
        const lines = [
            `# Deploy ${service.name} to Railway`,
            ``,
            `# 1. Login`,
            `railway login`,
            ``,
            `# 2. Link`,
            `railway link --project ${projectId} --service ${service.railwayService}`,
            ``,
            `# 3. Set variables`,
            ...Object.entries(serviceData).map(([key, value]) => {
                const escaped = value.replace(/"/g, '\\"');
                return `railway variables set "${key}=${escaped}"`;
            }),
            ``,
            `# 4. Deploy`,
            `railway up`,
            ``,
            `# 5. Verify`,
            `curl ${service.deployUrl}/api/health`
        ];

        return lines.join('\n');
    }

    // Validate configuration
    validateConfig(vaultData, servicesConfig) {
        const errors = [];
        const warnings = [];
        const stats = {
            totalServices: servicesConfig.services.length,
            configuredServices: 0,
            totalVariables: 0,
            missingRequired: 0
        };

        servicesConfig.services.forEach(service => {
            const serviceData = vaultData.services[service.id] || {};
            const hasData = Object.keys(serviceData).length > 0;
            
            if (hasData) {
                stats.configuredServices++;
            }

            service.variables.forEach(variable => {
                const value = serviceData[variable.key];
                
                if (value) {
                    stats.totalVariables++;
                } else if (variable.required) {
                    stats.missingRequired++;
                    errors.push({
                        service: service.name,
                        variable: variable.key,
                        message: `Required variable ${variable.key} is not set`
                    });
                }

                // Check URL format
                if (variable.type === 'url' && value && !value.match(/^https?:\/\//)) {
                    warnings.push({
                        service: service.name,
                        variable: variable.key,
                        message: `URL should start with http:// or https://`
                    });
                }

                // Check secret strength
                if (variable.type === 'secret' && value && value.length < 20) {
                    warnings.push({
                        service: service.name,
                        variable: variable.key,
                        message: `Secret is less than 20 characters (consider stronger)`
                    });
                }
            });
        });

        return { 
            valid: errors.length === 0, 
            errors, 
            warnings, 
            stats 
        };
    }

    // Generate status report
    generateStatusReport(vaultData, servicesConfig) {
        const validation = this.validateConfig(vaultData, servicesConfig);
        
        let report = `# Dissident Platform Status Report\n`;
        report += `# Generated: ${new Date().toISOString()}\n\n`;
        
        report += `## Summary\n`;
        report += `- Total Services: ${validation.stats.totalServices}\n`;
        report += `- Configured: ${validation.stats.configuredServices}\n`;
        report += `- Total Variables: ${validation.stats.totalVariables}\n`;
        report += `- Missing Required: ${validation.stats.missingRequired}\n`;
        report += `- Status: ${validation.valid ? '✅ Valid' : '❌ Has Errors'}\n\n`;

        report += `## Service Status\n`;
        servicesConfig.services.forEach(service => {
            const serviceData = vaultData.services[service.id] || {};
            const varCount = Object.keys(serviceData).length;
            const status = varCount > 0 ? '✅ Configured' : '⚠️ Not Configured';
            
            report += `- **${service.name}**: ${status} (${varCount} variables)\n`;
        });

        if (validation.errors.length > 0) {
            report += `\n## Errors\n`;
            validation.errors.forEach(error => {
                report += `- ❌ ${error.service}: ${error.message}\n`;
            });
        }

        if (validation.warnings.length > 0) {
            report += `\n## Warnings\n`;
            validation.warnings.forEach(warning => {
                report += `- ⚠️ ${warning.service}: ${warning.message}\n`;
            });
        }

        return report;
    }

    // Export for backup
    createBackup(vaultData, servicesConfig) {
        const backup = {
            timestamp: new Date().toISOString(),
            version: '2.0.0',
            vaultData: vaultData,
            servicesConfig: servicesConfig
        };

        const backups = JSON.parse(localStorage.getItem('dissident_vault_backups_v2') || '[]');
        backups.unshift(backup);
        
        if (backups.length > 10) {
            backups.pop();
        }

        localStorage.setItem('dissident_vault_backups_v2', JSON.stringify(backups));
        
        return backup;
    }

    // Restore from backup
    restoreBackup(index) {
        const backups = JSON.parse(localStorage.getItem('dissident_vault_backups_v2') || '[]');
        if (index >= backups.length) return null;
        
        return backups[index].vaultData;
    }

    // Get backups list
    getBackups() {
        return JSON.parse(localStorage.getItem('dissident_vault_backups_v2') || '[]');
    }

    // Download all configs as zip (would need JSZip library)
    exportAllConfigs(vaultData, servicesConfig) {
        const configs = {};
        
        // dissident-config.json
        configs['dissident-config.json'] = this.syncToConfig(vaultData, servicesConfig);
        
        // .env files for each service
        servicesConfig.services.forEach(service => {
            const envFile = this.generateEnvFile(service.id, vaultData, servicesConfig);
            if (envFile) {
                configs[`${service.id}.env`] = envFile.content;
            }
        });

        // Status report
        configs['STATUS.md'] = this.generateStatusReport(vaultData, servicesConfig);

        // Railway CLI commands
        servicesConfig.services.forEach(service => {
            const cli = this.generateRailwayCli(service.id, vaultData, servicesConfig);
            if (cli) {
                configs[`deploy-${service.id}.sh`] = cli;
            }
        });

        return configs;
    }

    // Auto-sync (called periodically)
    async autoSync(vaultData, servicesConfig) {
        // Create backup first
        this.createBackup(vaultData, servicesConfig);
        
        // Update config cache
        await this.syncToConfig(vaultData, servicesConfig);
        
        console.log('Auto-sync completed at', new Date().toISOString());
    }
}

// Export
window.VaultSyncManager = VaultSyncManager;
