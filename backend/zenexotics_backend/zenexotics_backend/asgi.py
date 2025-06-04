"""
ASGI config for zenexotics_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os
import logging

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zenexotics_backend.settings")

# Initialize Django ASGI application first
django_asgi_app = get_asgi_application()

# Import websocket routing and middleware after Django is initialized
import user_messages.routing
from user_messages.middleware import JWTAuthMiddleware

# Set up logging
logger = logging.getLogger("asgi")

print("🔥 ASGI: Loading ASGI configuration...")
print("🔥 ASGI: JWTAuthMiddleware imported:", JWTAuthMiddleware)
print("🔥 ASGI: websocket_urlpatterns:", user_messages.routing.websocket_urlpatterns)

# Create the websocket application with middleware stack (removed AllowedHostsOriginValidator for testing)
websocket_app = JWTAuthMiddleware(
    URLRouter(
        user_messages.routing.websocket_urlpatterns
    )
)

print("🔥 ASGI: WebSocket application created with middleware stack (no AllowedHostsOriginValidator)")

# Create a class to log HTTP requests
class LoggingHTTPApplication:
    def __init__(self, app):
        self.app = app
        
    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            path = scope.get("path", "")
            print(f"🔥 ASGI HTTP: Received request for {path}")
        
        await self.app(scope, receive, send)

# Wrap the Django ASGI app with the logging middleware
http_app = LoggingHTTPApplication(django_asgi_app)

application = ProtocolTypeRouter({
    "http": http_app,
    "websocket": websocket_app,
})

print("🔥 ASGI: Application configured successfully")
print("🔥 ASGI: Final application:", application)
