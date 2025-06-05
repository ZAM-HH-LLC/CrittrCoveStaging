from django.db import models
from django.conf import settings
import logging

def default_list():
    return []

def default_dict():
    return {}

class Client(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='client_profile'
    )
    about_me = models.TextField(blank=True)
    emergency_contact = models.JSONField(
        default=default_dict,
        blank=True,
        help_text='List of emergency contacts'
    )
    authorized_household_members = models.JSONField(
        default=default_list,
        blank=True,
        help_text='List of people authorized to interact with the pet'
    )
    home_environment = models.JSONField(
        default=default_list,
        blank=True,
        help_text='List of home environment features'
    )
    last_booking = models.DateField(null=True, blank=True)
    verified_payment_method = models.BooleanField(
        default=False,
        help_text='True if client has a verified payment method'
    )
    invited_by = models.ForeignKey(
        'professionals.Professional',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='invited_clients',
        help_text='The professional who invited this client'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Client: {self.user.name}"

    def calculate_profile_completion(self):
        """Calculate the profile completion percentage based on address."""
        logger = logging.getLogger(__name__)
        
        try:
            # Check if user has address with non-empty address_line_1
            # We're being extra careful here to check for valid addresses
            addresses = self.user.addresses.all()
            valid_addresses = [addr for addr in addresses if addr.address_line_1 and addr.address_line_1.strip()]
            
            # Log the information
            logger.info(f"Client {self.user.email} has {len(addresses)} addresses, {len(valid_addresses)} valid")
            for i, addr in enumerate(addresses):
                logger.info(f"Address {i+1}: address_line_1='{addr.address_line_1}'")
            
            # For clients, profile is complete (100%) when they have a valid address
            # Otherwise, it's 0%
            if valid_addresses:
                return 1.0
            else:
                return 0.0
            
        except Exception as e:
            logger.error(f"Error checking client profile completion: {e}")
            return 0.0

    class Meta:
        ordering = ['-created_at']
