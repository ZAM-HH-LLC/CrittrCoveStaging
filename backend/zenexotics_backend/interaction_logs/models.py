from django.db import models
from django.conf import settings

class InteractionLog(models.Model):
    interaction_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=50)
    target_id = models.CharField(max_length=100)
    target_type = models.CharField(max_length=50)
    metadata = models.JSONField()

    def __str__(self):
        return f"{self.action} by {self.user} on {self.target_type} at {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['target_id', 'target_type']),
        ]
