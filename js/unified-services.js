/**
 * Unified Services Configuration
 * Central configuration for ALL Dissident services
 * Token Vault uses this as the single source of truth
 */

const unifiedServices = {
    version: "3.1.0",
    lastUpdated: "2026-04-18",
    
    // Service definitions - ALL 6 services
    services: {
        // ============================================
        // 1. Discord Bot
        // ============================================
        "dissident-bot": {
            id: "dissident-bot",
            name: "Discord Bot",
            description: "Discord bot with moderation, verification, and economy",
            type: "discord-bot",
            railwayService: "bot",
            deployUrl: "https://dissidentbot.mastertibbles.co.uk",
            healthPort: 8081,
            icon: "🤖",
            color: "#5865F2",
            categories: [
                { id: "discord", name: "Discord Configuration" },
                { id: "database", name: "Database" },
                { id: "features", name: "Feature Toggles" }
            ],
            variables: [
                {
                    key: "DISSIDENT_TOKEN",
                    category: "discord",
                    description: "Discord bot token from https://discord.com/developers/applications",
                    type: "secret",
                    required: true,
                    sensitive: true,
                    validation: "discordToken"
                },
                {
                    key: "DISCORD_CLIENT_ID",
                    category: "discord",
                    description: "Discord OAuth client ID",
                    type: "text",
                    required: true
                },
                {
                    key: "DISCORD_CLIENT_SECRET",
                    category: "discord",
                    description: "Discord OAuth client secret",
                    type: "secret",
                    required: true,
                    sensitive: true
                },
                {
                    key: "DISSIDENT_DB_DRIVER",
                    category: "database",
                    description: "Database driver: sqlite or postgresql",
                    type: "select",
                    options: ["sqlite", "postgresql"],
                    default: "postgresql",
                    required: true
                },
                {
                    key: "DATABASE_URL",
                    category: "database",
                    description: "PostgreSQL connection URL (shared with API)",
                    type: "secret",
                    required: true,
                    sensitive: true,
                    validation: "databaseUrl",
                    shared: true
                },
                {
                    key: "DISSIDENT_DB_PATH",
                    category: "database",
                    description: "Path to SQLite database (if using sqlite)",
                    type: "text",
                    default: "data/dissident.db"
                },
                {
                    key: "ENABLE_MODERATION",
                    category: "features",
                    description: "Enable moderation commands",
                    type: "boolean",
                    default: "true"
                },
                {
                    key: "ENABLE_VERIFICATION",
                    category: "features",
                    description: "Enable verification system",
                    type: "boolean",
                    default: "true"
                },
                {
                    key: "ENABLE_ECONOMY",
                    category: "features",
                    description: "Enable economy system",
                    type: "boolean",
                    default: "true"
                },
                {
                    key: "ENABLE_AI",
                    category: "features",
                    description: "Enable AI/LLM features",
                    type: "boolean",
                    default: "false"
                },
                {
                    key: "REDIS_URL",
                    category: "features",
                    description: "Redis connection URL for caching",
                    type: "secret",
                    shared: true
                },
                {
                    key: "GITHUB_TOKEN",
                    category: "features",
                    description: "GitHub token for marketplace features",
                    type: "secret",
                    sensitive: true
                }
            ],
            dependencies: ["dissident-postgres", "dissident-redis"],
            healthCheck: {
                enabled: true,
                type: "railway",
                endpoint: "/health"
            }
        },
        
        // ============================================
        // 2. Website Frontend
        // ============================================
        "dissident-website": {
            id: "dissident-website",
            name: "Website",
            description: "Frontend static website",
            type: "static",
            railwayService: "Dissident-Website",
            deployUrl: "https://dissident.mastertibbles.co.uk",
            port: 8080,
            icon: "🌐",
            color: "#10B981",
            categories: [
                { id: "general", name: "General" },
                { id: "deployment", name: "Deployment" },
                { id: "integrations", name: "Integrations" }
            ],
            variables: [
                {
                    key: "FRONTEND_URL",
                    category: "general",
                    description: "Public URL of the website",
                    type: "url",
                    required: true,
                    default: "https://dissident.mastertibbles.co.uk",
                    validation: "url"
                },
                {
                    key: "API_BASE_URL",
                    category: "integrations",
                    description: "Backend API base URL",
                    type: "url",
                    required: true,
                    default: "https://dissident-api-backend-production.up.railway.app",
                    validation: "url"
                },
                {
                    key: "NODE_ENV",
                    category: "deployment",
                    description: "Node environment",
                    type: "select",
                    options: ["development", "production"],
                    default: "production",
                    required: true
                },
                {
                    key: "DISCORD_CLIENT_ID",
                    category: "integrations",
                    description: "Discord OAuth client ID for login",
                    type: "text",
                    required: true,
                    shared: true
                },
                {
                    key: "DISCORD_INVITE_URL",
                    category: "integrations",
                    description: "Discord server invite link",
                    type: "url",
                    validation: "url"
                },
                {
                    key: "WEBSITE_DB_URL",
                    category: "integrations",
                    description: "Database URL for website content",
                    type: "secret",
                    sensitive: true
                }
            ],
            dependencies: ["dissident-api-backend"],
            healthCheck: {
                enabled: true,
                type: "http",
                endpoint: "/",
                expectedStatus: 200
            }
        },
        
        // ============================================
        // 3. Backend API
        // ============================================
        "dissident-api-backend": {
            id: "dissident-api-backend",
            name: "API Backend",
            description: "Backend API for Dissident platform",
            type: "node",
            railwayService: "Dissident-api-backend",
            port: 3000,
            icon: "⚙️",
            color: "#F59E0B",
            categories: [
                { id: "server", name: "Server Configuration" },
                { id: "discord", name: "Discord Integration" },
                { id: "database", name: "Database" }
            ],
            variables: [
                {
                    key: "PORT",
                    category: "server",
                    description: "Server port",
                    type: "number",
                    default: "3000",
                    required: true,
                    validation: "port"
                },
                {
                    key: "NODE_ENV",
                    category: "server",
                    description: "Node environment",
                    type: "select",
                    options: ["development", "production"],
                    default: "production",
                    required: true
                },
                {
                    key: "DISCORD_TOKEN",
                    category: "discord",
                    description: "Discord bot token (shared with bot)",
                    type: "secret",
                    required: true,
                    sensitive: true,
                    validation: "discordToken",
                    shared: true
                },
                {
                    key: "DISCORD_CLIENT_ID",
                    category: "discord",
                    description: "Discord OAuth client ID",
                    type: "text",
                    required: true,
                    shared: true
                },
                {
                    key: "DISCORD_CLIENT_SECRET",
                    category: "discord",
                    description: "Discord OAuth client secret",
                    type: "secret",
                    required: true,
                    sensitive: true
                },
                {
                    key: "DATABASE_URL",
                    category: "database",
                    description: "PostgreSQL database URL (shared)",
                    type: "secret",
                    required: true,
                    sensitive: true,
                    validation: "databaseUrl",
                    shared: true
                },
                {
                    key: "REDIS_URL",
                    category: "server",
                    description: "Redis cache URL",
                    type: "secret",
                    shared: true
                },
                {
                    key: "JWT_SECRET",
                    category: "server",
                    description: "JWT signing secret",
                    type: "secret",
                    required: true,
                    sensitive: true
                }
            ],
            dependencies: ["dissident-postgres", "dissident-redis"],
            healthCheck: {
                enabled: true,
                type: "http",
                endpoint: "/health",
                expectedStatus: 200
            }
        },
        
        // ============================================
        // 4. Token Vault (this service)
        // ============================================
        "dissident-tokens-vault": {
            id: "dissident-tokens-vault",
            name: "Token Vault",
            description: "Centralized variable management hub",
            type: "static",
            railwayService: "dissident-tokens-vault",
            deployUrl: "https://dissident-tokens-vault-production.up.railway.app",
            icon: "🔐",
            color: "#8B5CF6",
            categories: [
                { id: "integration", name: "Service Integration" },
                { id: "security", name: "Security" }
            ],
            variables: [
                {
                    key: "RAILWAY_TOKEN",
                    category: "integration",
                    description: "Railway API token for deployment",
                    type: "secret",
                    required: true,
                    sensitive: true
                },
                {
                    key: "GITHUB_TOKEN",
                    category: "integration",
                    description: "GitHub token for syncing config",
                    type: "secret",
                    required: true,
                    sensitive: true
                },
                {
                    key: "VAULT_PASSWORD_HASH",
                    category: "security",
                    description: "Password hash for vault access",
                    type: "secret",
                    required: true,
                    sensitive: true
                },
                {
                    key: "DISCORD_WEBHOOK_URL",
                    category: "integration",
                    description: "Discord webhook for notifications (optional)",
                    type: "url",
                    validation: "url"
                },
                {
                    key: "REFRESH_INTERVAL",
                    category: "integration",
                    description: "Dashboard refresh interval in seconds",
                    type: "number",
                    default: "30",
                    validation: "number"
                }
            ],
            isHub: true,
            manages: ["dissident-bot", "dissident-website", "dissident-api-backend", "dissident-postgres", "dissident-redis", "dissident-website-data"]
        },
        
        // ============================================
        // 5. PostgreSQL Database
        // ============================================
        "dissident-postgres": {
            id: "dissident-postgres",
            name: "PostgreSQL",
            description: "Main PostgreSQL database for bot and API",
            type: "database",
            railwayService: "Postgres",
            icon: "🐘",
            color: "#336791",
            categories: [
                { id: "connection", name: "Connection" },
                { id: "config", name: "Configuration" }
            ],
            variables: [
                {
                    key: "POSTGRES_USER",
                    category: "connection",
                    description: "Database username",
                    type: "text",
                    default: "postgres",
                    required: true
                },
                {
                    key: "POSTGRES_PASSWORD",
                    category: "connection",
                    description: "Database password",
                    type: "secret",
                    required: true,
                    sensitive: true
                },
                {
                    key: "POSTGRES_DB",
                    category: "connection",
                    description: "Database name",
                    type: "text",
                    default: "dissident",
                    required: true
                },
                {
                    key: "DATABASE_URL",
                    category: "connection",
                    description: "Full connection URL (shared)",
                    type: "secret",
                    required: true,
                    sensitive: true,
                    validation: "databaseUrl",
                    shared: true
                },
                {
                    key: "POSTGRES_PORT",
                    category: "config",
                    description: "PostgreSQL port",
                    type: "number",
                    default: "5432",
                    validation: "port"
                }
            ],
            healthCheck: {
                enabled: true,
                type: "railway",
                endpoint: "service-status"
            }
        },
        
        // ============================================
        // 6. Redis Cache
        // ============================================
        "dissident-redis": {
            id: "dissident-redis",
            name: "Redis",
            description: "Redis cache for bot and API",
            type: "redis",
            railwayService: "redis",
            icon: "🔴",
            color: "#DC382D",
            categories: [
                { id: "connection", name: "Connection" },
                { id: "config", name: "Configuration" }
            ],
            variables: [
                {
                    key: "REDIS_URL",
                    category: "connection",
                    description: "Redis connection URL (shared)",
                    type: "secret",
                    required: true,
                    sensitive: true,
                    shared: true
                },
                {
                    key: "REDIS_HOST",
                    category: "connection",
                    description: "Redis hostname",
                    type: "text",
                    default: "localhost"
                },
                {
                    key: "REDIS_PORT",
                    category: "config",
                    description: "Redis port",
                    type: "number",
                    default: "6379",
                    validation: "port"
                },
                {
                    key: "REDIS_PASSWORD",
                    category: "connection",
                    description: "Redis password (if required)",
                    type: "secret",
                    sensitive: true
                }
            ],
            healthCheck: {
                enabled: true,
                type: "railway",
                endpoint: "service-status"
            }
        },
        
        // ============================================
        // 7. Website Data (PostgreSQL for website)
        // ============================================
        "dissident-website-data": {
            id: "dissident-website-data",
            name: "Website Data",
            description: "PostgreSQL database for website content",
            type: "database",
            railwayService: "Dissident Website Data",
            icon: "💾",
            color: "#06B6D4",
            categories: [
                { id: "connection", name: "Connection" }
            ],
            variables: [
                {
                    key: "WEBSITE_DB_URL",
                    category: "connection",
                    description: "Database URL for website content",
                    type: "secret",
                    required: true,
                    sensitive: true,
                    validation: "databaseUrl"
                },
                {
                    key: "WEBSITE_DB_USER",
                    category: "connection",
                    description: "Database username",
                    type: "text"
                },
                {
                    key: "WEBSITE_DB_PASSWORD",
                    category: "connection",
                    description: "Database password",
                    type: "secret",
                    sensitive: true
                }
            ],
            healthCheck: {
                enabled: true,
                type: "railway",
                endpoint: "service-status"
            }
        }
    },
    
    // Shared variables across services
    shared: {
        "DISCORD_TOKEN": {
            services: ["dissident-bot", "dissident-api-backend"],
            description: "Discord bot token - shared between bot and API"
        },
        "DISCORD_CLIENT_ID": {
            services: ["dissident-bot", "dissident-api-backend", "dissident-website"],
            description: "Discord OAuth client ID"
        },
        "DATABASE_URL": {
            services: ["dissident-bot", "dissident-api-backend"],
            description: "PostgreSQL connection URL"
        },
        "REDIS_URL": {
            services: ["dissident-bot", "dissident-api-backend"],
            description: "Redis cache connection URL"
        }
    },
    
    // Railway configuration
    railway: {
        projectId: "resplendent-fulfillment",
        services: [
            { name: "bot", serviceId: "bot-service-id" },
            { name: "Dissident-Website", serviceId: "website-service-id" },
            { name: "Dissident-api-backend", serviceId: "api-service-id" },
            { name: "dissident-tokens-vault", serviceId: "vault-service-id" },
            { name: "Postgres", serviceId: "postgres-service-id" },
            { name: "redis", serviceId: "redis-service-id" },
            { name: "Dissident Website Data", serviceId: "website-data-service-id" }
        ]
    },
    
    // Helper methods
    getService(serviceId) {
        return this.services[serviceId] || null;
    },
    
    getAllServices() {
        return Object.values(this.services);
    },
    
    getServicesByType(type) {
        return Object.values(this.services).filter(s => s.type === type);
    },
    
    getSharedVariableServices(key) {
        return this.shared[key]?.services || [];
    },
    
    getServiceVariables(serviceId) {
        const service = this.getService(serviceId);
        return service?.variables || [];
    },
    
    getTotalVariableCount() {
        return Object.values(this.services).reduce((total, service) => {
            return total + (service.variables?.length || 0);
        }, 0);
    },
    
    getServicesWithHealthCheck() {
        return Object.values(this.services).filter(s => s.healthCheck?.enabled);
    }
};

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = unifiedServices;
}

// Make globally available
window.unifiedServices = unifiedServices;
