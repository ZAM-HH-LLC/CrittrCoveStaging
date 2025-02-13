from core.url_factory import create_versioned_urls

app_name = 'default_availability'

# Create URLs using the factory
router, urlpatterns = create_versioned_urls(app_name)