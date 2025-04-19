from django.db.models.signals import post_save
from django.dispatch import receiver
from booking_occurrence_rates.models import BookingOccurrenceRate
from .services import BookingSummaryService

@receiver(post_save, sender=BookingOccurrenceRate)
def update_booking_summary(sender, instance, created, **kwargs):
    """
    Signal handler to update booking summary when a booking occurrence rate is saved.
    Uses the centralized BookingSummaryService to ensure consistent calculations.
    """
    booking = instance.occurrence.booking
    
    # Use the service to recalculate the summary
    BookingSummaryService.recalculate_from_occurrence_change(booking) 