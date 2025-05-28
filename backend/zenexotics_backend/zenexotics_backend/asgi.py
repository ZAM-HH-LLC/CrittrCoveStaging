"""
ASGI config for zenexotics_backend project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/4.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "zenexotics_backend.settings")

# Initialize Django ASGI application first
django_asgi_app = get_asgi_application()

# Import websocket routing and middleware after Django is initialized
import user_messages.routing
from user_messages.middleware import JWTAuthMiddleware

print("🔥 ASGI: Loading ASGI configuration...")
print("🔥 ASGI: JWTAuthMiddleware imported:", JWTAuthMiddleware)
print("🔥 ASGI: websocket_urlpatterns:", user_messages.routing.websocket_urlpatterns)

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(
                user_messages.routing.websocket_urlpatterns
            )
        )
    ),
})

print("🔥 ASGI: Application configured successfully")
