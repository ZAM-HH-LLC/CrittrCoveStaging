from django.urls import path
from . import views

urlpatterns = [
    path('', views.BookingListView.as_view(), name='booking-list'),
    path('create/', views.CreateBookingView.as_view(), name='booking-create'),
    path('request_booking/', views.RequestBookingView.as_view(), name='booking-request'),
    path('<int:booking_id>/', views.BookingDetailView.as_view(), name='booking-detail'),
    path('<int:booking_id>/available_services/', views.AvailableServicesView.as_view(), name='booking-available-services'),
    path('update_pets/', views.UpdateBookingPetsView.as_view(), name='booking-update-pets'),
    path('update_service-type/', views.UpdateBookingServiceTypeView.as_view(), name='booking-update-service-type'),
    path('update_occurrences/', views.UpdateBookingOccurrencesView.as_view(), name='booking-update-occurrences'),
]