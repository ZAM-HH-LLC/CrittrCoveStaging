from django.db.models.signals import post_save
from django.dispatch import receiver
from decimal import Decimal
from booking_occurrence_rates.models import BookingOccurrenceRate
from .models import BookingSummary

@receiver(post_save, sender=BookingOccurrenceRate)
def update_booking_summary(sender, instance, created, **kwargs):
    """
    Signal handler to update or create booking summary when a booking occurrence rate is saved.
    Only stores the fee and tax percentages, all other values are calculated dynamically.
    """
    booking = instance.occurrence.booking
    
    # Set fee and tax percentages
    fee_percentage = Decimal('10.00')  # 10% platform fee
    tax_percentage = Decimal('8.00')  # 8% tax
    
    # Update or create the booking summary with just the percentages
    summary, created = BookingSummary.objects.update_or_create(
        booking=booking,
        defaults={
            'fee_percentage': fee_percentage,
            'tax_percentage': tax_percentage,
        }
    ) 