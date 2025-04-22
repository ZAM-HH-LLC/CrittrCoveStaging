from django.urls import re_path
from . import consumers
from .middleware import JWTAuthMiddleware
from channels.routing import URLRouter
from channels.auth import AuthMiddlewareStack

# Define WebSocket URL patterns
websocket_urlpatterns = [
    re_path(r"ws/messages/$", JWTAuthMiddleware(AuthMiddlewareStack(
        URLRouter([
            re_path(r"^$", consumers.MessageConsumer.as_asgi()),
        ])
    ))),
] 