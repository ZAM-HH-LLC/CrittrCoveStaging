#!/bin/bash
# Install dependencies for Elastic Beanstalk deployment

set -e

# Upgrade pip first
echo "Upgrading pip..."
python3 -m pip install --upgrade pip

# Install requirements from file
echo "Installing dependencies from requirements.txt..."
python3 -m pip install -r requirements.txt

# Print installed packages for debugging
echo "Installed packages:"
python3 -m pip freeze

echo "Dependency installation complete!" 