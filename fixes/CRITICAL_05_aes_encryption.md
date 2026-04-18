# Critical Fix: Replace Weak XOR Encryption

## Problem
AIStorageManager uses XOR encryption which is cryptographically broken.

## Current State (INSECURE)
File: `js/ai-storage-manager.js` Lines 118-154
```javascript
// XOR "encryption" - EASILY BREAKABLE!
const encrypted = data.split('').map((char, i) => {
    return char.charCodeAt(0) ^ key.charCodeAt(i % key.length);
}).join(',');
```

## Risk
- XOR can be broken in seconds
- Session data easily recoverable
- Complete security failure

## Fix: Implement AES-GCM

### Step 1: Replace Encrypt Function
File: `js/ai-storage-manager.js`

Replace lines 118-135 with:

```javascript
async encrypt(data) {
    try {
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(JSON.stringify(data));
        
        // Import key
        const keyBuffer = encoder.encode(this.encryptionKey);
        const cryptoKey = await crypto.subtle.importKey(
            'raw', 
            keyBuffer, 
            { name: 'AES-GCM' }, 
            false, 
            ['encrypt']
        );
        
        // Generate random IV
        const iv = crypto.getRandomValues(new Uint8Array(12));
        
        // Encrypt
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv }, 
            cryptoKey, 
            dataBuffer
        );
        
        // Return IV + encrypted data (both needed for decryption)
        return JSON.stringify({
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(encrypted))
        });
    } catch (error) {
        console.error('[AIStorageManager] Encryption failed:', error);
        throw new Error('Encryption failed');
    }
}
```

### Step 2: Replace Decrypt Function
Replace lines 137-154 with:

```javascript
async decrypt(encryptedData) {
    try {
        const parsed = JSON.parse(encryptedData);
        const iv = new Uint8Array(parsed.iv);
        const data = new Uint8Array(parsed.data);
        
        // Import key
        const encoder = new TextEncoder();
        const keyBuffer = encoder.encode(this.encryptionKey);
        const cryptoKey = await crypto.subtle.importKey(
            'raw', 
            keyBuffer, 
            { name: 'AES-GCM' }, 
            false, 
            ['decrypt']
        );
        
        // Decrypt
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv }, 
            cryptoKey, 
            data
        );
        
        // Decode and parse
        const decoder = new TextDecoder();
        return JSON.parse(decoder.decode(decrypted));
    } catch (error) {
        console.error('[AIStorageManager] Decryption failed:', error);
        return null;
    }
}
```

### Step 3: Update Save/Load Methods
Change saveData and loadData to use async/await:

```javascript
async saveData(key, data) {
    try {
        if (!this.initialized) await this.init();
        const encrypted = await this.encrypt(data);
        // ... rest of save logic
    } catch (error) {
        console.error('[AIStorageManager] Save failed:', error);
    }
}

async loadData(key) {
    try {
        if (!this.initialized) await this.init();
        const encrypted = // ... get from storage
        return await this.decrypt(encrypted);
    } catch (error) {
        console.error('[AIStorageManager] Load failed:', error);
        return null;
    }
}
```

## Important Notes

1. **Web Crypto API** - Uses browser's built-in crypto (secure)
2. **AES-GCM** - Industry standard authenticated encryption
3. **Random IV** - Each encryption uses unique IV (prevents pattern analysis)
4. **Async** - Modern crypto is async, update all callers

## Browser Compatibility
- Chrome 37+
- Firefox 34+
- Safari 7+
- Edge 12+

## Fallback for Old Browsers (Optional)
```javascript
if (!window.crypto || !window.crypto.subtle) {
    console.warn('[AIStorageManager] Web Crypto not available, using memory only');
    // Don't persist to storage - keep in memory only
}
```
