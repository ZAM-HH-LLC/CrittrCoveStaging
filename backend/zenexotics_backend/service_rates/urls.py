from core.url_factory import create_versioned_urls

app_name = 'service_rates'

# Create URLs using the factory
router, urlpatterns = create_versioned_urls(app_name)