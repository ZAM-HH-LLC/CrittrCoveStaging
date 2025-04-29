from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_conversations, name='get_conversations'),
    # path('open_conversation/', views.open_conversation, name='open_conversation'),
] 