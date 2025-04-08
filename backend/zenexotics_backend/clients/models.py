from django.db import models
from django.conf import settings

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
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Client: {self.user.name}"

    def calculate_profile_completion(self):
        """Calculate the profile completion percentage based on required fields."""
        required_fields = {
            'about_me': bool(self.about_me and self.about_me.strip()),
            'emergency_contact': bool(self.emergency_contact and 
                                   self.emergency_contact.get('name') and 
                                   self.emergency_contact.get('phone')),
            'authorized_household_members': bool(self.authorized_household_members and 
                                              len(self.authorized_household_members) > 0),
            'home_environment': bool(self.home_environment and 
                                   len(self.home_environment) > 0)
        }
        
        completed_fields = sum(1 for completed in required_fields.values() if completed)
        return completed_fields / len(required_fields)

    class Meta:
        ordering = ['-created_at']
