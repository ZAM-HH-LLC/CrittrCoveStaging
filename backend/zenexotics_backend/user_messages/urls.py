from core.url_factory import create_versioned_urls

app_name = 'user_messages'

# Create URLs using the factory
router, urlpatterns = create_versioned_urls(app_name) 