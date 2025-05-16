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

# Clean up any previous deployment artifacts
rm -f application.zip
rm -f application_optimized.zip
rm -f minimal_application.zip

# Create an optimized deployment package using the create_deployment_package.sh script
echo "📦 Creating optimized deployment package..."
bash create_deployment_package.sh

if [ ! -f "minimal_application.zip" ]; then
  echo "❌ Failed to create deployment package!"
  exit 1
fi

# Copy the application.zip file to the deployment directory
echo "📋 Using optimized package: minimal_application.zip"
cp minimal_application.zip application.zip

# Set AWS region
AWS_REGION="us-east-2"

echo "🚀 Deploying application to Elastic Beanstalk..."
echo "   Environment: $ENV_NAME"
echo "   Region: $AWS_REGION"

# SAFETY CHECK - Never delete environments
echo "✅ SAFETY: This script will NEVER delete or recreate environments."
echo "✅ Deploying code to EXISTING environment: $ENV_NAME"

# Add health check endpoint to urls.py if it doesn't exist
if ! grep -q "def health_check" zenexotics_backend/urls.py; then
  echo "🔧 Adding health check endpoint to urls.py..."
  cat > zenexotics_backend/urls.py.tmp << 'EOF'
"""
URL configuration for zenexotics_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

# Health check view for Elastic Beanstalk
def health_check(request):
    return HttpResponse("OK")

urlpatterns = [
    path("admin/", admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/', include([
        # User Management
        path('users/', include('users.urls')),
        path('professional-status/', include('professional_status.urls')),
        path('clients/', include('clients.urls')),
        path('professionals/', include('professionals.urls')),
        path('professional-facilities/', include('professional_facilities.urls')),
        
        # Location Management
        path('locations/', include('locations.urls')),
        
        # Pet Management
        path('pets/', include('pets.urls')),
        
        # Service Management
        path('services/', include('services.urls')),
        path('service-rates/', include('service_rates.urls')),
        path('service-moderation/', include('service_moderation.urls')),
        
        # Availability Management
        path('availability/', include('availability.urls')),
        path('default-availability/', include('default_availability.urls')),
        path('shared-availability/', include('shared_availability.urls')),
        
        # Booking Management
        path('bookings/', include('bookings.urls')),
        path('booking-occurrences/', include('booking_occurrences.urls')),
        path('booking-summary/', include('booking_summary.urls')),
        path('booking-occurrence-rates/', include('booking_occurrence_rates.urls')),
        path('booking-details/', include('booking_details.urls')),
        path('booking-pets/', include('booking_pets.urls')),
        path('booking_drafts/', include('booking_drafts.urls')),
        
        # Review Management
        path('review-moderation/', include('review_moderation.urls')),
        path('client-reviews/', include('client_reviews.urls')),
        path('professional-reviews/', include('professional_reviews.urls')),
        
        # Communication
        path('messages/', include('user_messages.urls')),
        path('conversations/', include('conversations.urls')),
        
        # Payment Management
        path('payment-methods/', include('payment_methods.urls')),
        path('payments/', include('payments.urls')),
        
        # Contracts
        path('contracts/', include('contracts.urls')),
        
        # Logging
        path('search-logs/', include('search_logs.urls')),
        path('interaction-logs/', include('interaction_logs.urls')),
        path('error-logs/', include('error_logs.urls')),
        path('engagement-logs/', include('engagement_logs.urls')),
    ])),
    path('health/', health_check, name='health_check'),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Always serve static files
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
EOF
  mv zenexotics_backend/urls.py.tmp zenexotics_backend/urls.py
fi

# Ensure AWS EB CLI is configured with correct application and environment
echo "📋 Checking AWS EB CLI configuration..."
if ! eb list | grep -q "$ENV_NAME"; then
  echo "⚠️ Current directory is not configured for $ENV_NAME."
  echo "Updating configuration to use $ENV_NAME..."
  
  # Set the current environment as default for deployment
  eb use "$ENV_NAME"
fi

# Set environment variables if needed
echo "⚙️ Checking if environment variables need to be updated..."
eb setenv \
  DJANGO_SETTINGS_MODULE=zenexotics_backend.settings \
  DEBUG=False \
  ALLOWED_HOSTS=".elasticbeanstalk.com" \
  SECRET_KEY="$(cat /dev/urandom | LC_ALL=C tr -dc 'a-zA-Z0-9' | fold -w 50 | head -n 1)"

# Deploy using EB CLI to EXISTING environment
echo "🔄 Starting deployment..."
eb deploy "$ENV_NAME" --staged

echo "✅ Deployment complete!" 
echo "📊 Checking environment status..."
sleep 5
eb status

echo "📋 To view detailed logs, run: eb logs" 