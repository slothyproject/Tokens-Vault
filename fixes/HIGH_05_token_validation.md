# High Priority Fix: Add Token Validation

## Problem
Railway API token not validated before use, causing failed deployments.

## Current State (NO VALIDATION)
File: `js/vault-railway-api.js`
- Token used directly without validation
- No error handling for invalid tokens

## Risk
- Failed deployments
- 401 errors
- Confusing user experience

## Fix

### Step 1: Add Token Validation Method
File: `js/vault-railway-api.js`

Add after constructor:

```javascript
/**
 * Validate Railway API token format
 * @param {string} token - Railway API token
 * @returns {Object} Validation result
 */
validateToken(token) {
    const errors = [];
    
    if (!token) {
        errors.push('Token is required');
    } else if (typeof token !== 'string') {
        errors.push('Token must be a string');
    } else if (token.length < 20) {
        errors.push('Token too short (minimum 20 characters)');
    } else if (!/^[a-zA-Z0-9_-]+$/.test(token)) {
        errors.push('Token contains invalid characters');
    }
    
    return {
        valid: errors.length === 0,
        errors: errors
    };
}

/**
 * Verify token works by making test API call
 * @param {string} token - Railway API token
 * @returns {Promise<boolean>} True if token is valid
 */
async verifyToken(token) {
    try {
        const response = await fetch('https://backboard.railway.app/graphql', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: `
                    query {
                        me {
                            id
                            name
                        }
                    }
                `
            })
        });
        
        if (response.status === 401) {
            return { valid: false, error: 'Invalid or expired token' };
        }
        
        if (!response.ok) {
            return { valid: false, error: `API error: ${response.status}` };
        }
        
        const data = await response.json();
        
        if (data.errors) {
            return { valid: false, error: data.errors[0].message };
        }
        
        return { 
            valid: true, 
            user: data.data.me 
        };
        
    } catch (error) {
        return { valid: false, error: error.message };
    }
}
```

### Step 2: Update Constructor to Validate
```javascript
constructor(token) {
    // Validate format first
    const validation = this.validateToken(token);
    if (!validation.valid) {
        throw new Error(`Invalid Railway token: ${validation.errors.join(', ')}`);
    }
    
    this.token = token;
    this.baseUrl = 'https://backboard.railway.app/graphql';
    this.projectId = 'resplendent-fulfillment'; // Consider making this configurable
}
```

### Step 3: Add UI Feedback
Update token input to show validation:

```javascript
async validateRailwayToken() {
    const tokenInput = document.getElementById('railwayToken');
    const token = tokenInput.value.trim();
    
    // Show loading state
    this.showValidationStatus('validating');
    
    try {
        const railway = new RailwayAPI(token);
        const result = await railway.verifyToken();
        
        if (result.valid) {
            this.showValidationStatus('valid', `Connected as ${result.user.name}`);
            return true;
        } else {
            this.showValidationStatus('invalid', result.error);
            return false;
        }
    } catch (error) {
        this.showValidationStatus('error', error.message);
        return false;
    }
}

showValidationStatus(status, message) {
    const statusEl = document.getElementById('tokenValidationStatus');
    statusEl.className = `validation-status ${status}`;
    statusEl.textContent = message;
}
```

## HTML Update
Add validation status element:

```html
<div class="token-input-group">
    <input type="password" id="railwayToken" placeholder="Enter Railway token">
    <button onclick="VaultUI.validateRailwayToken()">Validate</button>
    <span id="tokenValidationStatus" class="validation-status"></span>
</div>
```

## CSS
```css
.validation-status {
    margin-left: 10px;
    font-size: 14px;
}

.validation-status.validating {
    color: #f59e0b;
}

.validation-status.valid {
    color: #22c55e;
}

.validation-status.invalid {
    color: #ef4444;
}

.validation-status.error {
    color: #dc2626;
}
```

## Testing

### Test 1: Empty Token
```javascript
new RailwayAPI('');
// Should throw: "Invalid Railway token: Token is required"
```

### Test 2: Invalid Format
```javascript
new RailwayAPI('<script>');
// Should throw: "Invalid Railway token: Token contains invalid characters"
```

### Test 3: Valid Token
```javascript
const api = new RailwayAPI(validToken);
const result = await api.verifyToken();
// Should return: { valid: true, user: { ... } }
```
