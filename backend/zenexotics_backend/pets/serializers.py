from rest_framework import serializers
from django.conf import settings
from urllib.parse import urlparse
from .models import Pet

class UserPetListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = ['pet_id', 'name', 'species', 'breed', 'age_years', 'age_months', 'profile_photo']

class PetSerializer(serializers.ModelSerializer):
    """
    Basic serializer for Pet model
    """
    # Add derived fields for frontend compatibility
    pet_id = serializers.IntegerField(source='id', read_only=True)
    type = serializers.CharField(source='species', required=False, allow_blank=True)
    profile_photo = serializers.SerializerMethodField()
    photo_gallery = serializers.SerializerMethodField()
    
    # Explicitly define boolean fields with allow_null=True to preserve null values
    friendly_with_children = serializers.BooleanField(required=False, allow_null=True)
    friendly_with_cats = serializers.BooleanField(required=False, allow_null=True)
    friendly_with_dogs = serializers.BooleanField(required=False, allow_null=True)
    spayed_neutered = serializers.BooleanField(required=False, allow_null=True)
    house_trained = serializers.BooleanField(required=False, allow_null=True)
    microchipped = serializers.BooleanField(required=False, allow_null=True)
    can_be_left_alone = serializers.BooleanField(required=False, allow_null=True)
    
    class Meta:
        model = Pet
        fields = [
            'pet_id', 'name', 'type', 'species', 'breed', 'pet_type',
            'age_years', 'age_months', 'weight', 'birthday', 'sex',
            'profile_photo', 'photo_gallery', 'adoption_date',
            'created_at', 'pet_description', 'friendly_with_children',
            'friendly_with_cats', 'friendly_with_dogs', 'spayed_neutered',
            'house_trained', 'microchipped', 'feeding_schedule',
            'potty_break_schedule', 'energy_level', 'can_be_left_alone',
            'medications', 'medication_notes', 'special_care_instructions',
            'vet_name', 'vet_address', 'vet_phone', 'insurance_provider',
            'vet_documents', 'owner'
        ]
    
    def to_representation(self, instance):
        """
        Override to_representation to ensure boolean fields are null when they should be
        """
        data = super().to_representation(instance)
        
        # List of boolean fields that should be null when not explicitly set
        boolean_fields = [
            'friendly_with_children', 'friendly_with_cats', 'friendly_with_dogs',
            'spayed_neutered', 'house_trained', 'microchipped', 'can_be_left_alone'
        ]
        
        # For each boolean field, check if it should be null
        for field in boolean_fields:
            # If the field is False in the database but wasn't in the initial data,
            # it means it was defaulted to False and should be null
            if data[field] is False and field not in getattr(self, 'initial_data', {}):
                # Check if the instance has any data that would indicate user interaction
                has_user_data = (
                    instance.pet_description or 
                    instance.feeding_schedule or 
                    instance.potty_break_schedule or 
                    instance.energy_level or 
                    instance.medications or 
                    instance.medication_notes or 
                    instance.special_care_instructions
                )
                
                # If no user data, assume the boolean fields were not set intentionally
                if not has_user_data:
                    data[field] = None
        
        return data
    
    def create(self, validated_data):
        """
        Override create method to ensure boolean fields are null if not provided
        """
        # Explicitly set boolean fields to null if they're not provided
        boolean_fields = [
            'friendly_with_children', 'friendly_with_cats', 'friendly_with_dogs',
            'spayed_neutered', 'house_trained', 'microchipped', 'can_be_left_alone'
        ]
        
        for field in boolean_fields:
            if field not in validated_data:
                validated_data[field] = None
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """
        Override update method to preserve null values for boolean fields if not provided
        """
        # Only update boolean fields if they're explicitly provided in the request
        boolean_fields = [
            'friendly_with_children', 'friendly_with_cats', 'friendly_with_dogs',
            'spayed_neutered', 'house_trained', 'microchipped', 'can_be_left_alone'
        ]
        
        # Remove boolean fields that aren't in the request data to preserve existing values
        for field in boolean_fields:
            if field not in self.initial_data:
                validated_data.pop(field, None)
        
        return super().update(instance, validated_data)
        
    def get_profile_photo(self, obj):
        """
        Return the profile photo URL without the server address
        """
        if not obj.profile_photo:
            return None
            
        # Convert to string if it's not already
        url = str(obj.profile_photo.url)
        
        # If it's a full URL, extract just the path part
        if url.startswith('http'):
            parsed_url = urlparse(url)
            return parsed_url.path
        
        # Otherwise just return the URL as is (which should be a path)
        return url
        
    def get_photo_gallery(self, obj):
        """
        Return the photo gallery URLs without the server address
        """
        if not obj.photo_gallery:
            return []
            
        result = []
        for photo in obj.photo_gallery.all():
            # Convert to string if it's not already
            url = str(photo.image.url)
            
            # If it's a full URL, extract just the path part
            if url.startswith('http'):
                parsed_url = urlparse(url)
                result.append(parsed_url.path)
            else:
                result.append(url)
                
        return result

class PetDetailSerializer(PetSerializer):
    """
    Detailed serializer for Pet model
    """
    # Add frontend compatibility fields
    ageYears = serializers.IntegerField(source='age_years', required=False, allow_null=True)
    ageMonths = serializers.IntegerField(source='age_months', required=False)
    adoptionDate = serializers.DateField(source='adoption_date', required=False, allow_null=True)
    description = serializers.CharField(source='pet_description', required=False, allow_blank=True)
    childrenFriendly = serializers.BooleanField(source='friendly_with_children', required=False, allow_null=True)
    catFriendly = serializers.BooleanField(source='friendly_with_cats', required=False, allow_null=True)
    dogFriendly = serializers.BooleanField(source='friendly_with_dogs', required=False, allow_null=True)
    spayedNeutered = serializers.BooleanField(source='spayed_neutered', required=False, allow_null=True)
    houseTrained = serializers.BooleanField(source='house_trained', required=False, allow_null=True)
    feedingInstructions = serializers.CharField(source='feeding_schedule', required=False, allow_blank=True)
    pottyBreakSchedule = serializers.CharField(source='potty_break_schedule', required=False, allow_blank=True)
    energyLevel = serializers.CharField(source='energy_level', required=False, allow_blank=True)
    canBeLeftAlone = serializers.BooleanField(source='can_be_left_alone', required=False, allow_null=True)
    medicalNotes = serializers.CharField(source='medication_notes', required=False, allow_blank=True)
    specialCareInstructions = serializers.CharField(source='special_care_instructions', required=False, allow_blank=True)
    vetName = serializers.CharField(source='vet_name', required=False, allow_blank=True)
    vetAddress = serializers.CharField(source='vet_address', required=False, allow_blank=True)
    vetPhone = serializers.CharField(source='vet_phone', required=False, allow_blank=True)
    insuranceProvider = serializers.CharField(source='insurance_provider', required=False, allow_blank=True)
    vetDocuments = serializers.SerializerMethodField()
    
    class Meta(PetSerializer.Meta):
        model = Pet
        fields = PetSerializer.Meta.fields + [
            'ageYears', 'ageMonths', 'adoptionDate', 'description',
            'childrenFriendly', 'catFriendly', 'dogFriendly',
            'spayedNeutered', 'houseTrained', 'feedingInstructions',
            'pottyBreakSchedule', 'energyLevel', 'canBeLeftAlone',
            'medicalNotes', 'specialCareInstructions', 'vetName',
            'vetAddress', 'vetPhone', 'insuranceProvider',
            'vetDocuments'
        ]
        
    def get_vetDocuments(self, obj):
        """
        Return vet documents as a list of objects
        """
        if not obj.vet_documents:
            return []
            
        result = []
        for doc in obj.vet_documents.all():
            # Convert to string if it's not already
            url = str(doc.file.url)
            
            # If it's a full URL, extract just the path part
            if url.startswith('http'):
                parsed_url = urlparse(url)
                url = parsed_url.path
                
            result.append({
                'id': doc.id,
                'name': doc.name,
                'url': url,
                'uploaded_at': doc.uploaded_at
            })
                
        return result