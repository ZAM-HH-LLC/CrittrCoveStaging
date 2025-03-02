from decimal import Decimal
from datetime import datetime
from collections import OrderedDict
import logging
from django.shortcuts import get_object_or_404
from booking_drafts.models import BookingDraft
from bookings.constants import BookingStates
from services.models import Service
from booking_occurrences.models import BookingOccurrence
from booking_details.models import BookingDetails
from core.time_utils import convert_from_utc, get_formatted_times
from users.models import UserSettings

logger = logging.getLogger(__name__)

def calculate_time_units(start_datetime, end_datetime, unit_of_time):
    """Calculate the number of time units between two datetimes based on the unit_of_time"""
    duration_hours = (end_datetime - start_datetime).total_seconds() / 3600
    
    if unit_of_time == '15 Min':
        return Decimal(str(duration_hours / 0.25)).quantize(Decimal('0.00001'))
    elif unit_of_time == '30 Min':
        return Decimal(str(duration_hours / 0.5)).quantize(Decimal('0.00001'))
    elif unit_of_time == '45 Min':
        return Decimal(str(duration_hours / 0.75)).quantize(Decimal('0.00001'))
    elif unit_of_time == '1 Hour':
        return Decimal(str(duration_hours)).quantize(Decimal('0.00001'))
    elif unit_of_time == '2 Hour':
        return Decimal(str(duration_hours / 2)).quantize(Decimal('0.00001'))
    elif unit_of_time == '3 Hour':
        return Decimal(str(duration_hours / 3)).quantize(Decimal('0.00001'))
    elif unit_of_time == '4 Hour':
        return Decimal(str(duration_hours / 4)).quantize(Decimal('0.00001'))
    elif unit_of_time == '5 Hour':
        return Decimal(str(duration_hours / 5)).quantize(Decimal('0.00001'))
    elif unit_of_time == '6 Hour':
        return Decimal(str(duration_hours / 6)).quantize(Decimal('0.00001'))
    elif unit_of_time == '8 Hour':
        return Decimal(str(duration_hours / 8)).quantize(Decimal('0.00001'))
    elif unit_of_time == '24 Hour':
        return Decimal(str(duration_hours / 24)).quantize(Decimal('0.00001'))
    elif unit_of_time in ['Per Day']:
        return Decimal(str(duration_hours / 24)).quantize(Decimal('0.00001'))
    elif unit_of_time in ['Per Visit']:
        return Decimal('1')
    else:
        return Decimal('1')

def calculate_occurrence_rates(occurrence, service, num_pets):
    """
    Calculate rates for an occurrence based on service and number of pets
    Returns base_total, rates dict, and calculated total cost
    """
    try:
        logger.info(f"MBA7777 - Starting calculate_occurrence_rates for service: {service.service_name}")
        logger.info(f"MBA7777 - Service rates count: {service.additional_rates.count()}")
        logger.info(f"MBA7777 - Using unit_of_time: {service.unit_of_time}")
        
        # Get start and end times
        start_datetime = datetime.combine(occurrence.start_date, occurrence.start_time)
        end_datetime = datetime.combine(occurrence.end_date, occurrence.end_time)
        
        # Calculate time units based on service's unit_of_time
        multiple = calculate_time_units(start_datetime, end_datetime, service.unit_of_time)
        logger.info(f"MBA7777 - Time units multiple: {multiple}")
        
        # Get base rate from service
        base_rate = Decimal(str(service.base_rate))
        base_amount = base_rate * multiple
        logger.info(f"MBA7777 - Base rate: {base_rate}, Base amount: {base_amount}")
        
        # Calculate additional animal rate if applicable
        additional_animal_amount = Decimal('0')
        additional_animal_rate_applies = 0  # Default to 0
        applies_after = int(str(service.applies_after))  # Convert to int, handling string input
        if num_pets > applies_after:
            additional_animal_rate = Decimal(str(service.additional_animal_rate))
            additional_pets = num_pets - applies_after
            additional_animal_amount = additional_animal_rate * additional_pets
            additional_animal_rate_applies = additional_pets  # Set to number of additional pets
            logger.info(f"MBA7777 - Additional animal amount: {additional_animal_amount}")
        
        # Check for holidays (TODO: Implement holiday check)
        is_holiday = False
        holiday_amount = Decimal('0')
        holiday_days = 0
        if is_holiday:
            holiday_rate = Decimal(str(service.holiday_rate))
            holiday_amount = holiday_rate
            holiday_days = 1
        
        # Get additional rates from service
        additional_rates = []
        additional_rates_total = Decimal('0')
        
        logger.info(f"MBA7777 - Getting additional rates for service {service.service_name}")
        for rate in service.additional_rates.all():
            rate_amount = Decimal(str(rate.rate))  # Changed from rate.amount to rate.rate
            logger.info(f"MBA7777 - Found rate: {rate.title} - {rate_amount}")
            additional_rates.append(OrderedDict([
                ('title', rate.title),
                ('description', rate.description or ''),
                ('amount', str(rate_amount))
            ]))
            additional_rates_total += rate_amount
        
        # Create rates dictionary
        rates = OrderedDict([
            ('base_rate', str(base_rate)),
            ('additional_animal_rate', str(service.additional_animal_rate)),
            ('additional_animal_rate_applies', additional_animal_rate_applies),
            ('applies_after', applies_after),
            ('unit_of_time', service.unit_of_time),  # Use service's unit_of_time directly
            ('holiday_rate', str(service.holiday_rate)),
            ('holiday_days', holiday_days),
            ('additional_rates', additional_rates)
        ])
        
        # Calculate total cost
        total_cost = base_amount + additional_animal_amount + holiday_amount + additional_rates_total
        logger.info(f"MBA7777 - Total cost breakdown:")
        logger.info(f"MBA7777 - Base amount: {base_amount}")
        logger.info(f"MBA7777 - Additional animal amount: {additional_animal_amount}")
        logger.info(f"MBA7777 - Holiday amount: {holiday_amount}")
        logger.info(f"MBA7777 - Additional rates total: {additional_rates_total}")
        logger.info(f"MBA7777 - Final total: {total_cost}")
        
        result = {
            'base_total': str(base_amount),
            'rates': rates,
            'calculated_cost': str(total_cost),
            'multiple': float(multiple)
        }
        logger.info(f"MBA7777 - Returning rate data: {result}")
        return result
        
    except Exception as e:
        logger.error(f"MBA7777 - Error calculating occurrence rates: {e}")
        return None

def create_occurrence_data(occurrence, service, num_pets, user_timezone='UTC'):
    """
    Creates a complete occurrence data dictionary with all rates and calculations
    Used by all booking draft endpoints
    """
    try:
        # Calculate rates
        rate_data = calculate_occurrence_rates(occurrence, service, num_pets)
        if not rate_data:
            return None
            
        # Get formatted times
        formatted_times = get_formatted_times(occurrence, occurrence.booking.client.user.id)
        
        # Convert times to user's timezone and 12-hour format
        start_dt = datetime.combine(occurrence.start_date, occurrence.start_time)
        end_dt = datetime.combine(occurrence.end_date, occurrence.end_time)
        
        # Convert to user's timezone
        user_start = convert_from_utc(start_dt, user_timezone)
        user_end = convert_from_utc(end_dt, user_timezone)
        
        # Format in 12-hour time
        start_time = user_start.strftime('%I:%M %p')
        end_time = user_end.strftime('%I:%M %p')
        
        # Create occurrence dictionary
        occurrence_data = OrderedDict([
            ('occurrence_id', occurrence.occurrence_id),
            ('start_date', occurrence.start_date.isoformat()),
            ('end_date', occurrence.end_date.isoformat()),
            ('start_time', start_time),  # Now in 12-hour format
            ('end_time', end_time),      # Now in 12-hour format
            ('calculated_cost', rate_data['calculated_cost']),
            ('base_total', rate_data['base_total']),
            ('multiple', rate_data['multiple']),
            ('rates', OrderedDict([
                ('base_rate', rate_data['rates']['base_rate']),
                ('additional_animal_rate', rate_data['rates']['additional_animal_rate']),
                ('additional_animal_rate_applies', rate_data['rates']['additional_animal_rate_applies']),
                ('applies_after', rate_data['rates']['applies_after']),
                ('unit_of_time', rate_data['rates']['unit_of_time']),
                ('holiday_rate', rate_data['rates']['holiday_rate']),
                ('holiday_days', rate_data['rates']['holiday_days']),
                ('additional_rates', rate_data['rates']['additional_rates'])
            ])),
            ('formatted_start', formatted_times['formatted_start']),
            ('formatted_end', formatted_times['formatted_end']),
            ('duration', formatted_times['duration']),
            ('timezone', formatted_times['timezone'])
        ])
        
        return occurrence_data
        
    except Exception as e:
        logger.error(f"Error creating occurrence data: {e}")
        return None

def calculate_cost_summary(occurrences):
    """Calculate cost summary from occurrences"""
    try:
        # Calculate subtotal from all occurrences
        subtotal = Decimal('0')
        for occ in occurrences:
            calculated_cost = Decimal(str(occ['calculated_cost']))
            subtotal += calculated_cost
            
        # Calculate other costs
        platform_fee = (subtotal * Decimal('0.10')).quantize(Decimal('0.01'))
        taxes = ((subtotal + platform_fee) * Decimal('0.08')).quantize(Decimal('0.01'))
        total_client_cost = subtotal + platform_fee + taxes
        total_sitter_payout = (subtotal * Decimal('0.90')).quantize(Decimal('0.01'))
        
        return OrderedDict([
            ('subtotal', float(subtotal)),
            ('platform_fee', float(platform_fee)),
            ('taxes', float(taxes)),
            ('total_client_cost', float(total_client_cost)),
            ('total_sitter_payout', float(total_sitter_payout)),
            ('is_prorated', True)
        ])
        
    except Exception as e:
        logger.error(f"Error calculating cost summary: {e}")
        return None

def create_draft_data(booking, request_pets, occurrences, cost_summary, service=None):
    """Creates draft data in the exact order required"""
    try:
        # Get user's timezone from settings
        user_settings = UserSettings.objects.filter(user=booking.client.user).first()
        user_timezone = user_settings.timezone if user_settings else 'UTC'
        
        # Determine if booking can be edited
        can_edit = booking.status in [
            BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
            BookingStates.PENDING_PROFESSIONAL_CHANGES,
            BookingStates.CONFIRMED,
            BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
        ]
        
        # Create service details
        service_details = OrderedDict([
            ('service_type', service.service_name if service else booking.service_id.service_name),
            ('service_id', service.service_id if service else booking.service_id.service_id)
        ])
        
        # Create draft data
        draft_data = OrderedDict([
            ('booking_id', booking.booking_id),
            ('status', booking.status),
            ('client_name', booking.client.user.name),
            ('professional_name', booking.professional.user.name),
            ('service_details', service_details),
            ('pets', [
                OrderedDict([
                    ('name', pet.get('name')),
                    ('breed', pet.get('breed')),
                    ('pet_id', pet.get('pet_id')),
                    ('species', pet.get('species'))
                ]) for pet in request_pets
            ]),
            ('occurrences', occurrences),
            ('cost_summary', cost_summary),
            ('can_edit', can_edit)
        ])
        
        return draft_data
        
    except Exception as e:
        logger.error(f"Error creating draft data: {e}")
        return None 