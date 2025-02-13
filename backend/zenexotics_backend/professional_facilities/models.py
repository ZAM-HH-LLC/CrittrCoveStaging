from django.db import models
from django.contrib.postgres.fields import ArrayField
from professionals.models import Professional

class ProfessionalFacility(models.Model):
    ANIMAL_TYPES = [
        ('Dogs', 'Dogs'),
        ('Cats', 'Cats'),
        ('Exotics', 'Exotics'),
        ('All', 'All')
    ]

    facility_id = models.AutoField(primary_key=True)
    professional = models.ForeignKey(
        Professional,
        on_delete=models.CASCADE,
        related_name='facilities'
    )
    facility_name = models.CharField(max_length=100)
    description = models.TextField()
    capacity = models.PositiveIntegerField(null=True, blank=True)
    available_for = models.CharField(max_length=10, choices=ANIMAL_TYPES)
    photos = models.JSONField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'professional_facilities'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.facility_name} - {self.professional.user.name}"
