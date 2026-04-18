# Dissident Token Vault with Ollama Proxy
FROM node:18-alpine

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy all files
COPY . .

# Create .env file if not exists (Railway will override with env vars)
RUN if [ ! -f .env ]; then cp .env.example .env; fi

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/api/health || exit 1

# Start server
CMD ["node", "server.js"]
