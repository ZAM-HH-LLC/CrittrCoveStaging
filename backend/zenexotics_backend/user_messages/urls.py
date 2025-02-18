from django.urls import path, include

app_name = 'user_messages'

urlpatterns = [
    path('v1/', include('user_messages.v1.urls')),
] 