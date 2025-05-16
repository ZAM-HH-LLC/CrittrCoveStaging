#!/bin/bash
# Create a minimal deployment package for Elastic Beanstalk

set -e

echo "🔧 Creating minimal deployment package for EB..."

# Get the current directory (should be the Django project root)
CURRENT_DIR=$(pwd)
echo "Current directory: $CURRENT_DIR"

# Create a clean deployment directory
TEMP_DIR=$(mktemp -d)
echo "Using temp directory: $TEMP_DIR"

# Create minimal requirements.txt
cat > $TEMP_DIR/requirements.txt << EOF
Django==4.2.7
djangorestframework==3.14.0
djangorestframework-simplejwt==5.3.0
python-dotenv==1.0.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
whitenoise==6.6.0
EOF

# Create Procfile
cat > $TEMP_DIR/Procfile << EOF
web: gunicorn --bind=0.0.0.0:8000 --timeout=300 zenexotics_backend.wsgi:application
EOF

# Create platform hooks directories
mkdir -p $TEMP_DIR/.platform/hooks/prebuild
mkdir -p $TEMP_DIR/.platform/hooks/predeploy

# Create prebuild hook
cat > $TEMP_DIR/.platform/hooks/prebuild/01_install_dependencies.sh << EOF
#!/bin/bash
# Install dependencies for Elastic Beanstalk deployment

set -e

# Determine the python version available (3.9 is standard on Amazon Linux 2023)
PYTHON_CMD=\$(which python3 || which python || echo "python3")
echo "Using Python command: \$PYTHON_CMD"

# Upgrade pip first
echo "Upgrading pip..."
\$PYTHON_CMD -m pip install --upgrade pip

# Install requirements from file
echo "Installing dependencies from requirements.txt..."
\$PYTHON_CMD -m pip install -r requirements.txt

# Print installed packages for debugging
echo "Installed packages:"
\$PYTHON_CMD -m pip freeze

echo "Dependency installation complete!"
EOF
chmod +x $TEMP_DIR/.platform/hooks/prebuild/01_install_dependencies.sh

# Create predeploy hook
cat > $TEMP_DIR/.platform/hooks/predeploy/01_collectstatic.sh << EOF
#!/bin/bash
# Collect static files for Django deployment

set -e

echo "Running collectstatic..."

# Determine the python version available (3.9 is standard on Amazon Linux 2023)
PYTHON_CMD=\$(which python3 || which python || echo "python3")
echo "Using Python command: \$PYTHON_CMD"

# Get application directory
APP_STAGING_DIR="/var/app/staging"
APP_CURRENT_DIR="/var/app/current"

# Use current directory if already deployed, otherwise use staging
if [ -d "\$APP_CURRENT_DIR" ]; then
  cd "\$APP_CURRENT_DIR"
  echo "Using current deployment directory: \$APP_CURRENT_DIR"
else
  cd "\$APP_STAGING_DIR"
  echo "Using staging directory: \$APP_STAGING_DIR"
fi

# List directories to debug
echo "Current directory: \$(pwd)"
echo "Directory contents:"
ls -la

# Run collectstatic
echo "Collecting static files..."
\$PYTHON_CMD manage.py collectstatic --noinput

echo "Static file collection complete!"
EOF
chmod +x $TEMP_DIR/.platform/hooks/predeploy/01_collectstatic.sh

# Create .ebextensions
mkdir -p $TEMP_DIR/.ebextensions

# Copy existing configuration files if they exist
if [ -d "$CURRENT_DIR/.ebextensions" ]; then
  cp -r $CURRENT_DIR/.ebextensions/* $TEMP_DIR/.ebextensions/
fi

# Create django config if it doesn't exist
if [ ! -f "$TEMP_DIR/.ebextensions/01_django.config" ]; then
  cat > $TEMP_DIR/.ebextensions/01_django.config << EOF
option_settings:
  aws:elasticbeanstalk:container:python:
    WSGIPath: zenexotics_backend.wsgi:application
  aws:elasticbeanstalk:environment:proxy:staticfiles:
    /static: static
  aws:elasticbeanstalk:application:environment:
    DJANGO_SETTINGS_MODULE: zenexotics_backend.settings
    DEBUG: "False"
    ALLOWED_HOSTS: ".elasticbeanstalk.com"
  aws:elasticbeanstalk:environment:process:default:
    PORT: '8000'
    HealthCheckPath: /health/
  aws:elasticbeanstalk:environment:proxy:
    ProxyServer: nginx
  aws:elasticbeanstalk:command:
    Timeout: 1800

files:
  "/etc/nginx/conf.d/proxy.conf" :
    mode: "000644"
    owner: root
    group: root
    content: |
      client_max_body_size 20M;
      proxy_connect_timeout 300;
      proxy_read_timeout 300;

  "/opt/elasticbeanstalk/hooks/appdeploy/post/99_make_static_files_writable.sh":
    mode: "000755"
    owner: root
    group: root
    content: |
      #!/bin/bash
      chmod -R 755 /var/app/current/static/
      exit 0

packages:
  yum:
    git: []
    gcc: []
    python3-devel: []
EOF
fi

# Create system packages config
cat > $TEMP_DIR/.ebextensions/03_packages.config << EOF
packages:
  yum:
    git: []
    gcc: []
    python3-devel: []
    python3-pip: []
    python3-setuptools: []

commands:
  01_upgrade_pip:
    command: "python3 -m pip install --upgrade pip setuptools wheel"
  02_check_python_version:
    command: "python3 --version"
  03_check_pip_version:
    command: "python3 -m pip --version"
EOF

# Create a simplified env.example
cat > $TEMP_DIR/.env.example << EOF
# Basic configuration for Elastic Beanstalk deployment
DEBUG=False
SECRET_KEY=change-this-to-your-production-secret-key
ALLOWED_HOSTS=.elasticbeanstalk.com

# Database connection - will be set by EB environment variables
# DB_NAME=
# DB_USER=
# DB_PASSWORD=
# DB_HOST=
# DB_PORT=
EOF

# Copy only essential Python files
echo "Copying essential Django files..."
cp -r $CURRENT_DIR/manage.py $TEMP_DIR/
cp -r $CURRENT_DIR/zenexotics_backend $TEMP_DIR/

# Create static directory
mkdir -p $TEMP_DIR/static

# Create the zip file
echo "Creating zip file..."
cd $TEMP_DIR
chmod -R 755 .platform
zip -r application.zip * .platform .ebextensions .env.example

# Move to a predictable location
cp application.zip $CURRENT_DIR/minimal_application.zip

# Clean up
echo "Cleaning up..."
rm -rf $TEMP_DIR

echo "✅ Deployment package created at: $CURRENT_DIR/minimal_application.zip"
echo "You can upload this file manually through the AWS Elastic Beanstalk Console"
echo "IMPORTANT: Make sure to set the following environment variables in the EB Console:"
echo "- SECRET_KEY (use a secure random string)"
echo "- DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT (if using external database)" 