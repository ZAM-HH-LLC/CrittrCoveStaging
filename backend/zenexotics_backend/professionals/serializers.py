from rest_framework import serializers
from .models import Professional
from bookings.models import Booking
from booking_occurrences.models import BookingOccurrence
from pets.models import Pet
from professional_reviews.models import ProfessionalReview
from services.models import Service
from professional_facilities.models import ProfessionalFacility
from professional_facilities.serializers import ProfessionalFacilitySerializer
from availability.models import Availability

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = ['name', 'species', 'breed', 'age_years', 'weight']

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['service_name', 'description', 'base_rate', 'additional_animal_rate', 'holiday_rate']

class ReviewSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='client.user.name')
    service_type = serializers.CharField(source='service.service_name')

    class Meta:
        model = ProfessionalReview
        fields = ['review_id', 'client_name', 'content', 'stars', 'created_at', 'service_type']

class AvailabilitySerializer(serializers.ModelSerializer):
    status = serializers.SerializerMethodField()
    reason = serializers.SerializerMethodField()

    class Meta:
        model = Availability
        fields = ['date', 'status', 'reason']

    def get_status(self, obj):
        if obj.is_booked:
            return 'booked'
        elif obj.is_available:
            return 'available'
        return 'unavailable'

    def get_reason(self, obj):
        if obj.is_booked:
            booking = obj.booking_set.first()
            if booking:
                return f"{booking.service_type} for {booking.client.user.name}"
        return None

class BookingOccurrenceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='booking.client.user.name')
    service_type = serializers.CharField(source='booking.service_id.service_name')
    pets = serializers.SerializerMethodField()
    
    class Meta:
        model = BookingOccurrence
        fields = ['booking_id', 'client_name', 'start_date', 'start_time', 'service_type', 'pets']
    
    def get_pets(self, obj):
        pets = Pet.objects.filter(bookingpets__booking=obj.booking)
        return PetSerializer(pets, many=True).data

class ProfessionalDashboardSerializer(serializers.ModelSerializer):
    upcoming_bookings = BookingOccurrenceSerializer(many=True, read_only=True)

    class Meta:
        model = Professional
        fields = [
            'upcoming_bookings'
        ]

class ClientProfessionalProfileSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name')
    email = serializers.CharField(source='user.email')
    reviews = serializers.SerializerMethodField()
    availability = serializers.SerializerMethodField()
    coordinates = serializers.SerializerMethodField()
    home_facilities = serializers.SerializerMethodField()
    pets = serializers.SerializerMethodField()
    services = serializers.SerializerMethodField()
    
    class Meta:
        model = Professional
        fields = [
            'professional_id',
            'name',
            'email',
            'bio',
            'experience',
            'average_rating',
            'total_num_of_reviews',
            'is_insured',
            'reviews',
            'availability',
            'coordinates',
            'home_facilities',
            'pets',
            'services'
        ]

    def get_reviews(self, obj):
        reviews = ProfessionalReview.objects.filter(professional=obj)
        return ReviewSerializer(reviews, many=True).data

    def get_availability(self, obj):
        availability = Availability.objects.filter(professional=obj)
        return AvailabilitySerializer(availability, many=True).data

    def get_coordinates(self, obj):
        address = obj.user.addresses.first()
        if address and address.coordinates:
            return address.coordinates
        return None

    def get_home_facilities(self, obj):
        facilities = ProfessionalFacility.objects.filter(professional=obj)
        return ProfessionalFacilitySerializer(facilities, many=True).data

    def get_pets(self, obj):
        pets = Pet.objects.filter(owner=obj.user)
        return PetSerializer(pets, many=True).data

    def get_services(self, obj):
        services = Service.objects.filter(professional=obj)
        return ServiceSerializer(services, many=True).data 