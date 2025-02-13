from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging

logger = logging.getLogger(__name__)

class BookingOccurrenceRate(models.Model):
    """Model for storing multiple rates as JSON for each booking occurrence"""
    occurrence_rate_id = models.AutoField(primary_key=True)
    occurrence = models.OneToOneField(
        'booking_occurrences.BookingOccurrence',
        on_delete=models.CASCADE,
        related_name='rates'
    )
    rates = models.JSONField(
        default=list,
        help_text='List of rates with title, description, and amount',
        encoder=DjangoJSONEncoder
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'booking_occurrence_rates'
        verbose_name = 'Booking Occurrence Rate'
        verbose_name_plural = 'Booking Occurrence Rates'

    def __str__(self):
        return f"Rates for {self.occurrence}"

    def get_total(self):
        """Get the total of all rates"""
        total = Decimal('0.00')
        if self.rates:
            for rate in self.rates:
                amount = Decimal(rate['amount'].replace('$', '').strip())
                total += amount
        return total.quantize(Decimal('0.01'))

    def clean(self):
        """Validate the rates JSON structure"""
        from django.core.exceptions import ValidationError
        
        if not isinstance(self.rates, list):
            raise ValidationError({'rates': 'Rates must be a list'})
        
        for rate in self.rates:
            if not isinstance(rate, dict):
                raise ValidationError({'rates': 'Each rate must be an object'})
            
            required_fields = {'title', 'description', 'amount'}
            missing_fields = required_fields - set(rate.keys())
            
            if missing_fields:
                raise ValidationError({
                    'rates': f'Rate is missing required fields: {", ".join(missing_fields)}'
                })
            
            # Validate and fix amount format
            amount = rate['amount']
            if not isinstance(amount, str):
                raise ValidationError({
                    'rates': f'Amount must be a string'
                })
            
            # Add '$' prefix if missing
            if not amount.startswith('$'):
                rate['amount'] = f"${amount}"
            
            try:
                # Try to convert amount to Decimal (removing $ first)
                Decimal(rate['amount'].replace('$', '').strip())
            except:
                raise ValidationError({
                    'rates': f'Invalid amount format: {amount}'
                })

@receiver([post_save], sender=BookingOccurrenceRate)
def update_occurrence_calculated_cost(sender, instance, created, **kwargs):
    """
    Signal handler to update the BookingOccurrence calculated cost when rates change
    """
    occurrence = instance.occurrence
    
    # Get the total from occurrence rates
    occurrence_rates_total = instance.get_total()
    
    # Get the calculated cost from booking details
    booking_details_cost = Decimal('0.00')
    booking_details = occurrence.booking_details.first()
    if booking_details:
        booking_details_cost = booking_details.calculate_occurrence_cost(is_prorated=True)
    
    # Log the values
    logger.info(f"Updating occurrence {occurrence.occurrence_id} calculated cost:")
    logger.info(f"Booking details cost: ${booking_details_cost}")
    logger.info(f"Occurrence rates total: ${occurrence_rates_total}")
    logger.info(f"Total: ${booking_details_cost + occurrence_rates_total}")
    
    # Update the occurrence's calculated cost
    occurrence.update_calculated_cost()
