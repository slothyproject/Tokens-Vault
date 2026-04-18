/**
 * Credential Vault Tests
 */

const credentialVault = require('../../services/credential-vault');

describe('CredentialVault', () => {
  describe('Encryption', () => {
    test('should encrypt and decrypt text', () => {
      const plaintext = 'my-secret-token';
      const encrypted = credentialVault.encrypt(plaintext);
      
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('algorithm');
      expect(encrypted.algorithm).toBe('aes-256-gcm');
    });

    test('should decrypt back to original text', () => {
      const plaintext = 'my-secret-token';
      const encrypted = credentialVault.encrypt(plaintext);
      const decrypted = credentialVault.decrypt(encrypted);
      
      expect(decrypted).toBe(plaintext);
    });

    test('should produce different ciphertexts for same plaintext', () => {
      const plaintext = 'my-secret-token';
      const encrypted1 = credentialVault.encrypt(plaintext);
      const encrypted2 = credentialVault.encrypt(plaintext);
      
      // IV should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      
      // Both should decrypt to same value
      expect(credentialVault.decrypt(encrypted1)).toBe(plaintext);
      expect(credentialVault.decrypt(encrypted2)).toBe(plaintext);
    });

    test('should fail to decrypt with wrong tag', () => {
      const plaintext = 'my-secret-token';
      const encrypted = credentialVault.encrypt(plaintext);
      
      // Modify the tag
      encrypted.tag = 'wrongtag';
      
      expect(() => {
        credentialVault.decrypt(encrypted);
      }).toThrow();
    });
  });

  describe('Token Masking', () => {
    test('should mask long tokens', () => {
      const token = 'my-railway-token-12345';
      const masked = credentialVault.maskToken(token);
      
      expect(masked).toBe('my-r****2345');
    });

    test('should mask short tokens as ****', () => {
      const token = 'short';
      const masked = credentialVault.maskToken(token);
      
      expect(masked).toBe('****');
    });

    test('should handle empty tokens', () => {
      const masked = credentialVault.maskToken('');
      expect(masked).toBe('****');
    });
  });
});
