# High Priority Fix: CORS Configuration

## Problem
CORS allows any origin with credentials, enabling CSRF attacks.

## Current State (INSECURE)
File: `server.js` Lines 28-31
```javascript
app.use(cors({
    origin: true,  // ❌ ALLOWS ANY ORIGIN!
    credentials: true
}));
```

## Risk
- Any website can make requests to your API
- CSRF attacks possible
- Session hijacking

## Fix

### Step 1: Update CORS Configuration
File: `server.js` Lines 28-31

**BEFORE:**
```javascript
app.use(cors({
    origin: true,
    credentials: true
}));
```

**AFTER:**
```javascript
// Allowed origins
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:8080',
    'http://localhost:3000',
    'https://dissidenttokens.mastertibbles.co.uk',
    'https://dissident-tokens-vault-production.up.railway.app'
];

app.use(cors({
    origin: function(origin, callback) {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Requested-With']
}));
```

### Step 2: Add Environment Variable (Optional)
For flexibility, add to `.env`:
```bash
ALLOWED_ORIGINS=http://localhost:8080,https://dissidenttokens.mastertibbles.co.uk
```

### Step 3: Handle Preflight
Add explicit OPTIONS handling:
```javascript
app.options('*', cors()); // Enable preflight for all routes
```

## Testing CORS

### Test 1: Allowed Origin (Should Work)
```bash
curl -H "Origin: https://dissidenttokens.mastertibbles.co.uk" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-api-url/api/health
```

### Test 2: Blocked Origin (Should Fail)
```bash
curl -H "Origin: https://evil-site.com" \
     -X GET \
     https://your-api-url/api/health
```

Should return CORS error.

## Verification
1. Frontend on allowed origin should work
2. Requests from unknown origins should be blocked
3. Check response headers include:
   - `Access-Control-Allow-Origin: specific-origin`
   - `Access-Control-Allow-Credentials: true`

## Common Issues

### Issue: "CORS error" in browser
**Cause:** Origin not in allowed list
**Fix:** Add the origin to `allowedOrigins` array

### Issue: "Credentials not included"
**Cause:** `credentials: true` missing
**Fix:** Ensure both server and client set credentials

## Security Headers (Bonus)
Add security headers middleware:
```javascript
app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
```
