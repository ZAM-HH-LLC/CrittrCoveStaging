from django.urls import path
from reviews.v1 import views

urlpatterns = [
    path('get-user-reviews/', views.GetUserReviewsView.as_view(), name='get-user-reviews'),
]
