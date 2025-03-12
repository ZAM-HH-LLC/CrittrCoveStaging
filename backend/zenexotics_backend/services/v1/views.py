"""
Views for the services API v1.
Ready for view implementations.
"""

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.shortcuts import get_object_or_404
from ..models import Service
from service_rates.models import ServiceRate
from professionals.models import Professional
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_professional_services_with_rates(request):
    """
    Get all services and their rates for the authenticated professional.
    """
    try:
        # Check if user is a professional
        if not hasattr(request.user, 'professional_profile'):
            return Response(
                {'error': 'User is not registered as a professional'},
                status=status.HTTP_403_FORBIDDEN
            )

        professional = request.user.professional_profile

        # Get all approved services for the professional
        services = Service.objects.filter(
            professional=professional,
            moderation_status='APPROVED'
        ).prefetch_related('additional_rates')

        # Prepare response data
        services_data = []
        for service in services:
            # Get additional rates for this service
            additional_rates = [
                {
                    'rate_id': rate.rate_id,
                    'title': rate.title,
                    'description': rate.description,
                    'rate': str(rate.rate)  # Convert Decimal to string for JSON serialization
                }
                for rate in service.additional_rates.all()
            ]

            service_data = {
                'service_id': service.service_id,
                'service_name': service.service_name,
                'description': service.description,
                'animal_type': service.animal_type,
                'categories': service.categories,
                'base_rate': str(service.base_rate),
                'additional_animal_rate': str(service.additional_animal_rate),
                'holiday_rate': str(service.holiday_rate),
                'applies_after': service.applies_after,
                'unit_of_time': service.unit_of_time,
                'additional_rates': additional_rates
            }
            services_data.append(service_data)

        return Response(services_data)

    except Exception as e:
        logger.error(f"Error in get_professional_services_with_rates: {str(e)}")
        return Response(
            {'error': 'An error occurred while fetching services data'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Views will be added here