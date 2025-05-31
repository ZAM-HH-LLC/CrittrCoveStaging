from django.urls import path
from . import views

urlpatterns = [
    path('log-auth-event/', views.log_auth_event, name='log_auth_event'),
] 