from django.db import models
from django.utils import timezone
from datetime import timedelta
from django.conf import settings
from bookings.models import Booking


class BaseReview(models.Model):
    """
    Abstract base model for all types of reviews
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]

    review_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='%(class)s_reviews')
    client = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='%(class)s_reviews')
    professional = models.ForeignKey('professionals.Professional', on_delete=models.CASCADE, related_name='%(class)s_reviews')
    rating = models.IntegerField()
    review_text = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='APPROVED')
    moderated_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='%(class)s_moderated')
    moderation_reason = models.TextField(null=True, blank=True)
    review_visible = models.BooleanField(default=False)
    review_posted = models.BooleanField(default=False)
    post_deadline = models.DateTimeField()

    class Meta:
        abstract = True
        ordering = ['-created_at']


class ProfessionalReview(BaseReview):
    """
    Reviews written by professionals about clients
    """
    class Meta:
        db_table = 'reviews_professional_reviews'
        verbose_name = 'Professional Review'
        verbose_name_plural = 'Professional Reviews'

    def __str__(self):
        return f"Professional Review {self.review_id} by {self.professional} for {self.client}"


class ClientReview(BaseReview):
    """
    Reviews written by clients about professionals
    """
    class Meta:
        db_table = 'reviews_client_reviews'
        verbose_name = 'Client Review'
        verbose_name_plural = 'Client Reviews'

    def __str__(self):
        return f"Client Review {self.review_id} by {self.client} for {self.professional}"


class ReviewRequest(models.Model):
    """
    Model to track review requests sent to users
    """
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('EXPIRED', 'Expired'),
    ]

    TYPE_CHOICES = [
        ('CLIENT', 'Client Review'),
        ('PROFESSIONAL', 'Professional Review'),
    ]

    request_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='review_requests')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='review_requests')
    review_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    completed_at = models.DateTimeField(null=True, blank=True)
    reminder_sent = models.BooleanField(default=False)

    class Meta:
        db_table = 'review_requests'
        ordering = ['-created_at']
        unique_together = ['booking', 'user', 'review_type']

    def __str__(self):
        return f"Review Request {self.request_id} for {self.user} on booking {self.booking.booking_id}"

    def save(self, *args, **kwargs):
        # Set expiration date if not already set (14 days from creation)
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(days=14)
        super().save(*args, **kwargs)

    def mark_completed(self):
        """Mark this review request as completed"""
        self.status = 'COMPLETED'
        self.completed_at = timezone.now()
        self.save(update_fields=['status', 'completed_at'])

    def mark_expired(self):
        """Mark this review request as expired"""
        self.status = 'EXPIRED'
        self.save(update_fields=['status'])
