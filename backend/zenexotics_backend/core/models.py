from django.db import models

class BookingReminderLog(models.Model):
    """Track which booking reminders have been sent to prevent duplicates"""
    occurrence = models.OneToOneField(
        'booking_occurrences.BookingOccurrence',
        on_delete=models.CASCADE,
        primary_key=True
    )
    reminder_sent_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'booking_reminder_logs'
        verbose_name = 'Booking Reminder Log'
        verbose_name_plural = 'Booking Reminder Logs'
    
    def __str__(self):
        return f"Reminder sent for occurrence {self.occurrence.occurrence_id}"