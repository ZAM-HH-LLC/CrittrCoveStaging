from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import ContractTemplate, Contract
from .serializers import ContractTemplateSerializer, ContractSerializer

class ContractTemplateListView(generics.ListAPIView):
    queryset = ContractTemplate.objects.all()
    serializer_class = ContractTemplateSerializer

class ContractListCreateView(generics.ListCreateAPIView):
    serializer_class = ContractSerializer

    def get_queryset(self):
        # Filter contracts by the logged-in user
        return Contract.objects.filter(sitter=self.request.user)

class ContractDetailView(APIView):
    def get(self, request, pk):
        contract = get_object_or_404(Contract, pk=pk)
        serializer = ContractSerializer(contract)
        return Response(serializer.data)

    def put(self, request, pk):
        contract = get_object_or_404(Contract, pk=pk)
        if contract.is_signed:
            return Response({'error': 'Contract is already signed'}, status=status.HTTP_400_BAD_REQUEST)
        
        contract.is_signed = True
        contract.signed_at = timezone.now()
        contract.save()
        return Response({'message': 'Contract signed successfully'})