from django.urls import path
from .views import (
    AvailableServicesView,
    AvailablePetsView,
    UpdateBookingDraftView,
)

urlpatterns = [
    path('<int:booking_id>/available_services/', AvailableServicesView.as_view(), name='available_services'),
    path('<int:booking_id>/available_pets/', AvailablePetsView.as_view(), name='available_pets'),
    path('<int:draft_id>/update/', UpdateBookingDraftView.as_view(), name='update_draft'),
]