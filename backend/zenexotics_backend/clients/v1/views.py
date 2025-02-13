from django.shortcuts import render
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from datetime import date

from bookings.constants import BookingStates
from ..models import Client
from ..serializers import ClientSerializer, ClientBookingOccurrenceSerializer
from professional_status.models import ProfessionalStatus
from bookings.models import Booking
from booking_occurrences.models import BookingOccurrence
import logging
from rest_framework.views import APIView
from user_addresses.models import Address
from ..serializers import ClientProfileEditSerializer
from pets.models import Pet
from booking_pets.models import BookingPets
from ..serializers import PetSerializer

logger = logging.getLogger(__name__)

class ClientListView(generics.ListAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        logger.info("=== Starting Client List Request ===")
        logger.info(f"Request user: {user.email}")
        
        try:
            professional_status = ProfessionalStatus.objects.get(user=user)
            if professional_status.is_approved:
                logger.info(f"User {user.email} is an approved professional - returning all clients")
                return Client.objects.all()
            else:
                logger.warning(f"User {user.email} is not an approved professional - returning empty list")
                return Client.objects.none()
        except ProfessionalStatus.DoesNotExist:
            logger.warning(f"User {user.email} has no professional status - returning empty list")
            return Client.objects.none()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        logger.info(f"Response data count: {len(response.data)}")
        return response

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_client_dashboard(request):
    try:
        # Get client profile from logged-in user
        try:
            client = request.user.client_profile
        except Client.DoesNotExist:
            return Response(
                {'error': 'User is not registered as a client'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Get current date
        today = date.today()

        # Get upcoming confirmed bookings with at least one upcoming occurrence
        confirmed_bookings = Booking.objects.filter(
            client=client,
            status=BookingStates.CONFIRMED,
            occurrences__start_date__gte=today,
            occurrences__status='FINAL'
        ).select_related('professional__user', 'service_id').distinct()

        # Serialize the bookings
        serialized_bookings = []
        for booking in confirmed_bookings:
            # Get the next occurrence for this booking
            next_occurrence = BookingOccurrence.objects.filter(
                booking=booking,
                start_date__gte=today,
                status='FINAL'
            ).order_by('start_date', 'start_time').first()
            
            if next_occurrence:
                booking_data = {
                    'booking_id': booking.booking_id,
                    'professional_name': booking.professional.user.name,
                    'start_date': next_occurrence.start_date,
                    'start_time': next_occurrence.start_time,
                    'service_type': booking.service_id.service_name if booking.service_id else None,
                    'pets': PetSerializer(Pet.objects.filter(bookingpets__booking=booking), many=True).data
                }
                serialized_bookings.append(booking_data)

        # Prepare response data
        response_data = {
            'upcoming_bookings': serialized_bookings
        }

        return Response(response_data)

    except Exception as e:
        logger.error(f"Error in get_client_dashboard: {str(e)}")
        return Response(
            {'error': 'An error occurred while fetching dashboard data'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

class ClientProfileEditView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        # Get the client profile or return 403 if user is not a client
        try:
            client = Client.objects.select_related('user').prefetch_related(
                'user__owned_pets'
            ).get(user=request.user)
        except Client.DoesNotExist:
            return Response(
                {"error": "User is not a client"}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Get the service address for the client
        address = Address.objects.filter(
            user=request.user,
            address_type='SERVICE'
        ).first()
        
        # Add the address to the client object for serialization
        client.address = address
        
        # Serialize the data
        serializer = ClientProfileEditSerializer(client)
        
        return Response(serializer.data)

class ClientPetsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, client_id):
        logger.info(f"Getting pets for client {client_id}")
        
        try:
            # Check if the requesting user has permission to view this client's pets
            if not request.user.is_staff:  # If not admin
                try:
                    # Check if user is the client
                    if hasattr(request.user, 'client_profile') and request.user.client_profile.id != client_id:
                        # Check if user is an approved professional
                        professional_status = ProfessionalStatus.objects.get(user=request.user)
                        if not professional_status.is_approved:
                            return Response(
                                {"error": "Not authorized to view client pets"},
                                status=status.HTTP_403_FORBIDDEN
                            )
                except (Client.DoesNotExist, ProfessionalStatus.DoesNotExist):
                    return Response(
                        {"error": "Not authorized to view client pets"},
                        status=status.HTTP_403_FORBIDDEN
                    )

            # Get the booking ID from query params if it exists
            booking_id = request.query_params.get('exclude_booking')
            logger.info(f"Excluding pets from booking ID: {booking_id}")
            
            # Get all pets for the client
            client = Client.objects.get(id=client_id)
            pets = Pet.objects.filter(owner=client.user)
            
            # If booking_id provided, exclude pets already in that booking
            if booking_id:
                existing_pet_ids = BookingPets.objects.filter(
                    booking__booking_id=booking_id
                ).values_list('pet__pet_id', flat=True)
                logger.info(f"Found existing pet IDs in booking: {existing_pet_ids}")
                pets = pets.exclude(pet_id__in=existing_pet_ids)
            
            # Serialize the pets
            serializer = PetSerializer(pets, many=True)
            
            logger.info(f"Found {len(serializer.data)} available pets for client {client_id}")
            return Response(serializer.data)
            
        except Client.DoesNotExist:
            logger.warning(f"Client {client_id} not found")
            return Response(
                {"error": "Client not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            logger.error(f"Error getting client pets: {str(e)}")
            return Response(
                {"error": "An error occurred while fetching client pets"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 