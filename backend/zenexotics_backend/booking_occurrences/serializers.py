from rest_framework import serializers
from .models import BookingOccurrence
from pets.serializers import PetSerializer

class BookingOccurrenceSerializer(serializers.ModelSerializer):
    client_name = serializers.CharField(source='booking.client.user.name')
    service_type = serializers.CharField(source='booking.service_id.service_name')
    pets = serializers.SerializerMethodField()
    
    class Meta:
        model = BookingOccurrence
        fields = ['booking_id', 'client_name', 'start_date', 'start_time', 'service_type', 'pets']
    
    def get_pets(self, obj):
        pets = obj.booking.bookingpets_set.all().select_related('pet')
        return PetSerializer([bp.pet for bp in pets], many=True).data 