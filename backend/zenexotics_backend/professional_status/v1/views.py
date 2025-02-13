from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.response import Response
from ..models import ProfessionalStatus
import logging
import json

logger = logging.getLogger(__name__)

@api_view(['GET'])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def get_professional_status(request):
    logger.info(f"Received professional status request for user: {request.user.email}")
    logger.info(f"User ID: {request.user.id}")
    
    try:
        # First check if the status exists
        prof_status = ProfessionalStatus.objects.get(user=request.user)
        logger.info(f"Found professional status for user {request.user.email}: {prof_status.is_approved}")
        
        response_data = {
            'is_approved': prof_status.is_approved,
            'approved_for_dogs': prof_status.approved_for_dogs,
            'approved_for_cats': prof_status.approved_for_cats,
            'approved_for_exotics': prof_status.approved_for_exotics,
        }
        
        # Log the response data
        logger.info(f"Response data: {json.dumps(response_data)}")
        
        # Create and return response with explicit content type
        response = Response(
            data=response_data,
            status=status.HTTP_200_OK,
            content_type='application/json'
        )
        
        # Log the final response
        logger.info(f"Final response data: {response.data}")
        return response
        
    except ProfessionalStatus.DoesNotExist:
        logger.warning(f"No professional status found for user {request.user.email}")
        response_data = {
            'is_approved': False,
            'approved_for_dogs': False,
            'approved_for_cats': False,
            'approved_for_exotics': False,
        }
        
        # Log the default response
        logger.info(f"Default response data: {json.dumps(response_data)}")
        
        # Create and return response with explicit content type
        response = Response(
            data=response_data,
            status=status.HTTP_200_OK,
            content_type='application/json'
        )
        
        # Log the final response
        logger.info(f"Final default response data: {response.data}")
        return response 