from django.db import models
from decimal import Decimal
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BookingOccurrence(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('CONFIRMED', 'Confirmed'),
        ('CANCELLED', 'Cancelled'),
        ('COMPLETED', 'Completed'),
    ]

    CREATOR_CHOICES = [
        ('CLIENT', 'Client'),
        ('PROFESSIONAL', 'Professional'),
    ]

    occurrence_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE, related_name='occurrences')
    start_date = models.DateField()
    end_date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    created_by = models.CharField(max_length=50, choices=CREATOR_CHOICES)
    last_modified_by = models.CharField(max_length=50, choices=CREATOR_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    calculated_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))

    class Meta:
        db_table = 'booking_occurrences'
        verbose_name = 'Booking Occurrence'
        verbose_name_plural = 'Booking Occurrences'
        ordering = ['start_date', 'start_time']

    def __str__(self):
        return f"Occurrence {self.occurrence_id} for Booking {self.booking.booking_id}"

    def save(self, *args, **kwargs):
        if self.calculated_cost is None:
            self.calculated_cost = Decimal('0.00')
        super().save(*args, **kwargs)

    def calculate_time_units(self, is_prorated=True):
        """Calculate the number of time units for this occurrence"""
        try:
            if hasattr(self.booking, 'service_id'):
                service = self.booking.service_id
                start_datetime = datetime.combine(self.start_date, self.start_time)
                end_datetime = datetime.combine(self.end_date, self.end_time)
                duration_hours = (end_datetime - start_datetime).total_seconds() / 3600
                
                if service.unit_of_time == 'PER_DAY':
                    multiple = duration_hours / 24
                elif service.unit_of_time == 'WEEK':
                    multiple = duration_hours / (24 * 7)
                elif service.unit_of_time == '1_HOUR':
                    multiple = duration_hours
                elif service.unit_of_time == '30_MIN':
                    multiple = duration_hours * 2
                elif service.unit_of_time == '15_MIN':
                    multiple = duration_hours * 4
                else:
                    return None
                
                if is_prorated:
                    return Decimal(str(multiple)).quantize(Decimal('0.001'))
                else:
                    return Decimal(str(round(multiple)))
        except (AttributeError, KeyError):
            pass
        return None

    def calculate_base_rate_cost(self, is_prorated=True):
        """Calculate the cost for the base rate considering time units"""
        try:
            if hasattr(self, 'rates') and self.rates.rates:
                base_rate = next(
                    (rate for rate in self.rates.rates if rate['title'] == 'Base Rate'),
                    None
                )
                if base_rate:
                    multiple = self.calculate_time_units(is_prorated)
                    if multiple is not None:
                        base_amount = Decimal(base_rate['amount'].replace('$', '').strip())
                        return base_amount * multiple
        except (AttributeError, KeyError):
            pass
        return Decimal('0.00')

    def update_calculated_cost(self):
        """
        Updates the calculated_cost field with the total cost of the occurrence.
        This includes both the booking details cost and any additional occurrence rates.
        The value is stored in the calculated_cost field for future reference.
        """
        try:
            total = Decimal('0.00')
            
            # Get the calculated cost from booking details
            booking_details = self.booking_details.first()
            if booking_details:
                total += booking_details.calculate_occurrence_cost(is_prorated=True)
            
            # Add the total from occurrence rates
            if hasattr(self, 'rates'):
                total += self.rates.get_total()
            
            # Update the field directly in the database
            BookingOccurrence.objects.filter(occurrence_id=self.occurrence_id).update(
                calculated_cost=total.quantize(Decimal('0.01'))
            )
            
            # Refresh from database to get updated value
            self.refresh_from_db()
            
            logger.info(f"Updated occurrence {self.occurrence_id} calculated cost to: ${self.calculated_cost}")
        except Exception as e:
            logger.error(f"Error updating calculated cost for occurrence {self.occurrence_id}: {str(e)}")

    def get_calculated_cost(self):
        """Return the stored calculated cost"""
        return self.calculated_cost if self.calculated_cost is not None else Decimal('0.00')
