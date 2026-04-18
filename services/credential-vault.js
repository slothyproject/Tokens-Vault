/**
 * credential-vault.js - Secure Credential Storage
 * Server-side encrypted credential management
 */

const crypto = require('crypto');

class CredentialVault {
  constructor() {
    this.masterKey = this.deriveMasterKey();
  }

  deriveMasterKey() {
    const keyEnv = process.env.ENCRYPTION_MASTER_KEY;
    if (!keyEnv) {
      console.warn('[CredentialVault] WARNING: Using fallback key. Set ENCRYPTION_MASTER_KEY!');
      return crypto.scryptSync('fallback-key-change-in-production', 'salt', 32);
    }
    return crypto.scryptSync(keyEnv, 'salt', 32);
  }

  encrypt(plaintext) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipheriv('aes-256-gcm', this.masterKey, iv);
      let encrypted = cipher.update(plaintext, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      const tag = cipher.getAuthTag();
      
      return {
        iv: iv.toString('hex'),
        tag: tag.toString('hex'),
        data: encrypted,
        algorithm: 'aes-256-gcm'
      };
    } catch (err) {
      console.error('[CredentialVault] Encryption failed:', err);
      throw new Error('Failed to encrypt credential');
    }
  }

  decrypt(encryptedObj) {
    try {
      const { iv, tag, data } = encryptedObj;
      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.masterKey,
        Buffer.from(iv, 'hex')
      );
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      let decrypted = decipher.update(data, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (err) {
      console.error('[CredentialVault] Decryption failed:', err);
      throw new Error('Failed to decrypt credential');
    }
  }

  maskToken(token) {
    if (!token || token.length < 8) return '****';
    return token.substring(0, 4) + '****' + token.substring(token.length - 4);
  }
}

module.exports = new CredentialVault();
