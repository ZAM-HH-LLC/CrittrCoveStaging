from django.db import models
from decimal import Decimal
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class BookingDetails(models.Model):
    detail_id = models.AutoField(primary_key=True)
    booking_occurrence = models.ForeignKey('booking_occurrences.BookingOccurrence', on_delete=models.CASCADE, related_name='booking_details')
    num_pets = models.PositiveIntegerField()
    base_rate = models.DecimalField(max_digits=10, decimal_places=2)
    additional_pet_rate = models.DecimalField(max_digits=10, decimal_places=2)
    applies_after = models.PositiveIntegerField(default=1, help_text="Additional pet rate applies after this many pets")
    holiday_rate = models.DecimalField(max_digits=10, decimal_places=2)
    calculated_rate = models.DecimalField(max_digits=10, decimal_places=2)
    unit_of_time = models.CharField(max_length=20, default='Per Visit')
    multiple = models.DecimalField(max_digits=10, decimal_places=5, default=1.00000)
    nights = models.PositiveIntegerField(default=0)

    def __str__(self):
        return f"Details for Occurrence {self.booking_occurrence.occurrence_id}"

    class Meta:
        db_table = 'booking_details'
        verbose_name_plural = 'booking details'

    def calculate_prorated_multiplier(self, start_datetime, end_datetime):
        """Calculate the prorated multiplier based on unit of time"""
        duration_hours = (end_datetime - start_datetime).total_seconds() / 3600
        
        unit_mapping = {
            '15 Min': 0.25,
            '30 Min': 0.5,
            '45 Min': 0.75,
            '1 Hour': 1,
            '2 Hour': 2,
            '3 Hour': 3,
            '4 Hour': 4,
            '5 Hour': 5,
            '6 Hour': 6,
            '7 Hour': 7,
            '8 Hour': 8,
            '24 Hour': 24,
            'Per Day': 24,
            'Per Visit': None,  # Special case - no proration
            'Per Night': 'Per Night',
            'Week': 168  # 24 * 7
        }

        # Debug logging for unit_of_time matching
        logger.info(f"MBA1234 Exact unit_of_time from request: {self.unit_of_time}")
        logger.info(f"MBA1234 Available mappings: {list(unit_mapping.keys())}")
        
        # Use exact case matching
        unit_hours = unit_mapping.get(self.unit_of_time)

        if self.unit_of_time == 'Per Night':
            return Decimal(str(self.nights))
        
        logger.info(f"Calculating prorated multiplier for occurrence {self.booking_occurrence.occurrence_id}:")
        logger.info(f"  Duration: {duration_hours} hours")
        logger.info(f"  Unit of time: {self.unit_of_time}")
        logger.info(f"  Unit hours: {unit_hours}")

        if unit_hours is None:  # PER_VISIT case
            logger.info("  Using PER_VISIT rate (multiplier = 1)")
            return Decimal('1')
            
        multiplier = Decimal(str(duration_hours / unit_hours)).quantize(Decimal('0.00001'))
        logger.info(f"  Final multiplier: {multiplier}")
        return multiplier

    def calculate_occurrence_cost(self, is_prorated=True):
        """Calculate total cost for an occurrence including prorated base rate and all additional rates"""
        logger.info(f"\nCalculating occurrence cost for occurrence {self.booking_occurrence.occurrence_id}:")
        logger.info(f"  Base rate: ${self.base_rate}")
        logger.info(f"  Additional pet rate: ${self.additional_pet_rate}")
        logger.info(f"  Holiday rate: ${self.holiday_rate}")
        logger.info(f"  Number of pets: {self.num_pets}")
        logger.info(f"  Applies after: {self.applies_after}")
        logger.info(f"  Is prorated: {is_prorated}")

        # Get start and end datetime
        start_datetime = datetime.combine(self.booking_occurrence.start_date, self.booking_occurrence.start_time)
        end_datetime = datetime.combine(self.booking_occurrence.end_date, self.booking_occurrence.end_time)
        logger.info(f"  Start datetime: {start_datetime}")
        logger.info(f"  End datetime: {end_datetime}")

        # Calculate base rate
        is_holiday = self.is_holiday(self.booking_occurrence.start_date)
        base_rate = self.holiday_rate if is_holiday else self.base_rate
        logger.info(f"  Is holiday: {is_holiday}")
        logger.info(f"  Using base rate: ${base_rate}")

        if is_prorated:
            multiplier = self.calculate_prorated_multiplier(start_datetime, end_datetime)
            base_total = base_rate * multiplier
            logger.info(f"  Applied multiplier {multiplier} to base rate: ${base_total}")
        else:
            base_total = base_rate
            logger.info(f"  Using flat base rate: ${base_total}")

        # Add additional animal rate if applicable
        if self.additional_pet_rate and self.num_pets > self.applies_after:
            additional_pets = self.num_pets - self.applies_after
            additional_pet_cost = self.additional_pet_rate * additional_pets
            base_total += additional_pet_cost
            logger.info(f"  Added cost for {additional_pets} additional pets at ${self.additional_pet_rate} each: ${additional_pet_cost}")

        logger.info(f"  Final calculated cost: ${base_total}")
        return base_total.quantize(Decimal('0.01'))

    def save(self, *args, **kwargs):
        """Override save to automatically calculate and set calculated_rate"""
        # Get start and end datetime for multiple calculation
        start_datetime = datetime.combine(self.booking_occurrence.start_date, self.booking_occurrence.start_time)
        end_datetime = datetime.combine(self.booking_occurrence.end_date, self.booking_occurrence.end_time)
        
        # Calculate and store the multiple
        self.multiple = self.calculate_prorated_multiplier(start_datetime, end_datetime)
        
        # Calculate the rate before saving
        self.calculated_rate = self.calculate_occurrence_cost(is_prorated=True)
        super().save(*args, **kwargs)

    def is_holiday(self, date):
        """Check if a date is a holiday"""
        # TODO: Implement holiday checking logic
        return False
