#!/bin/bash

# Simple deployment script for CrittrCove
# Usage: ./deploy.sh [staging|production]

# Exit on error
set -e

# Check arguments
if [ $# -ne 1 ]; then
  echo "Usage: ./deploy.sh [staging|production]"
  exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [ "$ENVIRONMENT" != "staging" ] && [ "$ENVIRONMENT" != "production" ]; then
  echo "Invalid environment. Use 'staging' or 'production'"
  exit 1
fi

# Add confirmation checks for production
if [ "$ENVIRONMENT" == "production" ]; then
  echo "⚠️  WARNING: You are about to deploy to PRODUCTION! ⚠️"
  read -p "Have you deployed to staging first and tested it thoroughly? (y/n): " STAGING_TESTED
  
  if [ "$STAGING_TESTED" != "y" ] && [ "$STAGING_TESTED" != "Y" ]; then
    echo "❌ Deployment aborted. Please deploy to staging first."
    exit 1
  fi
fi

# Set application and environment names
APP_NAME="crittrcove_staging"
if [ "$ENVIRONMENT" == "staging" ]; then
  ENV_NAME="Crittrcovestaging-env"
else
  ENV_NAME="CrittrCove-production"
fi

# Get credentials from .env file
if [ "$ENVIRONMENT" == "staging" ]; then
  ENV_FILE=".env.staging"
else
  ENV_FILE=".env.production"
fi

echo "📝 Deploying to $ENVIRONMENT environment using $ENV_FILE..."

# Python environment and dependency setup
echo "🔧 Setting up environment..."
cd "$(dirname "$0")"

# Set AWS region
AWS_REGION="us-east-2"

echo "🚀 Deploying application to Elastic Beanstalk..."
echo "   Application: $APP_NAME"
echo "   Environment: $ENV_NAME"
echo "   Region: $AWS_REGION"

# Deploy with EB CLI
if eb status "$ENV_NAME" &> /dev/null; then
  echo "🔄 Environment exists, updating..."
  eb deploy "$ENV_NAME"
else
  echo "🆕 Environment doesn't exist, creating..."
  eb create "$ENV_NAME" --single
fi

echo "✅ Deployment complete!" 