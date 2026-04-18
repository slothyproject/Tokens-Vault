# Critical Fix: Consistent PBKDF2 Iterations

## Problem
Inconsistent PBKDF2 iteration counts weaken security.

## Current State (INCONSISTENT)
File: `js/vault-core.js`

Line 331 (Initialization):
```javascript
iterations: 100000  // 100k iterations
```

Line 382 (Unlock):
```javascript
iterations: 10000   // Only 10k iterations!
```

## Risk
- Unlock uses weaker security than initialization
- Easier to brute-force passwords during unlock
- Security inconsistency

## Fix

### Step 1: Update Line 382
File: `js/vault-core.js`

**BEFORE (Line 382):**
```javascript
const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 10000  // WRONG - too low
}).toString();
```

**AFTER (Line 382):**
```javascript
const key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000  // CORRECT - matches init
}).toString();
```

## Verification
1. Create new vault (uses 100k iterations)
2. Lock vault
3. Unlock vault (should use 100k iterations)
4. Should work seamlessly

## Note
Existing vaults created with 10k iterations will need to be:
- Re-initialized with new password (recommended)
- OR: Support both iteration counts for backward compatibility

## Backward Compatibility Option
If needed for existing vaults:
```javascript
// Try 100k first (new standard)
let key = CryptoJS.PBKDF2(password, salt, {
    keySize: 256 / 32,
    iterations: 100000
}).toString();

// Verify - if fails, try 10k (legacy)
if (!this.verifyKey(key)) {
    key = CryptoJS.PBKDF2(password, salt, {
        keySize: 256 / 32,
        iterations: 10000
    }).toString();
}
```
