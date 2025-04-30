from django.urls import path
from .views import (
    AvailableServicesView,
    AvailablePetsView,
    UpdateBookingDraftView,
    UpdateBookingDraftPetsAndServicesView,
    UpdateBookingRatesView,
    UpdateBookingDraftMultipleDaysView,
    UpdateBookingDraftRecurringView,
)
from booking_drafts.v1.views import UpdateBookingDraftTimeAndDateView

urlpatterns = [
    path('<int:booking_id>/available_services/', AvailableServicesView.as_view(), name='available_services'),
    path('<int:booking_id>/available_pets/', AvailablePetsView.as_view(), name='available_pets'),
    path('<int:draft_id>/update_pets_and_services/', UpdateBookingDraftPetsAndServicesView.as_view(), name='update_pets_and_services'),
    path('update-time-and-date/<str:draft_id>/', UpdateBookingDraftTimeAndDateView.as_view(), name='update-booking-draft-time-and-date'),
    path('update-rates/<str:draft_id>/', UpdateBookingRatesView.as_view(), name='update-booking-rates'),
    path('update-multiple-days/<str:draft_id>/', UpdateBookingDraftMultipleDaysView.as_view(), name='update-multiple-days'),
    path('update-recurring/<str:draft_id>/', UpdateBookingDraftRecurringView.as_view(), name='update-recurring'),
]