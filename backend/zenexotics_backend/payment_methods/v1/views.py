# Payment Methods views will be added here

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from ..models import PaymentMethod
from ..serializers import PaymentMethodSerializer
from professional_status.models import ProfessionalStatus
import logging

logger = logging.getLogger(__name__)

class PaymentMethodsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get the method_type from query parameters
            method_type = request.query_params.get('method_type')

            # Validate method_type
            valid_method_types = ['Pay_for', 'Receive_payment', 'both']
            if not method_type or method_type not in valid_method_types:
                return Response(
                    {'error': f'Invalid or missing method_type. Must be one of: {", ".join(valid_method_types)}'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Base queryset for the user's payment methods
            payment_methods = PaymentMethod.objects.filter(user=request.user)

            # Check if user is an approved professional for receive payments
            is_approved_professional = ProfessionalStatus.objects.filter(
                user=request.user,
                is_approved=True
            ).exists()

            # Handle different method_types
            if method_type == 'both':
                # Get pay_for methods
                pay_for_methods = payment_methods.filter(
                    type_of_payment__in=['Pay_for', 'both']
                )
                
                # Get receive methods (only if professional)
                receive_methods = []
                if is_approved_professional:
                    receive_methods = payment_methods.filter(
                        type_of_payment__in=['Receive_payment', 'both']
                    )
                
                # Serialize both sets
                response_data = {
                    'pay_for': PaymentMethodSerializer(pay_for_methods, many=True).data,
                    'receive': PaymentMethodSerializer(receive_methods, many=True).data
                }
                return Response(response_data, status=status.HTTP_200_OK)
            
            # Handle Pay_for and Receive_payment types
            elif method_type == 'Pay_for':
                payment_methods = payment_methods.filter(
                    type_of_payment__in=['Pay_for', 'both']
                )
            elif method_type == 'Receive_payment':
                if not is_approved_professional:
                    return Response(
                        {'error': 'User is not an approved professional'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                payment_methods = payment_methods.filter(
                    type_of_payment__in=['Receive_payment', 'both']
                )

            # Serialize the filtered payment methods
            serialized_methods = PaymentMethodSerializer(payment_methods, many=True).data
            return Response(serialized_methods, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching payment methods: {str(e)}")
            return Response(
                {'error': 'An error occurred while fetching payment methods'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )