# Dissident Token Vault

A secure, client-side encrypted token management system for the Dissident Discord Bot Platform.

## Features

- **Client-Side Encryption**: All tokens are encrypted using AES-256 in your browser before storage
- **Zero Knowledge**: We never see your unencrypted secrets
- **Local Storage**: Encrypted data is stored in your browser's localStorage
- **Export/Import**: Backup and restore your encrypted tokens
- **Configuration Generation**: Auto-generate `.env` files for Dissident deployment

## Security

- AES-256 encryption using CryptoJS
- Your encryption key never leaves your device
- Without the key, stored data is cryptographically meaningless
- No server-side storage of secrets

## Usage

1. Generate or enter an encryption key
2. Add your Discord bot tokens, API keys, and other secrets
3. Tokens are encrypted locally before storage
4. Decrypt tokens when needed by entering your key
5. Export encrypted backups for safekeeping

## Deployment

This vault is deployed to Railway at: `https://dissidenttokens.mastertibbles.co.uk`

## Tech Stack

- HTML5/CSS3/JavaScript
- Tailwind CSS (CDN)
- CryptoJS for encryption
- Nginx (production server)

## License

Part of the Dissident Project - Private Use Only
