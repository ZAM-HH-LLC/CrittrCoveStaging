from django.urls import path
from . import views

urlpatterns = [
    path('', views.BookingListView.as_view(), name='booking-list'),
    path('<int:booking_id>/', views.BookingDetailView.as_view(), name='booking-detail'),
    path('<int:booking_id>/available_services/', views.AvailableServicesView.as_view(), name='booking-available-services'),
]