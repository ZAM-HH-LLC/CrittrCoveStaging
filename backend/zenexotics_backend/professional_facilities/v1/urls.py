from django.urls import path
from . import views

urlpatterns = [
    path('<int:professional_id>/', views.get_professional_facilities, name='professional-facilities'),
] 