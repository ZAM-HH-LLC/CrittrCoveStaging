from django.urls import path, include
from rest_framework.routers import DefaultRouter
from ..views import TutorialStatusViewSet
from . import views
from .views import user_profile, clear_url_cache

# Create a router for the TutorialStatusViewSet
tutorial_router = DefaultRouter()
tutorial_router.register(r'tutorial-status', TutorialStatusViewSet, basename='tutorial-status')

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('reset-password/', views.PasswordResetRequestView.as_view(), name='password_reset_request'),
    path('reset-password-confirm/<uidb64>/<token>/', views.PasswordResetConfirmView.as_view(), name='password_reset_confirm'),
    path('sitter-status/', views.SitterStatusView.as_view(), name='sitter_status'),
    path('get-name/', views.get_user_name, name='get_user_name'),
    path('contact/', views.ContactFormView.as_view(), name='contact_form'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('get-info/', views.get_user_info, name='get_user_info'),
    path('time-settings/', views.get_time_settings, name='time_settings'),
    path('update-time-settings/', views.update_time_settings, name='update_time_settings'),
    path('profile/', views.user_profile, name='user-profile'),
    path('update_profile_info/', views.update_profile_info, name='update-profile-info'),
    path('clear-url-cache/', clear_url_cache, name='clear-url-cache'),
]

# Add the tutorial router URLs
urlpatterns += tutorial_router.urls 