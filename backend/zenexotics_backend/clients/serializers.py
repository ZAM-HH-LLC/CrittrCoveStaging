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
    age = serializers.SerializerMethodField()
    is_dog = serializers.SerializerMethodField()
    
    class Meta:
        model = Pet
        fields = [
            # Basic Information
            'pet_id', 'name', 'species', 'breed', 'pet_type', 
            'age', 'age_years', 'age_months', 'weight', 'birthday', 'sex',
            'profile_photo', 'photo_gallery', 'adoption_date', 'created_at',
            'pet_description', 'is_dog',
            
            # Care Information
            'feeding_schedule', 'potty_break_schedule', 'energy_level',
            'can_be_left_alone', 'special_care_instructions',
            
            # Behavioral Information (Dog/Cat specific)
            'friendly_with_children', 'friendly_with_cats', 'friendly_with_dogs',
            
            # Medical Information
            'spayed_neutered', 'house_trained', 'microchipped',
            'medications', 'medication_notes',
            
            # Veterinary Information
            'vet_name', 'vet_address', 'vet_phone', 'insurance_provider',
            'vet_documents'
        ]
    
    def get_age(self, obj):
        """Format the age in a human-readable format"""
        if obj.age_years is not None:
            years_text = f"{obj.age_years} year{'s' if obj.age_years != 1 else ''}"
            
            if obj.age_months:
                months_text = f"{obj.age_months} month{'s' if obj.age_months != 1 else ''}"
                return f"{years_text}, {months_text}"
            return years_text
        
        if obj.age_months:
            return f"{obj.age_months} month{'s' if obj.age_months != 1 else ''}"
            
        if obj.birthday:
            today = timezone.now().date()
            years = today.year - obj.birthday.year - ((today.month, today.day) < (obj.birthday.month, obj.birthday.day))
            
            if years == 0:
                # Calculate months
                months = (today.month - obj.birthday.month) % 12
                if today.day < obj.birthday.day:
                    months -= 1
                return f"{months} month{'s' if months != 1 else ''}"
            
            return f"{years} year{'s' if years != 1 else ''}"
            
        return None
    
    def get_is_dog(self, obj):
        """Helper field to identify dogs for the frontend"""
        return obj.species and obj.species.upper() == 'DOG'

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
