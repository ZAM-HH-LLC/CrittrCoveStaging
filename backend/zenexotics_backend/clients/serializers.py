from rest_framework import serializers
from .models import Client
from bookings.models import Booking
from booking_occurrences.models import BookingOccurrence
from pets.models import Pet
from user_addresses.models import Address
from django.utils import timezone
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class PersonalInformationSerializer(serializers.Serializer):
    name = serializers.CharField()
    email = serializers.EmailField()
    phone_number = serializers.CharField()
    age = serializers.SerializerMethodField()

    def get_age(self, obj):
        if obj.birthday:
            today = timezone.now().date()
            return today.year - obj.birthday.year - ((today.month, today.day) < (obj.birthday.month, obj.birthday.day))
        return None

class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = Address
        fields = [
            'address_line_1',
            'address_line_2',
            'city',
            'state',
            'zip',
            'country'
        ]

class EmergencyContactSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, allow_null=True, allow_blank=True)
    phone_number = serializers.CharField(required=False, allow_null=True, allow_blank=True)

    def to_representation(self, instance):
        # Handle the case where instance is None or empty
        if not instance:
            return {'name': '', 'phone_number': ''}
        # Handle dictionary data
        if isinstance(instance, dict):
            return {
                'name': instance.get('name', ''),
                'phone_number': instance.get('phone_number', '')
            }
        return super().to_representation(instance)

class HouseholdMemberSerializer(serializers.Serializer):
    name = serializers.CharField()
    phone_number = serializers.CharField()

    def to_representation(self, instance):
        # Handle dictionary data
        if isinstance(instance, dict):
            return {
                'name': instance.get('name', ''),
                'phone_number': instance.get('phone_number', '')
            }
        return super().to_representation(instance)

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = ['pet_id', 'name', 'species', 'breed']

class ClientBookingOccurrenceSerializer(serializers.ModelSerializer):
    professional_name = serializers.CharField(source='booking.professional.user.name')
    service_type = serializers.SerializerMethodField()
    pets = serializers.SerializerMethodField()
    
    class Meta:
        model = BookingOccurrence
        fields = ['booking_id', 'professional_name', 'start_date', 'start_time', 'service_type', 'pets']
    
    def get_service_type(self, obj):
        return obj.booking.service_id.service_name if obj.booking.service_id else None
    
    def get_pets(self, obj):
        pets = Pet.objects.filter(bookingpets__booking=obj.booking)
        return PetSerializer(pets, many=True).data

class ClientSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source='user.name', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = Client
        fields = [
            'client_id', 'name', 'email', 'about_me',
            'emergency_contact', 'authorized_household_members',
            'last_booking', 'verified_payment_method',
            'created_at'
        ]

class ClientProfileEditSerializer(serializers.Serializer):
    personal_information = PersonalInformationSerializer(source='user')
    address = AddressSerializer()
    bio = serializers.CharField(source='about_me')
    emergency_contact = EmergencyContactSerializer()
    authorized_household_members = HouseholdMemberSerializer(many=True)
    pets = PetSerializer(many=True, source='user.owned_pets')
