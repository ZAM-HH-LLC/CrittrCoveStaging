from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils.timezone import now
import logging
import json

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([AllowAny])  # Allow anonymous logging for debugging
def log_auth_event(request):
    """
    Log authentication events from frontend for debugging.
    This endpoint accepts authentication events even from non-authenticated users
    to help debug logout issues.
    """
    try:
        event_data = request.data
        
        # Add server-side timestamp and IP
        event_data['server_timestamp'] = now().isoformat()
        event_data['ip_address'] = request.META.get('HTTP_X_FORWARDED_FOR', 
                                                   request.META.get('REMOTE_ADDR', 'unknown'))
        event_data['user_agent'] = request.META.get('HTTP_USER_AGENT', 'unknown')
        
        # Add user info if available
        if hasattr(request, 'user') and request.user.is_authenticated:
            event_data['server_user_id'] = request.user.id
            event_data['server_user_email'] = request.user.email
        else:
            event_data['server_user_id'] = None
            event_data['server_user_email'] = 'anonymous'
        
        # Log the event
        logger.error(f"🔐 FRONTEND_AUTH_EVENT: {json.dumps(event_data, indent=2)}")
        
        return Response({'status': 'logged'}, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"🔐 ERROR_LOGGING_AUTH_EVENT: {str(e)}")
        return Response({'error': 'Failed to log event'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def debug_log(request):
    """
    Endpoint to receive debug logs from mobile clients
    """
    try:
        data = request.data
        logger.info(f"[MOBILE DEBUG] Received debug log request: {data}")
        
        # Log the raw request data
        logger.info(f"[MOBILE DEBUG] Raw request data: {request.body}")
        
        # Log headers that might affect input behavior
        logger.info(f"[MOBILE DEBUG] Request headers: {dict(request.headers)}")
        
        # Log the specific input event data if it exists
        if 'event_type' in data:
            logger.info(f"[MOBILE DEBUG] Input event type: {data['event_type']}")
            logger.info(f"[MOBILE DEBUG] Input event data: {data.get('data', {})}")
        
        return Response({'status': 'success'})
    except Exception as e:
        logger.error(f"[MOBILE DEBUG] Error in debug_log: {str(e)}")
        return Response({'error': str(e)}, status=400) 