from django.db import models

class SharedAvailability(models.Model):
    shared_availability_id = models.AutoField(primary_key=True)
    availability = models.ForeignKey('availability.Availability', on_delete=models.CASCADE)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE)

    def __str__(self):
        return f"Shared: {self.availability} - {self.service.service_name}"

    class Meta:
        db_table = 'shared_availability'
        unique_together = ('availability', 'service')
        verbose_name_plural = 'shared availabilities'
