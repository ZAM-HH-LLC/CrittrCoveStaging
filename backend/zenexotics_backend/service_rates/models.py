from django.db import models

class ServiceRate(models.Model):
    rate_id = models.AutoField(primary_key=True)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, related_name='additional_rates')
    title = models.CharField(max_length=255)
    description = models.TextField()
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} for {self.service.service_name}"

    class Meta:
        db_table = 'service_rates'
        ordering = ['-created_at']
