#!/bin/bash

# Script to activate virtual environment and run Django development server
# This script uses Django's built-in runserver instead of Daphne
# Use this when you need to access the admin interface reliably but don't need websockets

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

# Make sure migrations are up to date
echo "Checking for and applying any pending migrations..."
$PYTHON_CMD manage.py migrate

echo "Starting Django development server..."
echo "Admin URL: http://127.0.0.1:8000/admin/"
echo "Press Ctrl+C to stop the server."

# Run the standard Django development server
$PYTHON_CMD manage.py runserver 0.0.0.0:8000

# Note: The venv activation only affects this script's environment,
# not the parent shell that called this script 