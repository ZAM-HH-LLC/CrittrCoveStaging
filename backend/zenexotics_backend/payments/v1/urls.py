from django.urls import path
from . import views

urlpatterns = [
    # Stripe payment method endpoints
    path('create-setup-intent/', views.create_setup_intent, name='create_setup_intent'),
    path('onboard-professional/', views.onboard_professional, name='onboard_professional'),
    path('connect-status/', views.connect_status, name='connect_status'),
    path('stripe-webhook/', views.stripe_webhook, name='stripe_webhook'),
]