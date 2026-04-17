// vault-sync.js - Configuration synchronization for Token Vault

const VaultSync = {
    // Sync vault data to dissident-config.json format
    syncToConfig(vaultData, servicesConfig) {
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

        return config;
    },

    // Generate .env file content
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
    },

    // Validate configuration
    validateConfig(vaultData, servicesConfig) {
        const errors = [];
        const warnings = [];

        servicesConfig.services.forEach(service => {
            const serviceData = vaultData.services[service.id] || {};
            
            service.variables.forEach(variable => {
                if (variable.required && !serviceData[variable.key]) {
                    errors.push({
                        service: service.name,
                        variable: variable.key,
                        message: `Required variable ${variable.key} is not set`
                    });
                }
            });
        });

        return { valid: errors.length === 0, errors, warnings };
    },

    // Download helper
    downloadFile(content, filename, type = 'text/plain') {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = VaultSync;
}
