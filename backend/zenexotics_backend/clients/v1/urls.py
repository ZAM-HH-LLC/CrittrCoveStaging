from django.urls import path
from . import views

urlpatterns = [
    path('', views.ClientListView.as_view(), name='client_list'),
    path('dashboard/', views.get_client_dashboard, name='client_dashboard'),
    path('profile/', views.ClientProfileEditView.as_view(), name='client-profile-edit'),
    path('<int:client_id>/pets/', views.ClientPetsView.as_view(), name='client-pets'),
    path('get-pets/', views.GetClientPetsView.as_view(), name='get-client-pets'),
    path('mark-noreply-as-not-spam/', views.mark_noreply_as_not_spam, name='mark-noreply-as-not-spam'),
] 