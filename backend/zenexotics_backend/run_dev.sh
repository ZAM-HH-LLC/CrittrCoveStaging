#!/bin/bash

# Script to activate virtual environment and run Django with auto-reloading

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Detect OS
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "win32" ]]; then
    # Windows
    VENV_ACTIVATE="./venv/Scripts/activate"
    PYTHON_CMD="python"
else
    # Mac/Linux
    VENV_ACTIVATE="./venv/bin/activate"
    PYTHON_CMD="python3"
fi

# Check if virtual environment exists
if [ ! -d "./venv" ]; then
    echo "Virtual environment not found. Creating one..."
    $PYTHON_CMD -m venv venv
fi

# Check if venv is already activated
if [[ "$VIRTUAL_ENV" == "" ]]; then
    echo "Activating virtual environment..."
    source "$VENV_ACTIVATE"
    
    # Check if activation was successful
    if [ $? -ne 0 ]; then
        echo "Failed to activate virtual environment"
        exit 1
    fi
else
    echo "Virtual environment is already activated"
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