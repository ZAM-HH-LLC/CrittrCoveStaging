from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from booking_pets.models import BookingPets
from .models import BookingDetails
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

@receiver([post_save], sender=BookingDetails)
def update_occurrence_rates(sender, instance, created, **kwargs):
    """
    Signal handler to update the BookingOccurrence calculated cost when BookingDetails changes
    """
    occurrence = instance.booking_occurrence
    
    # Get the calculated cost from booking details
    booking_details_cost = instance.calculate_occurrence_cost(is_prorated=True)
    
    # Get the total from occurrence rates
    occurrence_rates_total = Decimal('0.00')
    if hasattr(occurrence, 'rates'):
        occurrence_rates_total = occurrence.rates.get_total()
    
    # Log the values
    logger.info(f"Updating occurrence {occurrence.occurrence_id} calculated cost:")
    logger.info(f"Booking details cost: ${booking_details_cost}")
    logger.info(f"Occurrence rates total: ${occurrence_rates_total}")
    logger.info(f"Total: ${booking_details_cost + occurrence_rates_total}")
    
    # Update the occurrence's calculated cost
    occurrence.update_calculated_cost()

@receiver([post_save, post_delete], sender=BookingPets)
def update_booking_num_pets(sender, instance, **kwargs):
    """
    Signal handler to update the num_pets field in BookingDetails when pets are added or removed
    """
    booking = instance.booking
    # Update num_pets for all BookingDetails associated with this booking's occurrences
    for occurrence in booking.occurrences.all():
        booking_details = occurrence.booking_details.first()
        if booking_details:
            num_pets = booking.booking_pets.count()
            booking_details.num_pets = num_pets
            booking_details.save() 