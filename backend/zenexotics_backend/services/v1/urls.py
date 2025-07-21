from django.urls import path
from . import views

urlpatterns = [
    path('professional/services/', views.get_professional_services_with_rates, name='professional-services-with-rates'),
    path('create/', views.create_service, name='create-service'),
    path('delete/<int:service_id>/', views.delete_service, name='delete-service'),
    path('unarchive/<int:service_id>/', views.unarchive_service, name='unarchive-service'),
    path('update/<int:service_id>/', views.update_service, name='update-service'),
]