from django.db import models
from django.conf import settings

class Professional(models.Model):
    professional_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='professional_profile'
    )
    bio = models.TextField(blank=True)
    average_rating = models.FloatField(default=0.0)
    total_num_of_reviews = models.PositiveIntegerField(default=0)
    experience = models.TextField(blank=True)
    is_insured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    subscribed = models.BooleanField(default=False)

    class Meta:
        db_table = 'professionals'
        ordering = ['-created_at']

    def __str__(self):
        return f"Professional: {self.user.name}" 