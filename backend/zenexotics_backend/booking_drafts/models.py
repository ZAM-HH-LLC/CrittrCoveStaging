from django.db import models

class BookingDraft(models.Model):
    MODIFIER_CHOICES = [
        ('PROFESSIONAL', 'Professional'),
        ('SYSTEM', 'System'),
    ]

    STATUS_CHOICES = [
        ('IN_PROGRESS', 'In Progress'),
        ('FINALIZED', 'Finalized'),
        ('ABANDONED', 'Abandoned'),
    ]

    draft_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='drafts', null=True, blank=True)
    draft_data = models.JSONField()  # Using Django's built-in JSONField
    original_status = models.CharField(max_length=100, null=True)  # Store original booking status
    last_modified_by = models.CharField(max_length=50, choices=MODIFIER_CHOICES)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        if self.booking is None:
            return f"Draft (Unsaved) - {self.status}"
        return f"Draft for Booking {self.booking.booking_id} - {self.status}"

    class Meta:
        db_table = 'booking_drafts'
        ordering = ['-updated_at']
