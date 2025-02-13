from rest_framework import serializers
from .models import ProfessionalFacility

class ProfessionalFacilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfessionalFacility
        fields = [
            'facility_name',
            'description',
            'capacity',
            'available_for',
            'photos'
        ] 