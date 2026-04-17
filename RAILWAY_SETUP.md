# Dissident Token Vault - Railway Deployment Guide

## Overview
Static site with client-side AES-256 encryption for secure token management.

## Repository
https://github.com/slothyproject/Tokens-Vault

## Railway Configuration

### Service Settings
- **Service Name**: `dissident-tokens-vault`
- **Root Directory**: `/` (repository root)
- **Build Command**: `docker build -t tokens-vault .`
- **Start Command**: `nginx -g 'daemon off;'`

### Domain Configuration
**Custom Domain**: `dissidenttokens.mastertibbles.co.uk`

Add in Railway Dashboard:
1. Go to Service Settings → Domains
2. Click "Custom Domain"
3. Enter: `dissidenttokens.mastertibbles.co.uk`
4. Follow DNS instructions (add CNAME record)

### DNS Configuration (for your domain provider)
```
Type: CNAME
Name: dissidenttokens
Value: [Railway provided endpoint]
TTL: 3600
```

## Environment Variables

The Token Vault uses client-side encryption, so no sensitive server-side variables are needed:

```bash
# Optional: For future server-side features
NODE_ENV=production
VAULT_VERSION=1.0.0
```

## Deployment Methods

### Method 1: GitHub Integration (Recommended)
1. In Railway Dashboard, click "New"
2. Select "GitHub Repo"
3. Choose `slothyproject/Tokens-Vault`
4. Railway auto-detects Dockerfile
5. Deploy automatically on every push to main

### Method 2: Manual Deploy
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link to project
railway link --project resplendent-fulfillment

# Deploy
railway up
```

### Method 3: Railway Dashboard
1. Go to: https://railway.app/project/resplendent-fulfillment
2. Click "New"
3. Select "GitHub Repo" → `Tokens-Vault`
4. Configure service name as `dissident-tokens-vault`
5. Add custom domain
6. Deploy

## Health Check
Test deployment:
```bash
curl https://dissidenttokens.mastertibbles.co.uk
# Should return 200 with HTML content
```

## Security Features

1. **Client-Side Encryption**: All tokens encrypted with AES-256 in browser
2. **No Server Storage**: Only encrypted blobs stored in localStorage
3. **HTTPS Only**: Railway provides SSL automatically
4. **Security Headers**: Nginx configured with security headers

## File Structure

```
Tokens-Vault/
├── .github/
│   └── workflows/
│       └── deploy.yml       # Auto-deploy on push
├── Dockerfile               # Nginx container
├── railway.toml            # Railway configuration
├── index.html              # Main application
└── README.md               # Documentation
```

## Troubleshooting

### Deployment Fails
1. Check Dockerfile builds locally: `docker build -t test .`
2. Verify GitHub Actions secrets: `RAILWAY_TOKEN`

### Custom Domain Issues
1. Verify DNS CNAME record is propagated: `nslookup dissidenttokens.mastertibbles.co.uk`
2. Check Railway domain status shows "Healthy"

### 502 Bad Gateway
1. Check container health: `docker run -p 8080:80 tokens-vault`
2. Verify nginx.conf is valid

## Support

- **Railway Docs**: https://docs.railway.app/
- **Project**: Dissident Platform
- **Contact**: Part of Dissident Discord Bot Management

---

**Last Updated**: 2026-04-17
**Version**: 1.0.0
