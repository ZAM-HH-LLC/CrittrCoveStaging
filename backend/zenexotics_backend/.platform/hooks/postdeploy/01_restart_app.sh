#!/bin/bash
# Restart the application after deployment
set -e

echo "Restarting application services..."

# Ensure files are owned by webapp user
echo "Setting proper file permissions..."
chown -R webapp:webapp /var/app/current

# Restart nginx
echo "Restarting nginx..."
systemctl restart nginx.service || echo "Failed to restart nginx but continuing..."

# Restart the application
echo "Restarting web application..."
systemctl restart web.service || echo "Failed to restart web service but continuing..."

# Output status
echo "Service statuses:"
systemctl status nginx.service --no-pager || true
systemctl status web.service --no-pager || true

echo "Postdeploy hook completed."
