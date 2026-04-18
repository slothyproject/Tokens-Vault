# 🦙 OLLAMA CLOUD SETUP GUIDE

This guide will help you set up Ollama Cloud integration with your Token Vault.

## 🎯 What Was Created

### Backend Proxy (`server.js`)
- ✅ Node.js/Express server
- ✅ Proxies Ollama Cloud API requests
- ✅ Handles authentication server-side
- ✅ CORS-enabled for browser access
- ✅ Serves static files

### Frontend Updates
- ✅ Updated to call `/api/ollama/*` endpoints
- ✅ No API key needed in browser (secure!)
- ✅ Falls back to rule-based AI if Ollama unavailable

---

## 🚀 Quick Start

### Step 1: Get Your Ollama API Key

1. Go to: https://ollama.com/settings/keys
2. Create a new API key
3. Copy the key (starts with `oc_`)

### Step 2: Configure Railway Environment Variables

In your Railway dashboard:

1. Go to your Token Vault service
2. Click "Variables" tab
3. Add these environment variables:

```
OLLAMA_API_KEY=your_actual_api_key_here
OLLAMA_BASE_URL=https://ollama.com/api
PORT=8080
NODE_ENV=production
```

### Step 3: Deploy

The changes are already committed. Just push to deploy:

```bash
git push origin main
```

Or Railway will auto-deploy on commit.

---

## ✅ Verify It's Working

After deployment:

1. Open your vault: `https://tokens-vault.reddgr.com/`
2. Open browser console (F12)
3. Look for messages:
   - `✅ Ollama AI: CONFIGURED`
   - `Server running on port 8080`

4. Test the connection:
   ```
   GET https://tokens-vault.reddgr.com/api/health
   ```
   
   Should return:
   ```json
   {
     "status": "ok",
     "ollamaConfigured": true
   }
   ```

---

## 🔧 Available Endpoints

Your backend now provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Check server health |
| `/api/ollama/tags` | GET | List available models |
| `/api/ollama/generate` | POST | Generate text |
| `/api/ollama/chat` | POST | Chat completion |

---

## 🧪 Testing Ollama

### Test from browser console:

```javascript
// Test connection
fetch('/api/ollama/tags')
  .then(r => r.json())
  .then(data => console.log('Models:', data));

// Test generation
fetch('/api/ollama/generate', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    model: 'llama3.2:latest',
    prompt: 'Hello, how are you?',
    stream: false
  })
})
.then(r => r.json())
.then(data => console.log('Response:', data));
```

---

## 🎨 Available Models

Once connected, you can use these models:

- `llama3.2:latest` - General purpose (default)
- `qwen2.5:latest` - Coding & reasoning
- `phi4-mini:latest` - Fast & lightweight
- `gemma3:1b` - Ultra lightweight
- `deepcoder:latest` - Code generation
- `codegemma:latest` - Code-focused

---

## 🔒 Security

✅ **API key is stored server-side only**
✅ **Browser never sees the key**
✅ **Backend handles authentication**
✅ **CORS properly configured**

---

## ❓ Troubleshooting

### "Ollama AI: NOT CONFIGURED"
- Check that `OLLAMA_API_KEY` is set in Railway variables
- Restart the service after adding variables

### "Connection failed"
- Check browser console for errors
- Verify `/api/health` returns `ollamaConfigured: true`
- Check Railway logs for errors

### "401 Unauthorized"
- Your API key might be invalid
- Generate a new key at https://ollama.com/settings/keys

### "404 Not Found"
- Make sure you're calling `/api/ollama/*` not `/api/generate` directly

---

## 📚 Next Steps

1. ✅ Add your OLLAMA_API_KEY to Railway
2. ✅ Deploy the changes
3. ✅ Test the connection
4. 🎉 Enjoy AI-powered diagnostics!

---

## 🆘 Need Help?

If you encounter issues:
1. Check Railway logs
2. Verify environment variables are set
3. Test `/api/health` endpoint
4. Check browser console for errors

**The AI is ready when you see: `✅ Ollama AI: CONFIGURED` in the logs!**
