#!/bin/bash
# Script to check the deployment status and diagnose issues

# Exit on error
set -e

echo "🔍 Checking deployment status for CrittrCove backend..."

# Check EB environment status
echo "📋 Checking environment status..."
eb status

# Check logs for common issues
echo "📋 Analyzing logs for common errors..."
eb logs | grep -E "ERROR|ModuleNotFoundError|ImportError|Exception|failed" 

# Check if python-dotenv is in requirements
echo "📋 Verifying requirements-eb.txt contains python-dotenv..."
if grep -q "python-dotenv" requirements-eb.txt; then
  echo "✅ python-dotenv is in requirements-eb.txt"
else
  echo "❌ ERROR: python-dotenv is missing from requirements-eb.txt"
fi

# Check if hook scripts are executable
echo "📋 Checking if hook scripts are executable..."
find .platform -type f -name "*.sh" | while read script; do
  if [ -x "$script" ]; then
    echo "✅ $script is executable"
  else
    echo "❌ ERROR: $script is not executable"
  fi
done

# Print helpful next steps
echo ""
echo "✅ Check complete! Consider these next steps:"
echo "1. If python-dotenv is missing, run: echo 'python-dotenv==1.0.0' >> requirements-eb.txt"
echo "2. If scripts aren't executable, run: find .platform -type f -name '*.sh' -exec chmod +x {} \;"
echo "3. For dependency issues, try rebuilding: ./rebuild_env.sh staging"
echo "4. For size issues, create an optimized package: ./create_deployment_package.sh"
echo "5. Deploy again with: ./deploy.sh staging"
echo ""
echo "For more detailed logs, run: eb logs" 