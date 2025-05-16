#!/bin/bash
# Debug environment during deployment
set -e

echo "======= DEBUG ENVIRONMENT INFO ======="
echo "Date: $(date)"
echo "Current directory: $(pwd)"
echo "Python version: $(python --version 2>&1)"
echo "Virtual environments:"
find /var/app/venv -type d -maxdepth 1 2>/dev/null || echo "No virtual environments found"

# Check if required files exist
echo "Checking for critical files:"
if [ -f "/var/app/staging/requirements-eb.txt" ]; then 
  echo "✓ requirements-eb.txt exists"
else
  echo "✗ requirements-eb.txt not found!"
fi

if [ -f "/var/app/staging/manage.py" ]; then
  echo "✓ manage.py exists"
else
  echo "✗ manage.py not found!"
fi

if [ -f "/var/app/staging/Procfile" ]; then
  echo "✓ Procfile exists"
else
  echo "✗ Procfile not found!"
fi

# Check Django settings
echo "Django settings module: $DJANGO_SETTINGS_MODULE"
echo "Python path: $PYTHONPATH"

echo "======= END DEBUG INFO =======" 