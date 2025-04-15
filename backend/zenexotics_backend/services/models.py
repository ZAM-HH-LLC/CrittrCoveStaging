from django.db import models
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField

class Service(models.Model):
    MODERATION_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    UNIT_OF_TIME_CHOICES = [
        ('15 Min', '15 Min'),
        ('30 Min', '30 Min'),
        ('45 Min', '45 Min'),
        ('1 Hour', '1 Hour'),
        ('2 Hour', '2 Hour'),
        ('3 Hour', '3 Hour'),
        ('4 Hour', '4 Hour'),
        ('5 Hour', '5 Hour'),
        ('6 Hour', '6 Hour'),
        ('7 Hour', '7 Hour'),
        ('8 Hour', '8 Hour'),
        ('24 Hour', '24 Hour'),
        ('Per Day', 'Per Day'),
        ('Per Night', 'Per Night'),
        ('Per Visit', 'Per Visit'),
        ('Week', 'Week')
    ]

    # Animal type category choices
    ANIMAL_CATEGORIES = [
        ('Farm Animals', 'Farm Animals'),
        ('Domestic', 'Domestic'),
        ('Reptiles', 'Reptiles'),
        ('Aquatic', 'Aquatic'),
        ('Invertebrates', 'Invertebrates'),
        ('Other', 'Other')
    ]

    service_id = models.AutoField(primary_key=True)
    professional = models.ForeignKey('professionals.Professional', on_delete=models.CASCADE)
    service_name = models.CharField(max_length=255)
    description = models.TextField()
    # Replace animal_type and categories with a single JSONField
    animal_types = JSONField(default=dict, help_text='JSON field mapping animal types to their categories')
    base_rate = models.DecimalField(max_digits=10, decimal_places=2)
    additional_animal_rate = models.DecimalField(max_digits=10, decimal_places=2)
    holiday_rate = models.DecimalField(max_digits=10, decimal_places=2)
    holiday_rate_is_percent = models.BooleanField(default=True, help_text='Indicates if holiday rate is a percentage or fixed amount')
    applies_after = models.IntegerField(default=1, help_text='Additional animal rate applies after this many animals')
    unit_of_time = models.CharField(max_length=50, choices=UNIT_OF_TIME_CHOICES)
    is_overnight = models.BooleanField(default=False, help_text='Indicates if this service requires overnight stay')
    is_active = models.BooleanField(default=True, help_text='Indicates if this service is active')
    moderation_status = models.CharField(
        max_length=50, 
        choices=MODERATION_STATUS_CHOICES,
        default='APPROVED'
    )
    moderation_notes = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    searchable = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.service_name} by {self.professional}"

    class Meta:
        db_table = 'services'
        ordering = ['-created_at']
