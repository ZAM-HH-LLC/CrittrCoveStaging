from django.urls import path
from . import views

urlpatterns = [
    path('send_norm_message/', views.send_normal_message, name='send_normal_message'),
    path('conversation/<str:conversation_id>/', views.get_conversation_messages, name='get_conversation_messages'),
    path('prerequest_booking/<str:conversation_id>/', views.get_prerequest_booking_data, name='get_prerequest_booking_data'),
    path('send_request_booking/', views.send_request_booking, name='send_request_booking'),
] 