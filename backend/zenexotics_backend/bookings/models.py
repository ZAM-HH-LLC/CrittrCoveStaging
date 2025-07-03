from django.db import models
from .constants import BookingStates

class Booking(models.Model):
    BOOKING_STATUS_CHOICES = [
        ('Pending initial Professional Changes', 'Pending Initial Professional Changes'),
        ('Pending Professional Changes', 'Pending Professional Changes'),
        ('Pending Client Approval', 'Pending Client Approval'),
        ('Confirmed Pending Professional Changes', 'Confirmed Pending Professional Changes'),
        ('Confirmed', 'Confirmed'),
        ('Denied', 'Denied'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
        ('Draft', 'Draft'),
    ]

    booking_id = models.AutoField(primary_key=True)
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE)
    professional = models.ForeignKey('professionals.Professional', on_delete=models.CASCADE)
    service_id = models.ForeignKey('services.Service', on_delete=models.PROTECT, null=True, related_name='bookings', db_column='service_type_id')
    status = models.CharField(max_length=100, choices=BOOKING_STATUS_CHOICES)
    initiated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='initiated_bookings')
    cancelled_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='cancelled_bookings')
    last_modified_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, related_name='modified_bookings')
    denied_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='denied_bookings')
    pro_agreed_tos = models.BooleanField(default=False)
    client_agreed_tos = models.BooleanField(default=False)
    notes_from_pro = models.TextField(blank=True, null=True, help_text="Notes from the professional to the client for this booking")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Booking {self.booking_id} - {self.client} with {self.professional}"

    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']
