from django.shortcuts import render
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import Client
from .serializers import ClientSerializer
from professional_status.models import ProfessionalStatus
import logging

logger = logging.getLogger(__name__)

# Create your views here.

class ClientListView(generics.ListAPIView):
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        logger.info("=== Starting Client List Request ===")
        logger.info(f"Request user: {user.email}")
        
        try:
            professional_status = ProfessionalStatus.objects.get(user=user)
            if professional_status.is_approved:
                logger.info(f"User {user.email} is an approved professional - returning all clients")
                return Client.objects.all()
            else:
                logger.warning(f"User {user.email} is not an approved professional - returning empty list")
                return Client.objects.none()
        except ProfessionalStatus.DoesNotExist:
            logger.warning(f"User {user.email} has no professional status - returning empty list")
            return Client.objects.none()

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        logger.info(f"Response data count: {len(response.data)}")
        return response
