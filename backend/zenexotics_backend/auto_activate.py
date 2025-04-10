#!/usr/bin/env python
"""Script to auto-activate the virtual environment and then run Django's manage.py."""
import os
import sys
import subprocess

# Path to the virtual environment
VENV_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'venv'))
VENV_PYTHON = os.path.join(VENV_PATH, 'bin', 'python')
MANAGE_PY = os.path.join(os.path.dirname(__file__), 'manage.py')

def is_venv_active():
    """Check if a virtual environment is active"""
    return hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)

def main():
    """Main entry point."""
    # Check if we're already in the virtual environment
    if is_venv_active():
        print("Virtual environment is active, running manage.py...")
        # We're already in the venv, so run manage.py with the same arguments
        sys.argv[0] = MANAGE_PY
        # Load manage.py as a module
        sys.path.insert(0, os.path.dirname(MANAGE_PY))
        exec(open(MANAGE_PY).read())
    else:
        print("Activating virtual environment...")
        if not os.path.exists(VENV_PYTHON):
            print(f"Virtual environment not found at {VENV_PATH}")
            print("Please create it first with: python -m venv venv")
            sys.exit(1)
        
        # Re-execute this script using the venv's Python
        args = [VENV_PYTHON] + sys.argv
        print(f"Relaunching with: {' '.join(args)}")
        os.execv(VENV_PYTHON, args)

if __name__ == "__main__":
    main() 