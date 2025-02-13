from django.urls import path
from . import views

urlpatterns = [
    path('templates/', views.ContractTemplateListView.as_view(), name='contract_templates'),
    path('', views.ContractListCreateView.as_view(), name='contract_list_create'),
    path('<int:pk>/', views.ContractDetailView.as_view(), name='contract_detail'),
] 