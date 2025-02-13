from django.urls import path, include
from rest_framework.routers import DefaultRouter
from typing import List, Tuple, Any
from importlib import import_module
from django.core.exceptions import ImproperlyConfigured

def create_versioned_urls(app_name: str, viewset_registrations: List[Tuple[str, Any, str]] = None):
    """
    Creates a standardized URL configuration for an app with versioning support.
    
    Args:
        app_name (str): The name of the app for which to create URLs
        viewset_registrations (List[Tuple[str, ViewSet, str]]): Optional list of tuples containing
            (prefix, viewset, basename) for router registration
        
    Returns:
        tuple: A tuple containing (router, urlpatterns)
    """
    router = DefaultRouter()
    
    # Register any viewsets if provided
    if viewset_registrations:
        for prefix, viewset, basename in viewset_registrations:
            router.register(prefix, viewset, basename=basename)
    
    # Try to import the v1 urls module
    try:
        v1_urls_module = import_module(f'{app_name}.v1.urls')
        v1_patterns = getattr(v1_urls_module, 'urlpatterns', [])
    except (ImportError, AttributeError):
        v1_patterns = []
    
    # Create the final URL patterns
    urlpatterns = [
        path('v1/', include((v1_patterns + list(router.urls), app_name), namespace='v1')),
    ]
    
    return router, urlpatterns 