# Deploy Token Vault to Railway

## Quick Deploy

### Option 1: One-Click Dashboard (Easiest)
1. Go to: https://railway.app/project/resplendent-fulfillment
2. Click **"New"**
3. Select **GitHub Repo** → `slothyproject/Tokens-Vault`
4. Railway auto-detects Dockerfile
5. Set service name: `dissident-tokens-vault`
6. Deploy!

### Option 2: Command Line
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link and deploy
railway link --project resplendent-fulfillment
railway up
```

## Configuration

### Environment Variables (Optional)
Add these in Railway Dashboard if needed:
```bash
NODE_ENV=production
VAULT_VERSION=1.0.0
```

### Custom Domain Setup
1. In Railway Dashboard, go to Service Settings → Domains
2. Click **"Custom Domain"**
3. Enter: `dissidenttokens.mastertibbles.co.uk`
4. Copy the CNAME target provided
5. Add DNS record with your domain provider:
   ```
   Type: CNAME
   Name: dissidenttokens
   Value: [Railway provided endpoint]
   TTL: 3600
   ```

## Verification

After deployment, verify:
```bash
# Test health endpoint
curl https://dissidenttokens.mastertibbles.co.uk

# Should return HTML content and 200 status
```

## Files Included

- `Dockerfile` - Nginx container with security headers
- `railway.toml` - Railway configuration
- `index.html` - Main vault application
- `.github/workflows/deploy.yml` - Auto-deploy on push

## Auto-Deploy

The repository has GitHub Actions configured. Every push to `main` branch automatically deploys to Railway.

## Support

- Railway Docs: https://docs.railway.app/
- Project: Dissident Platform
