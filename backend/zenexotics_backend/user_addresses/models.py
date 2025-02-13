from django.db import models
from users.models import User

class AddressType(models.TextChoices):
    SERVICE = 'SERVICE', 'Service'
    BILLING = 'BILLING', 'Billing'

class Address(models.Model):
    address_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='addresses')
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    zip = models.CharField(max_length=20)
    country = models.CharField(max_length=100)
    coordinates = models.JSONField(null=True, blank=True)
    address_type = models.CharField(
        max_length=20,
        choices=AddressType.choices,
        default=AddressType.SERVICE
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Addresses' 