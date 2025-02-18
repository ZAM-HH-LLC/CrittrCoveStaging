from django.urls import path
from . import views

urlpatterns = [
    path('send_norm_message/', views.send_normal_message, name='send_normal_message'),
    path('conversation/<int:conversation_id>/', views.get_conversation_messages, name='get_conversation_messages'),
] 