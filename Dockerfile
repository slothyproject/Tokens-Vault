# Dissident Token Vault - Secure Secret Management
FROM nginx:alpine

# Install envsubst
RUN apk add --no-cache gettext

# Copy static files
COPY index.html /usr/share/nginx/html/
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Create entrypoint script
RUN printf '#!/bin/sh\necho "Waiting for PORT environment variable..."\nPORT=${PORT:-8080}\nexport PORT\necho "Starting Nginx on port $PORT"\nenvsubst < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf\ncat /etc/nginx/conf.d/default.conf\necho "Starting Nginx..."\nexec nginx -g "daemon off;"' > /start.sh && chmod +x /start.sh

# Expose the port Railway will use
EXPOSE 8080

# Start
CMD ["/start.sh"]
