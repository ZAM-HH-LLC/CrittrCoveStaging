from django.db import models

# Create your models here.

class Location(models.Model):
    """
    Model to store location information for the app's city-by-city rollout.
    This centralizes the management of supported locations so we can expand
    to new cities without requiring app updates.
    """
    name = models.CharField(max_length=100, unique=True)
    supported = models.BooleanField(default=False)
    display_order = models.IntegerField(default=999)  # For controlling the order in the dropdown
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['display_order', 'name']
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'
    
    def __str__(self):
        status = "Supported" if self.supported else "Coming Soon"
        return f"{self.name} ({status})"
