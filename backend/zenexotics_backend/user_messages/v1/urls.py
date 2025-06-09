from django.urls import path
from . import views

urlpatterns = [
    path('send_norm_message/', views.send_normal_message, name='send_normal_message'),
    path('conversation/<int:conversation_id>/', views.get_conversation_messages, name='get_conversation_messages'),
    path('prerequest_booking/<int:conversation_id>/', views.get_prerequest_booking_data, name='get_prerequest_booking_data'),
    path('send_request_booking/', views.send_request_booking, name='send_request_booking'),
    path('unread-count/', views.get_unread_message_count, name='get_unread_message_count'),
    path('upload_image/', views.upload_message_image, name='upload_message_image'),
    path('upload_and_send/', views.upload_and_send_message, name='upload_and_send_message'),
] 