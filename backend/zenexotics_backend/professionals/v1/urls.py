from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.get_professional_dashboard, name='professional_dashboard'),
    path('profile/client_view/<int:professional_id>/', views.get_professional_client_view, name='professional-client-view'),
    path('services/<int:professional_id>/', views.get_professional_services, name='get_professional_services'),
]