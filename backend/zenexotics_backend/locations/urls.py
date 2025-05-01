from django.urls import path
from .views import SupportedLocationsView, InitializeLocationsView

urlpatterns = [
    path('v1/supported/', SupportedLocationsView.as_view(), name='supported-locations'),
    path('v1/initialize/', InitializeLocationsView.as_view(), name='initialize-locations'),
] 