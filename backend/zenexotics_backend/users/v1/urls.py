from django.urls import path
from . import views

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
] 