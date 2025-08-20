from django.urls import path
from .views import PaymentMethodsView, PaymentMethodDetailView

urlpatterns = [
    path('', PaymentMethodsView.as_view(), name='payment-methods'),
    path('<str:payment_method_id>/', PaymentMethodDetailView.as_view(), name='payment-method-detail'),
]