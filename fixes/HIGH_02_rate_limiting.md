# High Priority Fix: Add Rate Limiting

## Problem
No rate limiting allows API abuse and DoS attacks.

## Current State (NO PROTECTION)
File: `server.js`
- No rate limiting middleware
- Unlimited requests allowed

## Risk
- API abuse
- Brute force attacks
- DoS attacks
- High server costs

## Fix

### Step 1: Install express-rate-limit
```bash
npm install express-rate-limit
```

### Step 2: Add Rate Limiting to server.js
File: `server.js`

Add after imports (around line 10):

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limiter
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests',
        message: 'Please try again later',
        retryAfter: '15 minutes'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    // Skip successful requests for health checks
    skip: (req) => req.path === '/api/health'
});

// Stricter limiter for auth endpoints
const authLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // 10 attempts per hour
    message: {
        error: 'Too many authentication attempts',
        message: 'Please try again in an hour'
    }
});

// Ollama API limiter (can be expensive)
const ollamaLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10, // 10 requests per minute
    message: {
        error: 'Ollama rate limit exceeded',
        message: 'Please slow down your AI requests'
    }
});
```

### Step 3: Apply Rate Limiters
Add after CORS middleware (around line 45):

```javascript
// Apply general rate limiting to all API routes
app.use('/api/', apiLimiter);

// Apply stricter limits to specific routes
app.use('/api/ollama/', ollamaLimiter);
app.use('/login', authLimiter);
```

## Custom Key Generator (Optional)
If behind a proxy (like Railway), use real client IP:

```javascript
const apiLimiter = rateLimit({
    // ... other options
    keyGenerator: (req) => {
        // Use X-Forwarded-For header if behind proxy
        return req.headers['x-forwarded-for'] || 
               req.headers['x-real-ip'] || 
               req.ip;
    }
});
```

## Rate Limit Headers
Clients receive these headers:
- `RateLimit-Limit`: 100
- `RateLimit-Remaining`: 99
- `RateLimit-Reset`: Unix timestamp

## Frontend Handling
Update frontend to handle 429 errors:

```javascript
async function makeRequest(url, options) {
    try {
        const response = await fetch(url, options);
        if (response.status === 429) {
            const data = await response.json();
            alert(`Rate limit exceeded: ${data.message}`);
            return null;
        }
        return response;
    } catch (error) {
        console.error('Request failed:', error);
        throw error;
    }
}
```

## Monitoring
Add logging to track rate limit hits:

```javascript
const apiLimiter = rateLimit({
    // ... other options
    handler: (req, res, next, options) => {
        console.warn(`[Rate Limit] IP: ${req.ip} exceeded limit`);
        res.status(options.statusCode).json(options.message);
    }
});
```

## Testing

### Test Rate Limit
```bash
# Make 101 rapid requests
for i in {1..101}; do
    curl -s https://your-api-url/api/health > /dev/null
    echo "Request $i"
done
```

Last request should return 429 error.

## Advanced: Different Limits for Different Users

```javascript
const tieredLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: (req) => {
        // Premium users get higher limits
        if (req.user?.isPremium) return 1000;
        return 100;
    }
});
```
