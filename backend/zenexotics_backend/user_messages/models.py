from django.db import models
from users.models import User
from bookings.models import Booking

class UserMessage(models.Model):
    MESSAGE_STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('read', 'Read'),
        ('action_required', 'Action Required'),
    ]

    MESSAGE_TYPE_CHOICES = [
        ('initial_booking_request', 'Initial Booking Request'), # This is the first message sent by the client to the professional
        ('normal_message', 'Normal Message'), # This is a normal message sent by the client/pro to the pro/client
        ('approval_request', 'Approval Request'), # This is a request for approval from the professional to client
        ('request_changes', 'Request Changes'), # This is a request for changes from the professional
        ('send_approved_message', 'Send Approved Message'), # This is a message sent by the client to the pro after the booking is approved
    ]

    message_id = models.AutoField(primary_key=True)
    conversation = models.ForeignKey('conversations.Conversation', on_delete=models.CASCADE)
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    booking = models.ForeignKey(Booking, null=True, blank=True, on_delete=models.SET_NULL)
    status = models.CharField(max_length=20, choices=MESSAGE_STATUS_CHOICES, default='sent')
    type_of_message = models.CharField(max_length=30, choices=MESSAGE_TYPE_CHOICES, default='normal_message')
    is_clickable = models.BooleanField(default=True)
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'

    def __str__(self):
        return f'Message from {self.sender} at {self.timestamp}'
