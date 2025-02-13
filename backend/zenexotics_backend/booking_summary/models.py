from django.db import models
from decimal import Decimal

class BookingSummary(models.Model):
    summary_id = models.AutoField(primary_key=True)
    booking = models.OneToOneField('bookings.Booking', on_delete=models.CASCADE)
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

    @property
    def subtotal(self):
        """Calculate subtotal from all occurrences' rates"""
        total = Decimal('0.00')
        for occurrence in self.booking.occurrences.all():
            try:
                if hasattr(occurrence, 'rates') and occurrence.rates.rates:
                    # Sum up all rates in the JSON array
                    occurrence_total = sum(
                        Decimal(rate['amount'].replace('$', '').strip())
                        for rate in occurrence.rates.rates
                    )
                    total += occurrence_total
            except (AttributeError, KeyError):
                continue
        return total

    @property
    def platform_fee(self):
        """Calculate platform fee based on subtotal and fee percentage"""
        return self.subtotal * (self.fee_percentage / Decimal('100.00'))

    @property
    def taxes(self):
        """Calculate taxes based on subtotal and tax percentage"""
        return (self.subtotal + self.platform_fee) * (self.tax_percentage / Decimal('100.00'))

    @property
    def total_client_cost(self):
        """Calculate total cost for the client including fees and taxes"""
        return self.subtotal + self.platform_fee + self.taxes

    @property
    def total_sitter_payout(self):
        """Calculate total payout for the sitter (subtotal minus platform fee)"""
        return self.subtotal - self.platform_fee
