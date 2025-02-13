from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import models
from ..models import Pet
from ..serializers import PetSerializer, UserPetListSerializer

class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter pets to return only those belonging to the current user
        """
        user = self.request.user
        return Pet.objects.filter(owner=user)

    def list(self, request, *args, **kwargs):
        """
        Return all pets owned by the current user in the specified format
        """
        try:
            pets = self.get_queryset()
            serializer = UserPetListSerializer(pets, many=True)
            return Response({'pets': serializer.data})
        except Exception as e:
            return Response(
                {'error': 'An error occurred while fetching pets'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 