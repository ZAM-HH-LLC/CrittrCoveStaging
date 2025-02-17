from django.db import models
from django.contrib.postgres.fields import ArrayField

class Service(models.Model):
    ANIMAL_TYPE_CHOICES = [
        ('DOG', 'Dog'),
        ('CAT', 'Cat'),
        ('EXOTIC', 'Exotic'),
        ('FARM', 'Farm Animal'),
        ('OTHER', 'Other'),
    ]

    MODERATION_STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    UNIT_OF_TIME_CHOICES = [
        ('15_MIN', '15 Minutes'),
        ('30_MIN', '30 Minutes'),
        ('45_MIN', '45 Minutes'),
        ('1_HOUR', '1 Hour'),
        ('2_HOUR', '2 Hours'),
        ('3_HOUR', '3 Hours'),
        ('4_HOUR', '4 Hours'),
        ('5_HOUR', '5 Hours'),
        ('6_HOUR', '6 Hours'),
        ('7_HOUR', '7 Hours'),
        ('8_HOUR', '8 Hours'),
        ('24_HOUR', '24 Hours'),
        ('PER_DAY', 'Per Day'),
        ('PER_VISIT', 'Per Visit'),
        ('WEEK', 'Week'),
    ]

    service_id = models.AutoField(primary_key=True)
    professional = models.ForeignKey('professionals.Professional', on_delete=models.CASCADE)
    service_name = models.CharField(max_length=255)
    description = models.TextField()
    animal_type = models.CharField(max_length=50, choices=ANIMAL_TYPE_CHOICES)
    categories = ArrayField(models.CharField(max_length=100), blank=True)
    base_rate = models.DecimalField(max_digits=10, decimal_places=2)
    additional_animal_rate = models.DecimalField(max_digits=10, decimal_places=2)
    holiday_rate = models.DecimalField(max_digits=10, decimal_places=2)
    applies_after = models.IntegerField(default=1, help_text='Additional animal rate applies after this many animals')
    unit_of_time = models.CharField(max_length=50, choices=UNIT_OF_TIME_CHOICES)
    moderation_status = models.CharField(
        max_length=50, 
        choices=MODERATION_STATUS_CHOICES,
        default='PENDING'
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
