from django.db import models
from django.core.serializers.json import DjangoJSONEncoder
from decimal import Decimal
from django.db.models.signals import post_save
from django.dispatch import receiver
import logging
import json

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
        
        if self.rates is None:
            self.rates = []
            return
        
        if not isinstance(self.rates, list):
            raise ValidationError({'rates': 'Rates must be a list'})
        
        cleaned_rates = []
        for rate in self.rates:
            if not isinstance(rate, dict):
                raise ValidationError({'rates': 'Each rate must be an object'})
            
            required_fields = {'title', 'description', 'amount'}
            missing_fields = required_fields - set(rate.keys())
            
            if missing_fields:
                raise ValidationError({
                    'rates': f'Rate is missing required fields: {", ".join(missing_fields)}'
                })
            
            # Create a new rate dict to avoid modifying the original
            cleaned_rate = {
                'title': str(rate['title']),
                'description': str(rate['description']),
                'amount': rate['amount']
            }
            
            # Validate and fix amount format
            amount = cleaned_rate['amount']
            if not isinstance(amount, str):
                cleaned_rate['amount'] = f"${amount}"
                amount = cleaned_rate['amount']
            
            # Add '$' prefix if missing
            if not amount.startswith('$'):
                cleaned_rate['amount'] = f"${amount}"
            
            try:
                # Try to convert amount to Decimal (removing $ first)
                Decimal(cleaned_rate['amount'].replace('$', '').strip())
            except:
                raise ValidationError({
                    'rates': f'Invalid amount format: {amount}'
                })
                
            cleaned_rates.append(cleaned_rate)
        
        self.rates = cleaned_rates

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

@receiver(post_save, sender='booking_occurrences.BookingOccurrence')
def create_occurrence_rates(sender, instance, created, **kwargs):
    """
    Signal handler to create BookingOccurrenceRate when a BookingOccurrence is created
    """
    if created:
        from service_rates.models import ServiceRate
        
        try:
            # Get the service from the booking
            service = instance.booking.service_id
            if not service:
                logger.warning(f"No service found for occurrence {instance.occurrence_id}")
                return
                
            # Get service rates
            service_rates = ServiceRate.objects.filter(service=service)
            
            # Create rates list
            rates_list = []
            
            # Format base rate amount
            base_rate_amount = f"${service.base_rate}"
            if not isinstance(base_rate_amount, str):
                base_rate_amount = f"${base_rate_amount}"
            if not base_rate_amount.startswith('$'):
                base_rate_amount = f"${base_rate_amount}"
            
            # Add base rate
            rates_list.append({
                'title': 'Base Rate',
                'description': 'Base rate for service',
                'amount': base_rate_amount
            })
            
            # Add additional service rates
            for rate in service_rates:
                rate_amount = f"${rate.rate}"
                if not isinstance(rate_amount, str):
                    rate_amount = f"${rate_amount}"
                if not rate_amount.startswith('$'):
                    rate_amount = f"${rate_amount}"
                    
                rates_list.append({
                    'title': str(rate.title),
                    'description': str(rate.description),
                    'amount': rate_amount
                })
            
            # Create the occurrence rate
            occurrence_rate = BookingOccurrenceRate.objects.create(
                occurrence=instance,
                rates=rates_list
            )
            logger.info(f"Created BookingOccurrenceRate for occurrence {instance.occurrence_id}")
            
        except Exception as e:
            logger.error(f"Error creating BookingOccurrenceRate: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error args: {e.args}")
            logger.error(f"Rates data that failed: {rates_list}")
            # Don't re-raise the exception to avoid transaction rollback
            return None
