from django.urls import re_path
from . import consumers

# Define WebSocket URL patterns (JWT auth is handled in ASGI config)
websocket_urlpatterns = [
    re_path(r'ws/messages/$', consumers.MessageConsumer.as_asgi()),
] 