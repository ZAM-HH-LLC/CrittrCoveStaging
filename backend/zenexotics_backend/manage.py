#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def is_venv_active():
    """Check if a virtual environment is active"""
    return hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)


def main():
    """Run administrative tasks."""
    # if not is_venv_active():
    #     print("Warning: Virtual environment is not activated!")
    #     print("Please activate it using: source venv/bin/activate")
    #     sys.exit(1)

    # Set the default Django settings module
    if 'test' in sys.argv:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zenexotics_backend.test_settings')
    else:
        os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'zenexotics_backend.settings')

    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == "__main__":
    main()
