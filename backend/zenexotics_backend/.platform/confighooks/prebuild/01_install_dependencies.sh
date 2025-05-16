#!/bin/bash
# Install dependencies defined in requirements-eb.txt

# Set error handling
set -e

# Get directory of the script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
echo "Running prebuild hooks from $DIR"

# Update pip first
echo "Upgrading pip..."
/var/app/venv/*/bin/pip install --upgrade pip setuptools wheel

# Install dependencies from requirements-eb.txt
echo "Installing dependencies from requirements-eb.txt..."
/var/app/venv/*/bin/pip install --no-cache-dir -r /var/app/staging/requirements-eb.txt

echo "Successfully installed dependencies"
