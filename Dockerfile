# Dissident Token Vault - Secure Secret Management
FROM nginx:alpine

# Install envsubst
RUN apk add --no-cache gettext

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Create entrypoint script
RUN printf '#!/bin/sh\n\
PORT=${PORT:-8080}\n\
export PORT\n\
echo "Starting Nginx on port $PORT"\n\
envsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf\n\
nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

# Expose the port Railway will use
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:${PORT:-8080}/ || exit 1

# Start
CMD ["/start.sh"]
