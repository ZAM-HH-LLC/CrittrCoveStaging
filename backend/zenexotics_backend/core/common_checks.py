"""
Common validation checks used across multiple views in the application.
These functions help maintain consistency and reduce code duplication.
"""

from rest_framework.response import Response
from rest_framework import status
from professionals.models import Professional
from services.models import Service
from django.shortcuts import get_object_or_404


def is_professional(request):
    """
    Check if the requesting user is a professional.
    
    Args:
        request: The request object containing the authenticated user
        
    Returns:
        tuple: (is_professional, response)
            is_professional (bool): True if user is a professional, False otherwise
            response (Response or None): Error response if not a professional, None otherwise
    """
    try:
        # Check if user has a professional profile
        professional = Professional.objects.filter(user=request.user).first()
        
        if not professional:
            return False, Response(
                {'error': 'User is not registered as a professional'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        return True, professional
        
    except Exception as e:
        return False, Response(
            {'error': f'Error checking professional status: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def owns_service(request, service_id):
    """
    Check if the requesting professional owns the specified service.
    
    Args:
        request: The request object containing the authenticated user
        service_id: The ID of the service to check ownership for
        
    Returns:
        tuple: (owns_service, response, service)
            owns_service (bool): True if professional owns service, False otherwise
            response (Response or None): Error response if not the owner, None otherwise
            service (Service or None): The service object if owned, None otherwise
    """
    # First check if user is a professional
    is_prof, result = is_professional(request)
    
    if not is_prof:
        return False, result, None
    
    professional = result
    
    try:
        # Get the service and check if the professional owns it
        service = get_object_or_404(Service, service_id=service_id)
        
        if service.professional.professional_id != professional.professional_id:
            return False, Response(
                {'error': 'You do not have permission to access this service'},
                status=status.HTTP_403_FORBIDDEN
            ), None
            
        return True, None, service
        
    except Service.DoesNotExist:
        return False, Response(
            {'error': 'Service not found'},
            status=status.HTTP_404_NOT_FOUND
        ), None
        
    except Exception as e:
        return False, Response(
            {'error': f'Error checking service ownership: {str(e)}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ), None
