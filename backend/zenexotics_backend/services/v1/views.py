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
from django.db import transaction

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

        # Get all services for the professional - include both APPROVED and PENDING
        services = Service.objects.filter(
            professional=professional,
            moderation_status__in=['APPROVED', 'PENDING']
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

            # Format same as create_service response
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
                'is_overnight': service.is_overnight,
                'moderation_status': service.moderation_status,
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@transaction.atomic
def create_service(request):
    """
    Create a new service for the authenticated professional.
    """
    try:
        # Check if user is a professional
        if not hasattr(request.user, 'professional_profile'):
            return Response(
                {'error': 'User is not registered as a professional'},
                status=status.HTTP_403_FORBIDDEN
            )

        professional = request.user.professional_profile
        
        # Extract data from request
        data = request.data
        logger.info(f"Creating service with data: {data}")
        
        # Validate required fields
        required_fields = ['service_name', 'description', 'base_rate', 'unit_of_time']
        for field in required_fields:
            if field not in data:
                return Response(
                    {'error': f'Missing required field: {field}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        # Format service_name: capitalize first letter of each word, lowercase the rest
        service_name = data['service_name']
        if isinstance(service_name, str) and service_name.strip():
            words = service_name.strip().split()
            service_name = ' '.join(word[0].upper() + word[1:].lower() for word in words)

        # Process animal_type
        animal_type = "Other"  # Default value
        
        # Extract animal_type from various possible formats
        if 'animal_type' in data:
            raw_animal_type = data['animal_type']
            
            # Handle if it's a dict with 'name' property
            if isinstance(raw_animal_type, dict) and 'name' in raw_animal_type:
                raw_animal_type = raw_animal_type['name']
            
            # Format animal type: capitalize first letter of each word, lowercase the rest
            if isinstance(raw_animal_type, str) and raw_animal_type.strip():
                words = raw_animal_type.strip().split()
                animal_type = ' '.join(word[0].upper() + word[1:].lower() for word in words)
        
        # Handle categories - they might be strings or objects with name
        categories = data.get('categories', [])
        category_names = []
        if isinstance(categories, list):
            for category in categories:
                if isinstance(category, dict) and 'name' in category:
                    category_names.append(category['name'])
                elif isinstance(category, str):
                    category_names.append(category)
        
        # Ensure we have at least one category
        if not category_names:
            category_names = ['Uncategorized']
        
        # Handle unit_of_time and ensure it's in the valid choices
        unit_of_time = data.get('unit_of_time', 'Per Visit')
        valid_units = ['15 Min', '30 Min', '45 Min', '1 Hour', '2 Hour', '3 Hour', 
                      '4 Hour', '5 Hour', '6 Hour', '7 Hour', '8 Hour', '24 Hour', 
                      'Per Day', 'Per Night', 'Per Visit', 'Week']
        if unit_of_time not in valid_units:
            unit_of_time = 'Per Visit'  # Default if invalid
        
        # Create service object
        service = Service(
            professional=professional,
            service_name=service_name,
            description=data['description'],
            base_rate=data['base_rate'],
            unit_of_time=unit_of_time,
            animal_type=animal_type,
            categories=category_names,
            additional_animal_rate=data.get('additional_animal_rate', 0),
            holiday_rate=data.get('holiday_rate', 0),
            applies_after=data.get('applies_after', 1),
            is_overnight=data.get('is_overnight', False),
            moderation_status='PENDING'
        )
        
        service.save()
        logger.info(f"Created service with ID: {service.service_id}")
        
        # Create additional rates if provided
        additional_rates_list = []
        if 'additional_rates' in data and isinstance(data['additional_rates'], list):
            for rate_data in data['additional_rates']:
                if 'title' in rate_data and 'rate' in rate_data:
                    rate = ServiceRate.objects.create(
                        service=service,
                        title=rate_data['title'],
                        description=rate_data.get('description', ''),
                        rate=rate_data['rate']
                    )
                    additional_rates_list.append({
                        'rate_id': rate.rate_id,
                        'title': rate.title,
                        'description': rate.description,
                        'rate': str(rate.rate)
                    })
        
        # Prepare response with created service data
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
            'is_overnight': service.is_overnight,
            'moderation_status': service.moderation_status,
            'additional_rates': additional_rates_list
        }
        
        return Response(service_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        logger.error(f"Error in create_service: {str(e)}")
        return Response(
            {'error': f'An error occurred while creating the service: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Views will be added here