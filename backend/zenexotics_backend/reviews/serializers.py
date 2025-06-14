from rest_framework import serializers
from .models import ClientReview, ProfessionalReview, ReviewRequest
from bookings.models import Booking


class ClientReviewSerializer(serializers.ModelSerializer):
    """Serializer for client reviews (reviews about professionals)"""
    client_name = serializers.SerializerMethodField()
    professional_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientReview
        fields = [
            'review_id', 'booking', 'client', 'professional', 'rating', 
            'review_text', 'created_at', 'status', 'review_visible',
            'client_name', 'professional_name', 'service_name'
        ]
        read_only_fields = ['review_id', 'created_at', 'status', 'review_visible']
    
    def get_client_name(self, obj):
        return f"{obj.client.user.first_name} {obj.client.user.last_name}"
    
    def get_professional_name(self, obj):
        return f"{obj.professional.user.first_name} {obj.professional.user.last_name}"
    
    def get_service_name(self, obj):
        if obj.booking.service_id:
            return obj.booking.service_id.service_name
        return "Unknown Service"
    
    def create(self, validated_data):
        # Set post_deadline to 30 days from now
        from django.utils import timezone
        from datetime import timedelta
        
        validated_data['post_deadline'] = timezone.now() + timedelta(days=30)
        return super().create(validated_data)


class ProfessionalReviewSerializer(serializers.ModelSerializer):
    """Serializer for professional reviews (reviews about clients)"""
    client_name = serializers.SerializerMethodField()
    professional_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ProfessionalReview
        fields = [
            'review_id', 'booking', 'client', 'professional', 'rating', 
            'review_text', 'created_at', 'status', 'review_visible',
            'client_name', 'professional_name', 'service_name'
        ]
        read_only_fields = ['review_id', 'created_at', 'status', 'review_visible']
    
    def get_client_name(self, obj):
        return f"{obj.client.user.first_name} {obj.client.user.last_name}"
    
    def get_professional_name(self, obj):
        return f"{obj.professional.user.first_name} {obj.professional.user.last_name}"
    
    def get_service_name(self, obj):
        if obj.booking.service_id:
            return obj.booking.service_id.service_name
        return "Unknown Service"
    
    def create(self, validated_data):
        # Set post_deadline to 30 days from now
        from django.utils import timezone
        from datetime import timedelta
        
        validated_data['post_deadline'] = timezone.now() + timedelta(days=30)
        return super().create(validated_data)


class ReviewRequestSerializer(serializers.ModelSerializer):
    """Serializer for review requests"""
    user_name = serializers.SerializerMethodField()
    booking_details = serializers.SerializerMethodField()
    
    class Meta:
        model = ReviewRequest
        fields = [
            'request_id', 'booking', 'user', 'review_type', 'status',
            'created_at', 'expires_at', 'user_name', 'booking_details'
        ]
        read_only_fields = ['request_id', 'created_at', 'expires_at', 'status']
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}"
    
    def get_booking_details(self, obj):
        booking = obj.booking
        service_name = booking.service_id.service_name if booking.service_id else "Unknown Service"
        
        # Get the other party in the booking
        if obj.review_type == 'CLIENT':
            # Client reviewing professional
            other_party = f"{booking.professional.user.first_name} {booking.professional.user.last_name}"
        else:
            # Professional reviewing client
            other_party = f"{booking.client.user.first_name} {booking.client.user.last_name}"
            
        return {
            "booking_id": booking.booking_id,
            "service_name": service_name,
            "other_party": other_party,
            "status": booking.status
        } 