from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import JSONField

User = get_user_model()

class ErrorLog(models.Model):
    error_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    error_type = models.CharField(max_length=100)
    error_message = models.TextField()
    stack_trace = models.TextField(null=True, blank=True)
    additional_data = JSONField(default=dict, blank=True)
    endpoint = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'error_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.error_type} at {self.created_at}"

class InteractionLog(models.Model):
    interaction_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    action_type = models.CharField(max_length=100)
    action_details = models.TextField()
    metadata = JSONField(default=dict, blank=True)
    status = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'interaction_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.action_type} by {self.user} at {self.created_at}"

class EngagementLog(models.Model):
    engagement_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=100, null=True, blank=True)
    feature = models.CharField(max_length=100)
    duration_seconds = models.IntegerField(null=True, blank=True)
    success = models.BooleanField(default=True)
    metadata = JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'engagement_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.feature} engagement by {self.user} at {self.created_at}" 