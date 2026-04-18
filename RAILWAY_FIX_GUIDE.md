# Fix Railway Ollama Configuration

## Problem
OLLAMA_BASE_URL is set to wrong value on Railway.

Current (WRONG): `https://ollama.com/api`
Should be: `https://api.ollama.com/v1`

## Step-by-Step Fix

### 1. Open Railway Dashboard
Go to: https://railway.app/dashboard

### 2. Click on "Central Hub" service

### 3. Click "Variables" tab at the top

### 4. Find OLLAMA_BASE_URL
You will see something like:
```
OLLAMA_BASE_URL = https://ollama.com/api   ❌ WRONG
```

### 5. Click the PENCIL/EDIT icon next to OLLAMA_BASE_URL

### 6. Change the value to:
```
https://api.ollama.com/v1
```

### 7. Click "Save" or "Update"

### 8. Railway will auto-redeploy (wait 1 minute)

### 9. Test
Go to your vault and click "Test Connection"

## Alternative: If you can't find Variables tab

1. Go to: https://railway.app/project/YOUR_PROJECT_ID/variables
2. Or look for a "Settings" tab, then "Environment Variables"

## What Success Looks Like

After fixing, when you visit:
https://dissidenttokens.mastertibbles.co.uk/api/health

You should see:
```json
{
  "status": "ok",
  "ollamaConfigured": true
}
```

And the Ollama test in your vault should say "Connected"!

---

**Need help finding the Variables tab? Take a screenshot of your Railway dashboard and I can point to where to click!**
