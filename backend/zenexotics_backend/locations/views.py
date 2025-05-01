from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAdminUser
from .models import Location


class SupportedLocationsView(APIView):
    """
    API view to get supported locations for signup.
    This centralizes location management so we can expand to new cities
    without requiring app updates.
    """
    permission_classes = [AllowAny]  # Allow anyone to access this endpoint
    
    def get(self, request):
        # Get all locations from the database
        locations = Location.objects.all()
        
        # Convert to the expected format
        locations_data = [
            {
                "name": location.name,
                "supported": location.supported
            }
            for location in locations
        ]
        
        # Always include "Other" option if not already in the database
        if not any(loc["name"] == "Other" for loc in locations_data):
            locations_data.append({
                "name": "Other",
                "supported": False
            })
        
        return Response({"locations": locations_data})


class InitializeLocationsView(APIView):
    """
    Admin utility view to initialize default locations if none exist.
    This is helpful during initial setup.
    """
    permission_classes = [IsAdminUser]  # Only allow admin users
    
    def post(self, request):
        # Check if we already have locations
        if Location.objects.exists():
            return Response(
                {"message": "Locations already exist. Delete them first if you want to reinitialize."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create default locations
        default_locations = [
            {"name": "Colorado Springs", "supported": True, "display_order": 1},
            {"name": "Denver", "supported": False, "display_order": 2},
            {"name": "Boulder", "supported": False, "display_order": 3},
            {"name": "Fort Collins", "supported": False, "display_order": 4},
            {"name": "Other", "supported": False, "display_order": 999},
        ]
        
        for loc in default_locations:
            Location.objects.create(
                name=loc["name"],
                supported=loc["supported"],
                display_order=loc["display_order"]
            )
        
        return Response({"message": "Default locations initialized successfully."})
