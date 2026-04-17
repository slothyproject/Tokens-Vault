# Dissident Token Vault v2.0 - Complete Secret Management System

**Enterprise-grade, client-side encrypted secret management for the Dissident Discord Bot Platform.**

## 🎯 Features

### Core Security
- ✅ **AES-256 Encryption** - All secrets encrypted in browser
- ✅ **Master Password** - PBKDF2 with 10,000 iterations
- ✅ **Client-Side Only** - Server never sees unencrypted data
- ✅ **Session Timeout** - Auto-lock after 30 minutes
- ✅ **Audit Trail** - Complete change history
- ✅ **Rollback Support** - Restore previous versions

### Service Management
- ✅ **Multi-Service Support** - Website, Backend, Discord Bot, Vault
- ✅ **Category Organization** - Discord, Security, Database, Deployment
- ✅ **Variable Templates** - Pre-defined schemas per service
- ✅ **Validation** - Required fields, URL format, secret strength

### Railway Integration
- ✅ **Direct API Deployment** - Deploy secrets from vault UI
- ✅ **Real-time Status** - Monitor deployment progress
- ✅ **Health Checks** - Automatic service verification
- ✅ **CLI Generation** - Export deploy scripts

### Automation
- ✅ **One-Command Deploy** - `master-controller.ps1 deploy-vault`
- ✅ **Config Sync** - Auto-update dissident-config.json
- ✅ **Backup System** - Automatic encrypted backups
- ✅ **Batch Operations** - Deploy all services at once

## 📁 Files

```
Dissident-Tokens-Vault/
├── index.html                  # Main vault application
├── vault-services.json         # Service definitions
├── vault-data.js               # Encryption & storage
├── vault-railway.js            # Railway API client
├── vault-railway-api.js        # Direct Railway GraphQL API
├── vault-sync.js               # Config synchronization
├── vault-complete-sync.js      # Full sync manager
├── Dockerfile                  # Container configuration
├── nginx.conf                  # Nginx server config
├── railway.toml               # Railway deployment config
├── deploy.bat                 # Windows deployment script
├── README.md                  # This file
└── .github/workflows/
    └── deploy.yml             # Auto-deploy on push
```

## 🚀 Quick Start

### 1. Access the Vault
```
https://dissidenttokens.mastertibbles.co.uk
```

### 2. Set Master Password (First Time)
1. Create a strong master password
2. This encrypts all your secrets
3. **Never forget it** - there's no recovery

### 3. Import Existing Secrets
1. Click "Import tokens.env" in sidebar
2. Paste your tokens.env content
3. Automatically mapped to services

### 4. Deploy to Railway
1. Add your Railway API token (Settings)
2. Select a service
3. Click "Deploy to Railway"
4. Watch real-time deployment status

## 🛠️ Automation

### PowerShell Controller
```powershell
# Show status
.\master-controller.ps1 -Action status

# Deploy vault
.\master-controller.ps1 -Action deploy-vault

# Deploy all services
.\master-controller.ps1 -Action deploy-all

# Sync configuration
.\master-controller.ps1 -Action sync-config

# Create backup
.\master-controller.ps1 -Action backup
```

### Windows Batch
```batch
# Quick deploy
deploy.bat
```

## 🔐 Security Architecture

### Encryption Flow
1. Master password → PBKDF2 → 256-bit key
2. Secrets encrypted with AES-256-CBC
3. Ciphertext stored in localStorage
4. **Key never leaves browser**

### Authentication
- Password hashed with bcrypt
- Salt stored with metadata
- Session key in memory only
- Auto-timeout after 30 min

### Audit Trail
Every action logged:
- Variable create/update/delete
- Service deployment
- Import/export operations
- Backup/restore

## 🌐 Service Configuration

### Dissident Website (Frontend)
- **Port**: 8080
- **Variables**: FRONTEND_URL, API_BASE_URL

### Dissident API Backend
- **Port**: 3000
- **Variables**: DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_BOT_TOKEN, JWT_SECRET, DATABASE_URL

### Discord Bot
- **Variables**: BOT_TOKEN, CLIENT_ID

### Token Vault (This Service)
- **Port**: 8080
- **Variables**: NODE_ENV, PORT

## 📊 Railway Integration

### Getting API Token
1. Go to Railway Dashboard → Account → Tokens
2. Create new token
3. Paste in vault Settings

### Deployment Process
1. **Connect** - Validate API token
2. **Update** - Set environment variables
3. **Deploy** - Trigger Railway deployment
4. **Verify** - Health check endpoint
5. **Complete** - Service online

## 🔄 Configuration Sync

### Vault → dissident-config.json
- Service URLs updated automatically
- Sensitive values masked (****)
- Version controlled

### Vault → Railway
- Direct API deployment
- Real-time synchronization
- Batch variable updates

### Import/Export
- tokens.env → Vault (structured import)
- Vault → .env files (per service)
- Full backup → Encrypted JSON

## 🆘 Troubleshooting

### "Connection Refused" Error
- Wait 2-3 minutes for deployment
- Check Railway dashboard for status
- Verify healthcheck path is set to `/`

### "Invalid Password"
- Master password is **not recoverable**
- Clear localStorage to reset (loses all data)

### "Railway Token Invalid"
- Get new token from Railway dashboard
- Ensure token has proper permissions

## 📚 Documentation

- **GitHub**: https://github.com/slothyproject/Tokens-Vault
- **Live URL**: https://dissidenttokens.mastertibbles.co.uk
- **Railway**: https://railway.app/project/resplendent-fulfillment

## 🔒 Security Best Practices

1. **Use strong master password** (20+ characters)
2. **Enable auto-lock** (default: 30 min)
3. **Regular backups** (automated)
4. **Rotate secrets** periodically
5. **Never share master password**
6. **Use Railway token** (not CLI) for automation

## 🎉 Complete Implementation

All 6 phases implemented:
- ✅ Phase 1: Deployment fixes (port 8080, healthcheck)
- ✅ Phase 2: Enhanced vault UI (master password, services)
- ✅ Phase 3: Railway API integration (direct deployment)
- ✅ Phase 4: Config synchronization (auto-sync)
- ✅ Phase 5: Automation scripts (one-command deploy)
- ✅ Phase 6: Security & audit (enterprise-grade)

## 📞 Support

**Part of the Dissident Discord Bot Management Platform**

- Backend API: https://github.com/slothyproject/Dissident-api-backend
- Frontend: https://github.com/slothyproject/Dissident-Website

---

**Version**: 2.0.0  
**Last Updated**: 2026-04-17  
**License**: Private Use Only
