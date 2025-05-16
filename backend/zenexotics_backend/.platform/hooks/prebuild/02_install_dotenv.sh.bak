#!/bin/bash
# Script to ensure python-dotenv is installed correctly

set -e

echo "Ensuring python-dotenv is installed..."

# Debug: List all potential venv locations to help troubleshoot
echo "Available venv directories:"
ls -la /var/app/venv/ || echo "No /var/app/venv directory found"

# Get the proper Python path - pattern needs to match staging-* paths
VENV_PYTHON_PATH=$(find /var/app/venv/staging-*/bin/python -type f 2>/dev/null | head -n 1)

# If not found with staging pattern, try the original wildcard
if [ -z "$VENV_PYTHON_PATH" ]; then
  echo "Trying alternate venv pattern..."
  VENV_PYTHON_PATH=$(find /var/app/venv/*/bin/python -type f 2>/dev/null | head -n 1)
fi

# If still not found, try the direct path we saw in the logs
if [ -z "$VENV_PYTHON_PATH" ]; then
  echo "Trying specific venv path from logs..."
  if [ -f "/var/app/venv/staging-LQM1lest/bin/python" ]; then
    VENV_PYTHON_PATH="/var/app/venv/staging-LQM1lest/bin/python"
  fi
fi

if [ -n "$VENV_PYTHON_PATH" ]; then
  VENV_DIR=$(dirname $(dirname $VENV_PYTHON_PATH))
  echo "Found Python virtual environment at: $VENV_DIR"
  
  # Install python-dotenv explicitly
  echo "Installing python-dotenv using $VENV_DIR/bin/pip..."
  $VENV_DIR/bin/pip install --no-cache-dir python-dotenv==1.0.0
  
  # Verify installation
  if $VENV_DIR/bin/pip freeze | grep -q "python-dotenv"; then
    echo "✅ python-dotenv successfully installed"
  else
    echo "❌ Error: Failed to install python-dotenv"
    $VENV_DIR/bin/pip freeze | grep dotenv || echo "Not found!"
    exit 1
  fi
else
  echo "❌ Error: Could not find Python virtual environment"
  echo "Trying direct pip install with system pip as fallback..."
  pip install python-dotenv==1.0.0 || echo "System pip install failed too"
  exit 1
fi

echo "python-dotenv installation completed successfully" 