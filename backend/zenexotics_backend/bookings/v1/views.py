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

class BookingDetailView(generics.RetrieveAPIView):
    queryset = Booking.objects.all()
    serializer_class = BookingDetailSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'booking_id'
    lookup_url_kwarg = 'booking_id'
    renderer_classes = [JSONRenderer]

    def initial(self, request, *args, **kwargs):
        """This runs before anything else in the view"""
        logger.info("="*50)
        logger.info("BOOKING DETAIL REQUEST RECEIVED")
        logger.info(f"URL: {request.build_absolute_uri()}")
        logger.info(f"Method: {request.method}")
        logger.info(f"User: {request.user.email}")
        logger.info(f"Booking ID: {kwargs.get('booking_id')}")
        logger.info("="*50)
        
        # Now let's check if the booking exists in the database
        try:
            booking = Booking.objects.get(booking_id=kwargs.get('booking_id'))
            logger.info(f"Booking found in database: {booking.booking_id}")
            logger.info(f"Booking client: {booking.client.user.email if booking.client else 'None'}")
            logger.info(f"Booking professional: {booking.professional.user.email if booking.professional else 'None'}")
        except Booking.DoesNotExist:
            logger.error(f"Booking {kwargs.get('booking_id')} does not exist in database")
        except Exception as e:
            logger.error(f"Error checking booking: {str(e)}")
        
        super().initial(request, *args, **kwargs)

    def get_queryset(self):
        logger.info("Building queryset for booking lookup")
        queryset = Booking.objects.select_related(
            'service_id',
            'client',
            'professional',
            'bookingsummary'
        ).prefetch_related(
            'booking_pets__pet',
            'occurrences',
            'occurrences__rates'
        )
        logger.info(f"Base queryset SQL: {str(queryset.query)}")
        return queryset

    def get_object(self):
        try:
            booking_id = self.kwargs.get('booking_id')
            logger.info(f"Attempting to fetch booking with ID: {booking_id}")
            logger.info(f"Current user: {self.request.user.email}")
            
            # Get the booking
            queryset = self.get_queryset()
            booking = queryset.get(booking_id=booking_id)
            logger.info(f"Found booking: {booking.booking_id}")
            logger.info(f"Client: {booking.client.user.email if booking.client else 'None'}")
            logger.info(f"Professional: {booking.professional.user.email if booking.professional else 'None'}")
            
            # Check if user has permission to view this booking
            user = self.request.user
            if not (user == booking.client.user or user == booking.professional.user):
                logger.error(f"User {user.email} not authorized to view booking {booking_id}")
                raise PermissionError("Not authorized to view this booking")
            
            return booking
            
        except Booking.DoesNotExist:
            logger.error(f"Booking {booking_id} not found in database")
            raise
        except Exception as e:
            logger.error(f"Error in get_object: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            raise

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['is_prorated'] = self.request.query_params.get('is_prorated', 'true').lower() == 'true'
        
        # Add user role context
        user = self.request.user
        try:
            professional = Professional.objects.get(user=user)
            context['is_professional'] = True
            context['professional'] = professional
            logger.info(f"User {user.email} is a professional")
        except Professional.DoesNotExist:
            context['is_professional'] = False
            context['professional'] = None
            logger.info(f"User {user.email} is not a professional")
        
        return context

    def retrieve(self, request, *args, **kwargs):
        try:
            logger.info(f"Retrieving booking with ID: {kwargs.get('booking_id')}")
            logger.info(f"Request user: {request.user.email}")
            
            instance = self.get_object()
            logger.info(f"Found booking: {instance.booking_id}")
            
            context = self.get_serializer_context()
            logger.info(f"Context: {context}")
            
            # If user is a professional, check for draft
            if context.get('is_professional') and context.get('professional') == instance.professional:
                try:
                    draft = BookingDraft.objects.get(booking=instance)
                    if draft.draft_data:
                        logger.info(f"Found draft data for booking {instance.booking_id}")
                        # Use draft data for response
                        draft_data = draft.draft_data
                        
                        # Set original status on instance for serializer
                        if draft.original_status:
                            instance.original_status = draft.original_status
                        
                        # Create serializer with instance
                        serializer = self.get_serializer(instance, context=context)
                        data = serializer.data
                        
                        # Override fields from draft data
                        if 'status' in draft_data:
                            data['status'] = draft_data['status']
                        if 'service_details' in draft_data:
                            data['service_details'] = draft_data['service_details']
                        if 'pets' in draft_data:
                            data['pets'] = draft_data['pets']
                        if 'occurrences' in draft_data:
                            data['occurrences'] = draft_data['occurrences']
                        if 'cost_summary' in draft_data:
                            data['cost_summary'] = draft_data['cost_summary']
                        
                        return Response(data)
                except BookingDraft.DoesNotExist:
                    logger.info("No draft found for booking")
                    pass
            
            # If no draft or user is client, return original booking data
            serializer = self.get_serializer(instance, context=context)
            data = serializer.data
            logger.info(f"Returning booking data: {data}")
            return Response(data)
            
        except PermissionError as e:
            logger.error(f"Permission denied: {str(e)}")
            return Response(
                {"error": str(e)},
                status=status.HTTP_403_FORBIDDEN
            )
        except Booking.DoesNotExist:
            logger.error(f"Booking with ID {kwargs.get('booking_id')} not found")
            return Response(
                {"error": f"Booking with ID {kwargs.get('booking_id')} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error retrieving booking: {str(e)}")
            logger.error(f"Full traceback: {traceback.format_exc()}")
            return Response(
                {"error": "An error occurred while retrieving the booking"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

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
                'unit_of_time': service.unit_of_time
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

            # Create the booking
            booking = Booking.objects.create(
                client=client,
                professional=professional,
                status=BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                initiated_by=request.user
            )

            return Response({
                'booking_id': booking.booking_id,
                'status': booking.status
            })

        except Exception as e:
            logger.error(f"Error creating booking: {str(e)}")
            return Response(
                {"error": "Failed to create booking"},
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
            draft = get_object_or_404(
                BookingDraft,
                booking=booking,
                status='IN_PROGRESS'
            )
            draft_data = draft.draft_data

            if not draft_data:
                logger.error(f"MBA976asd2n2h5 No draft data found for booking {booking_id}")
                return Response(
                    {"error": "No draft data found"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            try:
                # Update service type
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
                    
                    # Parse times and convert to UTC
                    user_settings = get_user_time_settings(booking.client.user.id)
                    user_timezone = user_settings['timezone']
                    
                    # Parse the date and time strings
                    start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date()
                    end_date = datetime.strptime(occurrence_data['end_date'], '%Y-%m-%d').date()
                    
                    # Try to parse time in both 12-hour and 24-hour formats
                    try:
                        # First try 12-hour format (e.g., "11:30 AM")
                        start_time = datetime.strptime(occurrence_data['start_time'], '%I:%M %p').time()
                        end_time = datetime.strptime(occurrence_data['end_time'], '%I:%M %p').time()
                    except ValueError:
                        # If that fails, try 24-hour format (e.g., "13:30")
                        start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time()
                        end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time()

                    # Create datetime objects in user's timezone
                    user_tz = pytz.timezone(user_timezone)
                    start_dt = user_tz.localize(datetime.combine(start_date, start_time))
                    end_dt = user_tz.localize(datetime.combine(end_date, end_time))
                    
                    # Convert to UTC
                    start_dt_utc = start_dt.astimezone(pytz.UTC)
                    end_dt_utc = end_dt.astimezone(pytz.UTC)

                    # Get or create occurrence
                    if isinstance(occurrence_id, str) and occurrence_id.startswith('draft_'):
                        # Create new occurrence
                        occurrence = BookingOccurrence.objects.create(
                            booking=booking,
                            start_date=start_dt_utc.date(),
                            end_date=end_dt_utc.date(),
                            start_time=start_dt_utc.time(),
                            end_time=end_dt_utc.time(),
                            created_by='PROFESSIONAL',
                            last_modified_by='PROFESSIONAL',
                            status='PENDING'
                        )
                    else:
                        # Update existing occurrence
                        occurrence = get_object_or_404(
                            BookingOccurrence,
                            occurrence_id=occurrence_id,
                            booking=booking
                        )
                        occurrence.start_date = start_dt_utc.date()
                        occurrence.end_date = end_dt_utc.date()
                        occurrence.start_time = start_dt_utc.time()
                        occurrence.end_time = end_dt_utc.time()
                        occurrence.last_modified_by = 'PROFESSIONAL'
                        occurrence.save()

                    # Update or create booking details
                    booking_details, created = BookingDetails.objects.get_or_create(
                        booking_occurrence=occurrence,
                        defaults={
                            'num_pets': len(draft_data.get('pets', [])),
                            'base_rate': Decimal(str(occurrence_data['rates']['base_rate']).replace('$', '')),
                            'additional_pet_rate': Decimal(str(occurrence_data['rates']['additional_animal_rate'])),
                            'applies_after': int(occurrence_data['rates']['applies_after']),
                            'holiday_rate': Decimal(str(occurrence_data['rates']['holiday_rate']).replace('$', '')),
                            'unit_of_time': occurrence_data['rates']['unit_of_time']
                        }
                    )
                    
                    if not created:
                        booking_details.num_pets = len(draft_data.get('pets', []))
                        booking_details.base_rate = Decimal(str(occurrence_data['rates']['base_rate']).replace('$', ''))
                        booking_details.additional_pet_rate = Decimal(str(occurrence_data['rates']['additional_animal_rate']))
                        booking_details.applies_after = int(occurrence_data['rates']['applies_after'])
                        booking_details.holiday_rate = Decimal(str(occurrence_data['rates']['holiday_rate']).replace('$', ''))
                        booking_details.unit_of_time = occurrence_data['rates']['unit_of_time']
                        booking_details.save()

                    # Update or create occurrence rates
                    BookingOccurrenceRate.objects.filter(occurrence=occurrence).delete()
                    rates_list = []
                    for rate in occurrence_data['rates'].get('additional_rates', []):
                        rates_list.append({
                            'title': rate['title'],
                            'description': rate.get('description', ''),
                            'amount': f"${rate['amount'].replace('$', '')}"
                        })
                    if rates_list:
                        BookingOccurrenceRate.objects.create(
                            occurrence=occurrence,
                            rates=rates_list
                        )

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
                    content='Booking Update',
                    type_of_message='send_approved_message',
                    is_clickable=True,
                    status='sent',
                    booking=booking,
                    metadata={
                        'booking_id': booking.booking_id,
                        'service_type': booking.service_id.service_name,
                        'pets': [{'name': bp.pet.name, 'species': bp.pet.species} for bp in booking.booking_pets.all()],
                        'occurrences': draft_data.get('occurrences', []),
                        'cost_summary': draft_data.get('cost_summary', {})
                    }
                )

                # Update conversation's last message and time
                conversation.last_message = "Booking Update"
                conversation.last_message_time = timezone.now()
                conversation.save()

                # Update booking status to PENDING_CLIENT_APPROVAL
                booking.status = BookingStates.PENDING_CLIENT_APPROVAL
                booking.save()
                logger.info(f"MBA976asd2n2h5 Updated booking status to {booking.status}")

                # Delete the draft
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
                        'num_pets': len(draft_data.get('pets', [])),
                        'num_occurrences': len(draft_data.get('occurrences', [])),
                        'cost_summary': draft_data.get('cost_summary', {})
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
                        'num_pets': len(draft_data.get('pets', [])),
                        'num_occurrences': len(draft_data.get('occurrences', [])),
                        'success': True
                    }
                )

                # Commit the transaction
                transaction.savepoint_commit(sid)

                # Return simplified success response
                return Response({
                    'status': 'success',
                    'message': 'Booking updated and sent to client',
                    'message_id': message.message_id,  # Include message ID for redirection
                    'conversation_id': conversation.conversation_id  # Add conversation ID
                })

            except Exception as e:
                # Roll back all changes to bookings and related tables if any part fails
                transaction.savepoint_rollback(sid)
                raise e

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