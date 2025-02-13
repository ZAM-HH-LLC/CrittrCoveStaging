from django.db import models
from users.models import User

class ProfessionalStatus(models.Model):
    status_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='professional_status'
    )
    is_approved = models.BooleanField(default=False)
    approval_date = models.DateTimeField(null=True, blank=True)
    
    # Service approvals
    approved_for_dogs = models.BooleanField(default=False)
    approved_for_cats = models.BooleanField(default=False)
    approved_for_exotics = models.BooleanField(default=False)
    
    approval_notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = 'Professional Statuses' 