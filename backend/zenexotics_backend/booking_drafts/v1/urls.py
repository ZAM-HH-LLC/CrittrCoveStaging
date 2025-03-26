from django.urls import path
from .views import (
    AvailableServicesView,
    AvailablePetsView,
    UpdateBookingDraftView,
    UpdateBookingDraftPetsAndServicesView,
)
from booking_drafts.v1.views import UpdateBookingDraftTimeAndDateView

urlpatterns = [
    path('<int:booking_id>/available_services/', AvailableServicesView.as_view(), name='available_services'),
    path('<int:booking_id>/available_pets/', AvailablePetsView.as_view(), name='available_pets'),
    path('<int:draft_id>/update_pets_and_services/', UpdateBookingDraftPetsAndServicesView.as_view(), name='update_pets_and_services'),
    path('update-time-and-date/<str:draft_id>/', UpdateBookingDraftTimeAndDateView.as_view(), name='update-booking-draft-time-and-date'),
]