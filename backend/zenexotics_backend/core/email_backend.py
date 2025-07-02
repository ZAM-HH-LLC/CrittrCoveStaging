"""
Custom email backend for handling SSL certificate verification issues in development.
"""

import ssl
from django.core.mail.backends.smtp import EmailBackend as DjangoSMTPBackend
from django.conf import settings


class DevelopmentEmailBackend(DjangoSMTPBackend):
    """
    Custom email backend that disables SSL certificate verification in development.
    This fixes common SSL certificate issues when using Gmail SMTP on macOS.
    """
    
    def open(self):
        """
        Override the open method to use a custom SSL context in development.
        """
        if getattr(settings, 'IS_DEVELOPMENT', False):
            # Create SSL context that doesn't verify certificates for development
            ssl_context = ssl.create_default_context()
            ssl_context.check_hostname = False
            ssl_context.verify_mode = ssl.CERT_NONE
            self.ssl_context = ssl_context
        
        return super().open() 