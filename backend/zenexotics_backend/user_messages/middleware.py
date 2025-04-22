from channels.middleware import BaseMiddleware
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from django.contrib.auth import get_user_model
from urllib.parse import parse_qs
import logging

logger = logging.getLogger(__name__)
User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_key):
    """
    Get user from JWT token
    """
    try:
        # Verify the token
        access_token = AccessToken(token_key)
        user_id = access_token.payload.get('user_id')
        
        # Get user from database
        return User.objects.get(id=user_id)
    except (InvalidToken, TokenError) as e:
        logger.error(f"Invalid token: {str(e)}")
        return AnonymousUser()
    except User.DoesNotExist:
        logger.error(f"User not found for token with user_id: {user_id}")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"Unexpected error in JWT token validation: {str(e)}")
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSockets
    """
    async def __call__(self, scope, receive, send):
        # Get query parameters from URL
        query_params = parse_qs(scope.get('query_string', b'').decode())
        token = query_params.get('token', [None])[0]
        
        # If token provided in query string
        if token:
            scope['user'] = await get_user_from_token(token)
        else:
            # Check for token in headers (for potential future use)
            headers = dict(scope.get('headers', []))
            authorization = headers.get(b'authorization', b'').decode()
            
            if authorization.startswith('Bearer '):
                token = authorization.split(' ')[1]
                scope['user'] = await get_user_from_token(token)
            else:
                scope['user'] = AnonymousUser()
        
        # Continue processing
        return await super().__call__(scope, receive, send) 