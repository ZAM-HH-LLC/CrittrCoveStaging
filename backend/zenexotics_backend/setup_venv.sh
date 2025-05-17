#!/bin/bash

# Script to set up a new virtual environment and install all dependencies

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Path to virtual environment
VENV_PATH="./venv"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_PATH" ]; then
    echo "Creating virtual environment at $VENV_PATH..."
    python3 -m venv venv
fi

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Check if activation was successful
if [ $? -ne 0 ]; then
    echo "Failed to activate virtual environment"
    exit 1
fi

echo "Virtual environment activated successfully!"

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "Installing dependencies from requirements-eb-deploy.txt..."
pip install -r requirements-eb-deploy.txt

echo "Setup complete! You can now run the development server with ./run_dev.sh" 