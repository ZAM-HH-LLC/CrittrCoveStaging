from django.urls import reverse
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from professionals.models import Professional
from bookings.models import Booking
from booking_occurrences.models import BookingOccurrence
from booking_pets.models import BookingPets
from pets.models import Pet
from services.models import Service
from clients.models import Client
from datetime import datetime, date, time, timedelta
from bookings.constants import BookingStates

User = get_user_model()

class GetProfessionalDashboardTests(APITestCase):
    maxDiff = None  # Show full diff in case of failure

    def setUp(self):
        # Create professional user
        self.professional_user = User.objects.create_user(
            email='pro@example.com',
            password='testpass123',
            name='Test Professional'
        )
        self.professional = Professional.objects.create(
            user=self.professional_user,
            bio='Test Bio',
            experience=5,
            is_insured=True
        )

        # Create client user
        self.client_user = User.objects.create_user(
            email='matt@example.com',
            password='testpass123',
            name='matt aertker'
        )
        # Get the automatically created client profile
        self.client_profile = self.client_user.client_profile

        # Create service
        self.service = Service.objects.create(
            professional=self.professional,
            service_name='Ferrier',
            description='Horse shoe service',
            animal_type='FARM',
            categories=['Equine Care', 'Hoof Care'],
            base_rate=100.00,
            additional_animal_rate=50.00,
            holiday_rate=150.00,
            unit_of_time='PER_VISIT',
            moderation_status='APPROVED'
        )

        # Create pet
        self.pet = Pet.objects.create(
            owner=self.client_user,
            name='Opal',
            species='DOG',
            breed='Golden',
            age_years=2,
            weight=60.5
        )

        # Create bookings with occurrences
        self.booking1 = Booking.objects.create(
            client=self.client_profile,
            professional=self.professional,
            service_id=self.service,
            status=BookingStates.CONFIRMED
        )
        self.booking2 = Booking.objects.create(
            client=self.client_profile,
            professional=self.professional,
            service_id=self.service,
            status=BookingStates.CONFIRMED
        )

        # Create booking occurrences
        start_date1 = date(2025, 2, 1)
        start_time1 = datetime.strptime('15:06:17', '%H:%M:%S').time()
        self.occurrence1 = BookingOccurrence.objects.create(
            booking=self.booking1,
            start_date=start_date1,
            end_date=start_date1,  # Same day service
            start_time=start_time1,
            end_time=(datetime.combine(date.today(), start_time1) + timedelta(hours=1)).time(),
            status='FINAL',
            created_by='CLIENT',
            last_modified_by='CLIENT'
        )

        start_date2 = date(2025, 3, 4)
        start_time2 = datetime.strptime('09:00:00', '%H:%M:%S').time()
        self.occurrence2 = BookingOccurrence.objects.create(
            booking=self.booking2,
            start_date=start_date2,
            end_date=start_date2,  # Same day service
            start_time=start_time2,
            end_time=(datetime.combine(date.today(), start_time2) + timedelta(hours=1)).time(),
            status='FINAL',
            created_by='CLIENT',
            last_modified_by='CLIENT'
        )

        # Add pet to bookings
        BookingPets.objects.create(booking=self.booking1, pet=self.pet)
        BookingPets.objects.create(booking=self.booking2, pet=self.pet)

        # Authenticate as professional
        self.client.force_authenticate(user=self.professional_user)

    def test_get_professional_dashboard(self):
        """Test retrieving professional dashboard data."""
        url = reverse('professionals:v1:professional_dashboard')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Store the response for our custom output
        self.last_response = response.json()

        expected_data = {
            "upcoming_bookings": [
                {
                    "booking_id": self.booking2.booking_id,
                    "client_name": "matt aertker",
                    "start_date": "2025-03-04",
                    "start_time": "09:00:00",
                    "service_type": "Ferrier",
                    "pets": [
                        {
                            "pet_id": self.pet.pet_id,
                            "name": "Opal",
                            "species": "DOG",
                            "breed": "Golden"
                        }
                    ]
                },
                {
                    "booking_id": self.booking1.booking_id,
                    "client_name": "matt aertker",
                    "start_date": "2025-02-01",
                    "start_time": "15:06:17",
                    "service_type": "Ferrier",
                    "pets": [
                        {
                            "pet_id": self.pet.pet_id,
                            "name": "Opal",
                            "species": "DOG",
                            "breed": "Golden"
                        }
                    ]
                }
            ]
        }

        self.assertEqual(response.json(), expected_data)

    def test_unauthenticated_access(self):
        """Test that unauthenticated access is not allowed."""
        self.client.force_authenticate(user=None)
        url = reverse('professionals:v1:professional_dashboard')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED) 