from django.urls import path, include
from core.url_factory import create_versioned_urls

app_name = 'booking_drafts'

# Create URLs using the factory
router, urlpatterns = create_versioned_urls(app_name)

urlpatterns = [
    path('v1/', include('booking_drafts.v1.urls')),
]