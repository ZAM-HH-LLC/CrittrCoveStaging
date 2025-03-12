from django.urls import path
from . import views

urlpatterns = [
    path('professional/services/', views.get_professional_services_with_rates, name='professional-services-with-rates'),
]