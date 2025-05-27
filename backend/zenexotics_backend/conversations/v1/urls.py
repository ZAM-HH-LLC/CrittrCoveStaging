from django.urls import path
from . import views

urlpatterns = [
    path('', views.get_conversations, name='get_conversations'),
    path('create/', views.create_conversation, name='create_conversation'),
    # path('open_conversation/', views.open_conversation, name='open_conversation'),
] 