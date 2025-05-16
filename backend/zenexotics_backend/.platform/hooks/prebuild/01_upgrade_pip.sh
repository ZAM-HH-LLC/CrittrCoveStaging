#!/bin/bash
# Upgrade pip and install essential packages

echo "Upgrading pip in all Python environments..."

# Find all pip executables in virtualenv paths
for pip_path in /var/app/venv/*/bin/pip; do
  if [ -f "$pip_path" ]; then
    echo "Upgrading pip in $pip_path"
    $pip_path install --upgrade pip setuptools wheel
    
    # Also install python-dotenv directly
    echo "Installing python-dotenv using $pip_path"
    $pip_path install --no-cache-dir python-dotenv==1.0.0
    
    # Verify installation
    if $pip_path freeze | grep -q "python-dotenv"; then
      echo "✅ python-dotenv successfully installed with $pip_path"
    else
      echo "⚠️ python-dotenv installation may have failed with $pip_path"
    fi
  fi
done

echo "Pip upgrade completed successfully"
