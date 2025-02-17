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
from ..serializers import BookingListSerializer, BookingDetailSerializer
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
from datetime import datetime

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

    def get_queryset(self):
        return Booking.objects.select_related(
            'service_id',
            'client',
            'professional',
            'bookingsummary'
        ).prefetch_related(
            'booking_pets__pet',
            'occurrences',
            'occurrences__rates'
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['is_prorated'] = self.request.query_params.get('is_prorated', 'true').lower() == 'true'
        
        # Add user role context
        user = self.request.user
        try:
            professional = Professional.objects.get(user=user)
            context['is_professional'] = True
            context['professional'] = professional
        except Professional.DoesNotExist:
            context['is_professional'] = False
            context['professional'] = None
        
        return context

    def retrieve(self, request, *args, **kwargs):
        try:
            instance = self.get_object()
        except Booking.DoesNotExist:
            return Response(
                {"error": f"Booking with ID {kwargs.get('booking_id')} not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        context = self.get_serializer_context()
        
        # If user is a professional, check for draft
        if context.get('is_professional') and context.get('professional') == instance.professional:
            try:
                draft = BookingDraft.objects.get(booking=instance)
                if draft.draft_data:
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
                pass
        
        # If no draft or user is client, return original booking data
        serializer = self.get_serializer(instance, context=context)
        return Response(serializer.data)

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
        # Create a savepoint at the start
        sid = transaction.savepoint()
        
        try:
            # Get request data
            conversation_id = request.data.get('conversation_id')
            service_id = request.data.get('service_type')
            pet_ids = request.data.get('pets', [])
            occurrences = request.data.get('occurrences', [])

            # Validate required fields
            if not all([conversation_id, service_id, pet_ids, occurrences]):
                return Response(
                    {"error": "Missing required fields"},
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

            # Get the client (must be the requesting user)
            try:
                client = Client.objects.get(user=request.user)
            except Client.DoesNotExist:
                return Response(
                    {"error": "Only clients can request bookings"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Get the professional (the other participant)
            other_user_id = conversation.participant1_id if conversation.participant1_id != request.user.id else conversation.participant2_id
            professional = get_object_or_404(Professional, user_id=other_user_id)

            # Get and validate the service belongs to the professional
            service = get_object_or_404(Service, service_id=service_id, professional=professional)

            # Create the booking
            booking = Booking.objects.create(
                client=client,
                professional=professional,
                service_id=service,
                status=BookingStates.PENDING_INITIAL_PROFESSIONAL_CHANGES,
                initiated_by=request.user
            )

            # Create booking pets entries and verify they belong to the client
            for pet_id in pet_ids:
                pet = get_object_or_404(Pet, pet_id=pet_id, owner=client.user)
                BookingPets.objects.create(
                    booking=booking,
                    pet=pet
                )

            # Get service rates
            service_rates = ServiceRate.objects.filter(service=service).all()

            # Create booking occurrences, details, and rates
            for occurrence_data in occurrences:
                try:
                    # Parse the dates from strings to datetime objects
                    start_date = datetime.strptime(occurrence_data['start_date'], '%Y-%m-%d').date()
                    end_date = datetime.strptime(occurrence_data.get('end_date', occurrence_data['start_date']), '%Y-%m-%d').date()
                    
                    # Parse the times from strings to time objects
                    start_time = datetime.strptime(occurrence_data['start_time'], '%H:%M').time()
                    end_time = datetime.strptime(occurrence_data['end_time'], '%H:%M').time()
                    
                    logger.info(f"Creating occurrence with data: {occurrence_data}")
                    
                    # Create booking occurrence
                    occurrence = BookingOccurrence.objects.create(
                        booking=booking,
                        start_date=start_date,
                        end_date=end_date,
                        start_time=start_time,
                        end_time=end_time,
                        created_by='CLIENT',
                        last_modified_by='CLIENT',
                        status='PENDING'
                    )
                    
                    logger.info(f"Created occurrence: {occurrence.occurrence_id}")

                    # Create booking details with rates from service
                    booking_details = BookingDetails.objects.create(
                        booking_occurrence=occurrence,
                        num_pets=len(pet_ids),
                        base_rate=service.base_rate,
                        additional_pet_rate=service.additional_animal_rate,
                        holiday_rate=service.holiday_rate,
                        applies_after=service.applies_after,
                        calculated_rate=Decimal('0.00')  # This will be updated by the save method
                    )
                    
                    logger.info(f"Created booking details for occurrence: {occurrence.occurrence_id}")

                    # Create booking occurrence rates if service has additional rates
                    if service_rates:
                        rates_data = [
                            {
                                'title': rate.title,
                                'description': rate.description,
                                'amount': f"${rate.rate}"
                            }
                            for rate in service_rates
                        ]
                        # Add base rate as first item in rates array
                        rates_data.insert(0, {
                            'title': 'Base Rate',
                            'description': 'Base rate for service',
                            'amount': f"${service.base_rate}"
                        })
                        occurrence_rates = BookingOccurrenceRate.objects.create(
                            occurrence=occurrence,
                            rates=rates_data
                        )
                        logger.info(f"Created occurrence rates for occurrence: {occurrence.occurrence_id}")

                    # Update the calculated cost after all related objects are created
                    occurrence.update_calculated_cost()
                    logger.info(f"Updated calculated cost for occurrence: {occurrence.occurrence_id}")

                except Exception as e:
                    logger.error(f"Error creating occurrence: {str(e)}")
                    logger.error(f"Error type: {type(e)}")
                    logger.error(f"Error args: {e.args}")
                    raise

            # Create initial booking summary (will be updated by signals)
            BookingSummary.objects.create(
                booking=booking,
                subtotal=Decimal('0'),
                platform_fee=Decimal('0'),
                taxes=Decimal('0'),
                total_client_cost=Decimal('0'),
                total_sitter_payout=Decimal('0')
            )

            # If we got here, everything worked, so commit the transaction
            transaction.savepoint_commit(sid)

            return Response({
                'booking_id': booking.booking_id,
                'status': booking.status
            })

        except Exception as e:
            # Something went wrong, rollback to the savepoint
            transaction.savepoint_rollback(sid)
            logger.error(f"Error creating booking request: {str(e)}")
            logger.error(f"Error type: {type(e)}")
            logger.error(f"Error args: {e.args}")
            return Response(
                {"error": "Failed to create booking request"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# Placeholder: Ready for views to be added