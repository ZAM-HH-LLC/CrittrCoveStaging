from django.shortcuts import render
import logging
import traceback
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from bookings.models import Booking
from booking_pets.models import BookingPets
from booking_drafts.models import BookingDraft
from pets.models import Pet
from professionals.models import Professional
from clients.models import Client
from bookings.constants import BookingStates
from services.models import Service
from booking_occurrences.models import BookingOccurrence
from booking_summary.models import BookingSummary
from booking_occurrence_rates.models import BookingOccurrenceRate
from decimal import Decimal
from collections import OrderedDict
import json
from rest_framework.renderers import JSONRenderer
from datetime import datetime, date, time, timedelta
from interaction_logs.models import InteractionLog
from engagement_logs.models import EngagementLog
from error_logs.models import ErrorLog
from core.time_utils import convert_to_utc, get_formatted_times
from users.models import UserSettings
from user_addresses.models import Address, AddressType
from core.constants import STATE_TAX_RATES
from core.booking_operations import (
    calculate_occurrence_rates, 
    create_occurrence_data, 
    calculate_cost_summary
)
import pytz
from django.utils import timezone
from booking_drafts.serializers import OvernightBookingCalculationSerializer, UpdateRatesSerializer

logger = logging.getLogger(__name__)

class OrderedDictJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, OrderedDict):
            return {
                '__ordered__': True,
                'items': [[k, self.default(v)] for k, v in obj.items()]
            }
        return super().default(obj)

def ordered_dict_hook(dct):
    if '__ordered__' in dct:
        return OrderedDict(dct['items'])
    return dct

def serialize_rates(rates):
    """Safely serialize rates, handling cases where rates don't exist"""
    try:
        if not rates:
            return None
        
        # Get the base rates
        base_rate = str(rates.base_rate) if hasattr(rates, 'base_rate') else "0.00"
        additional_animal_rate = float(rates.additional_animal_rate) if hasattr(rates, 'additional_animal_rate') else "0"
        holiday_rate = str(rates.holiday_rate) if hasattr(rates, 'holiday_rate') else "0.00"
        
        # Format additional rates
        additional_rates = []
        if hasattr(rates, 'rates') and rates.rates:
            for rate in rates.rates:
                additional_rates.append(OrderedDict([
                    ('title', rate.get('title', '')),
                    ('description', rate.get('description', '')),
                    ('amount', f"${rate.get('amount', '0.00')}")
                ]))
        
        return OrderedDict([
            ('base_rate', base_rate),
            ('additional_animal_rate', additional_animal_rate),
            ('additional_animal_rate_applies', False), # TODO: add the variable additional_animal_rate_applies here.
            ('applies_after', rates.applies_after_animals if hasattr(rates, 'applies_after_animals') else 1),
            ('unit_of_time', rates.time_unit if hasattr(rates, 'time_unit') else "DAY"),
            ('holiday_rate', holiday_rate),
            ('holiday_days', 0),
            ('additional_rates', additional_rates)
        ])
    except Exception as e:
        logger.warning(f"Error serializing rates: {e}")
        return None

def calculate_cost_summary(occurrences):
    """Calculate cost summary from occurrences"""
    try:
        # Calculate subtotal from all occurrences
        subtotal = Decimal('0')
        for occ in occurrences:
            # Get both base_total and additional costs
            base_total = Decimal(str(occ.get('base_total', '0')).replace('$', '').strip())
            calculated_cost = Decimal(str(occ.get('calculated_cost', '0')))
            
            # Log the values for debugging
            logger.info(f"Occurrence {occ.get('occurrence_id')} - Base Total: {base_total}, Calculated Cost: {calculated_cost}")
            
            # Add both to the subtotal
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
        logger.error(f"Error calculating cost summary: {str(e)}")
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
        
        # Create base draft data
        draft_data = OrderedDict([
            ('booking_id', booking.booking_id),
            ('status', booking.status),
            ('client_name', booking.client.user.name),
            ('professional_name', booking.professional.user.name),
            ('pets', request_pets),
            ('can_edit', can_edit),
            ('occurrences', occurrences if occurrences else [])  # Always include occurrences array
        ])

        # Add service details if service exists
        if service:
            draft_data['service_details'] = OrderedDict([
                ('service_type', service.service_name),
                ('service_id', service.service_id)
            ])
        elif booking.service_id:
            draft_data['service_details'] = OrderedDict([
                ('service_type', booking.service_id.service_name),
                ('service_id', booking.service_id.service_id)
            ])

        # Add cost summary if it exists
        if cost_summary:
            draft_data['cost_summary'] = cost_summary

        return draft_data
        
    except Exception as e:
        logger.error(f"Error creating draft data: {e}")
        return None

def pets_are_different(current_pets, new_pets):
    """Compare current booking pets with new pets to determine if there are changes"""
    if len(current_pets) != len(new_pets):
        return True
        
    # Convert lists to sets of tuples for comparison
    current_set = {(pet['pet_id'], pet['name'], pet['species'], pet['breed']) for pet in current_pets}
    new_set = {(pet['pet_id'], pet['name'], pet['species'], pet['breed']) for pet in new_pets}
    
    return current_set != new_set

def has_changes_from_original(booking, draft_data):
    """Compare all fields between booking and draft data to determine if there are any changes"""
    try:
        # Compare service details
        if booking.service_id and 'service_details' in draft_data:
            if booking.service_id.service_name != draft_data['service_details']['service_type']:
                logger.info(f"Service changed from {booking.service_id.service_name} to {draft_data['service_details']['service_type']}")
                return True

        # Compare pets
        current_pets = set([
            (bp.pet.pet_id, bp.pet.name, bp.pet.species, bp.pet.breed)
            for bp in booking.booking_pets.select_related('pet').all()
        ])
        draft_pets = set([
            (pet['pet_id'], pet['name'], pet['species'], pet['breed'])
            for pet in draft_data.get('pets', [])
        ])
        if current_pets != draft_pets:
            logger.info("Pets have changed")
            return True

        # Always check for rate differences in occurrences
        if 'occurrences' in draft_data:
            for draft_occ in draft_data['occurrences']:
                # Get the corresponding booking occurrence and its details
                try:
                    occurrence = BookingOccurrence.objects.get(
                        occurrence_id=draft_occ['occurrence_id'],
                        booking=booking
                    )
                    booking_details = occurrence.booking_details.first()
                    
                    if booking_details:
                        # Compare rates - convert everything to Decimal for accurate comparison
                        original_base_rate = Decimal(str(booking_details.base_rate))
                        original_additional_rate = Decimal(str(booking_details.additional_pet_rate))
                        original_holiday_rate = Decimal(str(booking_details.holiday_rate))
                        original_applies_after = int(booking_details.applies_after)

                        # Clean the draft values by removing '$' and whitespace
                        draft_base_rate = Decimal(str(draft_occ['rates']['base_rate']).replace('$', '').strip())
                        draft_additional_rate = Decimal(str(draft_occ['rates']['additional_animal_rate']).replace('$', '').strip())
                        draft_holiday_rate = Decimal(str(draft_occ['rates']['holiday_rate']).replace('$', '').strip())
                        draft_applies_after = int(str(draft_occ['rates']['applies_after']))

                        # Log the comparison
                        logger.info(f"Comparing rates for occurrence {draft_occ['occurrence_id']}:")
                        logger.info(f"Original - Base: {original_base_rate}, Additional: {original_additional_rate}, Holiday: {original_holiday_rate}, Applies After: {original_applies_after}")
                        logger.info(f"Draft - Base: {draft_base_rate}, Additional: {draft_additional_rate}, Holiday: {draft_holiday_rate}, Applies After: {draft_applies_after}")

                        # Compare the values
                        if (original_base_rate != draft_base_rate or
                            original_additional_rate != draft_additional_rate or
                            original_holiday_rate != draft_holiday_rate or
                            original_applies_after != draft_applies_after):
                            logger.info("Rates have changed")
                            logger.info(f"Base rate changed: {original_base_rate} != {draft_base_rate}")
                            logger.info(f"Additional rate changed: {original_additional_rate} != {draft_additional_rate}")
                            logger.info(f"Holiday rate changed: {original_holiday_rate} != {draft_holiday_rate}")
                            logger.info(f"Applies after changed: {original_applies_after} != {draft_applies_after}")
                            return True
                except BookingOccurrence.DoesNotExist:
                    logger.warning(f"Occurrence {draft_occ['occurrence_id']} not found")
                    continue

        return False
    except Exception as e:
        logger.error(f"Error comparing booking with draft: {e}")
        return True  # Default to True if comparison fails

def update_draft_with_service(booking, service_id=None, occurrence_services=None):
    """
    Updates draft data with new service(s)
    service_id: For main service updates
    occurrence_services: Dict of occurrence_id: service_id for multiple services
    """
    try:
        # Debug logging
        logger.info(f"MBA9999 - create_draft_data function: {create_draft_data}")
        logger.info(f"MBA9999 - create_draft_data parameters: {create_draft_data.__code__.co_varnames}")
        
        # Get or create draft
        draft, created = BookingDraft.objects.get_or_create(
            booking=booking,
            defaults={
                'draft_data': {},
                'last_modified_by': 'PROFESSIONAL',
                'status': 'IN_PROGRESS',
                'original_status': booking.status
            }
        )
        
        # Load existing draft data
        current_draft_data = draft.draft_data if draft.draft_data else {}
        
        # Get current pets from draft or booking
        pets_data = []
        if 'pets' in current_draft_data:
            pets_data = current_draft_data['pets']
        else:
            for bp in booking.booking_pets.select_related('pet').all():
                pets_data.append(OrderedDict([
                    ('name', bp.pet.name),
                    ('breed', bp.pet.breed),
                    ('pet_id', bp.pet.pet_id),
                    ('species', bp.pet.species)
                ]))
        
        # Get main service if specified
        main_service = None
        if service_id:
            main_service = get_object_or_404(
                Service,
                service_id=service_id,
                professional=booking.professional,
                moderation_status='APPROVED'
            )
        
        # Process occurrences
        processed_occurrences = []
        num_pets = len(pets_data)
        
        for occurrence in BookingOccurrence.objects.filter(booking=booking):
            # Get existing occurrence data from draft if it exists
            existing_occurrence = next(
                (o for o in current_draft_data.get('occurrences', [])
                 if str(o['occurrence_id']) == str(occurrence.occurrence_id)),
                None
            )

            # Determine which service to use for this occurrence
            occurrence_service = None
            if occurrence_services and str(occurrence.occurrence_id) in occurrence_services:
                occurrence_service = get_object_or_404(
                    Service,
                    service_id=occurrence_services[str(occurrence.occurrence_id)],
                    professional=booking.professional,
                    moderation_status='APPROVED'
                )
            elif main_service:
                occurrence_service = main_service
            else:
                occurrence_service = booking.service_id

            if occurrence_service:
                # Create a temporary service that preserves the unit_of_time from draft
                temp_service = Service(
                    service_id=occurrence_service.service_id,
                    service_name=occurrence_service.service_name,
                    professional=occurrence_service.professional,
                    base_rate=occurrence_service.base_rate,
                    additional_animal_rate=occurrence_service.additional_animal_rate,
                    applies_after=occurrence_service.applies_after,
                    holiday_rate=occurrence_service.holiday_rate,
                    unit_of_time=existing_occurrence['rates']['unit_of_time'] if existing_occurrence else occurrence_service.unit_of_time
                )
                logger.info(f"MBA9999 - Using unit_of_time from draft: {temp_service.unit_of_time}")

                occurrence_data = create_occurrence_data(
                    occurrence=occurrence,
                    service=temp_service,
                    num_pets=num_pets,
                    user_timezone=booking.client.user.settings.timezone
                )
                if occurrence_data:
                    processed_occurrences.append(occurrence_data)
        
        # Calculate cost summary
        cost_summary = calculate_cost_summary(processed_occurrences)
        
        # Debug logging
        logger.info(f"MBA9999 - About to call create_draft_data with:")
        logger.info(f"MBA9999 - booking: {booking}")
        logger.info(f"MBA9999 - request_pets: {pets_data}")
        logger.info(f"MBA9999 - occurrences: {processed_occurrences}")
        logger.info(f"MBA9999 - cost_summary: {cost_summary}")
        logger.info(f"MBA9999 - main_service: {main_service}")
        
        # Create new draft data
        draft_data = create_draft_data(
            booking=booking,
            request_pets=pets_data,
            occurrences=processed_occurrences,
            cost_summary=cost_summary,
            service=main_service
        )

        if draft_data is None:
            raise Exception("Failed to create draft data")
        
        # Update draft status if needed
        if booking.status == BookingStates.CONFIRMED:
            draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
        
        # Save draft
        draft.draft_data = draft_data
        draft.save()
        
        return draft_data
        
    except Exception as e:
        logger.error(f"Error updating draft with service: {e}")
        return None

# Views for booking_drafts app will be added here


class AvailableServicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        try:
            # Get the draft and verify professional access
            draft = get_object_or_404(BookingDraft, draft_id=booking_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            # If draft has a booking, verify it belongs to the professional
            if draft.booking and draft.booking.professional != professional:
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Get all approved services for the professional
            services = Service.objects.filter(
                professional=professional,
                moderation_status='APPROVED'
            )

            # Check for selected service in draft data
            selected_service_id = None
            if draft.draft_data and 'service_details' in draft.draft_data:
                selected_service_id = draft.draft_data['service_details'].get('service_id')

            # Format the response
            services_data = [
                OrderedDict([
                    ('service_id', service.service_id),
                    ('service_name', service.service_name),
                    ('base_rate', service.base_rate),
                    ('additional_animal_rate', service.additional_animal_rate),
                    ('applies_after', service.applies_after),
                    ('holiday_rate', service.holiday_rate),
                    ('unit_of_time', service.unit_of_time),
                    ('is_overnight', service.is_overnight),
                    ('is_selected', service.service_id == selected_service_id)
                ])
                for service in services
            ]

            return Response({
                'services': services_data,
                'selected_service_id': selected_service_id
            })
        except Exception as e:
            logger.error(f"Error in AvailableServicesView: {str(e)}")
            return Response(
                {"error": "Failed to get available services"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AvailablePetsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        try:
            # Get the draft and verify professional access
            draft = get_object_or_404(BookingDraft, draft_id=booking_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            # If draft has a booking, verify it belongs to the professional
            if draft.booking and draft.booking.professional != professional:
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Get the client from the draft data or booking
            client = None
            if draft.booking:
                client = draft.booking.client
            elif draft.draft_data and 'client_id' in draft.draft_data:
                client = Client.objects.get(id=draft.draft_data['client_id'])

            if not client:
                return Response({"error": "Client not found"}, status=status.HTTP_404_NOT_FOUND)

            # Get all pets for the client
            client_pets = Pet.objects.filter(owner=client.user)

            # Get selected pets from draft data
            selected_pet_ids = []
            if draft.draft_data and 'pets' in draft.draft_data:
                selected_pet_ids = [pet['pet_id'] for pet in draft.draft_data['pets']]

            # Format the response
            pets_data = [
                OrderedDict([
                    ('name', pet.name),
                    ('breed', pet.breed),
                    ('pet_id', pet.pet_id),
                    ('species', pet.species),
                    ('is_selected', pet.pet_id in selected_pet_ids)
                ])
                for pet in client_pets
            ]

            return Response({
                'pets': pets_data,
                'selected_pet_ids': selected_pet_ids
            })
        except Exception as e:
            logger.error(f"Error in AvailablePetsView: {str(e)}")
            return Response(
                {"error": "Failed to get available pets"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateBookingPetsView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request, booking_id):
        logger.info("MBA2573 - Starting UpdateBookingPetsView.post")
        logger.info(f"MBA2573 - Request data: {request.data}")
        
        try:
            # Get the booking and verify professional access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if booking.professional != professional:
                logger.error(f"MBA2573 - Unauthorized access attempt by {request.user.email} for booking {booking_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Validate booking status
            valid_statuses = [
                BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                BookingStates.PENDING_PROFESSIONAL_CHANGES,
                BookingStates.CONFIRMED,
                BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
            ]
            
            if booking.status not in valid_statuses:
                logger.error(f"MBA2573 - Invalid booking status {booking.status} for updating pets")
                return Response(
                    {"error": f"Cannot update pets when booking is in {BookingStates.get_display_state(booking.status)} status"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the list of pet IDs from the request
            new_pet_ids = request.data.get('pets', [])
            if not isinstance(new_pet_ids, list):
                logger.error("MBA2573 - Invalid pets data format")
                return Response(
                    {"error": "Invalid pets data format"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get pet details for the new pet IDs
            new_pets_data = []
            for pet_id in new_pet_ids:
                try:
                    pet = Pet.objects.get(pet_id=pet_id, owner=booking.client.user)
                    new_pets_data.append(OrderedDict([
                        ('name', pet.name),
                        ('breed', pet.breed),
                        ('pet_id', pet.pet_id),
                        ('species', pet.species)
                    ]))
                except Pet.DoesNotExist:
                    logger.error(f"MBA2573 - Pet with ID {pet_id} not found or does not belong to client")
                    return Response(
                        {"error": f"Pet with ID {pet_id} not found or does not belong to client"},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Get or create draft
            draft, created = BookingDraft.objects.get_or_create(
                booking=booking,
                defaults={
                    'draft_data': {},
                    'last_modified_by': 'PROFESSIONAL',
                    'status': 'IN_PROGRESS',
                    'original_status': booking.status
                }
            )

            # Load existing draft data
            current_draft_data = draft.draft_data if draft.draft_data else {}
            
            # Get service from draft or booking
            service = None
            if 'service_details' in current_draft_data and 'service_type' in current_draft_data['service_details']:
                try:
                    service = Service.objects.get(
                        service_name=current_draft_data['service_details']['service_type'],
                        professional=booking.professional,
                        moderation_status='APPROVED'
                    )
                except Service.DoesNotExist:
                    service = booking.service_id
            else:
                service = booking.service_id

            # Process occurrences
            processed_occurrences = []
            num_pets = len(new_pets_data)
            
            # Get existing occurrences from draft
            existing_occurrences = current_draft_data.get('occurrences', [])
            logger.info(f"MBA2573 - Found {len(existing_occurrences)} existing occurrences in draft")
            
            # Create TempOccurrence class for rate calculations
            class TempOccurrence:
                def __init__(self, start_date, end_date, start_time, end_time):
                    self.start_date = start_date
                    self.end_date = end_date
                    self.start_time = start_time
                    self.end_time = end_time
            
            # Process each occurrence
            for occurrence_data in existing_occurrences:
                try:
                    # Parse dates if they're strings
                    start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date() if isinstance(occurrence_data['start_date'], str) else occurrence_data['start_date']
                    end_date = datetime.strptime(occurrence_data['end_date'], '%Y-%m-%d').date() if isinstance(occurrence_data['end_date'], str) else occurrence_data['end_date']
                    
                    # Parse times if they're strings (assuming 24-hour format from draft)
                    start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time() if isinstance(occurrence_data['start_time'], str) else occurrence_data['start_time']
                    end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time() if isinstance(occurrence_data['end_time'], str) else occurrence_data['end_time']

                    # Create temporary occurrence for rate calculation
                    temp_occurrence = TempOccurrence(
                        start_date=start_date,
                        end_date=end_date,
                        start_time=start_time,
                        end_time=end_time
                    )

                    # Calculate rates using the new service
                    rate_data = calculate_occurrence_rates(temp_occurrence, service, num_pets)
                    if not rate_data:
                        raise Exception(f"Failed to calculate rates for occurrence {occurrence_data['occurrence_id']}")

                    # Get formatted times
                    formatted_times = get_formatted_times(
                        occurrence=temp_occurrence,
                        user_id=booking.client.user.id
                    )

                    # Create occurrence data preserving dates and times but with new rates
                    processed_occurrence = OrderedDict([
                        ('occurrence_id', occurrence_data['occurrence_id']),
                        ('start_date', occurrence_data['start_date'].isoformat() if isinstance(occurrence_data['start_date'], date) else occurrence_data['start_date']),
                        ('end_date', occurrence_data['end_date'].isoformat() if isinstance(occurrence_data['end_date'], date) else occurrence_data['end_date']),
                        ('start_time', occurrence_data['start_time'].strftime('%H:%M') if isinstance(occurrence_data['start_time'], time) else occurrence_data['start_time']),
                        ('end_time', occurrence_data['end_time'].strftime('%H:%M') if isinstance(occurrence_data['end_time'], time) else occurrence_data['end_time']),
                        ('calculated_cost', rate_data['calculated_cost']),
                        ('base_total', rate_data['base_total']),
                        ('multiple', rate_data['multiple']),
                        ('rates', rate_data['rates']),
                        ('formatted_start', formatted_times['formatted_start']),
                        ('formatted_end', formatted_times['formatted_end']),
                        ('duration', formatted_times['duration']),
                        ('timezone', formatted_times['timezone'])
                    ])

                    processed_occurrences.append(processed_occurrence)
                    
                except Exception as e:
                    logger.error(f"MBA2573 - Error processing occurrence: {str(e)}")
                    return Response(
                        {"error": f"Error processing occurrence: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Calculate cost summary
            cost_summary = calculate_cost_summary(processed_occurrences)

            # Create draft data
            draft_data = create_draft_data(
                booking=booking,
                request_pets=new_pets_data,
                occurrences=processed_occurrences,
                cost_summary=cost_summary,
                service=service
            )

            if not draft_data:
                logger.error("MBA2573 - Failed to create draft data")
                return Response(
                    {"error": "Failed to create draft data"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Check if pets have changed and update status if necessary
            current_pets = [
                {'pet_id': bp.pet.pet_id, 'name': bp.pet.name, 'species': bp.pet.species, 'breed': bp.pet.breed}
                for bp in booking.booking_pets.select_related('pet').all()
            ]
            
            if booking.status == BookingStates.CONFIRMED and pets_are_different(current_pets, new_pets_data):
                draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
                logger.info("MBA2573 - Pets have changed, updating status to CONFIRMED_PENDING_PROFESSIONAL_CHANGES")

            # Save updated draft data
            draft.draft_data = draft_data
            draft.save()

            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_PETS_UPDATED',
                target_type='BOOKING_DRAFT',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'new_pets': new_pets_data,
                    'previous_pets': current_pets,
                    'status_changed': draft_data['status'] != booking.status,
                    'service_name': service.service_name if service else None
                }
            )

            # Log engagement
            EngagementLog.objects.create(
                user=request.user,
                page_name='BOOKING_DETAILS',
                duration=0,  # Duration not applicable for this action
                interactions={
                    'action': 'UPDATE_PETS',
                    'booking_id': booking.booking_id,
                    'num_pets': len(new_pet_ids),
                    'status_changed': draft_data['status'] != booking.status,
                    'service_name': service.service_name if service else None
                }
            )

            logger.info(f"MBA2573 - Successfully updated booking draft for booking {booking_id}")
            return Response({
                'status': 'success',
                'booking_status': draft_data['status'],
                'draft_data': draft_data
            })

        except Exception as e:
            logger.error(f"MBA2573 - Error in UpdateBookingPetsView: {str(e)}")
            logger.error(f"MBA2573 - Full traceback: {traceback.format_exc()}")
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint='/api/booking_drafts/v1/update_pets',
                metadata={
                    'booking_id': booking_id,
                    'request_data': request.data
                }
            )
            return Response(
                {"error": "An error occurred while updating the booking draft"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateServiceTypeView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request, booking_id):
        logger.info("MBA9999 - Starting UpdateServiceTypeView.post")
        logger.info(f"MBA9999 - Request data: {request.data}")
        
        try:
            # Get the booking and verify professional access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if booking.professional != professional:
                logger.error(f"MBA9999 - Unauthorized access attempt by {request.user.email} for booking {booking_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Get the new service
            service = get_object_or_404(
                Service,
                service_id=request.data.get('service_id'),
                professional=professional,
                moderation_status='APPROVED'
            )

            # Get or create draft
            draft, created = BookingDraft.objects.get_or_create(
                booking=booking,
                defaults={
                    'draft_data': {},
                    'last_modified_by': 'PROFESSIONAL',
                    'status': 'IN_PROGRESS',
                    'original_status': booking.status
                }
            )

            # Load existing draft data
            current_draft_data = draft.draft_data if draft.draft_data else {}
            
            # Get current pets from draft or booking
            pets_data = []
            if 'pets' in current_draft_data:
                pets_data = current_draft_data['pets']
            else:
                for bp in booking.booking_pets.select_related('pet').all():
                    pets_data.append(OrderedDict([
                        ('name', bp.pet.name),
                        ('breed', bp.pet.breed),
                        ('pet_id', bp.pet.pet_id),
                        ('species', bp.pet.species)
                    ]))

            # Process occurrences
            processed_occurrences = []
            num_pets = len(pets_data)
            existing_occurrences = []
            
            # Get existing occurrences from draft and booking
            if 'occurrences' in current_draft_data:
                existing_occurrences = current_draft_data['occurrences']
            else:
                booking_occurrences = booking.occurrences.filter(booking=booking_id)
                for bo in booking_occurrences:
                    existing_occurrences.append(OrderedDict([
                        ('occurrence_id', bo.occurrence_id),
                        ('start_date', bo.start_date),
                        ('end_date', bo.end_date),
                        ('start_time', bo.start_time),
                        ('end_time', bo.end_time),
                        ('status', bo.status)
                    ]))
            logger.info(f"MBA9999 - Found {len(existing_occurrences)} existing occurrences in draft and booking")
            
            # Create TempOccurrence class for rate calculations
            class TempOccurrence:
                def __init__(self, start_date, end_date, start_time, end_time):
                    self.start_date = start_date
                    self.end_date = end_date
                    self.start_time = start_time
                    self.end_time = end_time
            
            # Process each occurrence
            for occurrence_data in existing_occurrences:
                try:
                    # Parse dates if they're strings
                    start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date() if isinstance(occurrence_data['start_date'], str) else occurrence_data['start_date']
                    end_date = datetime.strptime(occurrence_data['end_date'], '%Y-%m-%d').date() if isinstance(occurrence_data['end_date'], str) else occurrence_data['end_date']
                    
                    # Parse times if they're strings (assuming 24-hour format from draft)
                    start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time() if isinstance(occurrence_data['start_time'], str) else occurrence_data['start_time']
                    end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time() if isinstance(occurrence_data['end_time'], str) else occurrence_data['end_time']

                    # Create temporary occurrence for rate calculation
                    temp_occurrence = TempOccurrence(
                        start_date=start_date,
                        end_date=end_date,
                        start_time=start_time,
                        end_time=end_time
                    )

                    # Calculate rates using the new service
                    rate_data = calculate_occurrence_rates(temp_occurrence, service, num_pets)
                    if not rate_data:
                        raise Exception(f"Failed to calculate rates for occurrence {occurrence_data['occurrence_id']}")

                    # Get formatted times
                    formatted_times = get_formatted_times(
                        occurrence=temp_occurrence,
                        user_id=booking.client.user.id
                    )

                    # Create occurrence data preserving dates and times but with new rates
                    processed_occurrence = OrderedDict([
                        ('occurrence_id', occurrence_data['occurrence_id']),
                        ('start_date', occurrence_data['start_date'].isoformat() if isinstance(occurrence_data['start_date'], date) else occurrence_data['start_date']),
                        ('end_date', occurrence_data['end_date'].isoformat() if isinstance(occurrence_data['end_date'], date) else occurrence_data['end_date']),
                        ('start_time', occurrence_data['start_time'].strftime('%H:%M') if isinstance(occurrence_data['start_time'], time) else occurrence_data['start_time']),
                        ('end_time', occurrence_data['end_time'].strftime('%H:%M') if isinstance(occurrence_data['end_time'], time) else occurrence_data['end_time']),
                        ('calculated_cost', rate_data['calculated_cost']),
                        ('base_total', rate_data['base_total']),
                        ('multiple', rate_data['multiple']),
                        ('rates', rate_data['rates']),
                        ('formatted_start', formatted_times['formatted_start']),
                        ('formatted_end', formatted_times['formatted_end']),
                        ('duration', formatted_times['duration']),
                        ('timezone', formatted_times['timezone'])
                    ])

                    processed_occurrences.append(processed_occurrence)
                    
                except Exception as e:
                    logger.error(f"MBA9999 - Error processing occurrence: {str(e)}")
                    return Response(
                        {"error": f"Error processing occurrence: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Calculate cost summary
            cost_summary = calculate_cost_summary(processed_occurrences)

            # Create draft data
            draft_data = create_draft_data(
                booking=booking,
                request_pets=pets_data,
                occurrences=processed_occurrences,
                cost_summary=cost_summary,
                service=service
            )

            if not draft_data:
                logger.error("MBA9999 - Failed to create draft data")
                return Response(
                    {"error": "Failed to create draft data"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Ensure service details are correctly set
            draft_data['service_details'] = OrderedDict([
                ('service_type', service.service_name),
                ('service_id', service.service_id)
            ])

            # Update draft status if needed
            if booking.status == BookingStates.CONFIRMED:
                draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES

            # Save updated draft data
            draft.draft_data = draft_data
            draft.save()

            logger.info(f"MBA9999 - Successfully updated booking draft for booking {booking_id}")
            return Response({
                'status': 'success',
                'booking_status': draft_data['status'],
                'draft_data': draft_data
            })

        except Exception as e:
            logger.error(f"MBA9999 - Error in UpdateServiceTypeView: {str(e)}")
            logger.error(f"MBA9999 - Full traceback: {traceback.format_exc()}")
            return Response(
                {"error": "An error occurred while updating the service type"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateBookingOccurrencesView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request, booking_id):
        logger.info("MBA1644 - Starting UpdateBookingOccurrencesView.post")
        logger.info(f"MBA1644 - Request data: {request.data}")
        
        try:
            # Get the booking and verify professional access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if booking.professional != professional:
                logger.error(f"MBA1644 - Unauthorized access attempt by {request.user.email} for booking {booking_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Get or create draft
            draft, created = BookingDraft.objects.get_or_create(
                booking=booking,
                defaults={
                    'draft_data': {},
                    'last_modified_by': 'PROFESSIONAL',
                    'status': 'IN_PROGRESS',
                    'original_status': booking.status
                }
            )

            # Load existing draft data
            current_draft_data = draft.draft_data if draft.draft_data else {}
            
            # Get current pets from draft or booking
            pets_data = []
            if 'pets' in current_draft_data:
                pets_data = current_draft_data['pets']
            else:
                for bp in booking.booking_pets.select_related('pet').all():
                    pets_data.append(OrderedDict([
                        ('name', bp.pet.name),
                        ('breed', bp.pet.breed),
                        ('pet_id', bp.pet.pet_id),
                        ('species', bp.pet.species)
                    ]))

            # Get service from draft or booking
            service = None
            if 'service_details' in current_draft_data and 'service_type' in current_draft_data['service_details']:
                try:
                    service = Service.objects.get(
                        service_name=current_draft_data['service_details']['service_type'],
                        professional=booking.professional,
                        moderation_status='APPROVED'
                    )
                except Service.DoesNotExist:
                    service = booking.service_id
            else:
                service = booking.service_id

            # Process occurrences
            processed_occurrences = []
            num_pets = len(pets_data)
            
            # Process each occurrence from the request
            for occurrence_data in request.data.get('occurrences', []):
                try:
                    # Times are already in UTC from frontend, no conversion needed
                    start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date()
                    end_date = datetime.strptime(occurrence_data['end_date'], '%Y-%m-%d').date()
                    start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time()
                    end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time()

                    # Find existing occurrence in draft data or create new one
                    occurrence_id = occurrence_data.get('occurrence_id')
                    
                    if not occurrence_id:
                        # Generate new unique ID for new occurrence
                        occurrence_id = f"draft_{int(datetime.now().timestamp())}_{len(processed_occurrences)}"
                        logger.info(f"MBA1644 - Generated new occurrence ID: {occurrence_id}")

                    # Create a temporary service with the rates from the request
                    temp_service = Service(
                        service_id=service.service_id,
                        service_name=service.service_name,
                        professional=service.professional,
                        base_rate=occurrence_data['rates'].get('base_rate', service.base_rate),
                        additional_animal_rate=occurrence_data['rates'].get('additional_animal_rate', service.additional_animal_rate),
                        applies_after=occurrence_data['rates'].get('applies_after', service.applies_after),
                        holiday_rate=occurrence_data['rates'].get('holiday_rate', service.holiday_rate),
                        unit_of_time=occurrence_data['rates'].get('unit_of_time', service.unit_of_time)
                    )

                    # Create a temporary occurrence object for rate calculation
                    class TempOccurrence:
                        def __init__(self, start_date, end_date, start_time, end_time):
                            self.start_date = start_date
                            self.end_date = end_date
                            self.start_time = start_time
                            self.end_time = end_time

                    temp_occurrence = TempOccurrence(
                        start_date=start_date,
                        end_date=end_date,
                        start_time=start_time,
                        end_time=end_time
                    )

                    # Calculate rates using the temporary service and occurrence
                    rate_data = calculate_occurrence_rates(temp_occurrence, temp_service, num_pets)
                    if not rate_data:
                        raise Exception("Failed to calculate rates")

                    # Create occurrence data
                    processed_occurrence = OrderedDict([
                        ('occurrence_id', occurrence_id),
                        ('start_date', start_date.isoformat()),
                        ('end_date', end_date.isoformat()),
                        ('start_time', start_time.strftime('%H:%M')),  # UTC time
                        ('end_time', end_time.strftime('%H:%M')),      # UTC time
                        ('calculated_cost', rate_data['calculated_cost']),
                        ('base_total', rate_data['base_total']),
                        ('unit_of_time', rate_data['unit_of_time']),
                        ('multiple', rate_data['multiple']),
                        ('rates', rate_data['rates'])
                    ])

                    processed_occurrences.append(processed_occurrence)
                except Exception as e:
                    logger.error(f"MBA1644 - Error processing occurrence: {e}")
                    return Response(
                        {"error": f"Error processing occurrence: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Calculate cost summary
            cost_summary = calculate_cost_summary(processed_occurrences)
            if not cost_summary:
                raise Exception("Failed to calculate cost summary")

            # Create draft data
            draft_data = create_draft_data(
                booking=booking,
                request_pets=pets_data,
                occurrences=processed_occurrences,
                cost_summary=cost_summary,
                service=service
            )

            # Update draft status if needed
            if booking.status == BookingStates.CONFIRMED:
                draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES

            # Save the draft
            draft.draft_data = draft_data
            draft.save()

            logger.info(f"MBA1644 - Successfully updated booking draft for booking {booking_id}")
            return Response({
                'status': 'success',
                'draft_data': draft_data
            })

        except Exception as e:
            logger.error(f"MBA1644 - Error in UpdateBookingOccurrencesView: {str(e)}")
            logger.error(f"MBA1644 - Full error traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"An error occurred while updating the booking draft: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GetServiceRatesView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def get(self, request, booking_id):
        logger.info("MBA9999 - Starting GetServiceRatesView.get")
        try:
            # Get the booking and verify professional access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if booking.professional != professional:
                logger.error(f"MBA9999 - Unauthorized access attempt by {request.user.email} for booking {booking_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Get service from draft first, then fall back to booking service
            service = None
            draft = BookingDraft.objects.filter(booking=booking).first()
            
            if draft and draft.draft_data and 'service_details' in draft.draft_data:
                try:
                    service = Service.objects.get(
                        service_name=draft.draft_data['service_details']['service_type'],
                        professional=professional,
                        moderation_status='APPROVED'
                    )
                    logger.info(f"MBA9999 - Using service from draft: {service.service_name}")
                except Service.DoesNotExist:
                    logger.warning(f"MBA9999 - Service from draft not found")

            if not service and booking.service_id:
                service = booking.service_id
                logger.info(f"MBA9999 - Using service from booking: {service.service_name}")

            if not service:
                return Response(
                    {"error": "No service found for this booking"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Format service rates
            rates_data = OrderedDict([
                ('base_rate', str(service.base_rate)),
                ('additional_animal_rate', str(service.additional_animal_rate)),
                ('applies_after', service.applies_after),
                ('holiday_rate', str(service.holiday_rate)),
                ('unit_of_time', service.unit_of_time),
                ('additional_rates', [
                    OrderedDict([
                        ('title', rate.title),
                        ('description', rate.description or ''),
                        ('amount', str(rate.rate))
                    ]) for rate in service.additional_rates.all()
                ])
            ])

            return Response({
                'status': 'success',
                'rates': rates_data
            })

        except Exception as e:
            logger.error(f"MBA9999 - Error getting service rates: {str(e)}")
            logger.error(f"MBA9999 - Full error traceback: {traceback.format_exc()}")
            return Response(
                {"error": "Failed to get service rates"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

def delete_existing_drafts(booking, user):
    """Helper function to delete existing drafts and log the interaction"""
    try:
        existing_drafts = BookingDraft.objects.filter(booking=booking)
        if existing_drafts.exists():
            # Log the interaction before deleting
            for draft in existing_drafts:
                InteractionLog.objects.create(
                    user=user,
                    action='BOOKING_DRAFT_DELETED',
                    target_type='BOOKING_DRAFT',
                    target_id=str(booking.booking_id),
                    metadata={
                        'booking_id': booking.booking_id,
                        'draft_data': draft.draft_data,
                        'reason': 'Creating new draft'
                    }
                )
            
            # Delete the drafts
            count = existing_drafts.count()
            existing_drafts.delete()
            
            logger.info(f"Deleted {count} existing drafts for booking {booking.booking_id}")
            return count
        return 0
    except Exception as e:
        logger.error(f"Error deleting existing drafts: {str(e)}")
        return 0

class UpdateBookingDraftView(APIView):
    def patch(self, request, draft_id):
        # Get the draft
        draft = get_object_or_404(BookingDraft, draft_id=draft_id)
        
        # Update service and pets if provided
        if 'service_id' in request.data:
            service = get_object_or_404(Service, id=request.data['service_id'])
            draft.service_id = service.id
            draft.service_type = service.service_type
            
        if 'pet_ids' in request.data:
            pets = Pet.objects.filter(id__in=request.data['pet_ids'])
            draft.pet_ids = [pet.id for pet in pets]
            draft.pet_names = [pet.name for pet in pets]
            
        draft.updated_at = timezone.now()
        draft.save()
        
        # Get client and professional names
        client = Client.objects.get(id=draft.client_id) if draft.client_id else None
        professional = Professional.objects.get(id=draft.professional_id) if draft.professional_id else None
        
        # Prepare response data
        response_data = {
            'draft_id': draft.draft_id,
            'status': draft.status,
            'client_name': f"{client.first_name} {client.last_name}" if client else None,
            'professional_name': f"{professional.first_name} {professional.last_name}" if professional else None,
            'service_type': draft.service_type,
            'pets': draft.pet_names,
            'occurrences': draft.occurrences if draft.occurrences else [],
            'cost_summary': {
                'total_client_cost': draft.total_client_cost if hasattr(draft, 'total_client_cost') else None,
                'total_professional_payout': draft.total_professional_payout if hasattr(draft, 'total_professional_payout') else None
            }
        }
        
        return Response(response_data, status=status.HTTP_200_OK)

class UpdateBookingDraftPetsAndServicesView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def patch(self, request, draft_id):
        logger.info("MBA12345 - Starting UpdateBookingDraftPetsAndServicesView.patch")
        logger.info(f"MBA12345 - Request data: {request.data}")
        
        try:
            # Get the draft and verify professional access
            draft = get_object_or_404(BookingDraft, draft_id=draft_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if draft.booking and draft.booking.professional != professional:
                logger.error(f"MBA12345 - Unauthorized access attempt by {request.user.email} for draft {draft_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Update service if provided
            if 'service_id' in request.data:
                service = get_object_or_404(
                    Service,
                    service_id=request.data['service_id'],
                    professional=professional,
                    moderation_status='APPROVED'
                )
                if 'service_details' not in draft.draft_data:
                    draft.draft_data['service_details'] = {}
                draft.draft_data['service_details'].update({
                    'service_type': service.service_name,
                    'service_id': service.service_id
                })

            # Update pets if provided
            if 'pets' in request.data:
                pets_data = request.data['pets']
                if not isinstance(pets_data, list):
                    return Response(
                        {"error": "Invalid pets data format"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Get client from booking or draft data
                client = None
                if draft.booking:
                    client = draft.booking.client
                elif draft.draft_data and 'client_id' in draft.draft_data:
                    client = Client.objects.get(id=draft.draft_data['client_id'])
                else:
                    return Response(
                        {"error": "Client not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )

                # Validate all pets belong to the client
                for pet_data in pets_data:
                    try:
                        Pet.objects.get(pet_id=pet_data['pet_id'], owner=client.user)
                    except Pet.DoesNotExist:
                        return Response(
                            {"error": f"Pet with ID {pet_data['pet_id']} not found or does not belong to client"},
                            status=status.HTTP_404_NOT_FOUND
                        )

                draft.draft_data['pets'] = pets_data

            # Update draft status if needed
            if draft.booking and draft.booking.status == BookingStates.CONFIRMED:
                draft.draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES

            # Save the draft
            draft.save()

            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_DRAFT_UPDATED',
                target_type='BOOKING_DRAFT',
                target_id=str(draft_id),
                metadata={
                    'draft_id': draft_id,
                    'service_updated': 'service_id' in request.data,
                    'pets_updated': 'pets' in request.data,
                    'status_changed': draft.draft_data.get('status') != draft.booking.status if draft.booking else False,
                    'draft_data': draft.draft_data
                }
            )

            logger.info(f"MBA12345 - Successfully updated booking draft {draft_id}")
            return Response({
                'status': 'success',
                'draft_data': draft.draft_data
            })

        except Exception as e:
            logger.error(f"MBA12345 - Error in UpdateBookingDraftPetsAndServicesView: {str(e)}")
            logger.error(f"MBA12345 - Full error traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"An error occurred while updating the booking draft: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateBookingDraftTimeAndDateView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request, draft_id):
        logger.info("MBA1234 - Starting UpdateBookingDraftTimeAndDateView.post")
        logger.info(f"MBA1234 - Request data: {request.data}")
        
        try:
            # Get the draft and verify professional access
            draft = get_object_or_404(BookingDraft, draft_id=draft_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if draft.booking and draft.booking.professional != professional:
                logger.error(f"MBA1234 - Unauthorized access attempt by {request.user.email} for draft {draft_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Validate input data
            serializer = OvernightBookingCalculationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"MBA1234 - Invalid input data: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            # Get validated data
            start_date = serializer.validated_data['start_date']
            end_date = serializer.validated_data['end_date']
            start_time = serializer.validated_data['start_time']
            end_time = serializer.validated_data['end_time']
            user_timezone = serializer.validated_data.get('user_timezone', 'US/Mountain')

            # Get service from draft data
            service = None
            if draft.draft_data and 'service_details' in draft.draft_data:
                try:
                    service = Service.objects.get(
                        service_name=draft.draft_data['service_details']['service_type'],
                        professional=professional,
                        moderation_status='APPROVED'
                    )
                except Service.DoesNotExist:
                    logger.error("MBA1234 - Service not found in draft data")
                    return Response(
                        {"error": "Service not found"},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Get number of pets
            num_pets = len(draft.draft_data.get('pets', [])) if draft.draft_data else 0

            # Get rates from draft if they exist, otherwise use service rates
            # First check if there are existing rates in the draft data
            existing_rates = None
            if draft.draft_data and 'occurrences' in draft.draft_data and draft.draft_data['occurrences']:
                # Get rates from the first occurrence in the draft
                first_occurrence = draft.draft_data['occurrences'][0]
                if 'rates' in first_occurrence:
                    existing_rates = first_occurrence['rates']
                    logger.info(f"MBA1234 - Found existing rates in draft: {existing_rates}")

            # Calculate base rate and additional charges using draft rates if available
            base_rate = Decimal(str(existing_rates.get('base_rate', service.base_rate))) if existing_rates else Decimal(str(service.base_rate))
            additional_animal_rate = Decimal(str(existing_rates.get('additional_animal_rate', service.additional_animal_rate))) if existing_rates else Decimal(str(service.additional_animal_rate))
            holiday_rate = Decimal(str(existing_rates.get('holiday_rate', service.holiday_rate))) if existing_rates else Decimal(str(service.holiday_rate))

            logger.info(f"MBA1234 - Using rates: base_rate={base_rate}, additional_animal_rate={additional_animal_rate}, holiday_rate={holiday_rate}")

            # Calculate number of nights based on local times
            # Create datetime objects in the user's timezone
            start_dt = datetime.combine(start_date, start_time)
            end_dt = datetime.combine(end_date, end_time)

            # Calculate the difference in days
            nights = (end_dt - start_dt).days

            # If the end time is earlier than the start time on the same day,
            # or if the end time is on the next day but earlier than the start time,
            # we need to adjust the night count
            if end_time < start_time:
                nights += 1

            logger.info(f"MBA1234 - Calculated nights: {nights}")
            logger.info(f"MBA1234 - Start: {start_date} {start_time}, End: {end_date} {end_time}")

            # Calculate additional pet charges
            additional_pet_charges = Decimal('0')
            if num_pets > 1:
                additional_pets = num_pets - 1
                additional_pet_charges = additional_animal_rate * additional_pets * nights
                logger.info(f"MBA1234 - Additional pet charges: {additional_pet_charges} for {additional_pets} additional pets")

            # Calculate total cost (base rate per night + additional pet charges)
            total_cost = (base_rate * nights) + additional_pet_charges

            # Calculate additional rates total to add to the total cost
            additional_rates_total = Decimal('0')
            
            # If draft has additional rates, use those
            if existing_rates and 'additional_rates' in existing_rates:
                for rate in existing_rates['additional_rates']:
                    # Handle rate amount that might be formatted as a string with a dollar sign
                    rate_amount_str = str(rate.get('amount', '0')).replace('$', '').strip()
                    rate_amount = Decimal(rate_amount_str)
                    additional_rates_total += rate_amount
                    logger.info(f"MBA1234 - Using draft additional rate: {rate.get('title')}: {rate_amount}")
            # Else use service additional rates
            else:
                for rate in service.additional_rates.all():
                    rate_amount = Decimal(str(rate.rate))
                    additional_rates_total += rate_amount
                    logger.info(f"MBA1234 - Using service additional rate: {rate.title}: {rate_amount}")
                    
            # Update total cost with additional rates
            total_cost += additional_rates_total
            logger.info(f"MBA1234 - Base cost: {base_rate * nights}, Additional pet charges: {additional_pet_charges}, Additional rates: {additional_rates_total}")
            logger.info(f"MBA1234 - Total cost after adding additional rates: {total_cost}")

            # Create single occurrence for the entire stay
            occurrence = OrderedDict([
                ('occurrence_id', f"draft_{int(datetime.now().timestamp())}_0"),
                ('start_date', start_date.isoformat()),
                ('end_date', end_date.isoformat()),
                ('start_time', start_time.strftime('%H:%M')),
                ('end_time', end_time.strftime('%H:%M')),
                ('calculated_cost', float(total_cost)),
                ('base_total', float(base_rate * nights)),
                ('unit_of_time', service.unit_of_time),
                ('multiple', nights),
                ('rates', OrderedDict([
                    ('base_rate', str(base_rate)),
                    ('additional_animal_rate', str(additional_animal_rate)),
                    ('applies_after', service.applies_after),
                    ('holiday_rate', str(holiday_rate)),
                    ('holiday_days', 0),
                    ('additional_rates', existing_rates.get('additional_rates', []) if existing_rates else [
                        OrderedDict([
                            ('title', rate.title),
                            ('description', rate.description or ''),
                            ('amount', str(rate.rate))
                        ]) for rate in service.additional_rates.all()
                    ])
                ]))
            ])

            # Get professional's service address for tax calculation
            address = Address.objects.filter(
                user=professional.user,
                address_type=AddressType.SERVICE
            ).first()
            
            # Default tax rate if no address found
            tax_rate = Decimal('0.00')
            state = 'CO'  # Default state
            
            if address:
                state = address.state
                state_tax_info = STATE_TAX_RATES.get(state, {"taxable": False, "state_rate": Decimal('0.00')})
                
                # Check if the service is taxable in this state
                if state_tax_info["taxable"] is True:
                    tax_rate = Decimal(str(state_tax_info["state_rate"]))
                elif state_tax_info["taxable"] == "service_fee_only":
                    # Get client from the booking
                    client = None
                    if draft.booking:
                        client = draft.booking.client
                    
                    # Determine platform fees separately for professional and client
                    client_platform_fee_percentage = self.determine_client_platform_fee(client.user if client else None)
                    pro_platform_fee_percentage = self.determine_professional_platform_fee(professional.user)
                    
                    # Calculate fees
                    client_platform_fee = (total_cost * client_platform_fee_percentage).quantize(Decimal('0.01'))
                    pro_platform_fee = (total_cost * pro_platform_fee_percentage).quantize(Decimal('0.01'))
                    total_platform_fee = client_platform_fee + pro_platform_fee
                    
                    # For DC, only the platform fee is taxed
                    taxes = (total_platform_fee * Decimal(str(state_tax_info["state_rate"]))).quantize(Decimal('0.01'))
                    total_client_cost = total_cost + total_platform_fee + taxes
                    total_sitter_payout = (total_cost * (Decimal('1.0') - pro_platform_fee_percentage)).quantize(Decimal('0.01'))
                    
                    logger.info(f"MBA1234 - Using service_fee_only tax calculation for {state}. Tax rate: {state_tax_info['state_rate']}")
                    logger.info(f"MBA1234 - Client platform fee percentage: {client_platform_fee_percentage}")
                    logger.info(f"MBA1234 - Pro platform fee percentage: {pro_platform_fee_percentage}")
                    logger.info(f"MBA1234 - Client platform fee: {client_platform_fee}")
                    logger.info(f"MBA1234 - Pro platform fee: {pro_platform_fee}")
                    logger.info(f"MBA1234 - Total platform fee: {total_platform_fee}")
                    logger.info(f"MBA1234 - Taxes (on platform fee only): {taxes}")
                    
                    cost_summary = OrderedDict([
                        ('subtotal', float(total_cost)),
                        ('client_platform_fee', float(client_platform_fee)),
                        ('pro_platform_fee', float(pro_platform_fee)),
                        ('total_platform_fee', float(total_platform_fee)),
                        ('taxes', float(taxes)),
                        ('total_client_cost', float(total_client_cost)),
                        ('total_sitter_payout', float(total_sitter_payout)),
                        ('is_prorated', True),
                        ('tax_state', state),
                        ('client_platform_fee_percentage', float(client_platform_fee_percentage * 100)),
                        ('pro_platform_fee_percentage', float(pro_platform_fee_percentage * 100))
                    ])
                    
                    # Update draft data
                    if not draft.draft_data:
                        draft.draft_data = {}

                    draft.draft_data.update({
                        'occurrences': [occurrence],
                        'cost_summary': cost_summary,
                        'nights': nights
                    })

                    # Update draft status if needed
                    if draft.booking and draft.booking.status == BookingStates.CONFIRMED:
                        draft.draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES

                    # Save the draft
                    draft.save()

                    # Log the interaction
                    InteractionLog.objects.create(
                        user=request.user,
                        action='BOOKING_DRAFT_UPDATED',
                        target_type='BOOKING_DRAFT',
                        target_id=str(draft_id),
                        metadata={
                            'draft_id': draft_id,
                            'draft_data': draft.draft_data
                        }
                    )

                    logger.info(f"MBA1234 - Successfully updated booking draft {draft_id}")
                    return Response({
                        'status': 'success',
                        'draft_data': draft.draft_data
                    })
                else:
                    # Not taxable in this state
                    tax_rate = Decimal('0.00')
                
                logger.info(f"MBA1234 - Using tax rate {tax_rate} for state {state}")
            else:
                logger.warning(f"MBA1234 - No service address found for professional {professional.user.email}. Using default tax rate {tax_rate}")

            # Get client from the booking
            client = None
            if draft.booking:
                client = draft.booking.client
            
            # Determine platform fees separately for professional and client
            client_platform_fee_percentage = self.determine_client_platform_fee(client.user if client else None)
            pro_platform_fee_percentage = self.determine_professional_platform_fee(professional.user)
            pro_subscription_plan = professional.user.subscription_plan
            
            # Calculate cost summary with appropriate tax rate
            client_platform_fee = (total_cost * client_platform_fee_percentage).quantize(Decimal('0.01'))
            pro_platform_fee = (total_cost * pro_platform_fee_percentage).quantize(Decimal('0.01'))
            total_platform_fee = client_platform_fee + pro_platform_fee
            
            taxes = ((total_cost + total_platform_fee) * tax_rate).quantize(Decimal('0.01'))
            total_client_cost = total_cost + total_platform_fee + taxes
            total_sitter_payout = (total_cost * (Decimal('1.0') - pro_platform_fee_percentage)).quantize(Decimal('0.01'))

            logger.info(f"MBA1234 - Client platform fee percentage: {client_platform_fee_percentage}")
            logger.info(f"MBA1234 - Pro platform fee percentage: {pro_platform_fee_percentage}")
            logger.info(f"MBA1234 - Client platform fee: {client_platform_fee}")
            logger.info(f"MBA1234 - Pro platform fee: {pro_platform_fee}")
            logger.info(f"MBA1234 - Total platform fee: {total_platform_fee}")

            cost_summary = OrderedDict([
                ('subtotal', float(total_cost)),
                ('client_platform_fee', float(client_platform_fee)),
                ('pro_platform_fee', float(pro_platform_fee)),
                ('total_platform_fee', float(total_platform_fee)),
                ('taxes', float(taxes)),
                ('total_client_cost', float(total_client_cost)),
                ('total_sitter_payout', float(total_sitter_payout)),
                ('is_prorated', True),
                ('tax_state', state),
                ('pro_subscription_plan', pro_subscription_plan),
                ('client_platform_fee_percentage', float(client_platform_fee_percentage * 100)),
                ('pro_platform_fee_percentage', float(pro_platform_fee_percentage * 100))
            ])

            # Update draft data
            if not draft.draft_data:
                draft.draft_data = {}

            draft.draft_data.update({
                'occurrences': [occurrence],
                'cost_summary': cost_summary,
                'nights': nights
            })

            # Update draft status if needed
            if draft.booking and draft.booking.status == BookingStates.CONFIRMED:
                draft.draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES

            # Save the draft
            draft.save()

            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_DRAFT_UPDATED',
                target_type='BOOKING_DRAFT',
                target_id=str(draft_id),
                metadata={
                    'draft_id': draft_id,
                    'draft_data': draft.draft_data
                }
            )

            logger.info(f"MBA1234 - Successfully updated booking draft {draft_id}")
            return Response({
                'status': 'success',
                'draft_data': draft.draft_data
            })

        except Exception as e:
            logger.error(f"MBA1234 - Error in UpdateBookingDraftTimeAndDateView: {str(e)}")
            logger.error(f"MBA1234 - Full error traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"An error occurred while updating the booking draft: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def determine_client_platform_fee(self, client_user):
        """
        Determine the platform fee percentage for the client based on their subscription plan.
        
        Client platform fee rules by subscription plan:
        - Plan 0 (Free tier): Fee = 0% if first booking this month, else 15%
        - Plan 1 (Waitlist tier): Fee = 0% (unlimited free bookings)
        - Plan 2 (Commission tier): Fee = 15%
        - Plan 3 (Pro subscription): Fee = 15% (follows commission tier rule)
        - Plan 4 (Client subscription): Fee = 0%
        - Plan 5 (Dual subscription): Fee = 0% (no platform fees ever)
        
        Returns:
        - Decimal value of platform fee percentage (0.15 or 0.0)
        """
        # Default platform fee percentage
        platform_fee = Decimal('0.15')  # 15%
        
        # If we're missing a client user, default to the standard fee
        if not client_user:
            logger.warning("MBA1234 - No client user found, using default 15% platform fee")
            return platform_fee
        
        # Get subscription plan
        client_plan = client_user.subscription_plan
        logger.info(f"MBA1234 - Client subscription plan: {client_plan}")
        
        # Check subscription plan for client
        if client_plan == 5:  # Dual subscription - no platform fees ever
            logger.info("MBA1234 - Client has Dual subscription, applying 0% platform fee")
            return Decimal('0.0')
            
        if client_plan == 4:  # Client subscription - no platform fees
            logger.info("MBA1234 - Client has Client subscription, applying 0% platform fee")
            return Decimal('0.0')
            
        if client_plan == 1:  # Waitlist tier - unlimited free bookings
            logger.info("MBA1234 - Client has Waitlist tier, applying 0% platform fee")
            return Decimal('0.0')
            
        if client_plan == 0:  # Free tier - check if first booking this month
            # Get current month start
            today = timezone.now().date()
            month_start = today.replace(day=1)
            
            # Count client's bookings this month
            client_bookings_this_month = Booking.objects.filter(
                client__user=client_user,
                created_at__date__gte=month_start
            ).count()
            
            logger.info(f"MBA1234 - Client bookings this month: {client_bookings_this_month}")
            
            # If first booking this month, no platform fee
            if client_bookings_this_month == 0:
                logger.info("MBA1234 - First booking this month for client, applying 0% platform fee")
                return Decimal('0.0')
                
        # All other cases (plan 2, 3, or non-first booking for plan 0) - 15% platform fee
        logger.info("MBA1234 - Client pays standard 15% platform fee")
        return platform_fee
        
    def determine_professional_platform_fee(self, professional_user):
        """
        Determine the platform fee percentage for the professional based on their subscription plan.
        
        Professional platform fee rules by subscription plan:
        - Plan 0 (Free tier): Fee = 0% if first booking this month, else 15%
        - Plan 1 (Waitlist tier): Fee = 0% (unlimited free bookings)
        - Plan 2 (Commission tier): Fee = 15%
        - Plan 3 (Pro subscription): Fee = 0%
        - Plan 4 (Client subscription): Fee = 15% (follows commission tier rule)
        - Plan 5 (Dual subscription): Fee = 0% (no platform fees ever)
        
        Returns:
        - Decimal value of platform fee percentage (0.15 or 0.0)
        """
        # Default platform fee percentage
        platform_fee = Decimal('0.15')  # 15%
        
        # Get subscription plan
        pro_plan = professional_user.subscription_plan
        logger.info(f"MBA1234 - Professional subscription plan: {pro_plan}")
        
        # Check subscription plan for professional
        if pro_plan == 5:  # Dual subscription - no platform fees ever
            logger.info("MBA1234 - Professional has Dual subscription, applying 0% platform fee")
            return Decimal('0.0')
            
        if pro_plan == 3:  # Pro subscription - no platform fees
            logger.info("MBA1234 - Professional has Pro subscription, applying 0% platform fee")
            return Decimal('0.0')
            
        if pro_plan == 1:  # Waitlist tier - unlimited free bookings
            logger.info("MBA1234 - Professional has Waitlist tier, applying 0% platform fee")
            return Decimal('0.0')
            
        if pro_plan == 0:  # Free tier - check if first booking this month
            # Get current month start
            today = timezone.now().date()
            month_start = today.replace(day=1)
            
            # Count professional's bookings this month
            pro_bookings_this_month = Booking.objects.filter(
                professional__user=professional_user,
                created_at__date__gte=month_start
            ).count()
            
            logger.info(f"MBA1234 - Professional bookings this month: {pro_bookings_this_month}")
            
            # If first booking this month, no platform fee
            if pro_bookings_this_month == 0:
                logger.info("MBA1234 - First booking this month for professional, applying 0% platform fee")
                return Decimal('0.0')
                
        # All other cases (plan 2, 4, or non-first booking for plan 0) - 15% platform fee
        logger.info("MBA1234 - Professional pays standard 15% platform fee")
        return platform_fee

class UpdateBookingRatesView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request, draft_id):
        logger.info("MBA98765 - Starting UpdateBookingRatesView.post")
        logger.info(f"MBA98765 - Request data: {request.data}")
        
        try:
            # Get the draft and verify professional access
            draft = get_object_or_404(BookingDraft, draft_id=draft_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if draft.booking and draft.booking.professional != professional:
                logger.error(f"MBA98765 - Unauthorized access attempt by {request.user.email} for draft {draft_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Validate input data
            serializer = UpdateRatesSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"MBA98765 - Invalid input data: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            # Get or create draft_data if it doesn't exist
            if not draft.draft_data:
                draft.draft_data = {}

            # Get validated data
            occurrences_data = serializer.validated_data.get('occurrences', [])
            
            # If there are no occurrences in the draft, return error
            if 'occurrences' not in draft.draft_data or not draft.draft_data['occurrences']:
                logger.error(f"MBA98765 - No occurrences found in draft {draft_id}")
                return Response(
                    {"error": "No occurrences found in draft data. Please set up dates and times first."},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update rates in the draft occurrences
            updated_occurrences = []
            
            for occurrence_update in occurrences_data:
                occurrence_id = occurrence_update['occurrence_id']
                new_rates = occurrence_update['rates']
                
                # Find the occurrence in the draft data
                for i, occurrence in enumerate(draft.draft_data['occurrences']):
                    if occurrence['occurrence_id'] == occurrence_id:
                        # Update the occurrence rates
                        occurrence['rates']['base_rate'] = str(new_rates['base_rate'])
                        if 'additional_animal_rate' in new_rates:
                            occurrence['rates']['additional_animal_rate'] = str(new_rates['additional_animal_rate'])
                        if 'applies_after' in new_rates:
                            occurrence['rates']['applies_after'] = new_rates['applies_after']
                        if 'holiday_rate' in new_rates:
                            occurrence['rates']['holiday_rate'] = str(new_rates['holiday_rate'])
                        
                        # Update additional rates if provided
                        if 'additional_rates' in new_rates:
                            additional_rates = []
                            for rate in new_rates['additional_rates']:
                                additional_rates.append(OrderedDict([
                                    ('title', rate['title']),
                                    ('amount', str(rate['amount'])),
                                    ('description', rate.get('description', ''))
                                ]))
                            occurrence['rates']['additional_rates'] = additional_rates
                        
                        # Update calculated costs
                        base_rate = Decimal(str(new_rates['base_rate']))
                        unit_of_time = occurrence.get('unit_of_time', 'Per Visit')
                        multiple = occurrence.get('multiple', 1)
                        base_total = base_rate * Decimal(str(multiple))
                        occurrence['base_total'] = float(base_total)
                        
                        # Calculate additional animal rates
                        additional_animal_rate_total = Decimal('0')
                        if 'additional_animal_rate' in new_rates and 'applies_after' in new_rates:
                            num_pets = len(draft.draft_data.get('pets', []))
                            applies_after = new_rates['applies_after']
                            if num_pets > applies_after:
                                additional_pets = num_pets - applies_after
                                additional_animal_rate = Decimal(str(new_rates['additional_animal_rate']))
                                additional_animal_rate_total = additional_animal_rate * additional_pets * Decimal(str(multiple))
                                occurrence['rates']['additional_animal_rate_total'] = float(additional_animal_rate_total)
                        
                        # Calculate holiday rates
                        holiday_rate_total = Decimal('0')
                        if 'holiday_rate' in new_rates and occurrence['rates'].get('holiday_days', 0) > 0:
                            holiday_days = occurrence['rates']['holiday_days']
                            holiday_rate = Decimal(str(new_rates['holiday_rate']))
                            holiday_rate_total = holiday_rate * Decimal(str(holiday_days))
                            occurrence['rates']['holiday_rate_total'] = float(holiday_rate_total)
                        
                        # Calculate additional rates total
                        additional_rates_total = Decimal('0')
                        if 'additional_rates' in new_rates:
                            for rate in new_rates['additional_rates']:
                                additional_rates_total += Decimal(str(rate['amount']))
                        
                        # Update the calculated total cost for this occurrence
                        calculated_cost = base_total + additional_animal_rate_total + holiday_rate_total + additional_rates_total
                        occurrence['calculated_cost'] = float(calculated_cost)
                        
                        # Add to updated occurrences
                        updated_occurrences.append(occurrence)
                        break
            
            # If we didn't update any occurrences, return error
            if not updated_occurrences:
                logger.error(f"MBA98765 - No matching occurrences found in draft {draft_id}")
                return Response(
                    {"error": "No matching occurrences found in draft data"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update occurrences in draft data
            draft.draft_data['occurrences'] = updated_occurrences
            
            # Get professional's service address for tax calculation
            address = Address.objects.filter(
                user=professional.user,
                address_type=AddressType.SERVICE
            ).first()
            
            # Default tax rate if no address found
            tax_rate = Decimal('0.00')
            state = 'CO'  # Default state
            
            if address:
                state = address.state
            
            # Get client from the booking
            client = None
            if draft.booking:
                client = draft.booking.client
            
            # Calculate cost summary based on updated occurrences
            subtotal = Decimal('0')
            for occ in updated_occurrences:
                subtotal += Decimal(str(occ['calculated_cost']))
            
            # Determine platform fees separately for professional and client
            client_platform_fee_percentage = self.determine_client_platform_fee(client.user if client else None)
            pro_platform_fee_percentage = self.determine_professional_platform_fee(professional.user)
            
            # Calculate fees
            client_platform_fee = (subtotal * client_platform_fee_percentage).quantize(Decimal('0.01'))
            pro_platform_fee = (subtotal * pro_platform_fee_percentage).quantize(Decimal('0.01'))
            total_platform_fee = client_platform_fee + pro_platform_fee
            
            # Calculate taxes based on state tax info
            state_tax_info = STATE_TAX_RATES.get(state, {"taxable": False, "state_rate": Decimal('0.00')})
            
            if state_tax_info["taxable"] is True:
                # Regular tax calculation (tax on everything)
                tax_rate = Decimal(str(state_tax_info["state_rate"]))
                taxes = (subtotal * tax_rate).quantize(Decimal('0.01'))
            elif state_tax_info["taxable"] == "service_fee_only":
                # For DC, only the platform fee is taxed
                tax_rate = Decimal(str(state_tax_info["state_rate"]))
                taxes = (total_platform_fee * tax_rate).quantize(Decimal('0.01'))
            else:
                # No taxes
                taxes = Decimal('0.00')
            
            # Calculate totals
            total_client_cost = subtotal + client_platform_fee + taxes
            total_sitter_payout = (subtotal - pro_platform_fee).quantize(Decimal('0.01'))
            
            # Get pro subscription plan if available
            pro_subscription_plan = 0  # Default value
            try:
                # Access the subscription_plan attribute directly from user model
                pro_subscription_plan = professional.user.subscription_plan
                logger.info(f"MBA98765 - Retrieved professional subscription plan: {pro_subscription_plan}")
            except Exception as e:
                logger.error(f"MBA98765 - Error retrieving professional subscription plan: {str(e)}")
                # Default to 0 if there's an error
                pro_subscription_plan = 0
            
            # Create cost summary
            cost_summary = OrderedDict([
                ('subtotal', float(subtotal)),
                ('client_platform_fee', float(client_platform_fee)),
                ('pro_platform_fee', float(pro_platform_fee)),
                ('total_platform_fee', float(total_platform_fee)),
                ('taxes', float(taxes)),
                ('total_client_cost', float(total_client_cost)),
                ('total_sitter_payout', float(total_sitter_payout)),
                ('is_prorated', True),
                ('tax_state', state),
                ('client_platform_fee_percentage', float(client_platform_fee_percentage * 100)),
                ('pro_platform_fee_percentage', float(pro_platform_fee_percentage * 100)),
                ('pro_subscription_plan', pro_subscription_plan)
            ])
            
            # Update cost summary in draft data
            draft.draft_data['cost_summary'] = cost_summary
            
            # Update draft status if needed
            if draft.booking and draft.booking.status == BookingStates.CONFIRMED:
                draft.draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
            
            # Save the draft
            draft.save()
            
            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_RATES_UPDATED',
                target_type='BOOKING_DRAFT',
                target_id=str(draft_id),
                metadata={
                    'draft_id': draft_id,
                    'updated_occurrences': len(updated_occurrences),
                    'subtotal': float(subtotal),
                    'tax_state': state,
                    'tax_rate': float(tax_rate),
                    'draft_data': draft.draft_data
                }
            )
            
            logger.info(f"MBA98765 - Successfully updated booking rates for draft {draft_id}")
            return Response({
                'status': 'success',
                'draft_data': draft.draft_data
            })
            
        except Exception as e:
            logger.error(f"MBA98765 - Error updating booking rates: {str(e)}")
            logger.error(f"MBA98765 - Full error traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"An error occurred while updating booking rates: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
    def determine_client_platform_fee(self, client_user):
        """Determine the platform fee percentage for a client"""
        # Default to 15% if no client user
        if not client_user:
            logger.info("MBA98765 - No client user found, using default 15% platform fee")
            return Decimal('0.15')
        
        # Check if the client has a subscription
        try:
            # Access the subscription_plan attribute directly from user model
            subscription_plan = client_user.subscription_plan
            logger.info(f"MBA98765 - Client subscription plan: {subscription_plan}")
            
            # Check subscription plan for client
            if subscription_plan == 5:  # Dual subscription - no platform fees
                logger.info("MBA98765 - Client has Dual subscription, applying 0% platform fee")
                return Decimal('0.0')
                
            if subscription_plan == 4:  # Client subscription - reduced platform fees
                logger.info("MBA98765 - Client has Client subscription, applying 5% platform fee")
                return Decimal('0.05')
                
            if subscription_plan == 1:  # Waitlist tier - unlimited free bookings
                logger.info("MBA98765 - Client has Waitlist tier, applying 0% platform fee")
                return Decimal('0.0')
                
            if subscription_plan == 0:  # Free tier - check if first booking this month
                # Get current month start
                today = timezone.now().date()
                month_start = today.replace(day=1)
                
                # Count client's bookings this month
                client_bookings_this_month = Booking.objects.filter(
                    client__user=client_user,
                    created_at__date__gte=month_start
                ).count()
                
                logger.info(f"MBA98765 - Client bookings this month: {client_bookings_this_month}")
                
                # If first booking this month, no platform fee
                if client_bookings_this_month == 0:
                    logger.info("MBA98765 - First booking this month for client, applying 0% platform fee")
                    return Decimal('0.0')
        except Exception as e:
            # Log the error
            logger.error(f"MBA98765 - Error getting client subscription plan: {str(e)}")
        
        # All other cases - standard 15% platform fee
        logger.info("MBA98765 - Client pays standard 15% platform fee")
        return Decimal('0.15')
    
    def determine_professional_platform_fee(self, professional_user):
        """Determine the platform fee percentage for a professional"""
        # Default to 0% pro fee
        pro_fee = Decimal('0.00')
        
        # Check if the professional has an active subscription
        try:
            # Access the subscription_plan attribute directly from user model
            subscription_plan = professional_user.subscription_plan
            logger.info(f"MBA98765 - Professional subscription plan: {subscription_plan}")
            
            # Free tier (plan 0) and waitlist tier (plan 1) have 0% fee
            if subscription_plan == 0 or subscription_plan == 1:
                logger.info(f"MBA98765 - Professional has subscription plan {subscription_plan}, applying 0% fee")
                pro_fee = Decimal('0.00')
            # Commission tier (plan 2) has 15% fee
            elif subscription_plan == 2:
                logger.info(f"MBA98765 - Professional has subscription plan {subscription_plan}, applying 15% fee")
                pro_fee = Decimal('0.15')
            # Pro tiers (plans 3, 4, ...) have 0% fee
            else:
                logger.info(f"MBA98765 - Professional has subscription plan {subscription_plan}, applying 0% fee")
                pro_fee = Decimal('0.00')
        except Exception as e:
            # Log the error
            logger.error(f"MBA98765 - Error getting subscription plan: {str(e)}")
            # Default to 15% if there's an error accessing subscription
            pro_fee = Decimal('0.15')
        
        return pro_fee

class UpdateBookingDraftMultipleDaysView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request, draft_id):
        logger.info("MBA5321 - Starting UpdateBookingDraftMultipleDaysView.post")
        logger.info(f"MBA5321 - Request data: {request.data}")
        
        try:
            # Get the draft and verify professional access
            draft = get_object_or_404(BookingDraft, draft_id=draft_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if draft.booking and draft.booking.professional != professional:
                logger.error(f"MBA5321 - Unauthorized access attempt by {request.user.email} for draft {draft_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Initialize draft_data if it doesn't exist
            if not draft.draft_data:
                draft.draft_data = {}

            # Get dates from request
            dates_data = request.data.get('dates', [])
            if not dates_data:
                return Response(
                    {"error": "No dates provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get service from draft or booking
            service = None
            if 'service_details' in draft.draft_data:
                try:
                    service = Service.objects.get(
                        service_name=draft.draft_data['service_details']['service_type'],
                        professional=professional,
                        moderation_status='APPROVED'
                    )
                except Service.DoesNotExist:
                    service = draft.booking.service_id if draft.booking else None
            elif draft.booking:
                service = draft.booking.service_id

            if not service:
                return Response(
                    {"error": "No service found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get number of pets
            num_pets = len(draft.draft_data.get('pets', [])) if draft.draft_data else 0

            # Process each date and create occurrences
            processed_occurrences = []
            for date_data in dates_data:
                try:
                    # Parse date and times
                    date_obj = datetime.strptime(date_data['date'], '%Y-%m-%d').date()
                    start_time = datetime.strptime(date_data['startTime'], '%H:%M').time()
                    end_time = datetime.strptime(date_data['endTime'], '%H:%M').time()

                    # Create temporary occurrence for rate calculation
                    class TempOccurrence:
                        def __init__(self, start_date, end_date, start_time, end_time):
                            self.start_date = start_date
                            self.end_date = end_date
                            self.start_time = start_time
                            self.end_time = end_time

                    temp_occurrence = TempOccurrence(
                        start_date=date_obj,
                        end_date=date_obj,
                        start_time=start_time,
                        end_time=end_time
                    )

                    # Calculate rates
                    rate_data = calculate_occurrence_rates(temp_occurrence, service, num_pets)
                    if not rate_data:
                        raise Exception(f"Failed to calculate rates for date {date_obj}")

                    # Convert string values to Decimal for rounding
                    # Safely convert to Decimal, even if the values are already numbers
                    calculated_cost = Decimal(str(rate_data['calculated_cost']))
                    base_total = Decimal(str(rate_data['base_total']))

                    # Create occurrence data
                    occurrence = OrderedDict([
                        ('occurrence_id', f"draft_{int(datetime.now().timestamp())}_{len(processed_occurrences)}"),
                        ('start_date', date_obj.isoformat()),
                        ('end_date', date_obj.isoformat()),
                        ('start_time', start_time.strftime('%H:%M')),
                        ('end_time', end_time.strftime('%H:%M')),
                        ('calculated_cost', float(round(calculated_cost, 2))),
                        ('base_total', float(round(base_total, 2))),
                        ('multiple', rate_data['multiple']),
                        ('rates', rate_data['rates'])
                    ])

                    processed_occurrences.append(occurrence)

                except Exception as e:
                    logger.error(f"MBA5321 - Error processing date: {str(e)}")
                    return Response(
                        {"error": f"Error processing date: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Calculate cost summary with rounded values
            subtotal = Decimal('0')
            for occ in processed_occurrences:
                subtotal += Decimal(str(occ['calculated_cost']))
            
            subtotal = round(subtotal, 2)

            # Calculate platform fees using helper methods
            client = draft.booking.client if draft.booking else None
            client_platform_fee_percentage = self.determine_client_platform_fee(client.user if client else None)
            pro_platform_fee_percentage = self.determine_professional_platform_fee(professional.user)

            client_platform_fee = (subtotal * client_platform_fee_percentage).quantize(Decimal('0.01'))
            pro_platform_fee = (subtotal * pro_platform_fee_percentage).quantize(Decimal('0.01'))
            total_platform_fee = client_platform_fee + pro_platform_fee

            taxes = ((subtotal + total_platform_fee) * Decimal('0.08')).quantize(Decimal('0.01'))  # 8% tax
            total_client_cost = (subtotal + total_platform_fee + taxes).quantize(Decimal('0.01'))
            total_sitter_payout = (subtotal * (Decimal('1.0') - pro_platform_fee_percentage)).quantize(Decimal('0.01'))

            cost_summary = OrderedDict([
                ('subtotal', float(subtotal)),
                ('client_platform_fee', float(client_platform_fee)),
                ('pro_platform_fee', float(pro_platform_fee)),
                ('total_platform_fee', float(total_platform_fee)),
                ('taxes', float(taxes)),
                ('total_client_cost', float(total_client_cost)),
                ('total_sitter_payout', float(total_sitter_payout)),
                ('is_prorated', True),
                ('client_platform_fee_percentage', float(client_platform_fee_percentage * 100)),
                ('pro_platform_fee_percentage', float(pro_platform_fee_percentage * 100))
            ])

            # Preserve existing client data if it exists in draft_data
            client_name = None
            client_id = None
            
            if draft.draft_data and 'client_name' in draft.draft_data and draft.draft_data['client_name']:
                client_name = draft.draft_data['client_name']
                logger.info(f"MBA5321 - Using client_name from draft_data: {client_name}")
            elif draft.booking and draft.booking.client:
                client_name = draft.booking.client.user.name
                logger.info(f"MBA5321 - Using client_name from booking: {client_name}")
            
            if draft.draft_data and 'client_id' in draft.draft_data and draft.draft_data['client_id']:
                client_id = draft.draft_data['client_id']
                logger.info(f"MBA5321 - Using client_id from draft_data: {client_id}")
            elif draft.booking and draft.booking.client:
                client_id = draft.booking.client.id
                logger.info(f"MBA5321 - Using client_id from booking: {client_id}")

            # Create draft data structure
            draft_data = OrderedDict([
                ('booking_id', draft.booking.booking_id if draft.booking else None),
                ('status', draft.booking.status if draft.booking else 'DRAFT'),
                ('client_name', client_name),
                ('client_id', client_id),
                ('professional_name', professional.user.name),
                ('professional_id', professional.professional_id),
                ('pets', draft.draft_data.get('pets', [])),
                ('can_edit', True),
                ('occurrences', processed_occurrences),
                ('cost_summary', cost_summary),
                ('service_details', OrderedDict([
                    ('service_type', service.service_name),
                    ('service_id', service.service_id)
                ])),
                ('conversation_id', draft.booking.conversation_id if draft.booking else draft.draft_data.get('conversation_id'))
            ])

            # Update draft status if needed
            if draft.booking and draft.booking.status == BookingStates.CONFIRMED:
                draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES

            # Save the draft
            draft.draft_data = draft_data
            draft.save()

            logger.info(f"MBA5321 - Successfully updated booking draft {draft_id}")
            logger.info(f"MBA5321 - Client ID in response: {draft_data['client_id']}")
            logger.info(f"MBA5321 - Client Name in response: {draft_data['client_name']}")
            
            return Response({
                'status': 'success',
                'draft_data': draft_data
            })

        except Exception as e:
            logger.error(f"MBA5321 - Error in UpdateBookingDraftMultipleDaysView: {str(e)}")
            logger.error(f"MBA5321 - Full error traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"An error occurred while updating the booking draft: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def determine_client_platform_fee(self, client_user):
        """
        Determine the platform fee percentage for the client based on their subscription plan.
        Returns Decimal value of platform fee percentage (0.15 or 0.0)
        """
        platform_fee = Decimal('0.15')
        if not client_user:
            logger.warning("MBA5321 - No client user found, using default 15% platform fee")
            return platform_fee
        client_plan = client_user.subscription_plan
        logger.info(f"MBA5321 - Client subscription plan: {client_plan}")
        if client_plan == 5:
            logger.info("MBA5321 - Client has Dual subscription, applying 0% platform fee")
            return Decimal('0.0')
        if client_plan == 4:
            logger.info("MBA5321 - Client has Client subscription, applying 0% platform fee")
            return Decimal('0.0')
        if client_plan == 1:
            logger.info("MBA5321 - Client has Waitlist tier, applying 0% platform fee")
            return Decimal('0.0')
        if client_plan == 0:
            today = timezone.now().date()
            month_start = today.replace(day=1)
            pro_bookings_this_month = Booking.objects.filter(
                professional__user=client_user,
                created_at__date__gte=month_start
            ).count()
            logger.info(f"MBA5321 - Professional bookings this month: {pro_bookings_this_month}")
            if pro_bookings_this_month == 0:
                logger.info("MBA5321 - First booking this month for professional, applying 0% platform fee")
                return Decimal('0.0')
        logger.info("MBA5321 - Professional pays standard 15% platform fee")
        return platform_fee

    def determine_professional_platform_fee(self, professional_user):
        """
        Determine the platform fee percentage for the professional based on their subscription plan.
        Returns Decimal value of platform fee percentage (0.15 or 0.0)
        """
        platform_fee = Decimal('0.15')
        pro_plan = professional_user.subscription_plan
        logger.info(f"MBA5321 - Professional subscription plan: {pro_plan}")
        if pro_plan == 5:
            logger.info("MBA5321 - Professional has Dual subscription, applying 0% platform fee")
            return Decimal('0.0')
        if pro_plan == 3:
            logger.info("MBA5321 - Professional has Pro subscription, applying 0% platform fee")
            return Decimal('0.0')
        if pro_plan == 1:
            logger.info("MBA5321 - Professional has Waitlist tier, applying 0% platform fee")
            return Decimal('0.0')
        if pro_plan == 0:
            today = timezone.now().date()
            month_start = today.replace(day=1)
            pro_bookings_this_month = Booking.objects.filter(
                professional__user=professional_user,
                created_at__date__gte=month_start
            ).count()
            logger.info(f"MBA5321 - Professional bookings this month: {pro_bookings_this_month}")
            if pro_bookings_this_month == 0:
                logger.info("MBA5321 - First booking this month for professional, applying 0% platform fee")
                return Decimal('0.0')
        logger.info("MBA5321 - Professional pays standard 15% platform fee")
        return platform_fee

class UpdateBookingDraftRecurringView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]

    def post(self, request, draft_id):
        logger.info("MBA5asdt3f4321 - Starting UpdateBookingDraftRecurringView.post")
        logger.info(f"MBA5asdt3f4321 - Request data: {request.data}")
        
        try:
            # Get the draft and verify professional access
            draft = get_object_or_404(BookingDraft, draft_id=draft_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if draft.booking and draft.booking.professional != professional:
                logger.error(f"MBA5asdt3f4321 - Unauthorized access attempt by {request.user.email} for draft {draft_id}")
                return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

            # Get recurring data
            recurring_data = request.data
            if not recurring_data:
                return Response(
                    {"error": "No recurring data provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get service from draft or booking
            service = None
            if draft.draft_data and 'service_details' in draft.draft_data:
                try:
                    service = Service.objects.get(
                        service_name=draft.draft_data['service_details']['service_type'],
                        professional=professional,
                        moderation_status='APPROVED'
                    )
                except Service.DoesNotExist:
                    service = draft.booking.service_id if draft.booking else None
            else:
                service = draft.booking.service_id if draft.booking else None

            if not service:
                return Response(
                    {"error": "No service found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get number of pets
            num_pets = len(draft.draft_data.get('pets', [])) if draft.draft_data else 0

            # Generate recurring dates
            start_date = datetime.strptime(recurring_data['startDate'], '%Y-%m-%d').date()
            end_date = datetime.strptime(recurring_data['endDate'], '%Y-%m-%d').date()
            days_of_week = recurring_data['daysOfWeek']
            frequency = recurring_data['frequency']
            start_time = datetime.strptime(recurring_data['startTime'], '%H:%M').time()
            end_time = datetime.strptime(recurring_data['endTime'], '%H:%M').time()

            # Generate all dates between start and end that match the days of week
            current_date = start_date
            recurring_dates = []
            week_count = 0

            while current_date <= end_date:
                # Check if this date's day of week is selected
                if current_date.weekday() in days_of_week:
                    # For bi-weekly, only include if it's an even week number
                    if frequency == 'bi-weekly' and week_count % 2 != 0:
                        current_date += timedelta(days=1)
                        continue

                    recurring_dates.append(current_date)

                current_date += timedelta(days=1)
                if current_date.weekday() == 0:  # Monday
                    week_count += 1

            # Process each recurring date
            processed_occurrences = []
            for date_obj in recurring_dates:
                try:
                    # Create temporary occurrence for rate calculation
                    class TempOccurrence:
                        def __init__(self, start_date, end_date, start_time, end_time):
                            self.start_date = start_date
                            self.end_date = end_date
                            self.start_time = start_time
                            self.end_time = end_time

                    temp_occurrence = TempOccurrence(
                        start_date=date_obj,
                        end_date=date_obj,
                        start_time=start_time,
                        end_time=end_time
                    )

                    # Calculate rates
                    rate_data = calculate_occurrence_rates(temp_occurrence, service, num_pets)
                    if not rate_data:
                        raise Exception(f"Failed to calculate rates for date {date_obj}")

                    # Get formatted times
                    formatted_times = get_formatted_times(
                        occurrence=temp_occurrence,
                        user_id=draft.booking.client.user.id if draft.booking else None
                    )

                    # Create occurrence data
                    occurrence = OrderedDict([
                        ('occurrence_id', f"draft_{int(datetime.now().timestamp())}_{len(processed_occurrences)}"),
                        ('start_date', date_obj.isoformat()),
                        ('end_date', date_obj.isoformat()),
                        ('start_time', start_time.strftime('%H:%M')),
                        ('end_time', end_time.strftime('%H:%M')),
                        ('calculated_cost', rate_data['calculated_cost']),
                        ('base_total', rate_data['base_total']),
                        ('multiple', rate_data['multiple']),
                        ('rates', rate_data['rates']),
                        ('formatted_start', formatted_times['formatted_start']),
                        ('formatted_end', formatted_times['formatted_end']),
                        ('duration', formatted_times['duration']),
                        ('timezone', formatted_times['timezone'])
                    ])

                    processed_occurrences.append(occurrence)

                except Exception as e:
                    logger.error(f"MBA5asdt3f4321 - Error processing recurring date: {str(e)}")
                    return Response(
                        {"error": f"Error processing recurring date: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Calculate cost summary
            cost_summary = calculate_cost_summary(processed_occurrences)
            if not cost_summary:
                raise Exception("Failed to calculate cost summary")

            # Get current pets from draft or booking
            pets_data = []
            if 'pets' in draft.draft_data:
                pets_data = draft.draft_data['pets']
            elif draft.booking:
                for bp in draft.booking.booking_pets.select_related('pet').all():
                    pets_data.append(OrderedDict([
                        ('name', bp.pet.name),
                        ('breed', bp.pet.breed),
                        ('pet_id', bp.pet.pet_id),
                        ('species', bp.pet.species)
                    ]))

            # Create draft data
            draft_data = create_draft_data(
                booking=draft.booking,
                request_pets=pets_data,
                occurrences=processed_occurrences,
                cost_summary=cost_summary,
                service=service
            )

            # Add recurring metadata
            draft_data['recurring_metadata'] = {
                'frequency': frequency,
                'days_of_week': days_of_week,
                'start_date': start_date.isoformat(),
                'end_date': end_date.isoformat()
            }

            # Update draft status if needed
            if draft.booking and draft.booking.status == BookingStates.CONFIRMED:
                draft_data['status'] = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES

            # Save the draft
            draft.draft_data = draft_data
            draft.save()

            logger.info(f"MBA5asdt3f4321 - Successfully updated booking draft {draft_id}")
            return Response({
                'status': 'success',
                'draft_data': draft_data
            })

        except Exception as e:
            logger.error(f"MBA5asdt3f4321 - Error in UpdateBookingDraftRecurringView: {str(e)}")
            logger.error(f"MBA5asdt3f4321 - Full error traceback: {traceback.format_exc()}")
            return Response(
                {"error": f"An error occurred while updating the booking draft: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class GetBookingDraftDatesAndTimesView(APIView):
    permission_classes = [IsAuthenticated]
    renderer_classes = [JSONRenderer]
    
    def get(self, request, draft_id):
        logger.info(f"MBA-DEBUG: GetBookingDraftDatesAndTimesView.get called with draft_id={draft_id}")
        logger.info(f"MBA-DEBUG: Request path: {request.path}")
        logger.info(f"MBA-DEBUG: Request method: {request.method}")
        logger.info(f"MBA-DEBUG: Request user: {request.user.id if request.user else 'None'}")
        
        try:
            # First get the booking draft
            logger.info(f"MBA-DEBUG: Attempting to get BookingDraft with id={draft_id}")
            # Try multiple ways to find the draft
            draft = None
            
            # Log the available field names for debugging
            logger.info(f"MBA-DEBUG: Available fields on BookingDraft: {[f.name for f in BookingDraft._meta.get_fields()]}")
            
            # Try using draft_id first
            draft = BookingDraft.objects.filter(draft_id=draft_id).first()
            if not draft:
                # If that fails, try using booking_id
                logger.info(f"MBA-DEBUG: No draft found with draft_id={draft_id}, trying with booking_id")
                draft = BookingDraft.objects.filter(booking_id=draft_id).first()
            
            if not draft:
                logger.error(f"MBA-DEBUG: No BookingDraft found with id={draft_id}")
                return Response(
                    {"error": "Booking draft not found."},
                    status=status.HTTP_404_NOT_FOUND
                )
                
            logger.info(f"MBA-DEBUG: Successfully found draft with draft_id={draft.draft_id}")
            logger.info(f"MBA-DEBUG: Draft data: {draft.draft_data}")
            
            # Extract data directly from the draft_data JSON field
            draft_data = draft.draft_data
            
            # Initialize response data with default values
            response_data = {
                "dates": [],
                "times": {},
                "date_range_type": "multiple-days",  # Default
                "booking_type": "one-time",          # Default
                "date_range": None,
            }
            
            # Check if we have occurrences in the draft data
            if "occurrences" in draft_data and draft_data["occurrences"]:
                logger.info(f"MBA-DEBUG: Found {len(draft_data['occurrences'])} occurrences in draft data")
                
                occurrences = draft_data["occurrences"]
                dates = []
                times = {}
                
                # Extract service type to determine if it's an overnight service
                is_overnight = False
                if "service_details" in draft_data:
                    service_data = draft_data["service_details"]
                    service_type = service_data.get("service_type", "")
                    
                    # Check if it's an overnight service
                    is_overnight = any(keyword in service_type.lower() for keyword in ["overnight", "boarding", "house sit"])
                    logger.info(f"MBA-DEBUG: Service type is '{service_type}', is_overnight: {is_overnight}")
                
                # Process occurrences into dates and times
                for occurrence in occurrences:
                    start_date = occurrence["start_date"]
                    end_date = occurrence["end_date"]
                    start_time = occurrence["start_time"]
                    end_time = occurrence["end_time"]
                    
                    logger.info(f"MBA-DEBUG: Processing occurrence: {start_date} - {end_date}, {start_time} - {end_time}")
                    
                    # Add to dates array
                    dates.append({
                        "date": start_date,
                        "startTime": start_time,
                        "endTime": end_time
                    })
                    
                    # Store time info
                    times[start_date] = {
                        "startTime": start_time,
                        "endTime": end_time
                    }
                
                # Determine if all dates are consecutive
                if len(dates) > 1:
                    # Sort dates by start_date
                    sorted_dates = sorted(dates, key=lambda x: x["date"])
                    
                    # Check if dates are consecutive
                    all_consecutive = True
                    for i in range(1, len(sorted_dates)):
                        prev_date = datetime.strptime(sorted_dates[i-1]["date"], "%Y-%m-%d").date()
                        curr_date = datetime.strptime(sorted_dates[i]["date"], "%Y-%m-%d").date()
                        
                        if (curr_date - prev_date).days != 1:
                            all_consecutive = False
                            break
                    
                    logger.info(f"MBA-DEBUG: All dates consecutive: {all_consecutive}")
                    
                    # Set date_range_type based on whether dates are consecutive
                    if all_consecutive:
                        response_data["date_range_type"] = "date-range"
                        
                        # Create date range
                        if len(sorted_dates) > 0:
                            response_data["date_range"] = {
                                "startDate": sorted_dates[0]["date"],
                                "endDate": sorted_dates[-1]["date"]
                            }
                    else:
                        response_data["date_range_type"] = "multiple-days"
                
                # For overnight services with a date range, set the hasIndividualTimes flag based on service type
                if is_overnight and response_data["date_range_type"] == "date-range":
                    times["hasIndividualTimes"] = False
                elif response_data["date_range_type"] == "multiple-days" or not is_overnight:
                    times["hasIndividualTimes"] = True
                
                # Set the response data
                response_data["dates"] = dates
                response_data["times"] = times
                
                # Add occurrence data
                response_data["occurrences"] = occurrences
                
                # Add cost summary if available
                if "cost_summary" in draft_data:
                    response_data["cost_summary"] = draft_data["cost_summary"]
                
                # If we have service details with is_overnight, use that
                if "service_details" in draft_data:
                    service_data = draft_data["service_details"]
                    service_type = service_data.get("service_type", "")
                    
                    # Add isOvernightForced to times
                    if not times.get("hasIndividualTimes", False):
                        times["isOvernightForced"] = is_overnight
                    
                    # Add service info to response
                    response_data["service"] = {
                        "service_id": service_data.get("service_id"),
                        "service_name": service_type,
                        "is_overnight": is_overnight
                    }
                
                logger.info(f"MBA-DEBUG: Final response data: {response_data}")
            else:
                logger.info(f"MBA-DEBUG: No occurrences found in draft data, returning empty data")
            
            logger.info(f"MBA-DEBUG: Returning successful response with status 200")
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Booking.DoesNotExist:
            logger.error(f"MBA-DEBUG: Booking associated with draft {draft_id} not found")
            return Response(
                {"error": "Booking associated with this draft not found."},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"MBA-DEBUG: Unhandled error in GetBookingDraftDatesAndTimesView: {e}")
            logger.error(f"MBA-DEBUG: Traceback: {traceback.format_exc()}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Placeholder: Ready for views to be added
