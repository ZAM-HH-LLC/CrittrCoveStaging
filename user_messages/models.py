from django.db import models

class Message(models.Model):
    STATUS_CHOICES = [
        ('SENT', 'Sent'),
        ('READ', 'Read'),
        ('ACTION_REQUIRED', 'Action Required'),
    ]

    message_id = models.AutoField(primary_key=True)
    participant1 = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    participant2 = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='received_messages')
    role_map = models.JSONField()  # Stores roles as JSON: {"participant1_role": "client", "participant2_role": "professional"}
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    is_booking_request = models.BooleanField(default=False)
    metadata = models.JSONField(null=True, blank=True)  # Optional metadata as JSON

    def __str__(self):
        return f"Message {self.message_id} from {self.participant1} to {self.participant2}"

    class Meta:
        db_table = 'user_messages'
        ordering = ['-timestamp']
