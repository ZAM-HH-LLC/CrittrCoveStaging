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
import re
from core.common_checks import is_professional, owns_service

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_professional_services_with_rates(request):
    """
    Get all services and their rates for the authenticated professional.
    """
    try:
        # Check if user is a professional
        is_prof, result = is_professional(request)
        
        if not is_prof:
            return result
            
        professional = result

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

            # Format the holiday rate with appropriate symbol
            holiday_rate = str(service.holiday_rate)
            if service.holiday_rate_is_percent:
                formatted_holiday_rate = f"{holiday_rate}%"
            else:
                formatted_holiday_rate = f"${holiday_rate}"

            # Format same as create_service response
            service_data = {
                'service_id': service.service_id,
                'service_name': service.service_name,
                'description': service.description,
                'animal_types': service.animal_types,
                'base_rate': str(service.base_rate),
                'additional_animal_rate': str(service.additional_animal_rate),
                'holiday_rate': formatted_holiday_rate,
                'holiday_rate_is_percent': service.holiday_rate_is_percent,
                'applies_after': service.applies_after,
                'unit_of_time': service.unit_of_time,
                'is_overnight': service.is_overnight,
                'is_active': service.is_active,
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
        is_prof, result = is_professional(request)
        
        if not is_prof:
            return result
            
        professional = result
        
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

        # Process animal_types JSON field
        animal_types = {}
        
        # Extract animal_types from request data
        if 'animal_types' in data and isinstance(data['animal_types'], dict):
            # If it's already a dictionary, use it directly
            raw_animal_types = data['animal_types']
            # Format keys to have proper capitalization
            for animal, category in raw_animal_types.items():
                if animal and category:
                    # Format animal type name
                    animal_words = animal.strip().split()
                    formatted_animal = ' '.join(word[0].upper() + word[1:].lower() for word in animal_words)
                    
                    # Format category name
                    category_words = category.strip().split()
                    formatted_category = ' '.join(word[0].upper() + word[1:].lower() for word in category_words)
                    
                    animal_types[formatted_animal] = formatted_category
        elif 'animal_types' in data and isinstance(data['animal_types'], list):
            # Handle list of animal types with their categories
            for item in data['animal_types']:
                if isinstance(item, dict) and 'name' in item and 'category' in item:
                    # Format animal type name
                    animal_words = item['name'].strip().split()
                    formatted_animal = ' '.join(word[0].upper() + word[1:].lower() for word in animal_words)
                    
                    # Format category name
                    category_words = item['category'].strip().split()
                    formatted_category = ' '.join(word[0].upper() + word[1:].lower() for word in category_words)
                    
                    animal_types[formatted_animal] = formatted_category
                elif isinstance(item, str):
                    # If just a string is provided, default to "Other" category
                    animal_words = item.strip().split()
                    formatted_animal = ' '.join(word[0].upper() + word[1:].lower() for word in animal_words)
                    animal_types[formatted_animal] = "Other"
        
        # For backward compatibility
        if not animal_types and 'animal_type' in data:
            animal_type = data['animal_type']
            if isinstance(animal_type, str) and animal_type.strip():
                words = animal_type.strip().split()
                formatted_animal = ' '.join(word[0].upper() + word[1:].lower() for word in words)
                animal_types[formatted_animal] = "Other"
        
        # Ensure we have at least one animal type
        if not animal_types:
            animal_types = {"Other": "Other"}
        
        # Handle unit_of_time and ensure it's in the valid choices
        unit_of_time = data.get('unit_of_time', 'Per Visit')
        valid_units = ['15 Min', '30 Min', '45 Min', '1 Hour', '2 Hour', '3 Hour', 
                      '4 Hour', '5 Hour', '6 Hour', '7 Hour', '8 Hour', '24 Hour', 
                      'Per Day', 'Per Night', 'Per Visit', 'Week']
        if unit_of_time not in valid_units:
            unit_of_time = 'Per Visit'  # Default if invalid
        
        # Process holiday_rate - handle % or $ formatting
        holiday_rate = data.get('holiday_rate', '0')
        is_percent = False
        
        if isinstance(holiday_rate, str):
            # Check if it's a percentage or dollar amount
            if '%' in holiday_rate:
                is_percent = True
                # Extract numeric value for storage
                holiday_rate = re.sub(r'[^0-9.]', '', holiday_rate)
            elif '$' in holiday_rate:
                is_percent = False
                # Extract numeric value for storage
                holiday_rate = re.sub(r'[^0-9.]', '', holiday_rate)
        
        # Create service object
        service = Service(
            professional=professional,
            service_name=service_name,
            description=data['description'],
            base_rate=data['base_rate'],
            unit_of_time=unit_of_time,
            animal_types=animal_types,
            additional_animal_rate=data.get('additional_animal_rate', 0),
            holiday_rate=holiday_rate,
            holiday_rate_is_percent=is_percent,
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
        
        # Format the holiday rate for the response with appropriate symbol
        formatted_holiday_rate = holiday_rate
        if service.holiday_rate_is_percent:
            formatted_holiday_rate = f"{holiday_rate}%"
        else:
            formatted_holiday_rate = f"${holiday_rate}"
        
        # Prepare response with created service data
        service_data = {
            'service_id': service.service_id,
            'service_name': service.service_name,
            'description': service.description,
            'animal_types': service.animal_types,
            'base_rate': str(service.base_rate),
            'additional_animal_rate': str(service.additional_animal_rate),
            'holiday_rate': formatted_holiday_rate,
            'holiday_rate_is_percent': service.holiday_rate_is_percent,
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

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_service(request, service_id):
    """
    Delete a service if it is not being used in any bookings.
    """
    try:
        # Check if user is a professional and owns this service
        owns, response, service = owns_service(request, service_id)
        
        if not owns:
            return response
        
        # Check if the service is being used in any bookings
        if service.bookings.exists():
            return Response(
                {'error': 'Cannot delete this service as it is being used in bookings'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Delete the service
        service.delete()
        logger.info(f"Service {service_id} deleted successfully")
        
        return Response(
            {'success': 'Service deleted successfully'},
            status=status.HTTP_200_OK
        )
        
    except Exception as e:
        logger.error(f"Error in delete_service: {str(e)}")
        return Response(
            {'error': f'An error occurred while deleting the service: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

# Views will be added here