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
    echo "❌ Deployment aborted. Please deploy to staging first with './deploy.sh staging'"
    echo "   and test thoroughly before deploying to production."
    exit 1
  fi
  
  read -p "Are you absolutely sure you want to deploy to PRODUCTION? (y/n): " CONTINUE
  if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    echo "❌ Deployment aborted."
    exit 1
  fi
  
  echo "🚀 Proceeding with PRODUCTION deployment..."
else
  echo "🚀 Deploying to $ENVIRONMENT environment..."
fi

# Load appropriate .env file if it exists
ENV_FILE=".env.$ENVIRONMENT"
if [ -f "$ENV_FILE" ]; then
  echo "🔑 Loading environment variables from $ENV_FILE"
  export $(grep -v '^#' $ENV_FILE | xargs)
else
  echo "⚠️ Warning: $ENV_FILE not found. Make sure environment variables are set!"
  read -p "Do you want to continue without an environment file? (y/n): " CONTINUE_WITHOUT_ENV
  
  if [ "$CONTINUE_WITHOUT_ENV" != "y" ] && [ "$CONTINUE_WITHOUT_ENV" != "Y" ]; then
    echo "❌ Deployment aborted."
    echo "💡 Tip: Create your environment file by copying from the templates:"
    echo "    cp env_templates/$ENVIRONMENT.env .env.$ENVIRONMENT"
    echo "    Then edit the file to add your actual values."
    exit 1
  fi
fi

# Set environment variable for Django
export DJANGO_ENVIRONMENT=$ENVIRONMENT

# Check if AWS CLI is available
if ! command -v aws &> /dev/null; then
  echo "❌ AWS CLI is not installed. Please install it first with:"
  echo "   pip install awscli"
  exit 1
fi

# Set AWS credentials path
AWS_CONFIG_DIR="$(pwd)/.aws"
if [ ! -f "$AWS_CONFIG_DIR/credentials" ]; then
  echo "❌ AWS credentials not found in $AWS_CONFIG_DIR/credentials"
  echo "   Please update your credentials in this file before deploying."
  exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
pip install -r ../requirements.txt

# Run tests before deployment
echo "🧪 Running tests..."
python manage.py test --settings=zenexotics_backend.settings

# Collect static files
echo "📚 Collecting static files..."
python manage.py collectstatic --noinput

# Create deployment package
echo "📦 Creating deployment package..."
mkdir -p dist
APP_VERSION=$(date +"%Y%m%d%H%M%S")
ZIP_FILE="dist/crittrcove-$ENVIRONMENT-$APP_VERSION.zip"
zip -r "$ZIP_FILE" . -x "*.git*" -x "*.pyc" -x "__pycache__/*" -x "media/*" -x "dist/*" -x "venv/*" -x "venve/*" -x "eb-venv/*"

echo "📤 Deployment package created at $ZIP_FILE"

# Deploy using AWS CLI
echo "🌐 Deploying to Elastic Beanstalk using AWS CLI..."

# Check if environment exists
ENV_NAME="$ENVIRONMENT-crittrcove"
aws elasticbeanstalk describe-environments --environment-names "$ENV_NAME" --profile default --region us-east-2 --aws-config-file "$AWS_CONFIG_DIR/config" --aws-access-key-id $(grep aws_access_key_id "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ') --aws-secret-access-key $(grep aws_secret_access_key "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ')

if [ $? -ne 0 ]; then
  echo "⚠️ Environment $ENV_NAME doesn't exist yet. Creating it..."
  # Create application version
  aws elasticbeanstalk create-application-version \
    --application-name "CrittrCove" \
    --version-label "$ENVIRONMENT-$APP_VERSION" \
    --source-bundle S3Bucket="elasticbeanstalk-us-east-2-$(aws sts get-caller-identity --query 'Account' --output text --aws-config-file "$AWS_CONFIG_DIR/config" --aws-access-key-id $(grep aws_access_key_id "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ') --aws-secret-access-key $(grep aws_secret_access_key "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' '))",S3Key="$ZIP_FILE" \
    --auto-create-application \
    --profile default \
    --region us-east-2 \
    --aws-config-file "$AWS_CONFIG_DIR/config" \
    --aws-access-key-id $(grep aws_access_key_id "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ') \
    --aws-secret-access-key $(grep aws_secret_access_key "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ')
  
  # Create environment
  aws elasticbeanstalk create-environment \
    --application-name "CrittrCove" \
    --environment-name "$ENV_NAME" \
    --solution-stack-name "64bit Amazon Linux 2 v3.6.0 running Python 3.9" \
    --version-label "$ENVIRONMENT-$APP_VERSION" \
    --profile default \
    --region us-east-2 \
    --aws-config-file "$AWS_CONFIG_DIR/config" \
    --aws-access-key-id $(grep aws_access_key_id "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ') \
    --aws-secret-access-key $(grep aws_secret_access_key "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ')
else
  echo "🔄 Updating existing environment $ENV_NAME..."
  # Create application version
  aws elasticbeanstalk create-application-version \
    --application-name "CrittrCove" \
    --version-label "$ENVIRONMENT-$APP_VERSION" \
    --source-bundle S3Bucket="elasticbeanstalk-us-east-2-$(aws sts get-caller-identity --query 'Account' --output text --aws-config-file "$AWS_CONFIG_DIR/config" --aws-access-key-id $(grep aws_access_key_id "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ') --aws-secret-access-key $(grep aws_secret_access_key "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' '))",S3Key="$ZIP_FILE" \
    --profile default \
    --region us-east-2 \
    --aws-config-file "$AWS_CONFIG_DIR/config" \
    --aws-access-key-id $(grep aws_access_key_id "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ') \
    --aws-secret-access-key $(grep aws_secret_access_key "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ')
  
  # Update environment
  aws elasticbeanstalk update-environment \
    --application-name "CrittrCove" \
    --environment-name "$ENV_NAME" \
    --version-label "$ENVIRONMENT-$APP_VERSION" \
    --profile default \
    --region us-east-2 \
    --aws-config-file "$AWS_CONFIG_DIR/config" \
    --aws-access-key-id $(grep aws_access_key_id "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ') \
    --aws-secret-access-key $(grep aws_secret_access_key "$AWS_CONFIG_DIR/credentials" | cut -d "=" -f 2 | tr -d ' ')
fi

echo "✅ Deployment initiated! Check the AWS Elastic Beanstalk console for status updates."
echo "   Your application will be available at: http://$ENV_NAME.us-east-2.elasticbeanstalk.com" 