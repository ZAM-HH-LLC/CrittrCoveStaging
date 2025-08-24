from django.urls import path
from . import views

urlpatterns = [
    # Stripe payment method endpoints
    path('setup-intent/', views.create_setup_intent, name='create_setup_intent_new'),
    path('setup-payouts/', views.onboard_professional, name='setup_payouts'),
    path('connect-status/', views.connect_status, name='connect_status'),
    path('stripe-webhook/', views.stripe_webhook, name='stripe_webhook'),
]