"""
URL configuration for zenexotics_backend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
    TokenVerifyView,
)
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse

def root_ok(request):
    return HttpResponse("OK", status=200)

urlpatterns = [
    path("", root_ok),
    path("admin/", admin.site.urls),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('api/token/verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('api/', include([
        # Core utilities
        path('core/', include('core.urls')),
        
        # User Management
        path('users/', include('users.urls')),
        path('professional-status/', include('professional_status.urls')),
        path('clients/', include('clients.urls')),
        path('professionals/', include('professionals.urls')),
        path('professional-facilities/', include('professional_facilities.urls')),
        
        # Location Management
        path('locations/', include('locations.urls')),
        
        # Pet Management
        path('pets/', include('pets.urls')),
        
        # Service Management
        path('services/', include('services.urls')),
        path('service-rates/', include('service_rates.urls')),
        path('service-moderation/', include('service_moderation.urls')),
        
        # Availability Management
        path('availability/', include('availability.urls')),
        path('default-availability/', include('default_availability.urls')),
        path('shared-availability/', include('shared_availability.urls')),
        
        # Booking Management
        path('bookings/', include('bookings.urls')),
        path('booking-occurrences/', include('booking_occurrences.urls')),
        path('booking-summary/', include('booking_summary.urls')),
        path('booking-occurrence-rates/', include('booking_occurrence_rates.urls')),
        path('booking-details/', include('booking_details.urls')),
        path('booking-pets/', include('booking_pets.urls')),
        path('booking_drafts/', include('booking_drafts.urls')),
        
        # Review Management
        path('reviews/', include('reviews.urls')),
        path('review-moderation/', include('review_moderation.urls')),
        path('client-reviews/', include('client_reviews.urls')),
        path('professional-reviews/', include('professional_reviews.urls')),
        
        # Communication
        path('messages/', include('user_messages.urls')),
        path('conversations/', include('conversations.urls')),
        
        # Payment Management
        path('payment-methods/', include('payment_methods.urls')),
        path('payments/', include('payments.urls')),
        
        # Contracts
        path('contracts/', include('contracts.urls')),
        
        # Logging
        path('search-logs/', include('search_logs.urls')),
        path('interaction-logs/', include('interaction_logs.urls')),
        path('error-logs/', include('error_logs.urls')),
        path('engagement-logs/', include('engagement_logs.urls')),
    ])),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Always serve static files
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
