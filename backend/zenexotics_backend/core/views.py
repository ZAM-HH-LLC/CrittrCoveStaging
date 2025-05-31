from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
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