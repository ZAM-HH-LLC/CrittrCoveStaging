from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ClientReviewViewSet, ProfessionalReviewViewSet, ReviewRequestViewSet

app_name = 'reviews'

router = DefaultRouter()
router.register(r'client-reviews', ClientReviewViewSet)
router.register(r'professional-reviews', ProfessionalReviewViewSet)
router.register(r'requests', ReviewRequestViewSet)

urlpatterns = [
    path('v1/', include(router.urls)),
] 