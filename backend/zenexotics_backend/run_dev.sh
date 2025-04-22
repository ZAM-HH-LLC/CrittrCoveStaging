#!/bin/bash

# Script to activate virtual environment and run Django with auto-reloading

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Path to virtual environment
VENV_PATH="./venv"

# Check if virtual environment exists
if [ ! -d "$VENV_PATH" ]; then
    echo "Virtual environment not found at $VENV_PATH"
    echo "Please create it first with: python -m venv venv"
    exit 1
fi

# Activate virtual environment
source "$VENV_PATH/bin/activate"

# Check if activation was successful
if [ $? -ne 0 ]; then
    echo "Failed to activate virtual environment"
    exit 1
fi

echo "Virtual environment activated successfully!"

# Install watchdog if not already installed
pip install watchdog[watchmedo]

echo "Starting Daphne server with watchdog auto-reloading..."
echo "The server will automatically restart when Python files change."
echo "Press Ctrl+C to stop the server."

# Run the server with auto-reloading using watchdog
watchmedo auto-restart --directory=./ --pattern="*.py" --recursive -- daphne -b 0.0.0.0 -p 8000 zenexotics_backend.asgi:application

# Note: The venv activation only affects this script's environment,
# not the parent shell that called this script 