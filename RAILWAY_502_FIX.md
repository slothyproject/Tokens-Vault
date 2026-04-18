# Railway 502 Error Troubleshooting

## Problem
Railway is returning **502 Bad Gateway** after deployment.

This means the Node.js server is crashing on startup.

## Most Likely Causes

### 1. Environment Variables Not Set
Railway needs these variables configured in Dashboard → Variables:

```
OLLAMA_API_KEY=19a27be275154b33ac107ea5b271afee.L68BtHj24_Y2Cv8jiPdAirIi
OLLAMA_BASE_URL=https://api.ollama.com/v1
PORT=8080
NODE_ENV=production
```

**Action Required:**
1. Go to https://railway.app/dashboard
2. Click on "dissident-tokens-vault" project
3. Click on "Variables" tab
4. Add each variable above
5. Click "Save Variables"
6. Railway will auto-redeploy

### 2. Port Mismatch
The server listens on `process.env.PORT || 8080`.
Railway might assign a different port.

**Fix:** Ensure PORT=8080 is set in Railway variables.

### 3. Check Deployment Logs

**Action Required:**
1. Go to Railway Dashboard → Deployments
2. Click on the latest deployment
3. Check logs for error messages

## What to Do Right Now

### Step 1: Verify Variables
Open https://railway.app/dashboard and check:
- [ ] OLLAMA_API_KEY is set
- [ ] OLLAMA_BASE_URL is set to https://api.ollama.com/v1
- [ ] PORT is set to 8080

### Step 2: If Variables Are Missing
1. Add them in Railway Dashboard
2. Click "Redeploy" button
3. Wait 1-2 minutes
4. Test again: https://dissidenttokens.mastertibbles.co.uk/api/health

### Step 3: Check Logs
If still getting 502:
1. Go to Railway Dashboard
2. Click on the deployment
3. Look for red error messages
4. Copy them and share with me

## Test URLs

Try these in your browser:

1. **Health Check:**
   https://dissidenttokens.mastertibbles.co.uk/api/health

2. **Models:**
   https://dissidenttokens.mastertibbles.co.uk/api/ollama/tags

3. **Main Site:**
   https://dissidenttokens.mastertibbles.co.uk

## Expected Results

✅ **Working:**
- Health check returns JSON with `ollamaConfigured: true`
- /api/ollama/tags returns list of models
- Main site loads with vault.html

❌ **Not Working (502):**
- "502 Bad Gateway" nginx error
- "Application failed to respond"

## Next Steps

Please check Railway Dashboard and let me know:
1. Are the environment variables set?
2. What do the deployment logs show?
3. What error do you see when visiting /api/health?

I can help fix once you provide this info!
