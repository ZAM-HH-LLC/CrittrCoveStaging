from django.urls import path, include
from core.url_factory import create_versioned_urls

app_name = 'user_messages'

# Import v1 patterns directly
from .v1.urls import urlpatterns as v1_patterns

# Create URLs using the factory but with explicit v1 patterns
router, _ = create_versioned_urls(app_name)

# Create the final URL patterns
urlpatterns = [
    path('v1/', include((v1_patterns, app_name), namespace='v1')),
] 