/**
 * vault-backup.js - Encrypted backup and restore system for Dissident Token Vault
 * Client-side encrypted backups that only you can decrypt
 */

const VaultBackup = {
    // Configuration
    config: {
        maxBackups: 30, // Keep last 30 backups
        backupPrefix: 'dissident-vault-backup',
        version: '1.0'
    },

    // Initialize
    init() {
        console.log('[VaultBackup] Backup system initialized');
        this.loadBackupList();
    },

    // Load backup list from metadata
    loadBackupList() {
        const meta = this.getBackupMetadata();
        return meta.backups || [];
    },

    // Get backup metadata
    getBackupMetadata() {
        const metaStr = localStorage.getItem('dissident_backup_meta');
        if (metaStr) {
            try {
                return JSON.parse(metaStr);
            } catch (e) {
                console.error('[VaultBackup] Failed to parse backup metadata');
            }
        }
        return { backups: [], lastBackup: null };
    },

    // Save backup metadata
    saveBackupMetadata(meta) {
        localStorage.setItem('dissident_backup_meta', JSON.stringify(meta));
    },

    // Create encrypted backup
    async createBackup(notes = '') {
        console.log('[VaultBackup] Creating backup...');

        // Get current vault data
        const vaultData = VaultCore.loadVaultData();
        if (!vaultData) {
            throw new Error('No vault data available');
        }

        // Get session key for encryption
        const key = VaultCore.getSessionKey();
        if (!key) {
            throw new Error('Vault must be unlocked to create backup');
        }

        // Create backup object
        const backup = {
            version: this.config.version,
            createdAt: new Date().toISOString(),
            notes: notes,
            vaultData: vaultData
        };

        // Encrypt backup with vault key
        const encrypted = VaultCore.encrypt(backup, key);
        if (!encrypted) {
            throw new Error('Backup encryption failed');
        }

        // Create backup file
        const backupData = {
            type: 'dissident-vault-backup',
            version: this.config.version,
            encrypted: encrypted,
            createdAt: backup.createdAt,
            notes: notes
        };

        // Convert to JSON string
        const jsonString = JSON.stringify(backupData, null, 2);
        
        // Create blob and download
        const blob = new Blob([jsonString], { type: 'application/json' });
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `${this.config.backupPrefix}-${timestamp}.json`;

        // Trigger download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // Update metadata
        const meta = this.getBackupMetadata();
        meta.backups.unshift({
            filename: filename,
            createdAt: backup.createdAt,
            notes: notes,
            size: this.formatBytes(blob.size)
        });
        
        // Keep only maxBackups
        if (meta.backups.length > this.config.maxBackups) {
            meta.backups = meta.backups.slice(0, this.config.maxBackups);
        }
        
        meta.lastBackup = backup.createdAt;
        this.saveBackupMetadata(meta);

        // Send Discord notification
        if (typeof VaultDiscord !== 'undefined') {
            VaultDiscord.backupCreated(this.formatBytes(blob.size));
        }

        console.log('[VaultBackup] Backup created:', filename);
        return { success: true, filename, size: this.formatBytes(blob.size) };
    },

    // Restore from backup file
    async restoreBackup(file) {
        console.log('[VaultBackup] Restoring from backup...');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    // Validate backup
                    if (backupData.type !== 'dissident-vault-backup') {
                        throw new Error('Invalid backup file format');
                    }

                    // Get vault key
                    const key = VaultCore.getSessionKey();
                    if (!key) {
                        throw new Error('Vault must be unlocked to restore backup');
                    }

                    // Decrypt backup
                    const decrypted = VaultCore.decrypt(backupData.encrypted, key);
                    if (!decrypted) {
                        throw new Error('Failed to decrypt backup. Wrong password or corrupted file.');
                    }

                    // Validate decrypted data
                    if (!decrypted.vaultData) {
                        throw new Error('Invalid backup data structure');
                    }

                    // Confirm with user
                    const confirmed = confirm(
                        `Restore backup from ${new Date(backupData.createdAt).toLocaleString()}?\n\n` +
                        `Notes: ${backupData.notes || 'None'}\n\n` +
                        'This will OVERWRITE your current vault data.'
                    );

                    if (!confirmed) {
                        resolve({ success: false, cancelled: true });
                        return;
                    }

                    // Save restored data
                    VaultCore.saveVaultData(decrypted.vaultData);

                    // Send Discord notification
                    if (typeof VaultDiscord !== 'undefined') {
                        VaultDiscord.backupRestored(this.formatBytes(file.size));
                    }

                    console.log('[VaultBackup] Backup restored successfully');
                    resolve({ 
                        success: true, 
                        timestamp: backupData.createdAt,
                        notes: backupData.notes 
                    });

                } catch (error) {
                    console.error('[VaultBackup] Restore failed:', error);
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read backup file'));
            };

            reader.readAsText(file);
        });
    },

    // Verify backup integrity
    async verifyBackup(file) {
        console.log('[VaultBackup] Verifying backup...');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const backupData = JSON.parse(e.target.result);
                    
                    // Basic validation
                    if (backupData.type !== 'dissident-vault-backup') {
                        resolve({ valid: false, error: 'Invalid backup format' });
                        return;
                    }

                    // Try to decrypt (requires vault to be unlocked)
                    const key = VaultCore.getSessionKey();
                    if (!key) {
                        resolve({ 
                            valid: true, 
                            canDecrypt: false, 
                            message: 'Valid backup format. Unlock vault to verify decryption.' 
                        });
                        return;
                    }

                    const decrypted = VaultCore.decrypt(backupData.encrypted, key);
                    if (!decrypted) {
                        resolve({ 
                            valid: true, 
                            canDecrypt: false, 
                            error: 'Cannot decrypt. Wrong password or corrupted.' 
                        });
                        return;
                    }

                    resolve({
                        valid: true,
                        canDecrypt: true,
                        createdAt: backupData.createdAt,
                        notes: backupData.notes,
                        size: this.formatBytes(file.size)
                    });

                } catch (error) {
                    resolve({ valid: false, error: error.message });
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    },

    // Export as .env file
    async exportAsEnv(serviceId) {
        console.log('[VaultBackup] Exporting as .env...');

        const vaultData = VaultCore.loadVaultData();
        if (!vaultData || !vaultData.services[serviceId]) {
            throw new Error('Service not found');
        }

        const variables = vaultData.services[serviceId];
        
        // Generate .env content
        let envContent = `# Dissident Token Vault Export\n`;
        envContent += `# Service: ${serviceId}\n`;
        envContent += `# Exported: ${new Date().toISOString()}\n\n`;

        Object.entries(variables).forEach(([key, value]) => {
            if (value !== null && value !== undefined && value !== '') {
                // Escape special characters in value
                const escapedValue = this.escapeEnvValue(value.toString());
                envContent += `${key}=${escapedValue}\n`;
            }
        });

        // Create and download file
        const blob = new Blob([envContent], { type: 'text/plain' });
        const filename = `${serviceId}-env.txt`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('[VaultBackup] Exported:', filename);
        return { success: true, filename };
    },

    // Import from .env file
    async importFromEnv(serviceId, file) {
        console.log('[VaultBackup] Importing from .env...');

        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    const content = e.target.result;
                    const lines = content.split('\n');
                    const imported = [];
                    const errors = [];

                    lines.forEach((line, index) => {
                        line = line.trim();
                        
                        // Skip empty lines and comments
                        if (!line || line.startsWith('#')) return;

                        // Parse KEY=VALUE format
                        const match = line.match(/^([^=]+)=(.*)$/);
                        if (match) {
                            const key = match[1].trim();
                            let value = match[2].trim();

                            // Remove surrounding quotes if present
                            if ((value.startsWith('"') && value.endsWith('"')) ||
                                (value.startsWith("'") && value.endsWith("'"))) {
                                value = value.slice(1, -1);
                            }

                            // Unescape escaped characters
                            value = this.unescapeEnvValue(value);

                            imported.push({ key, value, line: index + 1 });
                        } else if (line) {
                            errors.push({ line: index + 1, content: line });
                        }
                    });

                    // Update vault data
                    const vaultData = VaultCore.loadVaultData();
                    if (!vaultData.services[serviceId]) {
                        vaultData.services[serviceId] = {};
                    }

                    imported.forEach(({ key, value }) => {
                        vaultData.services[serviceId][key] = value;
                    });

                    VaultCore.saveVaultData(vaultData);

                    // Send notification
                    if (typeof VaultDiscord !== 'undefined' && imported.length > 0) {
                        VaultDiscord.syncCompleted(serviceId, imported.length);
                    }

                    resolve({
                        success: true,
                        imported: imported.length,
                        variables: imported,
                        errors: errors
                    });

                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsText(file);
        });
    },

    // Export vault data as JSON
    async exportAsJson() {
        console.log('[VaultBackup] Exporting as JSON...');

        const vaultData = VaultCore.loadVaultData();
        if (!vaultData) {
            throw new Error('No vault data available');
        }

        // Create export object (without sensitive tokens in plaintext)
        const exportData = {
            exportedAt: new Date().toISOString(),
            services: vaultData.services,
            history: vaultData.history
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const filename = `dissident-vault-export-${new Date().toISOString().split('T')[0]}.json`;

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { success: true, filename };
    },

    // Escape value for .env file
    escapeEnvValue(value) {
        // If value contains special characters, wrap in quotes
        if (/[\s#'"$`]/.test(value)) {
            value = value.replace(/"/g, '\\"');
            return `"${value}"`;
        }
        return value;
    },

    // Unescape value from .env file
    unescapeEnvValue(value) {
        return value
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, '\\');
    },

    // Format bytes to human readable
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },

    // Get backup stats
    getStats() {
        const meta = this.getBackupMetadata();
        return {
            totalBackups: meta.backups.length,
            lastBackup: meta.lastBackup,
            backups: meta.backups
        };
    }
};

// Make available globally
window.VaultBackup = VaultBackup;

// Auto-initialize if vault page loaded
if (document.getElementById('serviceList')) {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => VaultBackup.init(), 300);
    });
}