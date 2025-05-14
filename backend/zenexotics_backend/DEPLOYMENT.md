# CrittrCove Deployment Guide

This guide explains how to deploy CrittrCove backend to AWS using Elastic Beanstalk.

## Prerequisites

1. AWS account with appropriate permissions
2. AWS CLI and EB CLI installed
3. PostgreSQL database (AWS RDS)
4. S3 bucket for media storage

## Initial AWS Setup (One-time)

### 1. Create S3 Buckets

Create two S3 buckets:
- `staging-crittrcove-media` - For staging environment
- `crittrcove-media` - For production environment

For each bucket:
1. Go to AWS S3 console
2. Create a new bucket with a unique name
3. Enable public access for media files
4. Add CORS configuration:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

### 2. Create RDS Databases

For both staging and production:
1. Go to AWS RDS console
2. Create PostgreSQL database
3. Choose t3.micro or t3.small for staging, t3.small for production
4. Set up security groups to allow access from Elastic Beanstalk

### 3. Create Elastic Beanstalk Applications

Create two Elastic Beanstalk environments:
- `staging-crittrcove` - For staging
- `production-crittrcove` - For production

For each environment:
1. Go to Elastic Beanstalk service
2. Create a new application
3. Choose Python platform
4. Configure environment:
   - Instance type: t3.micro for staging, t3.small for production
   - Load balancer: Application (can start without for MVP)
   - Set environment variables based on env templates

## Deployment Process

### First-time Setup

1. Install AWS CLI and EB CLI:
   ```
   pip install awscli awsebcli
   ```

2. Configure AWS credentials:
   ```
   aws configure
   ```

3. Initialize Elastic Beanstalk in your project:
   ```
   cd /Users/mattaertker/Documents/GitHub/CrittrCoveStaging/backend/zenexotics_backend
   eb init
   ```

4. Create staging and production environments:
   ```
   eb create staging-crittrcove
   eb create production-crittrcove
   ```

### Environment Configuration

1. Copy template files to actual env files:
   ```
   cp env_templates/staging.env .env.staging
   cp env_templates/production.env .env.production
   ```

2. Edit the .env files with actual values for your environments

### Deployment

To deploy to staging:
```
./deploy.sh staging
```

To deploy to production:
```
./deploy.sh production
```

## Troubleshooting

- **Static files not showing up**: Check AWS EB configuration for static files
- **Media files not accessible**: Verify S3 bucket permissions
- **Database connection errors**: Check security groups allow traffic from EB
- **Deployment failing**: Check EB logs for details on the error

## Monitoring and Maintenance

- Use CloudWatch for monitoring
- Set up S3 lifecycle policies for media files
- Regularly backup RDS databases 