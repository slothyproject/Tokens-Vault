# Dissident Token Vault - Secure Secret Management
FROM nginx:alpine

# Create directories
RUN mkdir -p /usr/share/nginx/html/js /usr/share/nginx/html/css

# Copy main HTML files
COPY index.html /usr/share/nginx/html/
COPY login.html /usr/share/nginx/html/
COPY vault.html /usr/share/nginx/html/
COPY minimal.html /usr/share/nginx/html/

# Copy config files
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY vault-services.json /usr/share/nginx/html/

# Copy JavaScript files
COPY js/vault-core.js /usr/share/nginx/html/js/
COPY js/vault-ui.js /usr/share/nginx/html/js/

# Copy CSS files
COPY css/vault.css /usr/share/nginx/html/css/

# Expose port 8080
EXPOSE 8080

# Healthcheck - check nginx is responding
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://localhost:8080/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
