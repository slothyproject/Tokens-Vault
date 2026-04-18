# High Priority Fix: Input Validation

## Problem
Request bodies not validated before forwarding to Ollama API.

## Current State (NO VALIDATION)
File: `server.js` Lines 93-141
- Directly forwards request body to Ollama
- No type checking
- No sanitization

## Risk
- Malicious payloads sent to Ollama
- API abuse
- Potential injection attacks

## Fix

### Step 1: Create Validation Middleware
Add to `server.js` before routes:

```javascript
/**
 * Validate Ollama generate request
 */
const validateGenerateRequest = (req, res, next) => {
    const { model, prompt, stream, options } = req.body;
    const errors = [];

    // Validate model
    if (!model) {
        errors.push('model is required');
    } else if (typeof model !== 'string') {
        errors.push('model must be a string');
    } else if (model.length > 100) {
        errors.push('model name too long (max 100 chars)');
    } else if (!/^[a-zA-Z0-9_\-\:\/]+$/.test(model)) {
        errors.push('model contains invalid characters');
    }

    // Validate prompt
    if (!prompt) {
        errors.push('prompt is required');
    } else if (typeof prompt !== 'string') {
        errors.push('prompt must be a string');
    } else if (prompt.length > 10000) {
        errors.push('prompt too long (max 10000 chars)');
    }

    // Validate stream (optional)
    if (stream !== undefined && typeof stream !== 'boolean') {
        errors.push('stream must be a boolean');
    }

    // Validate options (optional)
    if (options !== undefined && typeof options !== 'object') {
        errors.push('options must be an object');
    }

    // Return errors if any
    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            message: errors.join(', '),
            details: errors
        });
    }

    // Sanitize inputs
    req.body.model = model.trim();
    req.body.prompt = prompt.trim();

    next();
};

/**
 * Validate Ollama chat request
 */
const validateChatRequest = (req, res, next) => {
    const { model, messages, stream, options } = req.body;
    const errors = [];

    // Validate model
    if (!model) {
        errors.push('model is required');
    } else if (typeof model !== 'string') {
        errors.push('model must be a string');
    } else if (model.length > 100) {
        errors.push('model name too long');
    }

    // Validate messages
    if (!messages) {
        errors.push('messages is required');
    } else if (!Array.isArray(messages)) {
        errors.push('messages must be an array');
    } else if (messages.length === 0) {
        errors.push('messages array cannot be empty');
    } else if (messages.length > 100) {
        errors.push('too many messages (max 100)');
    } else {
        // Validate each message
        messages.forEach((msg, index) => {
            if (!msg.role || !msg.content) {
                errors.push(`message ${index} missing role or content`);
            }
            if (msg.role && !['user', 'assistant', 'system'].includes(msg.role)) {
                errors.push(`message ${index} has invalid role`);
            }
            if (msg.content && typeof msg.content !== 'string') {
                errors.push(`message ${index} content must be a string`);
            }
            if (msg.content && msg.content.length > 5000) {
                errors.push(`message ${index} content too long`);
            }
        });
    }

    if (errors.length > 0) {
        return res.status(400).json({
            error: 'Validation failed',
            message: errors.join(', '),
            details: errors
        });
    }

    next();
};
```

### Step 2: Apply Validation to Routes
Update routes in `server.js`:

**BEFORE (Line 93):**
```javascript
app.post('/api/ollama/generate', async (req, res) => {
```

**AFTER:**
```javascript
app.post('/api/ollama/generate', validateGenerateRequest, async (req, res) => {
```

**BEFORE (Line 147):**
```javascript
app.post('/api/ollama/chat', async (req, res) => {
```

**AFTER:**
```javascript
app.post('/api/ollama/chat', validateChatRequest, async (req, res) => {
```

## Test Validation

### Test 1: Valid Request (Should Work)
```bash
curl -X POST https://your-api-url/api/ollama/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.2:latest","prompt":"Hello"}'
```

### Test 2: Missing Model (Should Fail)
```bash
curl -X POST https://your-api-url/api/ollama/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Hello"}'
```
Should return: `{"error":"Validation failed","message":"model is required"}`

### Test 3: Invalid Characters (Should Fail)
```bash
curl -X POST https://your-api-url/api/ollama/generate \
  -H "Content-Type: application/json" \
  -d '{"model":"model<script>","prompt":"test"}'
```
Should return validation error.

## Additional Security Measures

### Sanitize Output
Prevent XSS in responses:

```javascript
const sanitizeOutput = (data) => {
    if (typeof data === 'string') {
        return data
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    }
    return data;
};
```

### Apply to Response
```javascript
res.json({
    response: sanitizeOutput(response.data.response)
});
```
