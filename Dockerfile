# Dissident Token Vault - Secure Secret Management
FROM nginx:alpine

# Copy all static files
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy JavaScript files
COPY vault-services.json /usr/share/nginx/html/
COPY vault-data.js /usr/share/nginx/html/
COPY vault-railway.js /usr/share/nginx/html/
COPY vault-railway-api.js /usr/share/nginx/html/
COPY vault-sync.js /usr/share/nginx/html/
COPY vault-complete-sync.js /usr/share/nginx/html/
COPY vault-github.js /usr/share/nginx/html/
COPY vault-railway-auto.js /usr/share/nginx/html/

# Expose port 8080
EXPOSE 8080

# Healthcheck - check nginx is responding
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
