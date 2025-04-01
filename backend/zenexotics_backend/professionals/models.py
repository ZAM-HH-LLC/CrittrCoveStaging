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
    is_insured = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def calculate_profile_completion(self):
        required_fields = {
            'bio': self.bio,
            'is_insured': self.is_insured
        }
        
        completed_fields = sum(1 for value in required_fields.values() if value)
        total_fields = len(required_fields)
        
        return completed_fields / total_fields if total_fields > 0 else 0.0

    class Meta:
        db_table = 'professionals'
        verbose_name = 'Professional'
        verbose_name_plural = 'Professionals'

    def __str__(self):
        return f"Professional: {self.user.name}" 