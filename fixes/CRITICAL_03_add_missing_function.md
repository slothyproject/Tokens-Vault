# Critical Fix: Add Missing Function

## Problem
`getSharedVariablesForService` is called but never defined, breaking shared variables feature.

## Current State (BROKEN)
File: `js/vault-ui.js` Line 224
```javascript
const sharedVars = this.getSharedVariablesForService(serviceId);  // ERROR: undefined function
```

## Error Message
```
TypeError: this.getSharedVariablesForService is not a function
```

## Fix

### Step 1: Add Missing Function
File: `js/vault-ui.js`

Add this function after line 220 (in the VaultUI object):

```javascript
/**
 * Get shared variables for a service (inherited from shared pool)
 * @param {string} serviceId - Service identifier
 * @returns {Object} Shared variables not overridden by service
 */
getSharedVariablesForService(serviceId) {
    const data = VaultCore.loadVaultData();
    if (!data) {
        console.warn('[VaultUI] No vault data loaded');
        return {};
    }
    
    const shared = data.shared || {};
    const serviceVars = data.services?.[serviceId] || {};
    
    // Return only shared vars that aren't overridden locally
    const result = {};
    Object.keys(shared).forEach(key => {
        if (!serviceVars.hasOwnProperty(key)) {
            result[key] = shared[key];
        }
    });
    
    return result;
},
```

## Verification
1. Open vault
2. Navigate to service with shared variables
3. Check console - should see no "undefined function" error
4. Shared variables should display correctly

## Test Code
```javascript
// In browser console
VaultUI.getSharedVariablesForService('dissident-website');
// Should return object with inherited variables
```
