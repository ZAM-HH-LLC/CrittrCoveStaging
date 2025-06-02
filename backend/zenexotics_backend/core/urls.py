from django.urls import path
from . import views
from .views import (
    log_auth_event,
    debug_log,
)

urlpatterns = [
    path('v1/log_auth_event/', log_auth_event, name='log_auth_event'),
    path('v1/debug_log/', debug_log, name='debug_log'),
] 