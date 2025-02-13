from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_professional_status, name='get_professional_status'),
] 