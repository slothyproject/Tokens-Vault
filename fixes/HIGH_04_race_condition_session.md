# High Priority Fix: Race Condition in Session Timeout

## Problem
Multiple intervals created if `startSessionTimeout` called multiple times.

## Current State (BUGGY)
File: `js/vault-core.js` Lines 70-72
```javascript
startSessionTimeout() {
    // No check if interval already exists!
    this.sessionTimeout.checkInterval = setInterval(() => {
```

## Risk
- Memory leak
- Excessive CPU usage
- Multiple intervals running simultaneously

## Fix

### Step 1: Clear Existing Interval First
File: `js/vault-core.js` Lines 70-72

**BEFORE:**
```javascript
startSessionTimeout() {
    this.sessionTimeout.checkInterval = setInterval(() => {
        // ... check timeout logic
    }, 1000);
}
```

**AFTER:**
```javascript
startSessionTimeout() {
    // Clear existing interval first (prevent duplicates)
    if (this.sessionTimeout.checkInterval) {
        clearInterval(this.sessionTimeout.checkInterval);
        this.sessionTimeout.checkInterval = null;
    }
    
    // Reset last activity time
    this.sessionTimeout.lastActivity = Date.now();
    
    // Start new interval
    this.sessionTimeout.checkInterval = setInterval(() => {
        this.checkSessionTimeout();
    }, 1000);
}
```

### Step 2: Extract Timeout Check Logic
Create separate method:

```javascript
checkSessionTimeout() {
    const now = Date.now();
    const elapsed = now - this.sessionTimeout.lastActivity;
    
    if (elapsed >= this.sessionTimeout.duration) {
        this.lock(); // Auto-lock on timeout
    }
}
```

### Step 3: Track Activity Listeners
Prevent duplicate event listeners:

```javascript
constructor() {
    // ... existing code ...
    this._activityListeners = []; // Track listeners
}

startSessionTimeout() {
    // Clear existing listeners
    this._removeActivityListeners();
    
    // Add new listeners
    this._addActivityListeners();
    
    // Start timeout check
    if (this.sessionTimeout.checkInterval) {
        clearInterval(this.sessionTimeout.checkInterval);
    }
    this.sessionTimeout.checkInterval = setInterval(() => {
        this.checkSessionTimeout();
    }, 1000);
}

_addActivityListeners() {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    
    events.forEach(event => {
        const listener = () => this.resetSessionTimeout();
        this._activityListeners.push({ event, listener });
        document.addEventListener(event, listener, { passive: true });
    });
}

_removeActivityListeners() {
    this._activityListeners.forEach(({ event, listener }) => {
        document.removeEventListener(event, listener);
    });
    this._activityListeners = [];
}

resetSessionTimeout() {
    this.sessionTimeout.lastActivity = Date.now();
}
```

### Step 4: Proper Cleanup in lock()
```javascript
lock() {
    // Clear interval
    if (this.sessionTimeout.checkInterval) {
        clearInterval(this.sessionTimeout.checkInterval);
        this.sessionTimeout.checkInterval = null;
    }
    
    // Remove event listeners
    this._removeActivityListeners();
    
    // ... rest of lock logic ...
}
```

## Verification

### Test 1: No Duplicate Intervals
```javascript
// Call startSessionTimeout multiple times
VaultCore.startSessionTimeout();
VaultCore.startSessionTimeout();
VaultCore.startSessionTimeout();

// Should only have ONE interval running
console.log(VaultCore._activityListeners.length); // Should be 4 (one per event)
```

### Test 2: Proper Cleanup
```javascript
VaultCore.startSessionTimeout();
VaultCore.lock();

// Should have no listeners
console.log(VaultCore._activityListeners.length); // Should be 0
```

## Debugging

Add logging to track:
```javascript
startSessionTimeout() {
    console.log('[VaultCore] Starting session timeout');
    
    if (this.sessionTimeout.checkInterval) {
        console.log('[VaultCore] Clearing existing interval');
        clearInterval(this.sessionTimeout.checkInterval);
    }
    
    // ... rest of code ...
}
```
