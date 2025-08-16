from django.urls import path
from . import views

urlpatterns = [
    path('track/', views.track_blog_visitor, name='track_blog_visitor'),
    path('summary/', views.blog_analytics_summary, name='blog_analytics_summary'),
]