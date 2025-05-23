from django.conf import settings
from django.http import HttpResponse

class SkipSSLRedirectForHealthCheckMiddleware:
    """
    Skips SECURE_SSL_REDIRECT for the health check path ("/").
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Only skip for the root path ("/") and only if SECURE_SSL_REDIRECT is True
        if (
            getattr(settings, "SECURE_SSL_REDIRECT", False)
            and request.path == "/"
            and not request.is_secure()
        ):
            # Return a 200 OK directly for the health check, BYPASSING all other middleware
            return HttpResponse("OK", status=200)
        return self.get_response(request) 