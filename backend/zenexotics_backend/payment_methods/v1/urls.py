from django.urls import path
from .views import PaymentMethodsView

urlpatterns = [
    path('', PaymentMethodsView.as_view(), name='payment-methods'),
]