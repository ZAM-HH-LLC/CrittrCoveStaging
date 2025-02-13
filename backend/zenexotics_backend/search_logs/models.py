from django.db import models
from django.conf import settings

class SearchLog(models.Model):
    search_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    timestamp = models.DateTimeField(auto_now_add=True)
    location = models.JSONField()
    service_category = models.CharField(max_length=100)
    service_name = models.CharField(max_length=100)
    animal_types = models.JSONField()
    price_range = models.JSONField()
    duration = models.CharField(max_length=50)
    sort_method = models.CharField(max_length=50)
    result_count = models.IntegerField()
    results_clicked = models.JSONField()

    def __str__(self):
        return f"Search {self.search_id} by {self.user or 'Anonymous'} at {self.timestamp}"

    class Meta:
        ordering = ['-timestamp']
