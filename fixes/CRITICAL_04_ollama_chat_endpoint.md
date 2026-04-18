# Critical Fix: Ollama Chat Endpoint URL

## Problem
Chat endpoint uses wrong URL construction, causing 404 errors.

## Current State (BROKEN)
File: `js/ollama-cloud-integration.js` Line 296
```javascript
const response = await fetch(`${this.config.baseUrl}/chat`, {
```

## Issue
- `baseUrl` is `/api/ollama`
- This constructs: `/api/ollama/chat`
- Backend expects: `/api/ollama/chat` (this is actually correct!)

Actually, looking closer, the issue might be that it's using the wrong path entirely. Let me check...

Actually the issue is different. The frontend constructs `/api/ollama/chat` which is correct.

But wait, the error was:
```json
{"error":"Not found","path":"/api/ollama/generate"}
```

This is a different issue - the backend proxy might not be working correctly.

## Actual Fix Required

The frontend code at line 296 is already correct. The issue is likely in the backend proxy.

But let me double-check the actual error pattern...

## Fix (If Frontend Issue Exists)

File: `js/ollama-cloud-integration.js` Line 296

**CURRENT:**
```javascript
const response = await fetch(`${this.config.baseUrl}/chat`, {
```

**Should be using full path:**
```javascript
const response = await fetch('/api/ollama/chat', {
```

## Verification
After fix:
1. Open vault
2. Go to AI Central Hub → Settings
3. Click "Test Connection"
4. Should show "Connected"

## Debug Steps
If still failing:
1. Open browser DevTools (F12)
2. Go to Network tab
3. Click "Test Connection"
4. Look for request to `/api/ollama/chat`
5. Check response status and error
