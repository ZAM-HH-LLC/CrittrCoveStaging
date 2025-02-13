from core.url_factory import create_versioned_urls

app_name = 'review_moderation'

# Create URLs using the factory
router, urlpatterns = create_versioned_urls(app_name)