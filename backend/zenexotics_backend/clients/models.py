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
    last_booking = models.DateField(null=True, blank=True)
    verified_payment_method = models.BooleanField(
        default=False,
        help_text='True if client has a verified payment method'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Client: {self.user.name}"

    class Meta:
        ordering = ['-created_at']
