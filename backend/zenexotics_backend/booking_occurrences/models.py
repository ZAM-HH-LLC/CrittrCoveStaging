from django.db import models
from decimal import Decimal
from datetime import datetime, time
from django.db.models.signals import post_save
from django.dispatch import receiver
from core.time_utils import convert_to_utc, convert_from_utc, format_datetime_for_user, get_formatted_times, format_booking_occurrence
import logging
import pytz

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
    start_time = models.TimeField(help_text="Time in 24-hour format (UTC)")
    end_time = models.TimeField(help_text="Time in 24-hour format (UTC)")
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
        # Ensure times are in military format
        if isinstance(self.start_time, str):
            try:
                # Parse time string and convert to military format
                parsed_time = datetime.strptime(self.start_time, '%I:%M %p').time()
                self.start_time = time(parsed_time.hour, parsed_time.minute)
            except ValueError:
                # If it's already in military format, just parse it
                try:
                    parsed_time = datetime.strptime(self.start_time, '%H:%M').time()
                    self.start_time = time(parsed_time.hour, parsed_time.minute)
                except ValueError:
                    pass

        if isinstance(self.end_time, str):
            try:
                # Parse time string and convert to military format
                parsed_time = datetime.strptime(self.end_time, '%I:%M %p').time()
                self.end_time = time(parsed_time.hour, parsed_time.minute)
            except ValueError:
                # If it's already in military format, just parse it
                try:
                    parsed_time = datetime.strptime(self.end_time, '%H:%M').time()
                    self.end_time = time(parsed_time.hour, parsed_time.minute)
                except ValueError:
                    pass

        if self.calculated_cost is None:
            self.calculated_cost = Decimal('0.00')
        super().save(*args, **kwargs)

    def get_formatted_times(self, user_id):
        """
        Get the start and end times formatted according to the user's preferences.
        Returns a tuple of (formatted start time, formatted end time, timezone abbreviation)
        """
        start_dt = datetime.combine(self.start_date, self.start_time)
        end_dt = datetime.combine(self.end_date, self.end_time)
        
        # Make datetimes timezone-aware in UTC
        start_dt = pytz.UTC.localize(start_dt)
        end_dt = pytz.UTC.localize(end_dt)
        
        # Format according to user preferences
        formatted_times = format_booking_occurrence(start_dt, end_dt, user_id)
        return formatted_times

    def set_times_from_local(self, start_dt, end_dt, user_timezone):
        """
        Set the occurrence times from local datetime objects.
        Converts the times to UTC and ensures military format.
        """
        # Convert to UTC
        start_utc = convert_to_utc(start_dt, user_timezone)
        end_utc = convert_to_utc(end_dt, user_timezone)
        
        # Set the fields (always in military format)
        self.start_date = start_utc.date()
        self.end_date = end_utc.date()
        self.start_time = start_utc.time()
        self.end_time = end_utc.time()

    def calculate_time_units(self, is_prorated=True):
        """Calculate the number of time units for this occurrence"""
        try:
            if hasattr(self.booking, 'service_id'):
                service = self.booking.service_id
                start_datetime = datetime.combine(self.start_date, self.start_time)
                end_datetime = datetime.combine(self.end_date, self.end_time)
                
                # Make datetimes timezone-aware in UTC
                start_datetime = pytz.UTC.localize(start_datetime)
                end_datetime = pytz.UTC.localize(end_datetime)
                
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
            
            # Only update and save if the value has changed
            if self.calculated_cost != total:
                self.calculated_cost = total.quantize(Decimal('0.01'))
                self.save()  # This will trigger the post_save signal in services (update_booking_summary)
                logger.info(f"Updated occurrence {self.occurrence_id} calculated cost to: ${self.calculated_cost}")
            
        except Exception as e:
            logger.error(f"Error updating calculated cost for occurrence {self.occurrence_id}: {str(e)}")

    def get_calculated_cost(self):
        """Return the stored calculated cost"""
        return self.calculated_cost if self.calculated_cost is not None else Decimal('0.00')

@receiver(post_save, sender=BookingOccurrence)
def create_booking_details(sender, instance, created, **kwargs):
    """
    Signal handler to create BookingDetails when a BookingOccurrence is created
    """
    if created:
        from booking_details.models import BookingDetails
        
        # Get the service from the booking
        service = instance.booking.service_id
        if not service:
            return
            
        # Get the number of pets
        num_pets = instance.booking.booking_pets.count()
        
        # Create the booking details
        BookingDetails.objects.create(
            booking_occurrence=instance,
            num_pets=num_pets,
            base_rate=service.base_rate,
            additional_pet_rate=service.additional_animal_rate,
            holiday_rate=service.holiday_rate,
            applies_after=service.applies_after,
            unit_of_time=service.unit_of_time,
            calculated_rate=Decimal('0.00')  # This will be updated by its own save method - calculate_prorated_multiplier
        )
