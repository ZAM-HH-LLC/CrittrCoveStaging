from django.db import models
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging
from core.tax_utils import calculate_taxes

logger = logging.getLogger(__name__)

class BookingSummary(models.Model):
    summary_id = models.AutoField(primary_key=True)
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE)
    subtotal = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    client_platform_fee_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text="Client platform fee percentage (e.g., 15.00 for 15%)",
        default=15.00
    )
    pro_platform_fee_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        help_text="Professional platform fee percentage (e.g., 15.00 for 15%)",
        default=15.00
    )
    client_platform_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Actual platform fee charged to client"
    )
    pro_platform_fee = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        default=Decimal('0.00'),
        help_text="Actual platform fee deducted from professional payout"
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

    def calculate_client_fee(self):
        """Calculate the client service fee based on the subtotal and client fee percentage"""
        return (self.subtotal * self.client_platform_fee_percentage / Decimal('100.00')).quantize(Decimal('0.01'))

    def calculate_pro_fee(self):
        """Calculate the professional service fee based on the subtotal and pro fee percentage"""
        return (self.subtotal * self.pro_platform_fee_percentage / Decimal('100.00')).quantize(Decimal('0.01'))

    def calculate_tax(self):
        """
        Legacy method for calculating tax based on percentage.
        This is maintained for backward compatibility.
        """
        return (self.subtotal * self.tax_percentage / Decimal('100.00')).quantize(Decimal('0.01'))

    def calculate_total(self):
        """Calculate the total including subtotal, fee, and tax"""
        return (self.subtotal + self.client_platform_fee + self.taxes).quantize(Decimal('0.01'))

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
        """Calculate total platform fee (client fee)"""
        return self.client_platform_fee

    @property
    def taxes(self):
        """
        Calculate taxes based on the professional's state and tax rules.
        Uses the core.tax_utils functions to determine the correct tax amount.
        """
        try:
            # Get professional from the booking
            professional = self.booking.professional
            
            # Calculate taxes using the core utility
            tax_amount = calculate_taxes(
                subtotal=self.subtotal,
                platform_fee=self.client_platform_fee,
                user=professional.user
            )
            
            logger.info(f"Calculated taxes for booking {self.booking.booking_id}: ${tax_amount}")
            return tax_amount
        except Exception as e:
            logger.error(f"Error calculating taxes: {str(e)}")
            # Fallback to legacy calculation
            return self.calculate_tax()

    @property
    def total_client_cost(self):
        """Calculate total cost for the client including fees and taxes"""
        taxes = self.taxes
        return (self.subtotal + self.client_platform_fee + taxes).quantize(Decimal('0.01'))

    @property
    def total_sitter_payout(self):
        """Calculate total payout for the sitter (subtotal minus platform fee)"""
        return (self.subtotal - self.pro_platform_fee).quantize(Decimal('0.01'))

@receiver([post_save], sender='booking_occurrences.BookingOccurrence')
def update_booking_summary(sender, instance, **kwargs):
    """
    Signal handler to update the booking summary when an occurrence's calculated cost changes
    """
    try:
        # Use the centralized service to update the booking summary
        from .services import BookingSummaryService
        BookingSummaryService.recalculate_from_occurrence_change(instance.booking)
    except Exception as e:
        logger.error(f"Error updating booking summary for occurrence {instance.occurrence_id}: {str(e)}")
