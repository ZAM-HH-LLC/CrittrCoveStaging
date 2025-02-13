from django.urls import path, include
from core.url_factory import create_versioned_urls

app_name = 'clients'

# Import v1 URLs directly
from .v1 import urls as v1_urls

# Create the URL patterns
urlpatterns = [
    path('v1/', include((v1_urls.urlpatterns, app_name), namespace='v1')),
]