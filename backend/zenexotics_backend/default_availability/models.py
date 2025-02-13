from django.db import models

class DefaultAvailability(models.Model):
    DEFAULT_STATE_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('UNAVAILABLE', 'Unavailable'),
    ]

    default_availability_id = models.AutoField(primary_key=True)
    professional = models.ForeignKey('professionals.Professional', on_delete=models.CASCADE)
    default_state = models.CharField(max_length=50, choices=DEFAULT_STATE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.professional} - Default: {self.default_state}"

    class Meta:
        db_table = 'default_availability'
        ordering = ['-created_at']
        verbose_name_plural = 'default availabilities'
