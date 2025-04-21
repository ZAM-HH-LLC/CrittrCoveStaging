from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.pagination import PageNumberPagination
from django.db.models import Q
from django.shortcuts import get_object_or_404
from clients.models import Client
from professionals.models import Professional
from ..models import Booking
from ..serializers import BookingListSerializer, BookingDetailSerializer, BookingResponseSerializer
from rest_framework import generics
from booking_pets.models import BookingPets
from pets.models import Pet
from ..constants import BookingStates
import logging
from booking_drafts.models import BookingDraft
from services.models import Service
from conversations.models import Conversation
from django.db import transaction
from booking_occurrences.models import BookingOccurrence
from booking_details.models import BookingDetails
from booking_occurrence_rates.models import BookingOccurrenceRate
from service_rates.models import ServiceRate
from booking_summary.models import BookingSummary
from decimal import Decimal
from datetime import datetime, timedelta
from django.core.serializers.json import DjangoJSONEncoder
import json
from time import time as current_time  # Rename import to avoid confusion
from error_logs.models import ErrorLog
from interaction_logs.models import InteractionLog
from engagement_logs.models import EngagementLog
import traceback
import pytz
from core.time_utils import get_user_time_settings, format_booking_occurrence
from rest_framework.renderers import JSONRenderer
from collections import OrderedDict
from django.utils import timezone
from user_messages.models import UserMessage
from conversations.v1.views import find_or_create_conversation

logger = logging.getLogger(__name__)

class BookingPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def get_next_link(self):
        if not self.page.has_next():
            return None
        return f"/api/bookings/v1/?page={self.page.next_page_number()}"

class BookingListView(APIView):
    permission_classes = [IsAuthenticated]
    pagination_class = BookingPagination

    def get(self, request):
        user = request.user
        
        # Try to get client and professional profiles for the user
        try:
            client = Client.objects.get(user=user)
            is_client = True
        except Client.DoesNotExist:
            is_client = False
            client = None

        try:
            professional = Professional.objects.get(user=user)
            is_professional = True
        except Professional.DoesNotExist:
            is_professional = False
            professional = None

        # Get professional bookings
        professional_bookings = []
        if is_professional:
            prof_bookings = Booking.objects.filter(professional=professional).select_related(
                'client__user',
                'professional__user',
                'bookingsummary'
            ).prefetch_related(
                'occurrences',
                'drafts'  # Add prefetch for drafts
            ).order_by('-created_at')
            
            # Serialize bookings and check for drafts
            for booking in prof_bookings:
                booking_data = BookingListSerializer(booking).data
                # Check if there's a draft for this booking
                draft = booking.drafts.first()  # Using related_name from BookingDraft model
                if draft and draft.draft_data and 'status' in draft.draft_data:
                    booking_data['status'] = draft.draft_data['status']
                professional_bookings.append(booking_data)

        # Get client bookings
        client_bookings = []
        if is_client:
            cli_bookings = Booking.objects.filter(client=client).select_related(
                'client__user',
                'professional__user',
                'bookingsummary'
            ).prefetch_related(
                'occurrences'
            ).order_by('-created_at')
            client_bookings = BookingListSerializer(cli_bookings, many=True).data

        # Return response with separated bookings
        return Response({
            'bookings': {
                'professional_bookings': professional_bookings,
                'client_bookings': client_bookings
            },
            'next_page': None  # Since we're not paginating the separated lists
        })
    
class BookingUpdatePetsView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, booking_id):
        try:
            # Get the booking
            booking = get_object_or_404(Booking, booking_id=booking_id)
            
            # Check if user has permission to update this booking
            if not (request.user == booking.client.user or request.user == booking.professional.user):
                return Response(
                    {"error": "Not authorized to update this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the list of pet IDs from the request
            new_pet_ids = request.data.get('pets', [])
            if not isinstance(new_pet_ids, list):
                return Response(
                    {"error": "Invalid pets data format"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check if booking status allows edits
            if booking.status in [
                BookingStates.CANCELLED, 
                BookingStates.DENIED, 
                BookingStates.COMPLETED,
                BookingStates.PENDING_CLIENT_APPROVAL,
                BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL
            ]:
                return Response(
                    {"error": f"Cannot update pets when booking is in {BookingStates.get_display_state(booking.status)} status"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get current pets
            current_pet_ids = list(BookingPets.objects.filter(
                booking=booking
            ).values_list('pet_id', flat=True))

            # Sort both lists for comparison
            current_pet_ids.sort()
            new_pet_ids.sort()

            # If pets are the same, return current status
            if current_pet_ids == new_pet_ids:
                return Response({
                    "status": BookingStates.get_display_state(booking.status),
                    "message": "No changes in pets"
                })

            # Validate that all pets belong to the client
            client_pets = Pet.objects.filter(owner=booking.client.user)
            invalid_pets = [pid for pid in new_pet_ids if pid not in client_pets.values_list('pet_id', flat=True)]
            if invalid_pets:
                return Response(
                    {"error": f"Pets {invalid_pets} do not belong to the client"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update booking status based on current status
            if booking.status == BookingStates.CONFIRMED:
                booking.status = BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
            elif booking.status not in [
                BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES, 
                BookingStates.PENDING_PROFESSIONAL_CHANGES
            ]:
                booking.status = BookingStates.PENDING_PROFESSIONAL_CHANGES

            # Save the booking first to update its status
            booking.save()

            # Clear existing pets and add new ones
            BookingPets.objects.filter(booking=booking).delete()
            for pet_id in new_pet_ids:
                BookingPets.objects.create(
                    booking=booking,
                    pet_id=pet_id
                )

            return Response({
                "status": BookingStates.get_display_state(booking.status),
                "message": "Pets updated successfully"
            })

        except Exception as e:
            logger.error(f"Error updating pets for booking {booking_id}: {str(e)}")
            return Response(
                {"error": "Failed to update pets"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class AvailableServicesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        # Get the booking and verify professional access
        booking = get_object_or_404(Booking, booking_id=booking_id)
        professional = get_object_or_404(Professional, user=request.user)
        if booking.professional != professional:
            return Response({"error": "Not authorized"}, status=status.HTTP_403_FORBIDDEN)

        # Get all approved services for the professional
        services = Service.objects.filter(
            professional=professional,
            moderation_status='APPROVED'
        )

        # Format the response
        services_data = [
            {
                'service_id': service.service_id,
                'service_name': service.service_name,
                'description': service.description,
                'unit_of_time': service.unit_of_time,
                'is_overnight': service.is_overnight
            }
            for service in services
        ]

        return Response(services_data)

class CreateBookingView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        try:
            # Get the conversation
            conversation_id = request.data.get('conversation_id')
            if not conversation_id:
                return Response(
                    {"error": "conversation_id is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the conversation and validate access
            conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
            
            # Verify the requesting user is part of this conversation
            if request.user.id not in [conversation.participant1_id, conversation.participant2_id]:
                return Response(
                    {"error": "Not authorized to create booking for this conversation"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the professional (must be the requesting user)
            try:
                professional = Professional.objects.get(user=request.user)
            except Professional.DoesNotExist:
                return Response(
                    {"error": "Only professionals can create bookings"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the client (the other participant)
            other_user_id = conversation.participant1_id if conversation.participant1_id != request.user.id else conversation.participant2_id
            client = get_object_or_404(Client, user_id=other_user_id)

            # Delete any existing in-progress drafts between these users
            existing_drafts = BookingDraft.objects.filter(
                Q(booking=None) | Q(booking__client=client, booking__professional=professional),
                status='IN_PROGRESS',
                draft_data__has_key='client_id',
                draft_data__client_id=client.id,
                draft_data__professional_id=professional.professional_id
            )
            if existing_drafts.exists():
                logger.info(f"Deleting {existing_drafts.count()} existing drafts for client {client.id} and professional {professional.professional_id}")
                existing_drafts.delete()

            # Create initial draft data
            draft_data = {
                'client_id': client.id,
                'professional_id': professional.professional_id,
                'client_name': client.user.name,
                'professional_name': professional.user.name,
                'status': BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                'pets': [],
                'occurrences': [],
                'can_edit': True,
                'conversation_id': conversation_id  # Add conversation_id to draft data
            }

            # Create the draft
            draft = BookingDraft.objects.create(
                draft_data=draft_data,
                last_modified_by='PROFESSIONAL',
                status='IN_PROGRESS'
            )

            logger.info(f"Created new draft {draft.draft_id} for client {client.id} and professional {professional.professional_id}")

            return Response({
                'draft_id': draft.draft_id,
                'status': draft.status,
                'draft_data': draft.draft_data
            })

        except Exception as e:
            logger.error(f"Error creating booking draft: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return Response(
                {"error": "An error occurred while creating the booking draft"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RequestBookingView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        request_start_time = current_time()  # Rename to avoid conflict with occurrence start_time
        sid = transaction.savepoint()
        
        try:
            # Get request data
            conversation_id = request.data.get('conversation_id')
            service_id = request.data.get('service_type')
            pet_ids = request.data.get('pets', [])
            occurrences = request.data.get('occurrences', [])

            # Validate required fields
            if not all([conversation_id, service_id, pet_ids, occurrences]):
                ErrorLog.objects.create(
                    user=request.user,
                    error_message='Missing required fields',
                    endpoint='/api/bookings/v1/request_booking/',
                    metadata={'request_data': request.data}
                )
                return Response(
                    {"error": "Missing required fields"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the conversation and validate access
            try:
                conversation = Conversation.objects.get(conversation_id=conversation_id)
                if request.user.id not in [conversation.participant1_id, conversation.participant2_id]:
                    ErrorLog.objects.create(
                        user=request.user,
                        error_type='AUTHORIZATION_ERROR',
                        error_message='Not authorized to create booking for this conversation',
                        endpoint='/api/bookings/v1/request_booking/',
                        additional_data={'conversation_id': conversation_id}
                    )
                    return Response(
                        {"error": "Not authorized to create booking for this conversation"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Conversation.DoesNotExist:
                ErrorLog.objects.create(
                    user=request.user,
                    error_type='NOT_FOUND',
                    error_message='Conversation not found',
                    endpoint='/api/bookings/v1/request_booking/',
                    additional_data={'conversation_id': conversation_id}
                )
                return Response(
                    {"error": "Conversation not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get the client (must be the requesting user)
            try:
                client = Client.objects.get(user=request.user)
            except Client.DoesNotExist:
                ErrorLog.objects.create(
                    user=request.user,
                    error_type='AUTHORIZATION_ERROR',
                    error_message='Only clients can request bookings',
                    endpoint='/api/bookings/v1/request_booking/'
                )
                return Response(
                    {"error": "Only clients can request bookings"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the professional (the other participant)
            other_user_id = conversation.participant1_id if conversation.participant1_id != request.user.id else conversation.participant2_id
            try:
                professional = Professional.objects.get(user_id=other_user_id)
            except Professional.DoesNotExist:
                ErrorLog.objects.create(
                    user=request.user,
                    error_type='NOT_FOUND',
                    error_message='Professional not found',
                    endpoint='/api/bookings/v1/request_booking/',
                    additional_data={'professional_id': other_user_id}
                )
                return Response(
                    {"error": "Professional not found"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Get and validate the service belongs to the professional
            try:
                service = Service.objects.get(service_id=service_id, professional=professional)
            except Service.DoesNotExist:
                ErrorLog.objects.create(
                    user=request.user,
                    error_type='NOT_FOUND',
                    error_message='Service not found or does not belong to the professional',
                    endpoint='/api/bookings/v1/request_booking/',
                    additional_data={'service_id': service_id, 'professional_id': professional.id}
                )
                return Response(
                    {"error": "Service not found or does not belong to the professional"},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Create the booking
            booking = Booking.objects.create(
                client=client,
                professional=professional,
                service_id=service,
                status=BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                initiated_by=request.user
            )

            # Log the booking creation with comprehensive metadata
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_REQUEST_CREATED',
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'service_id': service_id,
                    'professional_id': professional.professional_id,
                    'pets': [{
                        'pet_id': pet_id,
                        'pet_name': Pet.objects.get(pet_id=pet_id, owner=client.user).name
                    } for pet_id in pet_ids],
                    'occurrences': occurrences,
                    'booking_summary': {
                        'fee_percentage': '10.00',
                        'tax_percentage': '8.00'
                    }
                }
            )

            # Create booking pets entries
            for pet_id in pet_ids:
                try:
                    pet = Pet.objects.get(pet_id=pet_id, owner=client.user)
                    BookingPets.objects.create(
                        booking=booking,
                        pet=pet
                    )
                except Pet.DoesNotExist:
                    ErrorLog.objects.create(
                        user=request.user,
                        error_message=f'Pet with ID {pet_id} not found or does not belong to you',
                        endpoint='/api/bookings/v1/request_booking/',
                        metadata={'pet_id': pet_id}
                    )
                    transaction.savepoint_rollback(sid)
                    return Response(
                        {"error": f"Pet with ID {pet_id} not found or does not belong to you"},
                        status=status.HTTP_404_NOT_FOUND
                    )

            # Create booking occurrences
            for occurrence_data in occurrences:
                try:
                    # Parse the date and time strings
                    start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date()
                    end_date = datetime.strptime(occurrence_data.get('end_date', occurrence_data['start_date']), '%Y-%m-%d').date()
                    start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time()
                    end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time()
                    
                    # Get the user's timezone settings
                    user_settings = get_user_time_settings(request.user.id)
                    user_tz = pytz.timezone(user_settings['timezone'])
                    
                    # Combine into datetime objects in user's timezone
                    start_dt = datetime.combine(start_date, start_time)
                    end_dt = datetime.combine(end_date, end_time)
                    
                    # Make the datetime objects timezone-aware in user's timezone
                    start_dt = user_tz.localize(start_dt)
                    end_dt = user_tz.localize(end_dt)
                    
                    # Convert to UTC
                    start_dt_utc = start_dt.astimezone(pytz.UTC)
                    end_dt_utc = end_dt.astimezone(pytz.UTC)
                    
                    occurrence = BookingOccurrence.objects.create(
                        booking=booking,
                        start_date=start_dt_utc.date(),
                        end_date=end_dt_utc.date(),
                        start_time=start_dt_utc.time(),
                        end_time=end_dt_utc.time(),
                        created_by='CLIENT',
                        last_modified_by='CLIENT',
                        status='PENDING'
                    )
                except (ValueError, KeyError) as e:
                    ErrorLog.objects.create(
                        user=request.user,
                        error_message=f'Invalid occurrence data: {str(e)}',
                        endpoint='/api/bookings/v1/request_booking/',
                        metadata={'occurrence_data': occurrence_data}
                    )
                    transaction.savepoint_rollback(sid)
                    return Response(
                        {"error": f"Invalid occurrence data: {str(e)}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )

            # Create/update booking summary
            try:
                booking_summary, created = BookingSummary.objects.get_or_create(
                    booking=booking,
                    defaults={
                        'fee_percentage': Decimal('10.00'),
                        'tax_percentage': Decimal('8.00')
                    }
                )
                
                if not created:
                    booking_summary.fee_percentage = Decimal('10.00')
                    booking_summary.tax_percentage = Decimal('8.00')
                    booking_summary.save()
                
            except Exception as e:
                ErrorLog.objects.create(
                    user=request.user,
                    error_message=f'Error creating/updating booking summary: {str(e)}',
                    endpoint='/api/bookings/v1/request_booking/',
                    metadata={'booking_id': booking.booking_id}
                )
                transaction.savepoint_rollback(sid)
                return Response(
                    {"error": "Failed to create/update booking summary"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR
                )

            # Log successful completion
            duration = current_time() - request_start_time
            EngagementLog.objects.create(
                user=request.user,
                page_name='BOOKING_REQUEST',
                duration=int(duration),
                interactions={
                    'booking_id': booking.booking_id,
                    'service_id': service_id,
                    'num_pets': len(pet_ids),
                    'num_occurrences': len(occurrences),
                    'success': True
                }
            )

            transaction.savepoint_commit(sid)
            return Response({
                'booking_id': booking.booking_id,
                'status': booking.status
            })

        except Exception as e:
            transaction.savepoint_rollback(sid)
            
            # Log the error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint='/api/bookings/v1/request_booking/',
                metadata={'request_data': request.data}
            )
            
            # Log failed engagement
            duration = current_time() - request_start_time
            EngagementLog.objects.create(
                user=request.user,
                page_name='BOOKING_REQUEST',
                duration=int(duration),
                interactions={
                    'error_type': type(e).__name__,
                    'error_message': str(e),
                    'success': False
                }
            )
            
            return Response(
                {"error": "Failed to create booking request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateBookingServiceTypeView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request):
        try:
            booking_id = request.data.get('booking_id')
            service_id = request.data.get('service_id')

            # Get the booking
            booking = get_object_or_404(Booking, booking_id=booking_id)

            # Verify user is the professional and booking is in correct state
            if not (request.user == booking.professional.user and 
                   booking.status == BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES):
                return Response(
                    {"error": "Not authorized or invalid booking state"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the service
            service = get_object_or_404(Service, service_id=service_id)

            # Update the service
            booking.service_id = service
            booking.save()

            # Return updated service details
            service_data = {
                'service_id': service.service_id,
                'service_type': service.service_name,
                'description': service.description
            }

            return Response({
                'status': 'success',
                'message': 'Service type updated successfully',
                'service_details': service_data
            })

        except Exception as e:
            logger.error(f"Error updating booking service type: {str(e)}")
            return Response(
                {"error": "Failed to update service type"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

def calculate_cost(base_rate, additional_animal_rate, applies_after, holiday_rate, unit_of_time, num_pets, start_dt, end_dt, additional_rates=None):
    """
    Calculate the cost for an occurrence without using model instances.
    All rate parameters should be Decimal objects.
    start_dt and end_dt should be timezone-aware datetime objects.
    """
    from core.constants import UnitOfTime
    logger.info(f"MBA7777 Starting cost calculation with params: base_rate={base_rate}, unit_of_time={unit_of_time}, num_pets={num_pets}, applies_after={applies_after}")

    # Calculate duration in hours
    duration_hours = (end_dt - start_dt).total_seconds() / 3600
    logger.info(f"MBA7777 Duration in hours: {duration_hours}")

    # Get the unit multiplier based on unit_of_time
    unit_mapping = {
        UnitOfTime.FIFTEEN_MINUTES: 0.25,
        UnitOfTime.THIRTY_MINUTES: 0.5,
        UnitOfTime.FORTY_FIVE_MINUTES: 0.75,
        UnitOfTime.ONE_HOUR: 1,
        UnitOfTime.TWO_HOURS: 2,
        UnitOfTime.THREE_HOURS: 3,
        UnitOfTime.FOUR_HOURS: 4,
        UnitOfTime.FIVE_HOURS: 5,
        UnitOfTime.SIX_HOURS: 6,
        UnitOfTime.SEVEN_HOURS: 7,
        UnitOfTime.EIGHT_HOURS: 8,
        UnitOfTime.TWENTY_FOUR_HOURS: 24,
        UnitOfTime.PER_DAY: 24,
        UnitOfTime.PER_VISIT: None,  # Special case - no proration
        UnitOfTime.WEEK: 168  # 24 * 7
    }

    unit_hours = unit_mapping.get(unit_of_time)
    logger.info(f"MBA7777 Unit hours for {unit_of_time}: {unit_hours}")
    
    # Calculate base cost
    if unit_hours is None:  # PER_VISIT case
        multiplier = Decimal('1')
        base_total = base_rate
    else:
        # Calculate how many units are needed
        multiplier = Decimal(str(duration_hours / unit_hours)).quantize(Decimal('0.00001'))
        base_total = base_rate * multiplier

    logger.info(f"MBA7777 Calculated multiplier: {multiplier}")
    logger.info(f"MBA7777 Base total: {base_total}")

    # Calculate additional animal cost
    additional_animal_rate_total = Decimal('0')
    if num_pets > applies_after:
        additional_pets = num_pets - applies_after
        additional_animal_rate_total = additional_animal_rate * additional_pets * multiplier
    logger.info(f"MBA7777 Additional animal rate total: {additional_animal_rate_total}")

    # Add holiday rate if applicable (currently not implemented)
    holiday_rate_total = Decimal('0')
    logger.info(f"MBA7777 Holiday rate total: {holiday_rate_total}")

    # Calculate additional rates total
    additional_rates_total = Decimal('0')
    if additional_rates:
        additional_rates_total = sum(Decimal(str(rate['amount'])) for rate in additional_rates)
    logger.info(f"MBA7777 Additional rates total: {additional_rates_total}")

    # Calculate total
    total_cost = base_total + additional_animal_rate_total + holiday_rate_total + additional_rates_total
    logger.info(f"MBA7777 Final total cost: {total_cost}")

    return {
        'base_total': base_total,
        'multiplier': multiplier,
        'additional_animal_rate_total': additional_animal_rate_total,
        'holiday_rate_total': holiday_rate_total,
        'additional_rates_total': additional_rates_total,
        'total_cost': total_cost
    }

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

            # Calculate cost for 1 hour
            now = datetime.now(pytz.UTC)
            one_hour_later = now + timedelta(hours=1)

            # Get additional rates
            additional_rates = [
                OrderedDict([
                    ('title', rate.title),
                    ('description', rate.description or ''),
                    ('amount', str(rate.rate))
                ]) for rate in service.additional_rates.all()
            ]

            # Calculate costs
            costs = calculate_cost(
                base_rate=service.base_rate,
                additional_animal_rate=service.additional_animal_rate,
                applies_after=service.applies_after,
                holiday_rate=service.holiday_rate,
                unit_of_time=service.unit_of_time,
                num_pets=booking.booking_pets.count(),
                start_dt=now,
                end_dt=one_hour_later,
                additional_rates=additional_rates
            )

            # Format service rates
            rates_data = OrderedDict([
                ('base_rate', str(service.base_rate)),
                ('additional_animal_rate', str(service.additional_animal_rate)),
                ('applies_after', service.applies_after),
                ('holiday_rate', str(service.holiday_rate)),
                ('unit_of_time', service.unit_of_time),
                ('additional_rates', additional_rates),
                ('calculated_cost', str(costs['total_cost']))
            ])

            logger.info(f"MBA9999 - Returning rates data: {rates_data}")

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

class CalculateOccurrenceCostView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            # Get the booking and verify access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            if not (request.user == booking.client.user or request.user == booking.professional.user):
                return Response(
                    {"error": "Not authorized to access this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get occurrence data from request
            occurrence_data = request.data
            if not occurrence_data:
                return Response(
                    {"error": "No occurrence data provided"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get user's timezone settings
            user_settings = get_user_time_settings(request.user.id)
            user_tz = pytz.timezone(user_settings['timezone'])

            # Convert times to UTC for calculation
            start_dt = datetime.strptime(
                f"{occurrence_data['start_date']} {occurrence_data['start_time']}", 
                '%Y-%m-%d %H:%M'
            )
            end_dt = datetime.strptime(
                f"{occurrence_data['end_date']} {occurrence_data['end_time']}", 
                '%Y-%m-%d %H:%M'
            )

            # Make datetime objects timezone-aware in user's timezone
            start_dt = user_tz.localize(start_dt)
            end_dt = user_tz.localize(end_dt)

            # Convert to UTC
            start_dt_utc = start_dt.astimezone(pytz.UTC)
            end_dt_utc = end_dt.astimezone(pytz.UTC)

            # Calculate costs
            costs = calculate_cost(
                base_rate=Decimal(str(occurrence_data['rates']['base_rate'])),
                additional_animal_rate=Decimal(str(occurrence_data['rates']['additional_animal_rate'])),
                applies_after=int(occurrence_data['rates']['applies_after']),
                holiday_rate=Decimal(str(occurrence_data['rates']['holiday_rate'])),
                unit_of_time=occurrence_data['rates']['unit_of_time'],
                num_pets=booking.booking_pets.count(),
                start_dt=start_dt_utc,
                end_dt=end_dt_utc,
                additional_rates=occurrence_data['rates'].get('additional_rates', [])
            )

            # Format times back to user's timezone
            formatted_times = format_booking_occurrence(
                start_dt_utc,
                end_dt_utc,
                request.user.id
            )

            logger.info(f"MBA9999 - Calculated costs: {costs}")

            return Response({
                'status': 'success',
                'calculated_cost': str(costs['total_cost']),
                'base_total': str(costs['base_total']),
                'additional_rates_total': str(costs['additional_rates_total']),
                'formatted_times': formatted_times
            })

        except Exception as e:
            logger.error(f"Error calculating occurrence cost: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return Response(
                {"error": "Failed to calculate occurrence cost"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class UpdateBookingView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        """
        Update a booking with draft data and send approval message to client.
        This endpoint:
        1. Validates professional access
        2. Gets draft data
        3. Updates booking pets
        4. Updates service type
        5. Updates/creates occurrences
        6. Sends approval message
        7. Deletes draft
        8. Returns simple success response
        """
        logger.info(f"MBA976asd2n2h5 Starting UpdateBookingView.post for booking {booking_id}")
        sid = transaction.savepoint()  # Create savepoint for rollback
        request_start_time = current_time()

        try:
            # Get the booking and verify professional access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            professional = get_object_or_404(Professional, user=request.user)
            
            if booking.professional != professional:
                logger.error(f"MBA976asd2n2h5 Unauthorized access attempt by {request.user.email}")
                return Response(
                    {"error": "Not authorized to update this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get draft data
            draft = BookingDraft.objects.filter(
                booking=booking,
                status='IN_PROGRESS'
            ).first()
            draft_data = draft.draft_data if draft else None

            # Initialize cost_summary data and occurrences list
            cost_summary = {}
            occurrences = []

            if draft_data:
                # Use draft data for cost summary and occurrences
                cost_summary = {
                    'total_client_cost': draft_data.get('cost_summary', {}).get('total_client_cost'),
                    'total_sitter_payout': draft_data.get('cost_summary', {}).get('total_sitter_payout')
                }
                occurrences = draft_data.get('occurrences', [])

                # Process draft data updates (existing code for updating service, pets, occurrences)
                if 'service_details' in draft_data:
                    service = get_object_or_404(
                        Service,
                        service_id=draft_data['service_details']['service_id'],
                        professional=professional,
                        moderation_status='APPROVED'
                    )
                    booking.service_id = service
                    booking.save()
                    logger.info(f"MBA976asd2n2h5 Updated service to {service.service_name}")

                # Update booking pets
                # First delete existing pets
                BookingPets.objects.filter(booking=booking).delete()
                
                # Then add new pets
                for pet_data in draft_data.get('pets', []):
                    pet = get_object_or_404(Pet, pet_id=pet_data['pet_id'])
                    BookingPets.objects.create(booking=booking, pet=pet)
                logger.info(f"MBA976asd2n2h5 Updated booking pets: {draft_data.get('pets', [])}")

                # Process occurrences
                for occurrence_data in draft_data.get('occurrences', []):
                    occurrence_id = occurrence_data.get('occurrence_id')
                    
                    logger.info(f"MBA7654 Processing occurrence data: {occurrence_data}")
                    
                    try:
                        # Parse times directly from draft data (already in UTC and military time)
                        # Store exactly as received - no timezone conversion needed
                        start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date()
                        end_date = datetime.strptime(occurrence_data['end_date'], '%Y-%m-%d').date()
                        start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time()
                        end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time()

                        logger.info(f"MBA7654 Using exact draft times - Start: {start_date} {start_time}, End: {end_date} {end_time}")

                        # Get or create occurrence
                        if isinstance(occurrence_id, str) and occurrence_id.startswith('draft_'):
                            # Create new occurrence - store exactly as is since times are already UTC
                            occurrence = BookingOccurrence.objects.create(
                                booking=booking,
                                start_date=start_date,
                                end_date=end_date,
                                start_time=start_time,
                                end_time=end_time,
                                created_by='PROFESSIONAL',
                                last_modified_by='PROFESSIONAL',
                                status='PENDING'
                            )
                            logger.info(f"MBA7654 Created new occurrence with exact draft times - Start: {occurrence.start_date} {occurrence.start_time}, End: {occurrence.end_date} {occurrence.end_time}")
                        else:
                            # Update existing occurrence - store exactly as is since times are already UTC
                            occurrence = get_object_or_404(
                                BookingOccurrence,
                                occurrence_id=occurrence_id,
                                booking=booking
                            )
                            occurrence.start_date = start_date
                            occurrence.end_date = end_date
                            occurrence.start_time = start_time
                            occurrence.end_time = end_time
                            occurrence.last_modified_by = 'PROFESSIONAL'
                            occurrence.save()
                            logger.info(f"MBA7654 Updated existing occurrence with exact draft times - Start: {occurrence.start_date} {occurrence.start_time}, End: {occurrence.end_date} {occurrence.end_time}")
                    except Exception as e:
                        logger.error(f"MBA7654 Error processing occurrence: {str(e)}")
                        logger.error(f"MBA7654 Full traceback: {traceback.format_exc()}")
                        raise

            else:
                # Get cost summary from BookingSummary table
                booking_summary = BookingSummary.objects.filter(booking=booking).first()
                if booking_summary:
                    cost_summary = {
                        'total_client_cost': str(booking_summary.total_client_cost),
                        'total_sitter_payout': str(booking_summary.total_sitter_payout)
                    }
                
                # Get occurrences from database tables
                booking_occurrences = BookingOccurrence.objects.filter(booking=booking)
                occurrences = []
                
                for occurrence in booking_occurrences:
                    # Get the booking details and rates separately
                    booking_details = BookingDetails.objects.filter(booking_occurrence=occurrence).first()
                    occurrence_rates = BookingOccurrenceRate.objects.filter(occurrence=occurrence).first()
                    
                    # Safely access the rates field
                    additional_rates = []
                    if occurrence_rates:
                        try:
                            additional_rates = occurrence_rates.rates
                        except Exception as e:
                            logger.error(f"Error accessing rates for occurrence {occurrence.occurrence_id}: {str(e)}")
                    
                    # Combine date and time for timezone conversion
                    start_dt = datetime.combine(occurrence.start_date, occurrence.start_time).replace(tzinfo=pytz.UTC)
                    end_dt = datetime.combine(occurrence.end_date, occurrence.end_time).replace(tzinfo=pytz.UTC)
                    
                    # Convert to user's timezone
                    start_dt_local = start_dt.astimezone(user_tz)
                    end_dt_local = end_dt.astimezone(user_tz)
                    
                    # Format the occurrence data
                    occurrence_data = {
                        'occurrence_id': occurrence.occurrence_id,
                        'start_date': occurrence.start_date.strftime('%Y-%m-%d'),
                        'end_date': occurrence.end_date.strftime('%Y-%m-%d'),
                        'start_time': occurrence.start_time.strftime('%H:%M'),
                        'end_time': occurrence.end_time.strftime('%H:%M'),
                        'status': occurrence.status,
                        'calculated_cost': str(occurrence.calculated_cost),
                        'formatted_times': format_booking_occurrence(start_dt, end_dt, request.user.id),
                        'rates': {
                            'base_rate': str(booking_details.base_rate) if booking_details else '0.00',
                            'additional_animal_rate': str(booking_details.additional_pet_rate) if booking_details else '0.00',
                            'applies_after': booking_details.applies_after if booking_details else 1,
                            'holiday_rate': str(booking_details.holiday_rate) if booking_details else '0.00',
                            'unit_of_time': booking_details.unit_of_time if booking_details else 'Per Visit',
                            'additional_rates': additional_rates
                        }
                    }
                    occurrences.append(occurrence_data)

            # Send approval message to client
            conversation = Conversation.objects.filter(
                Q(participant1=booking.client.user, participant2=booking.professional.user) |
                Q(participant1=booking.professional.user, participant2=booking.client.user)
            ).first()

            if not conversation:
                conversation = Conversation.objects.create(
                    participant1=booking.professional.user,
                    participant2=booking.client.user
                )

            message = UserMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                content='Approval Request',
                type_of_message='send_approved_message',
                is_clickable=True,
                status='sent',
                booking=booking,
                metadata={
                    'booking_id': booking.booking_id,
                    'service_type': booking.service_id.service_name,
                    'occurrences': occurrences,
                    'cost_summary': cost_summary
                }
            )

            # Update conversation's last message and time
            conversation.last_message = "Approval Request"
            conversation.last_message_time = timezone.now()
            conversation.save()

            # Update booking status to PENDING_CLIENT_APPROVAL
            booking.status = BookingStates.PENDING_CLIENT_APPROVAL
            booking.save()
            logger.info(f"MBA976asd2n2h5 Updated booking status to {booking.status}")

            # Delete the draft if it exists
            if draft:
                draft.delete()
                logger.info(f"MBA976asd2n2h5 Deleted draft {draft.draft_id}")

            # Log successful interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_UPDATE_SENT',
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'service_type': booking.service_id.service_name,
                    'occurrences': occurrences,
                    'cost_summary': cost_summary
                }
            )

            # Log engagement
            duration = current_time() - request_start_time
            EngagementLog.objects.create(
                user=request.user,
                page_name='BOOKING_DETAILS',
                duration=int(duration),
                interactions={
                    'action': 'SEND_TO_CLIENT',
                    'booking_id': booking.booking_id,
                    'success': True
                }
            )

            # Commit the transaction
            transaction.savepoint_commit(sid)

            # Return simplified success response
            return Response({
                'status': 'success',
                'message': 'Approval Request sent to client',
                'message_id': message.message_id,
                'conversation_id': conversation.conversation_id
            })

        except Exception as e:
            logger.error(f"MBA976asd2n2h5 Error updating booking: {str(e)}")
            logger.error(f"MBA976asd2n2h5 Full traceback: {traceback.format_exc()}")

            # Log error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint='/api/bookings/v1/update/',
                metadata={
                    'booking_id': booking_id,
                    'draft_data': draft_data if 'draft_data' in locals() else None
                }
            )

            # Log failed engagement
            if 'request_start_time' in locals():
                duration = current_time() - request_start_time
                EngagementLog.objects.create(
                    user=request.user,
                    page_name='BOOKING_DETAILS',
                    duration=int(duration),
                    interactions={
                        'action': 'SEND_TO_CLIENT',
                        'booking_id': booking_id,
                        'error_type': type(e).__name__,
                        'error_message': str(e),
                        'success': False
                    }
                )

            return Response(
                {"error": f"An error occurred while updating the booking: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ApproveBookingView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, booking_id):
        try:
            # Get the booking and verify client access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            client = get_object_or_404(Client, user=request.user)

            # Verify this is the client's booking
            if booking.client != client:
                return Response(
                    {"error": "Not authorized to approve this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Verify booking is in correct state
            valid_states = [
                BookingStates.PENDING_CLIENT_APPROVAL,
                BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL
            ]
            if booking.status not in valid_states:
                return Response(
                    {"error": f"Cannot approve booking in {BookingStates.get_display_state(booking.status)} state"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update booking status to CONFIRMED
            booking.status = BookingStates.CONFIRMED
            booking.save()

            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_APPROVED',
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'previous_status': valid_states[0] if booking.status == valid_states[0] else valid_states[1],
                    'new_status': BookingStates.CONFIRMED
                }
            )

            return Response({
                'status': BookingStates.get_display_state(booking.status),
                'message': 'Booking approved successfully'
            })

        except Exception as e:
            logger.error(f"Error approving booking: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            # Log the error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint=f'/api/bookings/v1/{booking_id}/approve/',
                metadata={'booking_id': booking_id}
            )
            
            return Response(
                {"error": "Failed to approve booking"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class RequestBookingChangesView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        """
        Create a change request message for a booking.
        
        This endpoint:
        1. Validates user access to the booking
        2. Gets or creates a conversation between the client and professional
        3. Creates a message with the requested changes
        4. Updates the booking status if needed
        5. Returns success response with message details
        """
        logger.info(f"MBA88899 Starting RequestBookingChangesView.post for booking {booking_id}")
        sid = transaction.savepoint()  # Create savepoint for rollback
        
        try:
            # Get the booking and verify access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            
            # Check if user has permission to view this booking
            if not (request.user == booking.client.user or request.user == booking.professional.user):
                return Response(
                    {"error": "Not authorized to request changes for this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get the change request message from the request
            message_text = request.data.get('message')
            if not message_text or not message_text.strip():
                return Response(
                    {"error": "Change request message cannot be empty"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"MBA88899 Change request message: {message_text}")
            
            # Determine if user is client or professional
            is_client = request.user == booking.client.user
            user_role = 'client' if is_client else 'professional'
            other_user = booking.professional.user if is_client else booking.client.user
            
            # Find or create a conversation between these users
            conversation, is_professional = find_or_create_conversation(
                request.user, 
                other_user, 
                user_role
            )
            
            logger.info(f"MBA88899 Using conversation {conversation.conversation_id}")
            
            # Create a message with change request type
            change_request_message = UserMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                content=message_text,
                type_of_message='request_changes',
                is_clickable=True,
                status='sent',
                booking=booking,
                metadata={
                    'booking_id': booking.booking_id,
                    'service_type': booking.service_id.service_name,
                    'requested_by': user_role,
                    'timestamp': timezone.now().isoformat(),
                    'cost_summary': {
                        'total_client_cost': str(booking.bookingsummary.total_client_cost) if hasattr(booking, 'bookingsummary') else '0.00',
                        'total_sitter_payout': str(booking.bookingsummary.total_sitter_payout) if hasattr(booking, 'bookingsummary') else '0.00'
                    }
                }
            )
            
            logger.info(f"MBA88899 Created message {change_request_message.message_id}")
            
            # Update booking status based on who is requesting changes
            previous_status = booking.status
            
            if is_client:
                # Client requesting changes from the professional
                if booking.status in [BookingStates.PENDING_CLIENT_APPROVAL, BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL]:
                    # Client is responding to professional's proposal with requested changes
                    booking.status = BookingStates.PENDING_PROFESSIONAL_CHANGES
                    booking.save()
                # If already confirmed, don't change status - will be handled by professional
            else:
                # Professional requesting changes from the client
                if booking.status in [BookingStates.CONFIRMED, BookingStates.PENDING_PROFESSIONAL_CHANGES]:
                    # Professional is requesting changes to a confirmed booking
                    booking.status = BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL
                    booking.save()
            
            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_CHANGE_REQUESTED',
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'previous_status': previous_status,
                    'new_status': booking.status,
                    'message': message_text,
                    'requested_by': user_role
                }
            )
            
            # Commit the transaction
            transaction.savepoint_commit(sid)
            
            return Response({
                'status': 'success',
                'message': 'Change request submitted successfully',
                'message_id': change_request_message.message_id,
                'conversation_id': conversation.conversation_id,
                'booking_status': BookingStates.get_display_state(booking.status)
            })
            
        except Exception as e:
            transaction.savepoint_rollback(sid)
            logger.error(f"MBA88899 Error requesting booking changes: {str(e)}")
            logger.error(f"MBA88899 Full traceback: {traceback.format_exc()}")
            
            # Log the error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint=f'/api/bookings/v1/{booking_id}/request-changes/',
                metadata={'booking_id': booking_id}
            )
            
            return Response(
                {"error": "An error occurred while requesting booking changes"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class CreateFromDraftView(APIView):
    permission_classes = [IsAuthenticated]
    
    @transaction.atomic
    def post(self, request):
        """
        Create a booking from a draft.
        
        This endpoint:
        1. Validates the professional is the one in the conversation
        2. Creates a new booking with data from the draft
        3. Creates booking occurrences, details, and rates
        4. Creates booking pets entries
        5. Creates a booking summary
        6. Logs the interaction
        7. Creates a message for the client
        8. Deletes the draft
        """
        logger.info("MBA66777 Starting CreateFromDraftView.post")
        sid = transaction.savepoint()  # Create savepoint for rollback
        
        try:
            # Extract conversation_id from request data
            conversation_id = request.data.get('conversation_id')
            if not conversation_id:
                return Response(
                    {"error": "Conversation ID is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get conversation and verify professional access
            conversation = get_object_or_404(Conversation, conversation_id=conversation_id)
            if not (request.user == conversation.participant1 or request.user == conversation.participant2):
                return Response(
                    {"error": "Not authorized to access this conversation"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Determine if user is professional
            try:
                professional = Professional.objects.get(user=request.user)
            except Professional.DoesNotExist:
                return Response(
                    {"error": "Only professionals can create bookings from drafts"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Get draft from conversation
            draft = BookingDraft.objects.filter(
                draft_data__conversation_id=conversation_id,
                status='IN_PROGRESS'
            ).first()
            
            if not draft:
                return Response(
                    {"error": "No draft found for this conversation"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            draft_data = draft.draft_data
            logger.info(f"MBA66777 Draft data: {draft_data}")
            
            # Get client from draft data
            client_id = draft_data.get('client_id')
            if not client_id:
                return Response(
                    {"error": "Client ID not found in draft data"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            client = get_object_or_404(Client, id=client_id)
            
            # Get service from draft data
            service_details = draft_data.get('service_details', {})
            service_id = service_details.get('service_id')
            if not service_id:
                return Response(
                    {"error": "Service ID not found in draft data"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            service = get_object_or_404(Service, service_id=service_id)
            
            # Create booking with status "Pending Client Approval"
            booking = Booking.objects.create(
                client=client,
                professional=professional,
                service_id=service,
                status=BookingStates.PENDING_CLIENT_APPROVAL,
                initiated_by=professional.user,
                last_modified_by=professional.user
            )
            logger.info(f"MBA66777 Created booking {booking.booking_id}")
            
            # Add pets to booking
            pet_count = 0
            for pet_data in draft_data.get('pets', []):
                pet_id = pet_data.get('pet_id')
                if pet_id:
                    pet = get_object_or_404(Pet, pet_id=pet_id)
                    BookingPets.objects.create(booking=booking, pet=pet)
                    pet_count += 1
            
            logger.info(f"MBA66777 Added {pet_count} pets to booking {booking.booking_id}")
            
            # Process occurrences
            occurrences = []
            for occurrence_data in draft_data.get('occurrences', []):
                # Parse dates and times
                start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date()
                end_date = datetime.strptime(occurrence_data['end_date'], '%Y-%m-%d').date()
                start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time()
                end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time()
                
                # Create occurrence
                occurrence = BookingOccurrence.objects.create(
                    booking=booking,
                    start_date=start_date,
                    end_date=end_date,
                    start_time=start_time,
                    end_time=end_time,
                    created_by='PROFESSIONAL',
                    last_modified_by='PROFESSIONAL',
                    status='PENDING',
                    calculated_cost=Decimal(str(occurrence_data.get('calculated_cost', 0)))
                )
                
                logger.info(f"MBA66777 Created occurrence {occurrence.occurrence_id} for booking {booking.booking_id}")
                
                # Get or create booking details
                unit_of_time = occurrence_data.get('unit_of_time', 'Per Visit')
                logger.info(f"MBA66777 Unit of time: {unit_of_time}")
                multiple = occurrence_data.get('multiple', 1)
                logger.info(f"MBA66777 Multiple: {multiple}")
                rates = occurrence_data.get('rates', {})
                logger.info(f"MBA66777 Rates: {rates}")
                
                # BookingDetails is created by signal, so let's update it
                booking_details = BookingDetails.objects.filter(booking_occurrence=occurrence).first()
                if booking_details:
                    booking_details.num_pets = pet_count
                    booking_details.base_rate = Decimal(str(rates.get('base_rate', 0)))
                    booking_details.additional_pet_rate = Decimal(str(rates.get('additional_animal_rate', 0)))
                    booking_details.applies_after = int(rates.get('applies_after', 1))
                    booking_details.holiday_rate = Decimal(str(rates.get('holiday_rate', 0)))
                    booking_details.unit_of_time = unit_of_time
                    booking_details.multiple = Decimal(str(multiple))
                    booking_details.nights = int(draft_data.get('nights', 0))
                    booking_details.save()
                    
                    # Force update the calculated rate based on the supplied multiple
                    base_rate = booking_details.base_rate
                    calculated_rate = base_rate * Decimal(str(multiple))
                    
                    # Add additional pet costs if applicable
                    if booking_details.additional_pet_rate and pet_count > booking_details.applies_after:
                        additional_pets = pet_count - booking_details.applies_after
                        additional_pet_cost = booking_details.additional_pet_rate * additional_pets * Decimal(str(multiple))
                        calculated_rate += additional_pet_cost
                        logger.info(f"MBA66777 Added {additional_pets} additional pets cost: ${additional_pet_cost}")
                    
                    # Update calculated_rate directly
                    booking_details.calculated_rate = calculated_rate.quantize(Decimal('0.01'))
                    booking_details.save(update_fields=['calculated_rate'])
                    
                    logger.info(f"MBA66777 Updated booking details for occurrence {occurrence.occurrence_id}")
                    logger.info(f"MBA66777 Forced calculated_rate to: ${booking_details.calculated_rate}")
                
                # Create additional rates if any
                additional_rates = rates.get('additional_rates', [])
                if additional_rates:
                    occurrence_rate, created = BookingOccurrenceRate.objects.get_or_create(
                        occurrence=occurrence,
                        defaults={'rates': []}
                    )
                    
                    rate_objects = []
                    for rate in additional_rates:
                        rate_objects.append({
                            'title': rate.get('title'),
                            'amount': str(rate.get('amount')),
                            'description': rate.get('description', 'Additional rate')
                        })
                    
                    occurrence_rate.rates = rate_objects
                    occurrence_rate.save()
                    
                    logger.info(f"MBA66777 Added {len(rate_objects)} additional rates for occurrence {occurrence.occurrence_id}")
                
                # Force update the occurrence's calculated_cost
                total_cost = Decimal('0.00')
                
                # Get the calculated_cost directly from the draft data if available
                draft_calculated_cost = occurrence_data.get('calculated_cost')
                if draft_calculated_cost:
                    total_cost = Decimal(str(draft_calculated_cost))
                    logger.info(f"MBA66777 Using draft calculated_cost: ${total_cost}")
                else:
                    # Add booking details calculated rate
                    if booking_details:
                        total_cost += booking_details.calculated_rate
                    
                    # Add additional rates totals
                    additional_rates_total = Decimal('0.00')
                    occurrence_rate = getattr(occurrence, 'rates', None)
                    if occurrence_rate and occurrence_rate.rates:
                        for rate in occurrence_rate.rates:
                            amount_str = str(rate.get('amount', '0'))
                            # Clean the amount string - remove any non-numeric characters except decimal point
                            try:
                                # First try to handle currency format (e.g., "$25.23")
                                amount_str = amount_str.replace('$', '').strip()
                                amount_value = Decimal(amount_str)
                                additional_rates_total += amount_value
                                logger.info(f"MBA66777 Added additional rate amount: ${amount_value}")
                            except Exception as e:
                                logger.error(f"MBA66777 Error parsing amount '{amount_str}': {str(e)}")
                                # Skip this rate if we can't parse it
                    
                    total_cost += additional_rates_total
                    logger.info(f"MBA66777 Calculated total cost: ${total_cost}")
                
                occurrence.calculated_cost = total_cost.quantize(Decimal('0.01'))
                occurrence.save(update_fields=['calculated_cost'])
                
                logger.info(f"MBA66777 Updated occurrence calculated_cost to ${occurrence.calculated_cost}")
                
                # Add to occurrences list for message
                occurrences.append({
                    'occurrence_id': occurrence.occurrence_id,
                    'start_date': start_date.strftime('%Y-%m-%d'),
                    'end_date': end_date.strftime('%Y-%m-%d'),
                    'start_time': start_time.strftime('%H:%M'),
                    'end_time': end_time.strftime('%H:%M')
                })

            # Get cost summary from draft data
            cost_summary = draft_data.get('cost_summary', {})
            
            logger.info(f"MBA66777 pro_platform_fee_percentage: {cost_summary.get('pro_platform_fee_percentage', 17)}")
            logger.info(f"MBA66777 client_platform_fee_percentage: {cost_summary.get('client_platform_fee_percentage', 17)}")
            
            # Create booking summary with platform fee data using the centralized service
            from booking_summary.services import BookingSummaryService
            summary = BookingSummaryService.create_or_update_from_draft(booking, draft_data)
            
            logger.info(f"MBA66777 Created/updated booking summary for booking {booking.booking_id}")
            
            # Log the interaction with metadata
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_CREATED_FROM_DRAFT',
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'draft_id': draft.draft_id,
                    'draft_data': draft_data,
                    'cost_summary': cost_summary
                }
            )
            
            # Create a message for the client
            message = UserMessage.objects.create(
                conversation=conversation,
                sender=request.user,
                content='Approval Request',
                type_of_message='send_approved_message',
                is_clickable=True,
                status='sent',
                booking=booking,
                metadata={
                    'booking_id': booking.booking_id,
                    'service_type': service.service_name,
                    'occurrences': occurrences,
                    'cost_summary': {
                        'total_client_cost': float(cost_summary.get('total_client_cost', 0)),
                        'total_sitter_payout': float(cost_summary.get('total_sitter_payout', 0))
                    }
                }
            )
            
            logger.info(f"MBA66777 Created message for conversation {conversation.conversation_id}")
            
            # Update conversation's last message and time
            conversation.last_message = "Approval Request"
            conversation.last_message_time = timezone.now()
            conversation.save()
            
            # Delete the draft
            draft.delete()
            logger.info(f"MBA66777 Deleted draft {draft.draft_id}")
            
            # Commit the transaction
            transaction.savepoint_commit(sid)
            
            return Response({
                'status': 'success',
                'message': 'Booking created successfully',
                'booking_id': booking.booking_id,
                'message': message.metadata
            })
            
        except Exception as e:
            transaction.savepoint_rollback(sid)
            logger.error(f"MBA66777 Error creating booking from draft: {str(e)}")
            logger.error(f"MBA66777 Full traceback: {traceback.format_exc()}")
            return Response(
                {"error": "An error occurred while creating the booking"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ConnectionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get query parameters
            connection_type = request.GET.get('type', 'clients')  # Default to clients
            filter_type = request.GET.get('filter', 'all')  # Default to all
            page = int(request.GET.get('page', 1))
            page_size = int(request.GET.get('page_size', 20))
            
            # Calculate offset for pagination
            offset = (page - 1) * page_size
            limit = page_size
            
            # Get user information
            user = request.user
            
            logger.info(f"MBA7893 Fetching connections for user {user.email} - Type: {connection_type}, Filter: {filter_type}")
            
            # Determine if user is professional or client
            is_professional = False
            is_client = False
            professional = None
            client = None
            
            try:
                professional = Professional.objects.get(user=user)
                is_professional = True
                logger.info(f"MBA7893 User is a professional with ID {professional.professional_id}")
            except Professional.DoesNotExist:
                pass
                
            try:
                client = Client.objects.get(user=user)
                is_client = True
                logger.info(f"MBA7893 User is a client")
            except Client.DoesNotExist:
                pass
            
            connections = []
            
            # CASE 1: Professional looking for their clients
            if is_professional and connection_type == 'clients':
                logger.info(f"MBA7893 Professional looking for clients")

                # Base query for clients
                if filter_type == 'all':
                    # All clients: with bookings, invited by this professional, or in conversations
                    client_query = Client.objects.filter(
                        Q(booking__professional=professional) |  # Clients who have bookings with this professional
                        Q(invited_by=professional) |  # Clients who were invited by this professional
                        Q(user__conversations_as_participant1__participant2=user) |  # Clients in conversations (as participant1)
                        Q(user__conversations_as_participant2__participant1=user)    # Clients in conversations (as participant2)
                    ).distinct().select_related('user')
                elif filter_type == 'active_bookings':
                    # Clients with active bookings (not completed, not cancelled)
                    client_query = Client.objects.filter(
                        booking__professional=professional,
                        booking__status__in=[
                            BookingStates.CONFIRMED,
                            BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL,
                            BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_CLIENT_APPROVAL,
                            BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_PROFESSIONAL_CHANGES
                        ]
                    ).distinct()
                elif filter_type == 'no_bookings':
                    # Clients invited by professional or in conversations but no bookings
                    client_query = Client.objects.filter(
                        Q(invited_by=professional) |
                        Q(user__conversations_as_participant1__participant2=user) |
                        Q(user__conversations_as_participant2__participant1=user)
                    ).exclude(
                        booking__professional=professional
                    ).distinct()
                elif filter_type == 'past_bookings':
                    # Clients with only completed or cancelled bookings
                    client_query = Client.objects.filter(
                        booking__professional=professional,
                        booking__status__in=[
                            BookingStates.COMPLETED,
                            BookingStates.CANCELLED,
                            BookingStates.DENIED
                        ]
                    ).exclude(
                        booking__professional=professional,
                        booking__status__in=[
                            BookingStates.CONFIRMED,
                            BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL,
                            BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_CLIENT_APPROVAL,
                            BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_PROFESSIONAL_CHANGES
                        ]
                    ).distinct()
                
                # Apply pagination
                paginated_clients = client_query[offset:offset+limit]
                
                # Serialize the client information
                for client in paginated_clients:
                    # Get pets for this client
                    pets = Pet.objects.filter(owner=client.user)
                    
                    # Get the last active booking with this client
                    last_booking = Booking.objects.filter(
                        client=client,
                        professional=professional
                    ).order_by('-created_at').first()
                    
                    # Get services used by this client from bookings
                    services = list(Booking.objects.filter(
                        client=client,
                        professional=professional
                    ).values_list('service_id__service_name', flat=True).distinct())
                    
                    # Get booking status counts
                    active_bookings_count = Booking.objects.filter(
                        client=client,
                        professional=professional,
                        status__in=[
                            BookingStates.CONFIRMED,
                            BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL,
                            BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_CLIENT_APPROVAL,
                            BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_PROFESSIONAL_CHANGES
                        ]
                    ).count()
                    
                    completed_bookings_count = Booking.objects.filter(
                        client=client,
                        professional=professional,
                        status=BookingStates.COMPLETED
                    ).count()
                    
                    # Check if there's a conversation with this client
                    has_conversation = Conversation.objects.filter(
                        (Q(participant1=user) & Q(participant2=client.user)) |
                        (Q(participant1=client.user) & Q(participant2=user))
                    ).exists()
                    
                    # Get or create a conversation with this client
                    conversation, is_professional_in_convo = find_or_create_conversation(
                        user, client.user, 'professional'
                    )
                    
                    # Build client connection data
                    connection = {
                        'id': client.user.id,
                        'client_id': client.id,  # Add the actual client ID
                        'name': client.user.name,
                        'email': client.user.email,
                        'profile_image': client.user.profile_image_url if hasattr(client.user, 'profile_image_url') else None,
                        'about_me': client.about_me,
                        'last_booking_date': last_booking.created_at.strftime('%Y-%m-%d') if last_booking else None,
                        'last_booking_status': BookingStates.get_display_state(last_booking.status) if last_booking else None,
                        'pets': [
                            {
                                'pet_id': pet.pet_id,
                                'name': pet.name,
                                'species': pet.species,
                                'breed': pet.breed,
                                'age': f"{pet.age_years or 0} years, {pet.age_months or 0} months"
                            } for pet in pets
                        ],
                        'services': services,
                        'active_bookings_count': active_bookings_count,
                        'completed_bookings_count': completed_bookings_count,
                        'has_conversation': has_conversation,
                        'conversation_id': conversation.conversation_id
                    }
                    connections.append(connection)
            
            # CASE 2: Client looking for their professionals
            elif is_client and connection_type == 'professionals':
                logger.info(f"MBA7893 Client looking for professionals")
                
                # Base query for client's professionals
                if filter_type == 'all':
                    professional_query = Professional.objects.filter(
                        Q(booking__client=client) |  # Professionals who have bookings with this client
                        Q(user__conversations_as_participant1__participant2=user) |  # Professionals in conversations (as participant1)
                        Q(user__conversations_as_participant2__participant1=user)    # Professionals in conversations (as participant2)
                    ).distinct().select_related('user')
                elif filter_type == 'active_bookings':
                    # Professionals with active bookings (not completed, not cancelled)
                    professional_query = Professional.objects.filter(
                        booking__client=client,
                        booking__status__in=[
                            BookingStates.CONFIRMED,
                            BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL,
                            BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_CLIENT_APPROVAL,
                            BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_PROFESSIONAL_CHANGES
                        ]
                    ).distinct()
                elif filter_type == 'past_bookings':
                    # Professionals with only completed or cancelled bookings
                    professional_query = Professional.objects.filter(
                        booking__client=client,
                        booking__status__in=[
                            BookingStates.COMPLETED,
                            BookingStates.CANCELLED,
                            BookingStates.DENIED
                        ]
                    ).exclude(
                        booking__client=client,
                        booking__status__in=[
                            BookingStates.CONFIRMED,
                            BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL,
                            BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_CLIENT_APPROVAL,
                            BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_PROFESSIONAL_CHANGES
                        ]
                    ).distinct()
                elif filter_type == 'no_bookings':
                    # Professionals with conversations but no bookings
                    professional_query = Professional.objects.filter(
                        Q(user__conversations_as_participant1__participant2=user) |
                        Q(user__conversations_as_participant2__participant1=user)
                    ).exclude(
                        booking__client=client
                    ).distinct()
                else:
                    # Default case
                    professional_query = Professional.objects.filter(
                        Q(booking__client=client) |
                        Q(user__conversations_as_participant1__participant2=user) |
                        Q(user__conversations_as_participant2__participant1=user)
                    ).distinct().select_related('user')
                
                # Apply pagination
                paginated_professionals = professional_query[offset:offset+limit]
                
                # Serialize the professional information
                for prof in paginated_professionals:
                    # Get services offered by this professional
                    services = list(Service.objects.filter(
                        professional=prof,
                        moderation_status='APPROVED'
                    ).values_list('service_name', flat=True))
                    
                    # Get the last active booking with this professional
                    last_booking = Booking.objects.filter(
                        client=client,
                        professional=prof
                    ).order_by('-created_at').first()
                    
                    # Get booking status counts
                    active_bookings_count = Booking.objects.filter(
                        client=client,
                        professional=prof,
                        status__in=[
                            BookingStates.CONFIRMED,
                            BookingStates.CONFIRMED_PENDING_CLIENT_APPROVAL,
                            BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_CLIENT_APPROVAL,
                            BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                            BookingStates.PENDING_PROFESSIONAL_CHANGES
                        ]
                    ).count()
                    
                    completed_bookings_count = Booking.objects.filter(
                        client=client,
                        professional=prof,
                        status=BookingStates.COMPLETED
                    ).count()
                    
                    # Check if there's a conversation with this professional
                    has_conversation = Conversation.objects.filter(
                        (Q(participant1=user) & Q(participant2=prof.user)) |
                        (Q(participant1=prof.user) & Q(participant2=user))
                    ).exists()
                    
                    # Get or create a conversation with this professional
                    conversation, is_professional_in_convo = find_or_create_conversation(
                        user, prof.user, 'client'
                    )
                    
                    # Build professional connection data
                    connection = {
                        'id': prof.user.id,
                        'professional_id': prof.professional_id,  # Add the actual professional ID
                        'name': prof.user.name,
                        'email': prof.user.email,
                        'profile_image': prof.user.profile_image_url if hasattr(prof.user, 'profile_image_url') else None,
                        'about_me': prof.about_me if hasattr(prof, 'about_me') else '',
                        'last_booking_date': last_booking.created_at.strftime('%Y-%m-%d') if last_booking else None,
                        'last_booking_status': BookingStates.get_display_state(last_booking.status) if last_booking else None,
                        'services': services,
                        'active_bookings_count': active_bookings_count,
                        'completed_bookings_count': completed_bookings_count,
                        'has_conversation': has_conversation,
                        'conversation_id': conversation.conversation_id
                    }
                    connections.append(connection)
            
            # Return response
            logger.info(f"MBA7893 Returning {len(connections)} connections")
            return Response({
                'connections': connections,
                'has_more': len(connections) == page_size  # Indicates if there are more connections to load
            })
            
        except Exception as e:
            logger.error(f"MBA7893 Error fetching connections: {str(e)}")
            logger.error(f"MBA7893 Full traceback: {traceback.format_exc()}")
            
            # Log the error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint='/api/bookings/v1/connections/',
                metadata={
                    'connection_type': request.GET.get('type'),
                    'filter_type': request.GET.get('filter')
                }
            )
            
            return Response(
                {"error": "Failed to fetch connections"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
class BookingDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        """Get simplified booking details"""
        logger.info(f"BookingDetailView called with booking_id={booking_id}")
        
        try:
            # Get the booking and verify access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            
            # Check if user has permission to view this booking
            if not (request.user == booking.client.user or request.user == booking.professional.user):
                return Response(
                    {"error": "Not authorized to view this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            # Get booking summary
            booking_summary = BookingSummary.objects.filter(booking=booking).first()
            
            # Get booking pets
            booking_pets = BookingPets.objects.filter(booking=booking).select_related('pet')
            
            # Get booking occurrences with details and rates
            occurrences = BookingOccurrence.objects.filter(booking=booking)
            
            # Format service details - simplified
            service_details = {
                'service_id': booking.service_id.service_id,
                'service_type': booking.service_id.service_name,
            }
            
            # Format pets - simplified
            pets_data = []
            for booking_pet in booking_pets:
                pet = booking_pet.pet
                pets_data.append({
                    'pet_id': pet.pet_id,
                    'name': pet.name,
                    'species': pet.species,
                    'breed': getattr(pet, 'breed', None),
                })
            
            # Format occurrences - simplified
            occurrences_data = []
            for occurrence in occurrences:
                # Get booking details for this occurrence
                booking_details = BookingDetails.objects.filter(booking_occurrence=occurrence).first()
                
                # Get occurrence rates
                occurrence_rates = BookingOccurrenceRate.objects.filter(occurrence=occurrence).first()
                
                # Safely access the rates field
                additional_rates = []
                if occurrence_rates:
                    try:
                        additional_rates = occurrence_rates.rates
                    except Exception as e:
                        logger.error(f"Error accessing rates for occurrence {occurrence.occurrence_id}: {str(e)}")

                base_rate = booking_details.base_rate
                multiple = booking_details.multiple
                base_total = (base_rate * Decimal(str(multiple))).quantize(Decimal('0.01'))
                
                # Format the occurrence data - simplified
                occurrence_data = {
                    'occurrence_id': occurrence.occurrence_id,
                    'start_date': occurrence.start_date.strftime('%Y-%m-%d'),
                    'end_date': occurrence.end_date.strftime('%Y-%m-%d'),
                    'start_time': occurrence.start_time.strftime('%H:%M'),
                    'end_time': occurrence.end_time.strftime('%H:%M'),
                    'calculated_cost': str(occurrence.calculated_cost),
                    'unit_of_time': booking_details.unit_of_time if booking_details else 'Per Visit',
                    'base_total': str(base_total),
                    'multiple': Decimal(str(multiple)).quantize(Decimal('0.01')),
                    'rates': {
                        'base_rate': str(booking_details.base_rate) if booking_details else '0.00',
                        'additional_animal_rate': str(booking_details.additional_pet_rate) if booking_details else '0.00',
                        'applies_after': booking_details.applies_after if booking_details else 1,
                        'holiday_rate': str(booking_details.holiday_rate) if booking_details else '0.00',
                        'additional_rates': additional_rates
                    }
                }
                occurrences_data.append(occurrence_data)
            
            # Format cost summary - simplified
            cost_summary = {}
            if booking_summary:
                cost_summary = {
                    'subtotal': str(booking_summary.subtotal),
                    'client_platform_fee': str(booking_summary.client_platform_fee),
                    'pro_platform_fee': str(booking_summary.pro_platform_fee),
                    'taxes': str(booking_summary.taxes),
                    'client_platform_fee_percentage': str(booking_summary.client_platform_fee_percentage),
                    'pro_platform_fee_percentage': str(booking_summary.pro_platform_fee_percentage),
                    'total_client_cost': str(booking_summary.total_client_cost),
                    'total_sitter_payout': str(booking_summary.total_sitter_payout)
                }
            
            # Determine if user can edit the booking
            can_edit = booking.status in [
                BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                BookingStates.PENDING_PROFESSIONAL_CHANGES,
                BookingStates.CONFIRMED_PENDING_PROFESSIONAL_CHANGES
            ] and request.user == booking.professional.user
            
            # Create the simplified response
            response_data = {
                'booking_id': booking.booking_id,
                'owner_id': booking.client.user.id,
                'owner_name': booking.client.user.name,
                'professional_id': booking.professional.professional_id,
                'professional_name': booking.professional.user.name,
                'service_details': service_details,
                'pets': pets_data,
                'occurrences': occurrences_data,
                'cost_summary': cost_summary,
                'status': BookingStates.get_display_state(booking.status),
                'can_edit': can_edit
            }
            
            return Response(response_data)
            
        except Exception as e:
            logger.error(f"Error fetching booking details: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            
            # Log the error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint=f'/api/bookings/v1/{booking_id}/details/',
                metadata={'booking_id': booking_id}
            )
            
            return Response(
                {"error": "Failed to fetch booking details"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
