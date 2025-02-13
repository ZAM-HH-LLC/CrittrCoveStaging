from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Pet
from .serializers import PetSerializer

class PetViewSet(viewsets.ModelViewSet):
    queryset = Pet.objects.all()
    serializer_class = PetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """
        Filter pets to return only those belonging to the current user
        or pets assigned to the user as a sitter
        """
        user = self.request.user
        return Pet.objects.filter(
            models.Q(client__user=user) | 
            models.Q(sitter__user=user)
        )

    @action(detail=False, methods=['GET'])
    def my_pets(self, request):
        """
        Return only pets owned by the current user
        """
        pets = Pet.objects.filter(client__user=request.user)
        serializer = self.get_serializer(pets, many=True)
        return Response(serializer.data)