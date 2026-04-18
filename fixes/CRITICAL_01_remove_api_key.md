# Critical Security Fix: Remove Hardcoded API Key

## Problem
The Ollama API key is hardcoded in `.env` file, exposing it in version control.

## Current State (BAD)
File: `.env` (Line 3)
```
OLLAMA_API_KEY=19a27be275154b33ac107ea5b271afee.L68BtHj24_Y2Cv8jiPdAirIi
```

## Risk
- API key exposed in git history
- Anyone with repo access can see the key
- Could be abused if repo is public

## Fix Steps

### Step 1: Add .env to .gitignore
```bash
# Add to .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Add .env to gitignore"
```

### Step 2: Remove .env from git tracking
```bash
git rm --cached .env
git commit -m "Remove .env from version control"
```

### Step 3: Regenerate API Key (IMPORTANT!)
1. Go to https://ollama.com/settings/keys
2. Find the current key
3. Click "Revoke" or "Delete"
4. Create new key
5. Copy new key

### Step 4: Update Railway (Only Place to Store Key)
1. Go to Railway Dashboard
2. Click "Central Hub" service
3. Click "Variables" tab
4. Update OLLAMA_API_KEY with NEW key
5. Save (auto-redeploys)

### Step 5: Update Local .env (Never commit this!)
Create local `.env` file with NEW key (don't commit!):
```bash
OLLAMA_API_KEY=your_NEW_key_here
OLLAMA_BASE_URL=https://api.ollama.com/v1
```

## Verification
- Git should not track .env anymore
- Only Railway has the production key
- Local development uses local .env file

## Prevention
Add to .gitignore:
```
.env
.env.local
.env.*.local
```

Never commit files with:
- API keys
- Passwords
- Tokens
- Secrets
