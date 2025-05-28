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
    logger.info(f"WebSocket JWT: Attempting to validate token: {token_key[:20]}...")
    try:
        # Verify the token
        access_token = AccessToken(token_key)
        user_id = access_token.payload.get('user_id')
        logger.info(f"WebSocket JWT: Token valid, user_id: {user_id}")
        
        # Get user from database
        user = User.objects.get(id=user_id)
        logger.info(f"WebSocket JWT: User found: {user.email}")
        return user
    except (InvalidToken, TokenError) as e:
        logger.error(f"WebSocket JWT: Invalid token: {str(e)}")
        return AnonymousUser()
    except User.DoesNotExist:
        logger.error(f"WebSocket JWT: User not found for token with user_id: {user_id}")
        return AnonymousUser()
    except Exception as e:
        logger.error(f"WebSocket JWT: Unexpected error in JWT token validation: {str(e)}")
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    """
    Custom middleware for JWT authentication in WebSockets
    """
    async def __call__(self, scope, receive, send):
        logger.info(f"WebSocket JWT: Processing connection, scope type: {scope.get('type')}")
        
        # Get query parameters from URL
        query_string = scope.get('query_string', b'').decode()
        logger.info(f"WebSocket JWT: Query string: {query_string}")
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        # If token provided in query string
        if token:
            logger.info(f"WebSocket JWT: Token found in query string")
            scope['user'] = await get_user_from_token(token)
        else:
            logger.info(f"WebSocket JWT: No token in query string, checking headers")
            # Check for token in headers (for potential future use)
            headers = dict(scope.get('headers', []))
            authorization = headers.get(b'authorization', b'').decode()
            
            if authorization.startswith('Bearer '):
                token = authorization.split(' ')[1]
                logger.info(f"WebSocket JWT: Token found in authorization header")
                scope['user'] = await get_user_from_token(token)
            else:
                logger.info(f"WebSocket JWT: No valid token found, setting anonymous user")
                scope['user'] = AnonymousUser()
        
        logger.info(f"WebSocket JWT: Final user: {scope['user']}")
        
        # Continue processing
        return await super().__call__(scope, receive, send) 