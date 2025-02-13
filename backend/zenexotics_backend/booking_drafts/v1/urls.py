from django.urls import path
from . import views

urlpatterns = [
    path('<int:booking_id>/update/', views.BookingDraftUpdateView.as_view(), name='booking-draft-update'),
    path('<int:booking_id>/available_pets/', views.AvailablePetsView.as_view(), name='booking-draft-available-pets'),
]