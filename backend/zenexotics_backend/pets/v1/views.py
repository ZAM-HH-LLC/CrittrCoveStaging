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
            
    @action(detail=False, methods=['post'], url_path='add-pet')
    def add_pet(self, request):
        """
        Add a new pet for the current user
        """
        try:
            # Set the owner to the current user
            data = request.data.copy()
            data['owner'] = request.user.id
            
            # Create serializer and validate
            serializer = PetSerializer(data=data)
            if serializer.is_valid():
                # Save the pet
                pet = serializer.save()
                
                # Return the created pet data
                return Response(
                    {'message': 'Pet added successfully', 'pet': serializer.data},
                    status=status.HTTP_201_CREATED
                )
            else:
                # Return validation errors
                return Response(
                    {'error': 'Invalid pet data', 'details': serializer.errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
        except Exception as e:
            return Response(
                {'error': f'An error occurred while adding the pet: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            ) 