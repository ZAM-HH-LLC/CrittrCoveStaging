from django.test import Client as DjangoClient
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from professionals.models import Professional
from services.models import Service
from pets.models import Pet
from bookings.models import Booking
from clients.models import Client
from booking_occurrences.models import BookingOccurrence
from booking_pets.models import BookingPets
from rest_framework_simplejwt.tokens import RefreshToken
from datetime import datetime, timedelta, time
import json

User = get_user_model()

class GetProBookingsTests(APITestCase):
    maxDiff = None  # Show full diff in case of failure

    def setUp(self):
        # Create a professional user
        self.pro_user = User.objects.create_user(
            email='pro@example.com',
            password='testpass123',
            name='Test Pro'
        )
        self.professional = Professional.objects.create(user=self.pro_user)

        # Create a client user
        self.client_user = User.objects.create_user(
            email='matt@example.com',
            password='testpass123',
            name='matt aertker'
        )
        self.client_profile, _ = Client.objects.get_or_create(user=self.client_user)

        # Create a service
        self.service = Service.objects.create(
            professional=self.professional,
            service_name='Ferrier',
            description='Test service',
            animal_type='FARM',
            categories=['Ferrier'],
            base_rate=100.00,
            additional_animal_rate=50.00,
            holiday_rate=150.00,
            unit_of_time='PER_VISIT',
            moderation_status='APPROVED'
        )

        # Create a pet
        self.pet = Pet.objects.create(
            owner=self.client_user,
            name='Opal',
            species='DOG',
            breed='Golden'
        )

        # Create bookings
        self.booking1 = Booking.objects.create(
            client=self.client_profile,
            professional=self.professional,
            service_id=self.service,
            status='Confirmed',
            initiated_by=self.client_user,
            last_modified_by=self.client_user
        )
        # Associate pet with booking1
        BookingPets.objects.create(booking=self.booking1, pet=self.pet)

        # Create booking occurrence for booking1
        self.occurrence1 = BookingOccurrence.objects.create(
            booking=self.booking1,
            start_date='2025-02-01',
            end_date='2025-02-01',
            start_time='15:06:17',
            end_time='16:06:17',
            status='CONFIRMED',
            created_by='CLIENT',
            last_modified_by='CLIENT'
        )

        self.booking2 = Booking.objects.create(
            client=self.client_profile,
            professional=self.professional,
            service_id=self.service,
            status='Confirmed',
            initiated_by=self.client_user,
            last_modified_by=self.client_user
        )
        # Associate pet with booking2
        BookingPets.objects.create(booking=self.booking2, pet=self.pet)

        # Create booking occurrence for booking2
        self.occurrence2 = BookingOccurrence.objects.create(
            booking=self.booking2,
            start_date='2025-03-04',
            end_date='2025-03-04',
            start_time='09:00:00',
            end_time='10:00:00',
            status='CONFIRMED',
            created_by='CLIENT',
            last_modified_by='CLIENT'
        )

        # Get JWT token for professional user
        refresh = RefreshToken.for_user(self.pro_user)
        self.access_token = str(refresh.access_token)

    def test_get_pro_bookings_match(self):
        """Test retrieving all bookings for a professional"""
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {self.access_token}')
        response = self.client.get('/api/bookings/v1/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.last_response = response.json()

        expected_data = {
            "bookings": {
                "professional_bookings": [
                    {
                        "booking_id": self.booking2.booking_id,
                        "client_name": "matt aertker",
                        "professional_name": "Test Pro",
                        "service_name": "Ferrier",
                        "start_date": "2025-03-04",
                        "start_time": "09:00:00",
                        "total_client_cost": 0.0,
                        "total_sitter_payout": 0.0,
                        "status": "Confirmed"
                    },
                    {
                        "booking_id": self.booking1.booking_id,
                        "client_name": "matt aertker",
                        "professional_name": "Test Pro",
                        "service_name": "Ferrier",
                        "start_date": "2025-02-01",
                        "start_time": "15:06:17",
                        "total_client_cost": 0.0,
                        "total_sitter_payout": 0.0,
                        "status": "Confirmed"
                    }
                ],
                "client_bookings": []
            },
            "next_page": None
        }
        self.assertEqual(response.json(), expected_data)

    def test_get_client_bookings_match(self):
        """Test retrieving bookings as a client"""
        # Get token for client user
        refresh = RefreshToken.for_user(self.client_user)
        client_token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {client_token}')
        response = self.client.get('/api/bookings/v1/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        data = response.json()
        self.assertEqual(len(data['bookings']['client_bookings']), 2)
        self.assertEqual(len(data['bookings']['professional_bookings']), 0)

    def test_get_no_bookings_match(self):
        """Test retrieving bookings for a user with no bookings"""
        # Create a new user with no bookings
        new_user = User.objects.create_user(
            email='no_bookings@example.com',
            password='testpass123',
            name='No Bookings User'
        )
        refresh = RefreshToken.for_user(new_user)
        token = str(refresh.access_token)
        
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        response = self.client.get('/api/bookings/v1/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        expected_data = {
            "bookings": {
                "professional_bookings": [],
                "client_bookings": []
            },
            "next_page": None
        }
        self.assertEqual(response.json(), expected_data)

    def test_unauthenticated_access(self):
        """Test unauthenticated access is denied"""
        response = self.client.get('/api/bookings/v1/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED) 