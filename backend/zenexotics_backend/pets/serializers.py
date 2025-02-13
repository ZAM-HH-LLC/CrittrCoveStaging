from rest_framework import serializers
from .models import Pet

class UserPetListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = ['pet_id', 'name', 'species', 'breed', 'age_years', 'age_months', 'profile_photo']

class PetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pet
        fields = '__all__'
        read_only_fields = ['pet_id', 'created_at']