# Critical Fix: Add Content Security Policy

## Problem
No CSP headers, allowing XSS attacks through injected scripts.

## Current State (NO PROTECTION)
Files: All HTML files lack CSP meta tag

## Risk
- XSS attacks possible
- Malicious scripts can execute
- Data theft, session hijacking

## Fix

### Step 1: Add CSP to vault.html
File: `vault.html`

Add this meta tag in the `<head>` section (after charset meta):

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
               font-src 'self' https://fonts.gstatic.com;
               connect-src 'self' https://api.ollama.com https://backboard.railway.app https://discord.com;
               img-src 'self' data: blob: https:;
               frame-ancestors 'none';
               base-uri 'self';
               form-action 'self';">
```

### Step 2: Add CSP to login.html
File: `login.html`

Add same CSP meta tag in `<head>`:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' https://cdnjs.cloudflare.com 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               connect-src 'self';
               img-src 'self' data:;
               frame-ancestors 'none';">
```

### Step 3: Add CSP to index.html
File: `index.html`

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data:;
               refresh-src 'self';">
```

## CSP Directives Explained

| Directive | Value | Meaning |
|-----------|-------|---------|
| default-src | 'self' | Default: only same origin |
| script-src | 'self' cdnjs | Scripts from self + CDN |
| style-src | 'self' 'unsafe-inline' | Styles + inline styles |
| connect-src | 'self' api.ollama.com | API calls allowed |
| img-src | 'self' data: | Images from self + data URIs |
| frame-ancestors | 'none' | Prevent clickjacking |

## Testing CSP

1. Open browser DevTools
2. Go to Console
3. Look for CSP violation errors
4. If something breaks, adjust policy

## Common CSP Errors

### "Refused to load script"
Add the script source to `script-src`:
```
script-src 'self' https://allowed-domain.com;
```

### "Refused to connect"
Add the API endpoint to `connect-src`:
```
connect-src 'self' https://api.example.com;
```

## Report-Only Mode (Optional)
Test before enforcing:
```html
<meta http-equiv="Content-Security-Policy-Report-Only" 
      content="...policy...;
      report-uri /csp-report">
```

This logs violations without blocking anything.
