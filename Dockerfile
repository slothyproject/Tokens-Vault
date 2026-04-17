# Dissident Token Vault - Secure Secret Management
FROM nginx:alpine

# Install envsubst and wget for healthcheck
RUN apk add --no-cache gettext wget

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Create entrypoint script with validation
RUN printf '#!/bin/sh\n\
echo "=== Token Vault Startup ==="\n\
PORT=${PORT:-8080}\n\
export PORT\n\
echo "Configuring Nginx on port $PORT..."\n\
\n\
# Generate nginx config\n\
envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf\n\
\n\
# Validate nginx config\n\
echo "Validating Nginx configuration..."\n\
nginx -t\n\
if [ $? -ne 0 ]; then\n\
    echo "ERROR: Nginx configuration test failed"\n\
    exit 1\n\
fi\n\
\n\
echo "Nginx config valid. Starting server..."\n\
\n\
# Start nginx\n\
exec nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

# Expose the port Railway will use
EXPOSE 8080

# Healthcheck - waits 30s before first check, then every 10s
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=5 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-8080}/ || exit 1

# Start
CMD ["/start.sh"]
