from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..models import ProfessionalFacility
from ..serializers import ProfessionalFacilitySerializer

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_professional_facilities(request, professional_id):
    try:
        facilities = ProfessionalFacility.objects.filter(professional_id=professional_id)
        serializer = ProfessionalFacilitySerializer(facilities, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        ) 