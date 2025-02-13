from django.db import models
from django.conf import settings

class ErrorLog(models.Model):
    error_id = models.AutoField(primary_key=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    endpoint = models.CharField(max_length=255)
    error_message = models.TextField()
    metadata = models.JSONField()

    def __str__(self):
        return f"Error at {self.endpoint} ({self.timestamp})"

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['endpoint']),
        ]
