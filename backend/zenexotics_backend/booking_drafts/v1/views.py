from django.shortcuts import render
import logging
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
from core.booking_operations import (
    calculate_occurrence_rates, 
    create_occurrence_data, 
    calculate_cost_summary
)
import traceback
import pytz
from django.utils import timezone
from booking_drafts.serializers import OvernightBookingCalculationSerializer

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
                    'status_changed': draft.draft_data.get('status') != draft.booking.status if draft.booking else False
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

            # Calculate base rate and additional charges
            base_rate = Decimal(str(service.base_rate))
            additional_rate = Decimal(str(service.additional_animal_rate))
            holiday_rate = Decimal(str(service.holiday_rate))

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
                additional_pet_charges = additional_rate * additional_pets

            # Calculate total cost (base rate per night + additional pet charges per night)
            total_cost = (base_rate * nights) + additional_pet_charges

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
                    ('additional_animal_rate', str(additional_rate)),
                    ('applies_after', service.applies_after),
                    ('holiday_rate', str(holiday_rate)),
                    ('holiday_days', 0),
                    ('additional_rates', [])
                ]))
            ])

            # Calculate cost summary
            platform_fee = (total_cost * Decimal('0.10')).quantize(Decimal('0.01'))
            taxes = ((total_cost + platform_fee) * Decimal('0.08')).quantize(Decimal('0.01'))
            total_client_cost = total_cost + platform_fee + taxes
            total_sitter_payout = (total_cost * Decimal('0.90')).quantize(Decimal('0.01'))

            cost_summary = OrderedDict([
                ('subtotal', float(total_cost)),
                ('platform_fee', float(platform_fee)),
                ('taxes', float(taxes)),
                ('total_client_cost', float(total_client_cost)),
                ('total_sitter_payout', float(total_sitter_payout)),
                ('is_prorated', True)
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
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'nights': nights,
                    'total_cost': float(total_cost)
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

# Placeholder: Ready for views to be added
