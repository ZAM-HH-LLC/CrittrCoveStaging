#!/bin/bash
set -e
# Patch the static alias to include trailing slash
sed -i 's|alias /var/app/current/staticfiles;|alias /var/app/current/staticfiles/;|' /etc/nginx/conf.d/elasticbeanstalk/01_static.conf
systemctl restart nginx 