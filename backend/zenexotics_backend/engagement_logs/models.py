from django.db import models
from django.conf import settings

class EngagementLog(models.Model):
    engagement_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    page_name = models.CharField(max_length=100)
    duration = models.IntegerField(help_text='Time spent on the page in seconds')
    interactions = models.JSONField(help_text='List of interactions on the page')

    def __str__(self):
        return f"{self.user} on {self.page_name} for {self.duration}s"

    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['page_name']),
        ]
