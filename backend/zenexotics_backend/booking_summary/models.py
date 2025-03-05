from django.db import models
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)

class BookingSummary(models.Model):
    summary_id = models.AutoField(primary_key=True)
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    fee_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text="Platform fee percentage (e.g., 10.00 for 10%)",
        default=10.00
    )
    tax_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text="Tax percentage (e.g., 8.00 for 8%)",
        default=8.00
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'booking_summary'
        verbose_name = 'Booking Summary'
        verbose_name_plural = 'Booking Summaries'

    def __str__(self):
        return f"Summary for Booking {self.booking.booking_id}"

    def calculate_fee(self):
        """Calculate the service fee based on the subtotal and fee percentage"""
        return (self.subtotal * self.fee_percentage / Decimal('100.00')).quantize(Decimal('0.01'))

    def calculate_tax(self):
        """Calculate the tax based on the subtotal and tax percentage"""
        return (self.subtotal * self.tax_percentage / Decimal('100.00')).quantize(Decimal('0.01'))

    def calculate_total(self):
        """Calculate the total including subtotal, fee, and tax"""
        return (self.subtotal + self.calculate_fee() + self.calculate_tax()).quantize(Decimal('0.01'))

    def update_subtotal(self):
        """Update the subtotal by summing all occurrence calculated costs"""
        from booking_occurrences.models import BookingOccurrence
        
        total = Decimal('0.00')
        occurrences = BookingOccurrence.objects.filter(booking=self.booking)
        
        for occurrence in occurrences:
            total += occurrence.calculated_cost
        
        if self.subtotal != total:
            self.subtotal = total.quantize(Decimal('0.01'))
            self.save()
            logger.info(f"Updated booking {self.booking.booking_id} summary subtotal to: ${self.subtotal}")

    @property
    def platform_fee(self):
        """Calculate platform fee based on subtotal and fee percentage"""
        return (self.subtotal * (self.fee_percentage / Decimal('100.00'))).quantize(Decimal('0.01'))

    @property
    def taxes(self):
        """Calculate taxes based on subtotal and tax percentage"""
        platform_fee = self.platform_fee
        return ((self.subtotal + platform_fee) * (self.tax_percentage / Decimal('100.00'))).quantize(Decimal('0.01'))

    @property
    def total_client_cost(self):
        """Calculate total cost for the client including fees and taxes"""
        platform_fee = self.platform_fee
        taxes = self.taxes
        return (self.subtotal + platform_fee + taxes).quantize(Decimal('0.01'))

    @property
    def total_sitter_payout(self):
        """Calculate total payout for the sitter (subtotal minus platform fee)"""
        platform_fee = self.platform_fee
        return (self.subtotal - platform_fee).quantize(Decimal('0.01'))

@receiver([post_save], sender='booking_occurrences.BookingOccurrence')
def update_booking_summary(sender, instance, **kwargs):
    """
    Signal handler to update the booking summary when an occurrence's calculated cost changes
    """
    try:
        # Get or create the summary
        from booking_summary.models import BookingSummary
        summary, created = BookingSummary.objects.get_or_create(
            booking=instance.booking,
            defaults={
                'fee_percentage': Decimal('10.00'),
                'tax_percentage': Decimal('8.00')
            }
        )
        summary.update_subtotal()
    except Exception as e:
        logger.error(f"Error updating booking summary for occurrence {instance.occurrence_id}: {str(e)}")
