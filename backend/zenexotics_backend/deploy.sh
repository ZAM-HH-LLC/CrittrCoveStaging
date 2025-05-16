#!/bin/bash

# CrittrCove Backend Deployment Script
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

# Set environment names - fixed capitalization to match existing EB environment
if [ "$ENVIRONMENT" == "staging" ]; then
  ENV_NAME="Crittrcovestaging-env"
else
  ENV_NAME="CrittrCove-production"
fi

# Get environment variable file
if [ "$ENVIRONMENT" == "staging" ]; then
  ENV_FILE=".env.staging"
else
  ENV_FILE=".env.production"
fi

# Check if environment file exists
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Environment file $ENV_FILE not found!"
  echo "Please create $ENV_FILE based on env_templates/${ENVIRONMENT}.env"
  exit 1
fi

echo "📝 Deploying to $ENVIRONMENT environment using $ENV_FILE..."

# Setup environment
echo "🔧 Setting up environment..."
cd "$(dirname "$0")"

# Set AWS region
AWS_REGION="us-east-2"

echo "🚀 Deploying application to Elastic Beanstalk..."
echo "   Environment: $ENV_NAME"
echo "   Region: $AWS_REGION"

# SAFETY CHECK - Never delete environments
echo "✅ SAFETY: This script will NEVER delete or recreate environments."
echo "✅ Deploying code to EXISTING environment: $ENV_NAME"

# Ensure AWS EB CLI is configured with correct application and environment
echo "📋 Checking AWS EB CLI configuration..."
if ! eb list | grep -q "$ENV_NAME"; then
  echo "⚠️ Current directory is not configured for $ENV_NAME."
  echo "Updating configuration to use $ENV_NAME..."
  
  # Set the current environment as default for deployment
  eb use "$ENV_NAME"
fi

# Deploy using EB CLI to EXISTING environment
echo "🔄 Starting deployment..."
eb deploy "$ENV_NAME" --staged

echo "✅ Deployment complete!" 