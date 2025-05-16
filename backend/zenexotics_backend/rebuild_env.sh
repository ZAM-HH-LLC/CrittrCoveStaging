#!/bin/bash
# Script to rebuild an Elastic Beanstalk environment when it's in a bad state
# This will use eb terminate and eb create to recreate the environment

set -e

# Check arguments
if [ $# -ne 1 ]; then
  echo "Usage: ./rebuild_env.sh [staging|production]"
  exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo "Invalid environment. Use 'staging' or 'production'"
  exit 1
fi

# Set environment names
if [ "$ENVIRONMENT" == "staging" ]; then
  ENV_NAME="Crittrcovestaging-env"
else
  ENV_NAME="CrittrCove-production"
fi

echo "⚠️ WARNING: This will FORCEFULLY RECREATE your environment $ENV_NAME ⚠️"
echo "All data in the environment will be lost, but settings will be preserved."

# Ask for confirmation
read -p "Are you sure you want to proceed? (y/n): " CONFIRM
if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
  echo "❌ Operation cancelled."
  exit 1
fi

# Fix the deployment files
echo "🔧 Checking deployment files..."
# Remove trailing spaces and % character from Procfile
sed -i '' 's/[[:space:]]*$//' Procfile 2>/dev/null || true
sed -i '' 's/%$//' Procfile 2>/dev/null || true

# Remove trailing spaces and % character from requirements-eb.txt
sed -i '' 's/[[:space:]]*$//' requirements-eb.txt 2>/dev/null || true
sed -i '' 's/%$//' requirements-eb.txt 2>/dev/null || true

# Create an isolated deployment without terminating
echo "🔧 Creating new deployment package..."
eb deploy $ENV_NAME --staged

echo "✅ Deployment initiated!"
echo "✅ Monitor progress with: eb status"
echo "✅ Check logs with: eb logs" 