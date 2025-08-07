from django.db import models
from django.conf import settings
from users.models import User
from bookings.models import Booking
from .helpers import message_image_path, validate_message_image

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
        ('booking_confirmed', 'Booking Confirmed'), # This is a message sent when a booking is confirmed
        ('image_message', 'Image Message'), # This is a message with image attachments
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
    image = models.ImageField(
        upload_to=message_image_path,
        null=True,
        blank=True,
        validators=[validate_message_image],
        help_text="Image attachment for the message. Maximum size: 5MB. Allowed formats: JPEG, PNG, GIF, WebP"
    )
    
    # Fields for handling deleted users while preserving conversation history
    sender_name_backup = models.CharField(max_length=255, blank=True, help_text='Backup of sender name for deleted users')
    is_sender_deleted = models.BooleanField(default=False, help_text='True if the sender has been deleted')
    
    def get_sender_name(self):
        """
        Get the sender name, using backup if the sender is deleted.
        """
        if self.is_sender_deleted:
            return self.sender_name_backup or "Deleted User"
        return self.sender.name if self.sender else "Unknown User"

    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Message'
        verbose_name_plural = 'Messages'

    def __str__(self):
        return f'Message from {self.sender} at {self.timestamp}'


class MessageMetrics(models.Model):
    """
    Model to track performance metrics for messaging
    """
    DELIVERY_STATUS_CHOICES = [
        ('websocket_sent', 'WebSocket Sent'),
        ('websocket_received', 'WebSocket Received'),
        ('email_sent', 'Email Sent'),
        ('email_delivered', 'Email Delivered'),
        ('email_opened', 'Email Opened'),
        ('read', 'Message Read'),
        ('failed', 'Delivery Failed'),
    ]
    
    id = models.AutoField(primary_key=True)
    message = models.ForeignKey(UserMessage, on_delete=models.CASCADE, related_name='metrics')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE)
    delivery_status = models.CharField(max_length=20, choices=DELIVERY_STATUS_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    delivery_latency = models.FloatField(null=True, blank=True, help_text='Delivery time in milliseconds')
    is_recipient_online = models.BooleanField(default=False)
    client_info = models.JSONField(null=True, blank=True, help_text='Client browser/device info')
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Message Metric'
        verbose_name_plural = 'Message Metrics'
        
    def __str__(self):
        return f'Metric for message {self.message_id} - {self.delivery_status}'
