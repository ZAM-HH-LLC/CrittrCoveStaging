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
from django.core.paginator import Paginator, EmptyPage
from reviews.models import ProfessionalReview, ClientReview, ReviewRequest

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

            logger.info(f"MBA976asd2n2h5 Updated conversation {conversation.conversation_id} with last_message='{conversation.last_message}', last_message_time='{conversation.last_message_time}'")

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

            # Send confirmation message
            try:
                # Get conversation between client and professional
                from conversations.models import Conversation
                from user_messages.models import UserMessage
                from django.utils import timezone
                
                # Find the conversation
                conversation = Conversation.objects.filter(
                    (Q(participant1=request.user) & Q(participant2=booking.professional.user)) |
                    (Q(participant1=booking.professional.user) & Q(participant2=request.user))
                ).first()
                
                if conversation:
                    # Get booking summary data for cost information
                    cost_data = {
                        'total_client_cost': "0.00",
                        'total_sitter_payout': "0.00"
                    }
                    
                    try:
                        from booking_summary.models import BookingSummary
                        booking_summary = BookingSummary.objects.get(booking=booking)
                        cost_data = {
                            'total_client_cost': str(booking_summary.total_client_cost),
                            'total_sitter_payout': str(booking_summary.total_sitter_payout)
                        }
                    except Exception as cost_error:
                        logger.error(f"Error fetching booking cost data: {str(cost_error)}")
                    
                    # Create confirmation message with complete metadata
                    confirmation_message = UserMessage.objects.create(
                        conversation=conversation,
                        sender=request.user,
                        content="Booking Confirmed",
                        type_of_message='booking_confirmed',
                        is_clickable=True,
                        status='sent',
                        booking=booking,
                        metadata={
                            'booking_id': booking.booking_id,
                            'service_type': booking.service_id.service_name if booking.service_id else "Unknown Service",
                            'booking_status': BookingStates.get_display_state(booking.status),
                            'confirmed_at': timezone.now().isoformat(),
                            'cost_summary': cost_data
                        }
                    )
                    
                    # Update conversation's last message and time
                    conversation.last_message = "Booking Confirmed"
                    conversation.last_message_time = timezone.now()
                    conversation.save()
                    
                    logger.info(f"Updated conversation {conversation.conversation_id} with last_message='{conversation.last_message}', last_message_time='{conversation.last_message_time}'")
                    logger.info(f"Sent confirmation message for booking {booking_id} in conversation {conversation.conversation_id}")
                    logger.info(f"Confirmation message metadata: {confirmation_message.metadata}")
                else:
                    logger.error(f"Could not find conversation between client and professional for booking {booking_id}")
            except Exception as msg_error:
                logger.error(f"Error creating confirmation message: {str(msg_error)}")
                logger.error(f"Traceback: {traceback.format_exc()}")
                # Don't fail the overall process if messaging fails
            
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

            logger.info(f"MBA88899 Other user: {other_user}")
            logger.info(f"MBA88899 User role: {user_role}")
            logger.info(f"MBA88899 Request user: {request.user}")
            logger.info(f"MBA88899 is_client: {is_client}")
            
            # Find or create a conversation between these users
            conversation, is_professional = find_or_create_conversation(
                request.user, 
                other_user, 
                user_role,
                only_find_with_role=True  # Only find, don't create new conversations
            )
            
            # If no conversation found with the right roles, return an error
            if not conversation:
                logger.error(f"MBA88899 No conversation found where user {request.user.id} is a {user_role}")
                return Response(
                    {"error": "No existing conversation found between these users with the correct roles"},
                    status=status.HTTP_404_NOT_FOUND
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
        Create or update a booking from a draft.
        
        This endpoint:
        1. Validates the professional is the one in the conversation
        2. If draft has an existing booking, updates it. Otherwise, creates a new booking 
        3. Creates/updates booking occurrences, details, and rates
        4. Creates/updates booking pets entries
        5. Creates/updates a booking summary
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
            
            # Check if we have an existing booking to update or need to create a new one
            is_new_booking = False
            if draft.booking:
                # Update existing booking
                booking = draft.booking
                booking.status = BookingStates.PENDING_CLIENT_APPROVAL
                booking.service_id = service
                booking.last_modified_by = professional.user
                booking.save()
                logger.info(f"MBA66777 Updated existing booking {booking.booking_id}")
                
                # Delete existing booking pets and occurrences to rebuild them
                BookingPets.objects.filter(booking=booking).delete()
                
                # Store existing occurrences to delete after creating new ones
                # This prevents foreign key constraint issues when deleting occurrences
                existing_occurrences = list(BookingOccurrence.objects.filter(booking=booking))
            else:
                # Create new booking with status "Pending Client Approval"
                booking = Booking.objects.create(
                    client=client,
                    professional=professional,
                    service_id=service,
                    status=BookingStates.PENDING_CLIENT_APPROVAL,
                    initiated_by=professional.user,
                    last_modified_by=professional.user
                )
                is_new_booking = True
                logger.info(f"MBA66777 Created new booking {booking.booking_id}")
                existing_occurrences = []
            
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
            new_booking_occurrences = []
            
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
                
                new_booking_occurrences.append(occurrence)
                logger.info(f"MBA66777 Created occurrence {occurrence.occurrence_id} for booking {booking.booking_id}")
                
                # Get or create booking details
                # Try to get unit_of_time from either occurrence_data directly or from occurrence_data.rates
                unit_of_time = occurrence_data.get('unit_of_time')
                if not unit_of_time and 'rates' in occurrence_data:
                    unit_of_time = occurrence_data['rates'].get('unit_of_time')
                if not unit_of_time:
                    unit_of_time = 'Per Visit'  # Default if not found in either place
                
                logger.info(f"MBAio3htg5uohg: Unit of time: {unit_of_time}")
                
                multiple = occurrence_data.get('multiple', 1)
                # Ensure multiple is a string to preserve precision (e.g., 0.33 vs 0.3)
                if not isinstance(multiple, str):
                    multiple = str(multiple)
                logger.info(f"MBAio3htg5uohg: Multiple from draft: {multiple}")
                
                rates = occurrence_data.get('rates', {})
                logger.info(f"MBAio3htg5uohg: Rates: {rates}")
                
                booking_details = BookingDetails.objects.filter(booking_occurrence=occurrence).first()
                if booking_details:
                    booking_details.num_pets = pet_count
                    booking_details.base_rate = Decimal(str(rates.get('base_rate', 0)))
                    booking_details.additional_pet_rate = Decimal(str(rates.get('additional_animal_rate', 0)))
                    booking_details.applies_after = int(rates.get('applies_after', 1))
                    booking_details.holiday_rate = Decimal(str(rates.get('holiday_rate', 0)))
                    booking_details.unit_of_time = unit_of_time
                    # Store the exact multiple value from the draft without rounding
                    booking_details.multiple = Decimal(multiple)
                    booking_details.nights = int(draft_data.get('nights', 0))
                    booking_details.save()
                    
                    # Force update the calculated rate based on the supplied multiple
                    base_rate = booking_details.base_rate
                    calculated_rate = base_rate * Decimal(multiple)
                    
                    # Add additional pet costs if applicable
                    if booking_details.additional_pet_rate and pet_count > booking_details.applies_after:
                        additional_pets = pet_count - booking_details.applies_after
                        additional_pet_cost = booking_details.additional_pet_rate * additional_pets * Decimal(multiple)
                        calculated_rate += additional_pet_cost
                        logger.info(f"MBA66777 Added {additional_pets} additional pets cost: ${additional_pet_cost}")
                    
                    # Update calculated_rate directly
                    booking_details.calculated_rate = calculated_rate.quantize(Decimal('0.01'))
                    booking_details.save(update_fields=['calculated_rate'])
                    
                    logger.info(f"MBAio3htg5uohg: Updated booking details with multiple={multiple} for occurrence {occurrence.occurrence_id}")
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
            
            # Now it's safe to delete old occurrences since new ones are created
            for old_occurrence in existing_occurrences:
                old_occurrence.delete()
                logger.info(f"MBA66777 Deleted old occurrence {old_occurrence.occurrence_id}")

            # Get cost summary from draft data
            cost_summary = draft_data.get('cost_summary', {})
            
            logger.info(f"MBA66777 pro_platform_fee_percentage: {cost_summary.get('pro_platform_fee_percentage', 17)}")
            logger.info(f"MBA66777 client_platform_fee_percentage: {cost_summary.get('client_platform_fee_percentage', 17)}")
            
            # Create booking summary with platform fee data using the centralized service
            from booking_summary.services import BookingSummaryService
            summary = BookingSummaryService.create_or_update_from_draft(booking, draft_data)
            
            logger.info(f"MBA66777 Created/updated booking summary for booking {booking.booking_id}")
            
            # Log the interaction with metadata
            action = 'BOOKING_CREATED_FROM_DRAFT' if is_new_booking else 'BOOKING_UPDATED_FROM_DRAFT'
            InteractionLog.objects.create(
                user=request.user,
                action=action,
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'draft_id': draft.draft_id,
                    'is_new_booking': is_new_booking,
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
            
            logger.info(f"MBA66777 Updated conversation {conversation.conversation_id} with last_message='{conversation.last_message}', last_message_time='{conversation.last_message_time}'")
            
            # Delete the draft
            draft.delete()
            logger.info(f"MBA66777 Deleted draft {draft.draft_id}")
            
            # Commit the transaction
            transaction.savepoint_commit(sid)
            
            return Response({
                'status': 'success',
                'message': 'Booking created successfully' if is_new_booking else 'Booking updated successfully',
                'booking_id': booking.booking_id,
                'message': message.metadata
            })
            
        except Exception as e:
            transaction.savepoint_rollback(sid)
            logger.error(f"MBA66777 Error creating/updating booking from draft: {str(e)}")
            logger.error(f"MBA66777 Full traceback: {traceback.format_exc()}")
            return Response(
                {"error": "An error occurred while processing the booking"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class ConnectionsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            user = request.user
            page = request.query_params.get('page', 1)
            
            # Determine if user is professional or client
            is_professional = False
            professional = None
            
            try:
                professional = Professional.objects.get(user=user)
                is_professional = True
                logger.info(f"MBA9452: User is a professional with ID {professional.professional_id}")
            except Professional.DoesNotExist:
                return Response(
                    {"error": "User must be a professional to access connections"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            if is_professional:
                # Get the user's timezone
                from core.time_utils import get_user_time_settings
                user_settings = get_user_time_settings(user.id)
                user_tz = pytz.timezone(user_settings['timezone'])
                current_date = timezone.now().astimezone(user_tz).date()
                
                logger.info(f"MBA9452: Current date in user timezone: {current_date}")
                
                # Get all clients for this professional (both invited and with bookings)
                clients = Client.objects.filter(
                    Q(booking__professional=professional) |  # Clients who have bookings with this professional
                    Q(invited_by=professional)  # Clients who were invited by this professional
                ).distinct().select_related('user')
                
                connections = []
                for client in clients:
                    # Find all conversations between these users
                    conversations = Conversation.objects.filter(
                        (Q(participant1=request.user) & Q(participant2=client.user)) |
                        (Q(participant1=client.user) & Q(participant2=request.user))
                    ).order_by('last_message_time')
                    
                    logger.info(f"MBA9452: Found {conversations.count()} conversations between user {request.user.id} and client {client.user.id}")
                    
                    # Find the conversation where the requesting user is the professional
                    conversations = Conversation.objects.filter(
                        (Q(participant1=request.user) & Q(participant2=client.user)) |
                        (Q(participant1=client.user) & Q(participant2=request.user))
                    )
                    
                    conversation_id = None
                    for conversation in conversations:
                        # Check the role map to ensure the requesting user is the professional
                        role_map = conversation.role_map
                        logger.info(f"MBA9452: Checking conversation role map: {role_map}")
                        
                        # Check if any key in the role map has "professional" as its value
                        for key, role in role_map.items():
                            if role == "professional":
                                # If we found a professional role, check if this is our user
                                if key.startswith('user_') or key == str(request.user.id):
                                    conversation_id = conversation.conversation_id
                                    logger.info(f"MBA9452: Found conversation where user is professional: conversation_id={conversation_id}, role_map={role_map}")
                                    break
                        else:
                            logger.info(f"MBA9452: Skipping conversation - user is not professional: conversation_id={conversation.conversation_id}, role_map={role_map}")
                        
                        if not conversation_id:
                            logger.info(f"MBA9452: No conversation found where user is professional for client: user_id={request.user.id}, client_id={client.id}, conversations_checked={list(conversations.values_list('conversation_id', flat=True))}")
                    
                    # Check for active bookings (any booking that isn't completed or cancelled)
                    has_active_booking = Booking.objects.filter(
                        client=client,
                        professional=professional,
                        status__in=[
                            BookingStates.CONFIRMED
                        ]
                    ).exists()
                    
                    # Check for past bookings - bookings with status COMPLETED and at least one occurrence with end_date < current_date
                    has_past_booking = 0
                    completed_bookings = Booking.objects.filter(
                        client=client,
                        professional=professional,
                        status=BookingStates.COMPLETED
                    )
                    
                    if completed_bookings.exists():
                        # For each completed booking, check if any occurrence has end_date earlier than current date
                        for booking in completed_bookings:
                            past_occurrences = BookingOccurrence.objects.filter(
                                booking=booking,
                                end_date__lt=current_date
                            )
                            if past_occurrences.exists():
                                has_past_booking = 1
                                break
                    
                    logger.info(f"MBA9452: Client {client.id} has_active_booking={has_active_booking}, has_past_booking={has_past_booking}")
                    
                    # Get the client's pets
                    pets = Pet.objects.filter(owner=client.user)
                    
                    # Build the connection data
                    connection_data = {
                        'id': client.user.id,
                        'client_id': client.id,
                        'name': client.user.name,
                        'profile_image': client.user.profile_image_url if hasattr(client.user, 'profile_image_url') else None,
                        'about_me': client.about_me,
                        'has_past_booking': has_past_booking,
                        'pets': [{'id': pet.pet_id, 'name': pet.name, 'species': pet.species} for pet in pets],
                        'active_bookings_count': 1 if has_active_booking else 0,
                        'conversation_id': conversation_id if conversation_id else None
                    }
                    
                    logger.info(f"MBA9452: Built connection data for client {client.user.id}: {connection_data}")
                    
                    connections.append(connection_data)
                
                # Paginate results
                paginator = Paginator(connections, 20)
                try:
                    page_obj = paginator.page(page)
                except EmptyPage:
                    page_obj = paginator.page(paginator.num_pages)
                
                return Response({
                    'connections': page_obj.object_list,
                    'total_count': paginator.count,
                    'has_next': page_obj.has_next(),
                    'has_previous': page_obj.has_previous(),
                    'current_page': page_obj.number,
                    'total_pages': paginator.num_pages
                })
                
        except Exception as e:
            logger.error(f"MBA9452: Error in ConnectionsView: {str(e)}")
            return Response(
                {"error": str(e)},
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
                    'multiple': str(multiple),  # Don't quantize the multiple - return the exact value
                    'rates': {
                        'base_rate': str(booking_details.base_rate) if booking_details else '0.00',
                        'additional_animal_rate': str(booking_details.additional_pet_rate) if booking_details else '0.00',
                        'applies_after': booking_details.applies_after if booking_details else 1,
                        'holiday_rate': str(booking_details.holiday_rate) if booking_details else '0.00',
                        'holiday_days': 0,  # Add holiday_days field with default
                        'additional_rates': additional_rates,
                        'unit_of_time': booking_details.unit_of_time if booking_details else 'Per Visit', # Also include unit_of_time in rates
                    }
                }
                
                # Log the multiple value and unit_of_time for debugging
                logger.info(f"MBAio3htg5uohg: Occurrence {occurrence.occurrence_id} multiple: {multiple}, unit_of_time: {booking_details.unit_of_time if booking_details else 'Per Visit'}")
                
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

class MarkBookingCompletedView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        """
        Mark a booking as completed.
        
        This endpoint:
        1. Validates professional access to the booking
        2. Verifies the booking is in "Confirmed" status
        3. Updates the booking status to "Completed"
        4. Updates all occurrences to "COMPLETED" status
        5. Creates review request messages for both client and professional
        6. Returns success response with updated booking status
        """
        logger.info(f"MBA8675309: Starting MarkBookingCompletedView.post for booking {booking_id}")
        sid = transaction.savepoint()  # Create savepoint for rollback
        
        try:
            # Get the booking and verify professional access
            booking = get_object_or_404(Booking, booking_id=booking_id)
            
            # Check if user is a professional
            try:
                professional = Professional.objects.get(user=request.user)
            except Professional.DoesNotExist:
                logger.error(f"MBA8675309: User {request.user.id} is not a professional")
                return Response(
                    {"error": "Only professionals can mark bookings as completed"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verify this is the professional's booking
            if booking.professional != professional:
                logger.error(f"MBA8675309: Professional {professional.professional_id} does not own booking {booking_id}")
                return Response(
                    {"error": "Not authorized to mark this booking as completed"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verify booking is in "Confirmed" status
            if booking.status != BookingStates.CONFIRMED:
                logger.error(f"MBA8675309: Booking {booking_id} is not in Confirmed status. Current status: {booking.status}")
                return Response(
                    {"error": "Only confirmed bookings can be marked as completed"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get all occurrences for this booking
            occurrences = BookingOccurrence.objects.filter(booking=booking).order_by('-end_time')
            
            if not occurrences.exists():
                logger.error(f"MBA8675309: No occurrences found for booking {booking_id}")
                return Response(
                    {"error": "Cannot mark booking as completed - no occurrences found"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get the latest occurrence's end time
            latest_occurrence = occurrences.first()
            current_time = timezone.now()
            
            # Check if the latest occurrence has ended
            # Create a datetime object from the latest occurrence's date and time for comparison
            latest_occurrence_datetime = datetime.combine(
                latest_occurrence.end_date, 
                latest_occurrence.end_time
            ).replace(tzinfo=pytz.UTC)
            
            if latest_occurrence_datetime > current_time:
                logger.error(f"MBA8675309: Latest occurrence for booking {booking_id} has not ended yet. End time: {latest_occurrence_datetime}")
                return Response(
                    {"error": "Cannot mark booking as completed - all occurrences must have ended"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            logger.info(f"MBA8675309: Verified all occurrences have ended for booking {booking_id}")
            
            # Get client for messaging
            client = booking.client
            
            # Store previous status for logging
            previous_status = booking.status
            
            # Update booking status to "Completed"
            booking.status = BookingStates.COMPLETED
            booking.completed_at = timezone.now()
            booking.completed_by = request.user
            booking.save()
            logger.info(f"MBA8675309: Updated booking {booking_id} status to {booking.status}")
            
            # Update all occurrences to "COMPLETED" status
            occurrences = BookingOccurrence.objects.filter(booking=booking)
            for occurrence in occurrences:
                occurrence.status = 'COMPLETED'
                occurrence.save()
            logger.info(f"MBA8675309: Updated {occurrences.count()} occurrences to COMPLETED status")
            
            # Find or create conversation between professional and client
            conversation = Conversation.objects.filter(
                (Q(participant1=request.user) & Q(participant2=client.user)) |
                (Q(participant1=client.user) & Q(participant2=request.user))
            ).first()
            
            if not conversation:
                logger.error(f"MBA8675309: No conversation found between professional {professional.professional_id} and client {client.id}")
                # Create a new conversation if none exists
                conversation = Conversation.objects.create(
                    participant1=request.user,
                    participant2=client.user,
                    role_map={
                        f"user_{request.user.id}": "professional",
                        f"user_{client.user.id}": "client"
                    }
                )
                logger.info(f"MBA8675309: Created new conversation {conversation.conversation_id}")
            
            # Get booking summary for cost information
            booking_summary = BookingSummary.objects.filter(booking=booking).first()
            cost_data = {
                'total_client_cost': str(booking_summary.total_client_cost) if booking_summary else "0.00",
                'total_sitter_payout': str(booking_summary.total_sitter_payout) if booking_summary else "0.00"
            }
            
            # Create a single review request message with both client and professional review data
            # Import the UserMessage model
            from user_messages.models import UserMessage
            
            # We need to make sure 'request_review' is a valid message type
            # Since we can't modify the choices at runtime, we'll use 'booking_confirmed' as the type instead
            # This will still work with our frontend logic
            
            review_request = UserMessage.objects.create(
                conversation=conversation,
                sender=request.user,  # Use the professional as the sender
                content="Booking Completed",
                type_of_message='booking_confirmed',  # Using an existing message type
                is_clickable=True,
                status='sent',
                booking=booking,
                metadata={
                    'booking_id': booking.booking_id,
                    'service_type': booking.service_id.service_name if booking.service_id else "Unknown Service",
                    'booking_status': BookingStates.get_display_state(booking.status),
                    'completed_at': timezone.now().isoformat(),  # Use isoformat for datetime
                    'cost_summary': cost_data,
                    'is_review_request': True,  # Special flag to identify review request messages
                    'client_review': {
                        'review_type': 'client_review',
                        'reviewer_id': client.user.id,
                        'reviewee_id': professional.user.id,
                    },
                    'professional_review': {
                        'review_type': 'professional_review',
                        'reviewer_id': professional.user.id,
                        'reviewee_id': client.user.id,
                    }
                }
            )
            logger.info(f"MBA8675309: Created review request message {review_request.message_id}")
            
            # Update conversation's last message and time
            conversation.last_message = "Booking Completed - Please leave a review"
            conversation.last_message_time = timezone.now()
            conversation.save()
            logger.info(f"MBA8675309: Updated conversation {conversation.conversation_id} with last_message='{conversation.last_message}'")
            
            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='BOOKING_MARKED_COMPLETED',
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'previous_status': previous_status,
                    'new_status': booking.status,
                    'completed_at': timezone.now().isoformat()
                }
            )
            
            # Commit the transaction
            transaction.savepoint_commit(sid)
            
            return Response({
                'status': 'success',
                'message': 'Booking marked as completed successfully',
                'booking_status': BookingStates.get_display_state(booking.status),
                'conversation_id': conversation.conversation_id
            })
            
        except Exception as e:
            transaction.savepoint_rollback(sid)
            logger.error(f"MBA8675309: Error marking booking as completed: {str(e)}")
            logger.error(f"MBA8675309: Full traceback: {traceback.format_exc()}")
            
            # Log the error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint=f'/api/bookings/v1/{booking_id}/mark_completed/',
                metadata={'booking_id': booking_id}
            )
            
            return Response(
                {"error": "An error occurred while marking the booking as completed"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class SubmitBookingReviewView(APIView):
    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def post(self, request, booking_id):
        """
        Submit a review for a booking.
        
        This endpoint:
        1. Validates user access to the booking
        2. Creates a review record using the appropriate model (ProfessionalReview or ClientReview)
        3. Updates the corresponding ReviewRequest if it exists
        4. Returns success response
        """
        logger.info(f"MBA8675309: Starting SubmitBookingReviewView.post for booking {booking_id}")
        sid = transaction.savepoint()  # Create savepoint for rollback
        
        try:
            # Get the booking
            booking = get_object_or_404(Booking, booking_id=booking_id)
            
            # Validate the user has access to this booking
            is_professional = False
            if booking.professional and booking.professional.user == request.user:
                is_professional = True
            elif booking.client and booking.client.user == request.user:
                is_professional = False
            else:
                logger.error(f"MBA8675309: User {request.user.id} does not have access to booking {booking_id}")
                return Response(
                    {"error": "Not authorized to review this booking"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verify booking is in "Completed" status
            if booking.status != BookingStates.COMPLETED:
                logger.error(f"MBA8675309: Booking {booking_id} is not in Completed status. Current status: {booking.status}")
                return Response(
                    {"error": "Only completed bookings can be reviewed"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get review data from request
            rating = request.data.get('rating')
            review_text = request.data.get('review_text', '')
            is_professional_review = request.data.get('is_professional_review', is_professional)
            
            # Validate rating
            try:
                rating = int(rating)
                if rating < 1 or rating > 5:
                    raise ValueError("Rating must be between 1 and 5")
            except (ValueError, TypeError):
                logger.error(f"MBA8675309: Invalid rating value: {rating}")
                return Response(
                    {"error": "Rating must be an integer between 1 and 5"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Import the review models
            from reviews.models import ProfessionalReview, ClientReview, ReviewRequest
            
            # Check if a review already exists
            if is_professional_review:
                existing_review = ProfessionalReview.objects.filter(
                    booking=booking,
                    professional=booking.professional,
                    client=booking.client
                ).first()
                review_type = 'PROFESSIONAL'
            else:
                existing_review = ClientReview.objects.filter(
                    booking=booking,
                    professional=booking.professional,
                    client=booking.client
                ).first()
                review_type = 'CLIENT'
            
            if existing_review:
                logger.info(f"MBA8675309: Review already exists for booking {booking_id}")
                return Response(
                    {"error": "You have already submitted a review for this booking"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Set post deadline to 14 days from now
            post_deadline = timezone.now() + timedelta(days=14)
            
            # Create the review using the appropriate model
            if is_professional_review:
                review = ProfessionalReview.objects.create(
                    booking=booking,
                    professional=booking.professional,
                    client=booking.client,
                    rating=rating,
                    review_text=review_text,
                    status='PENDING',
                    review_visible=False,
                    review_posted=True,
                    post_deadline=post_deadline
                )
                logger.info(f"MBA8675309: Created professional review {review.review_id} for booking {booking_id}")
            else:
                review = ClientReview.objects.create(
                    booking=booking,
                    professional=booking.professional,
                    client=booking.client,
                    rating=rating,
                    review_text=review_text,
                    status='PENDING',
                    review_visible=False,
                    review_posted=True,
                    post_deadline=post_deadline
                )
                logger.info(f"MBA8675309: Created client review {review.review_id} for booking {booking_id}")
            
            # Check if both reviews are now submitted
            if is_professional_review:
                other_review = ClientReview.objects.filter(
                    booking=booking,
                    professional=booking.professional,
                    client=booking.client
                ).first()
            else:
                other_review = ProfessionalReview.objects.filter(
                    booking=booking,
                    professional=booking.professional,
                    client=booking.client
                ).first()
            
            if other_review:
                # Make both reviews visible
                review.review_visible = True
                other_review.review_visible = True
                review.save()
                other_review.save()
                logger.info(f"MBA8675309: Both reviews submitted, making them visible")
            
            # Update the corresponding ReviewRequest if it exists
            review_request = ReviewRequest.objects.filter(
                booking=booking,
                user=request.user,
                review_type=review_type
            ).first()
            
            if review_request:
                review_request.mark_completed()
                logger.info(f"MBA8675309: Marked review request {review_request.request_id} as completed")
            
            # Log the interaction
            InteractionLog.objects.create(
                user=request.user,
                action='REVIEW_SUBMITTED',
                target_type='BOOKING',
                target_id=str(booking.booking_id),
                metadata={
                    'booking_id': booking.booking_id,
                    'review_id': review.review_id,
                    'rating': rating,
                    'is_professional_review': is_professional_review
                }
            )
            
            # Commit the transaction
            transaction.savepoint_commit(sid)
            
            return Response({
                'status': 'success',
                'message': 'Review submitted successfully',
                'review_id': review.review_id,
                'is_visible': review.review_visible
            })
            
        except Exception as e:
            transaction.savepoint_rollback(sid)
            logger.error(f"MBA8675309: Error submitting review: {str(e)}")
            logger.error(f"MBA8675309: Full traceback: {traceback.format_exc()}")
            
            # Log the error
            ErrorLog.objects.create(
                user=request.user,
                error_message=str(e),
                endpoint=f'/api/bookings/v1/{booking_id}/review/',
                metadata={'booking_id': booking_id}
            )
            
            return Response(
                {"error": "An error occurred while submitting the review"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        
