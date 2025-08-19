from django.urls import path
from . import views

urlpatterns = [
    path('dashboard/', views.get_professional_dashboard, name='professional_dashboard'),
    path('services/<int:professional_id>/', views.get_professional_services, name='get_professional_services'),
    path('search/', views.search_professionals, name='search_professionals'),
    path('get-matched/', views.submit_get_matched_request, name='submit_get_matched_request'),
]