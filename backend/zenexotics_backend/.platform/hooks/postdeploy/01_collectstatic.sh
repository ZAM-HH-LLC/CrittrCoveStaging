#!/bin/bash
# Collect static files for Django deployment

set -e

echo "Running collectstatic..."

# Get application directory
APP_STAGING_DIR="/var/app/staging"
APP_CURRENT_DIR="/var/app/current"

# Use current directory if already deployed, otherwise use staging
if [ -d "$APP_CURRENT_DIR" ]; then
  cd "$APP_CURRENT_DIR"
  echo "Using current deployment directory: $APP_CURRENT_DIR"
else
  cd "$APP_STAGING_DIR"
  echo "Using staging directory: $APP_STAGING_DIR"
fi

# Run collectstatic
echo "Collecting static files..."
python3 manage.py collectstatic --noinput

echo "Static file collection complete!" 