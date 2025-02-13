from django.db import models

class Availability(models.Model):
    TYPE_CHOICES = [
        ('UNAVAILABLE', 'Unavailable'),
        ('BOOKED', 'Booked'),
    ]

    availability_id = models.AutoField(primary_key=True)
    professional = models.ForeignKey('professionals.Professional', on_delete=models.CASCADE)
    service = models.ForeignKey('services.Service', on_delete=models.SET_NULL, null=True, blank=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, null=True, blank=True)
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    reason = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.professional} - {self.date} ({self.start_time} to {self.end_time})"

    class Meta:
        db_table = 'availability'
        ordering = ['date', 'start_time']
        verbose_name_plural = 'availabilities'
