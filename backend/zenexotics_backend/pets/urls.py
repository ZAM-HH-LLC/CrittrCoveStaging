from core.url_factory import create_versioned_urls
from .v1 import views

app_name = 'pets'

# Create URLs using the factory with viewset registration
router, urlpatterns = create_versioned_urls(
    app_name,
    viewset_registrations=[
        ('pets', views.PetViewSet, 'pet'),
    ]
)