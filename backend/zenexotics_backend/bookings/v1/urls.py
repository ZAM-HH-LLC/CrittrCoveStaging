from django.urls import path
from . import views

urlpatterns = [
    path('', views.BookingListView.as_view(), name='booking-list'),
    path('create/', views.CreateBookingView.as_view(), name='booking-create'),
    path('create-from-draft/', views.CreateFromDraftView.as_view(), name='booking-create-from-draft'),
    path('request_booking/', views.RequestBookingView.as_view(), name='booking-request'),
    path('<int:booking_id>/details/', views.BookingDetailView.as_view(), name='booking-detail'),
    path('<int:booking_id>/available_services/', views.AvailableServicesView.as_view(), name='booking-available-services'),
    path('<str:booking_id>/service_rates/', views.GetServiceRatesView.as_view(), name='service_rates'),
    path('<str:booking_id>/calculate_occurrence_cost/', views.CalculateOccurrenceCostView.as_view(), name='calculate_occurrence_cost'),
    path('<int:booking_id>/update/', views.UpdateBookingView.as_view(), name='booking-update'),
    path('<int:booking_id>/approve/', views.ApproveBookingView.as_view(), name='booking-approve'),
    path('<int:booking_id>/request-changes/', views.RequestBookingChangesView.as_view(), name='booking-request-changes'),
    path('connections/', views.ConnectionsView.as_view(), name='connections'),
]