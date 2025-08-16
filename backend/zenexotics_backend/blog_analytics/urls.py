from django.urls import path, include

app_name = 'blog_analytics'

urlpatterns = [
    path('v1/', include('blog_analytics.v1.urls')),
]