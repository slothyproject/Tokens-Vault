/**
 * Unified Services Configuration
 * This replaces/extends vault-services.json with comprehensive service definitions
 * for Token Vault to manage ALL Dissident services
 */

const unifiedServices = {
    version: "3.0.0",
    lastUpdated: "2026-04-18",
    
    // Service definitions
    services: {
        "dissident-bot": {
            id: "dissident-bot",
            name: "Dissident Bot",
            description: "Discord bot with moderation, verification, and economy",
            type: "discord-bot",
            railwayService: "dissident-bot",
            deployUrl: "https://dissident-bot-production.up.railway.app",
            healthPort: 8081,
            icon: "🤖",
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
                    sensitive: true
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
                    default: "sqlite",
                    required: true
                },
                {
                    key: "DISSIDENT_DB_PATH",
                    category: "database",
                    description: "Path to SQLite database",
                    type: "text",
                    default: "data/dissident.db"
                },
                {
                    key: "DATABASE_URL",
                    category: "database",
                    description: "PostgreSQL connection URL",
                    type: "url",
                    placeholder: "postgresql://user:pass@host/db"
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
                    key: "OLLAMA_BASE_URL",
                    category: "features",
                    description: "Ollama server URL for AI features",
                    type: "url",
                    default: "http://localhost:11434"
                },
                {
                    key: "OLLAMA_MODEL",
                    category: "features",
                    description: "Ollama model to use",
                    type: "text",
                    default: "llama2"
                }
            ]
        },
        
        "dissident-website": {
            id: "dissident-website",
            name: "Dissident Website",
            description: "Frontend static website",
            type: "static",
            railwayService: "Dissident-Website",
            deployUrl: "https://dissident.mastertibbles.co.uk",
            port: 8080,
            icon: "🌐",
            categories: [
                { id: "general", name: "General" },
                { id: "deployment", name: "Deployment" }
            ],
            variables: [
                {
                    key: "FRONTEND_URL",
                    category: "general",
                    description: "Public URL of the website",
                    type: "url",
                    required: true,
                    default: "https://dissident.mastertibbles.co.uk"
                },
                {
                    key: "API_BASE_URL",
                    category: "general",
                    description: "Backend API base URL",
                    type: "url",
                    required: true,
                    default: "https://dissident-api-backend-production.up.railway.app"
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
                    key: "DISCORD_INVITE_URL",
                    category: "general",
                    description: "Discord server invite link",
                    type: "url"
                }
            ]
        },
        
        "dissident-api-backend": {
            id: "dissident-api-backend",
            name: "Dissident API Backend",
            description: "Backend API for Dissident platform",
            type: "node",
            railwayService: "dissident-api-backend",
            port: 3000,
            icon: "⚙️",
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
                    required: true
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
                    sensitive: true
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
                    key: "DATABASE_URL",
                    category: "database",
                    description: "PostgreSQL database URL",
                    type: "url",
                    required: true,
                    sensitive: true
                }
            ]
        },
        
        "dissident-tokens-vault": {
            id: "dissident-tokens-vault",
            name: "Token Vault",
            description: "Centralized variable management",
            type: "static",
            railwayService: "dissident-tokens-vault",
            deployUrl: "https://dissident-tokens-vault-production.up.railway.app",
            icon: "🔐",
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
                    key: "DISCORD_WEBHOOK_URL",
                    category: "integration",
                    description: "Discord webhook for notifications",
                    type: "url"
                }
            ]
        }
    },
    
    // Shared variables across services
    shared: {
        "DISCORD_TOKEN": {
            services: ["dissident-bot", "dissident-api-backend"],
            description: "Shared Discord bot token"
        },
        "DISCORD_CLIENT_ID": {
            services: ["dissident-bot", "dissident-api-backend", "dissident-website"],
            description: "Shared Discord OAuth client ID"
        },
        "DATABASE_URL": {
            services: ["dissident-bot", "dissident-api-backend"],
            description: "Shared database connection"
        }
    },
    
    // Railway configuration
    railway: {
        projectId: "resplendent-fulfillment",
        services: [
            { name: "dissident-bot", serviceId: "bot-service-id" },
            { name: "Dissident-Website", serviceId: "website-service-id" },
            { name: "dissident-api-backend", serviceId: "api-service-id" },
            { name: "dissident-tokens-vault", serviceId: "vault-service-id" }
        ]
    }
};

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = unifiedServices;
}