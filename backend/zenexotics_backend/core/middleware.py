import logging
import json
from datetime import datetime
from django.utils.timezone import now
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth.models import AnonymousUser

logger = logging.getLogger(__name__)
User = get_user_model()

class AuthenticationLoggingMiddleware:
    """
    Middleware to log all authentication events, token expiry, and API calls
    for debugging authentication issues.
    
    Only applies to API routes to avoid interfering with Django admin.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only log API routes - skip admin, static files, and other Django routes
        should_log = self._should_log_request(request)
        
        if not should_log:
            # Pass through without logging for non-API routes
            return self.get_response(request)
        
        # Get timestamp and user info before processing
        start_time = now()
        request_id = f"{start_time.strftime('%Y%m%d_%H%M%S')}_{id(request)}"
        
        # Extract token and user info
        user_info = self._extract_user_info(request)
        
        # Log the incoming request
        self._log_request(request, request_id, user_info, start_time)
        
        # Process the request
        response = self.get_response(request)
        
        # Log the response
        end_time = now()
        duration_ms = (end_time - start_time).total_seconds() * 1000
        self._log_response(request, response, request_id, user_info, duration_ms)
        
        return response

    def _should_log_request(self, request):
        """
        Determine if this request should be logged.
        Only log API routes, exclude admin and static files.
        """
        path = request.path.lower()
        
        # Skip admin routes completely
        if path.startswith('/admin/'):
            return False
            
        # Skip static files
        if path.startswith('/static/') or path.startswith('/media/'):
            return False
            
        # Skip favicon and other browser requests
        if path.startswith('/favicon.ico') or path.startswith('/.well-known/'):
            return False
            
        # Only log API routes
        if path.startswith('/api/'):
            return True
            
        # Skip everything else (Django views, health checks, etc.)
        return False

    def _extract_user_info(self, request):
        """Extract user information from the request"""
        user_info = {
            'user_id': None,
            'email': None,
            'is_authenticated': False,
            'token_status': 'no_token',
            'token_expiry': None,
            'ip_address': self._get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown')[:200]
        }
        
        # Get authorization header
        auth_header = request.META.get('HTTP_AUTHORIZATION', '')
        
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            user_info['token_status'] = 'token_present'
            
            try:
                # Parse the token
                access_token = AccessToken(token)
                user_info['token_status'] = 'token_valid'
                user_info['token_expiry'] = datetime.fromtimestamp(access_token.payload.get('exp', 0))
                
                # Get user info
                user_id = access_token.payload.get('user_id')
                if user_id:
                    try:
                        user = User.objects.get(id=user_id)
                        user_info.update({
                            'user_id': user_id,
                            'email': user.email,
                            'is_authenticated': True
                        })
                    except User.DoesNotExist:
                        user_info['token_status'] = 'user_not_found'
                        
            except (InvalidToken, TokenError) as e:
                user_info['token_status'] = f'token_invalid: {str(e)}'
            except Exception as e:
                user_info['token_status'] = f'token_error: {str(e)}'
        
        return user_info

    def _get_client_ip(self, request):
        """Get the client IP address"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

    def _log_request(self, request, request_id, user_info, timestamp):
        """Log incoming request details"""
        log_data = {
            'event_type': 'API_REQUEST',
            'request_id': request_id,
            'timestamp': timestamp.isoformat(),
            'method': request.method,
            'path': request.path,
            'query_params': dict(request.GET),
            'user_info': user_info
        }
        
        # Log authentication issues specifically
        if user_info['token_status'] not in ['no_token', 'token_valid']:
            logger.warning(f"🔐 AUTH_ISSUE: {json.dumps(log_data, indent=2)}")
        else:
            logger.info(f"🔐 API_REQUEST: {request.method} {request.path} | User: {user_info.get('email', 'anonymous')} | Token: {user_info['token_status']}")

    def _log_response(self, request, response, request_id, user_info, duration_ms):
        """Log response details"""
        log_data = {
            'event_type': 'API_RESPONSE',
            'request_id': request_id,
            'method': request.method,
            'path': request.path,
            'status_code': response.status_code,
            'duration_ms': round(duration_ms, 2),
            'user_info': user_info
        }
        
        # Log specific authentication-related responses
        if response.status_code == 401:
            logger.error(f"🔐 AUTH_FAILURE: {json.dumps(log_data, indent=2)}")
            
            # Try to get response body for 401 errors
            try:
                if hasattr(response, 'data'):
                    log_data['response_body'] = response.data
                logger.error(f"🔐 AUTH_FAILURE_DETAILS: {json.dumps(log_data, indent=2)}")
            except:
                pass
                
        elif response.status_code >= 500:
            logger.error(f"🔐 SERVER_ERROR: {json.dumps(log_data, indent=2)}")
        else:
            logger.info(f"🔐 API_RESPONSE: {response.status_code} | {duration_ms:.1f}ms | {request.method} {request.path}")

    def process_exception(self, request, exception):
        """Log exceptions during request processing"""
        # Only log exceptions for API routes
        if not self._should_log_request(request):
            return None
            
        user_info = getattr(request, '_auth_user_info', {})
        
        log_data = {
            'event_type': 'API_EXCEPTION',
            'timestamp': now().isoformat(),
            'method': request.method,
            'path': request.path,
            'exception_type': type(exception).__name__,
            'exception_message': str(exception),
            'user_info': user_info
        }
        
        logger.error(f"🔐 API_EXCEPTION: {json.dumps(log_data, indent=2)}")
        return None 