from django.urls import path
from . import views

urlpatterns = [
    path('<int:booking_id>/update/', views.BookingDraftUpdateView.as_view(), name='booking_draft_update'),
    path('<int:booking_id>/available_pets/', views.AvailablePetsView.as_view(), name='booking_draft_available_pets'),
    path('<int:booking_id>/update_occurrences/', views.UpdateBookingOccurrencesView.as_view(), name='booking_draft_update_occurrences'),
    path('<int:booking_id>/update_pets/', views.UpdateBookingPetsView.as_view(), name='booking_draft_update_pets'),
    path('<int:booking_id>/update_service_type/', views.UpdateServiceTypeView.as_view(), name='booking_draft_update_service_type'),
]