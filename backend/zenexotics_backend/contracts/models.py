from django.db import models
from django.conf import settings  # Import settings to access AUTH_USER_MODEL

class ContractTemplate(models.Model):
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class Contract(models.Model):
    title = models.CharField(max_length=255)
    template = models.ForeignKey(
        ContractTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )
    sitter = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='contracts'
    )
    client_name = models.CharField(max_length=255)
    client_email = models.EmailField()
    content = models.TextField()
    is_signed = models.BooleanField(default=False)
    signed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} - {self.client_name}"