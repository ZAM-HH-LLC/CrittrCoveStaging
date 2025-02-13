from django.db import models

class ServiceModeration(models.Model):
    ACTION_CHOICES = [
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    moderation_id = models.AutoField(primary_key=True)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, related_name='moderation_actions')
    moderator = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    notes = models.TextField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Moderation for {self.service.service_name} - {self.action}"

    class Meta:
        db_table = 'service_moderation'
        ordering = ['-timestamp']
