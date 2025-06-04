@echo off
:: Script to activate virtual environment and run Django development server for Windows
:: This script uses Django's built-in runserver instead of Daphne
:: Use this when you need to access the admin interface reliably but dont need websockets

:: Get the directory where this script is located
cd %~dp0

:: Check if virtual environment exists
if not exist "venv" (
    echo Virtual environment not found. Creating one...
    python -m venv venv
)

:: Activate virtual environment
call venv\Scripts\activate.bat

:: Make sure migrations are up to date
echo Checking for and applying any pending migrations...
python manage.py migrate

echo Starting Django development server...
echo Admin URL: http://127.0.0.1:8000/admin/
echo Press Ctrl+C to stop the server.

:: Run the standard Django development server
python manage.py runserver 0.0.0.0:8000 