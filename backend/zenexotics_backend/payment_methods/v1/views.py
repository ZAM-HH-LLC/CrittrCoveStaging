# Payment Methods views will be added here

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework_simplejwt.authentication import JWTAuthentication
from django.db import models
from django.shortcuts import get_object_or_404
from ..models import PaymentMethod
from ..serializers import PaymentMethodSerializer, PaymentMethodCreateSerializer
from professional_status.models import ProfessionalStatus
import logging
import stripe
from django.conf import settings

logger = logging.getLogger(__name__)

class PaymentMethodsView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            # Get the method_type from query parameters
            method_type = request.query_params.get('method_type')

            # Validate method_type
            valid_method_types = ['payment', 'payout', 'both']
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
                # Get payment methods (any method that can be used for payments)
                payment_methods_list = payment_methods.filter(
                    models.Q(type__in=['CREDIT_CARD', 'DEBIT_CARD']) | 
                    models.Q(type='BANK_ACCOUNT')
                )
                
                # Get payout methods (only bank accounts, only if professional)
                payout_methods_list = []
                if is_approved_professional:
                    payout_methods_list = payment_methods.filter(type='BANK_ACCOUNT')
                
                # Serialize both sets
                response_data = {
                    'payment_methods': PaymentMethodSerializer(payment_methods_list, many=True).data,
                    'payout_methods': PaymentMethodSerializer(payout_methods_list, many=True).data
                }
                return Response(response_data, status=status.HTTP_200_OK)
            
            # Handle payment and payout types
            elif method_type == 'payment':
                # All payment methods can be used for payments
                payment_methods = payment_methods.filter(
                    models.Q(type__in=['CREDIT_CARD', 'DEBIT_CARD']) | 
                    models.Q(type='BANK_ACCOUNT')
                )
            elif method_type == 'payout':
                if not is_approved_professional:
                    return Response(
                        {'error': 'User is not an approved professional'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                # Only bank accounts can be used for payouts
                payment_methods = payment_methods.filter(type='BANK_ACCOUNT')

            # Serialize the filtered payment methods
            serialized_methods = PaymentMethodSerializer(payment_methods, many=True).data
            return Response(serialized_methods, status=status.HTTP_200_OK)

        except Exception as e:
            logger.error(f"Error fetching payment methods: {str(e)}")
            return Response(
                {'error': 'An error occurred while fetching payment methods'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def post(self, request):
        """Save a payment method after successful Stripe setup"""
        try:
            # Initialize Stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            serializer = PaymentMethodCreateSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
            stripe_pm_id = serializer.validated_data['stripe_payment_method_id']
            is_approved_professional = serializer.validated_data.get('is_approved_professional', False)
            
            # Fetch payment method details from Stripe
            try:
                stripe_pm = stripe.PaymentMethod.retrieve(stripe_pm_id)
            except stripe.error.InvalidRequestError:
                return Response(
                    {'error': 'Invalid Stripe payment method ID'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if payment method already exists
            if PaymentMethod.objects.filter(
                user=request.user,
                stripe_payment_method_id=stripe_pm_id
            ).exists():
                return Response(
                    {'error': 'Payment method already exists'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Extract payment method details based on type
            pm_data = {
                'user': request.user,
                'stripe_payment_method_id': stripe_pm_id,
            }
            
            if stripe_pm.type == 'card':
                card = stripe_pm.card
                pm_data.update({
                    'type': 'CREDIT_CARD' if card.funding == 'credit' else 'DEBIT_CARD',
                    'last4': card.last4,
                    'brand': card.brand.title(),
                    'exp_month': card.exp_month,
                    'exp_year': card.exp_year,
                    'billing_postal_code': stripe_pm.billing_details.address.postal_code if stripe_pm.billing_details.address else None,
                    'is_verified': True,  # Payment method is verified if we successfully retrieved it from Stripe
                })
                
                # Logic: Credit cards are always for payments only
                is_first_payment_method = not PaymentMethod.objects.filter(
                    user=request.user
                ).exists()
                pm_data['is_primary_payment'] = is_first_payment_method
                pm_data['is_primary_payout'] = False
                
            elif stripe_pm.type == 'us_bank_account':
                bank = stripe_pm.us_bank_account
                pm_data.update({
                    'type': 'BANK_ACCOUNT',
                    'last4': bank.last4,
                    'bank_account_last4': bank.last4,
                    'bank_name': bank.bank_name,
                    'is_verified': True,  # Payment method is verified if we successfully retrieved it from Stripe
                })
                
                # Logic: Bank accounts based on professional status
                is_first_payment_method = not PaymentMethod.objects.filter(
                    user=request.user
                ).exists()
                
                if is_approved_professional:
                    # Professional: bank can be used for both payment and payout
                    pm_data['is_primary_payment'] = is_first_payment_method
                    pm_data['is_primary_payout'] = is_first_payment_method
                else:
                    # Non-professional: bank only for payments
                    pm_data['is_primary_payment'] = is_first_payment_method
                    pm_data['is_primary_payout'] = False
            
            else:
                return Response(
                    {'error': f'Unsupported payment method type: {stripe_pm.type}'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create the payment method
            payment_method = PaymentMethod.objects.create(**pm_data)
            
            # Set as primary if needed
            if pm_data.get('is_primary_payment'):
                PaymentMethod.set_primary_payment_method(request.user, payment_method)
            if pm_data.get('is_primary_payout'):
                PaymentMethod.set_primary_payout_method(request.user, payment_method)
            
            # Return the created payment method
            response_data = PaymentMethodSerializer(payment_method).data
            return Response(response_data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            logger.error(f"Error saving payment method: {str(e)}")
            return Response(
                {'error': 'An error occurred while saving the payment method'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

class PaymentMethodDetailView(APIView):
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def patch(self, request, payment_method_id):
        """Update a payment method (e.g., set as primary)"""
        try:
            # Get the payment method
            payment_method = get_object_or_404(
                PaymentMethod,
                payment_method_id=payment_method_id,
                user=request.user
            )
            
            # Check if request wants to set as primary payment
            if request.data.get('is_primary_payment') is True:
                PaymentMethod.set_primary_payment_method(request.user, payment_method)
                logger.info(f"Set payment method {payment_method_id} as primary payment for user {request.user.id}")
            
            # Check if request wants to set as primary payout  
            if request.data.get('is_primary_payout') is True:
                if payment_method.type == 'BANK_ACCOUNT':
                    PaymentMethod.set_primary_payout_method(request.user, payment_method)
                    logger.info(f"Set payment method {payment_method_id} as primary payout for user {request.user.id}")
                else:
                    return Response(
                        {'error': 'Only bank accounts can be set as primary payout method'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            
            # Return updated payment method
            payment_method.refresh_from_db()
            response_data = PaymentMethodSerializer(payment_method).data
            return Response(response_data, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error updating payment method: {str(e)}")
            return Response(
                {'error': 'An error occurred while updating the payment method'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def delete(self, request, payment_method_id):
        """Delete a payment method"""
        try:
            # Initialize Stripe
            stripe.api_key = settings.STRIPE_SECRET_KEY
            
            # Get the payment method
            payment_method = get_object_or_404(
                PaymentMethod,
                payment_method_id=payment_method_id,
                user=request.user
            )
            
            # Detach from Stripe first
            try:
                stripe.PaymentMethod.detach(payment_method.stripe_payment_method_id)
            except stripe.error.InvalidRequestError as e:
                # Payment method might already be detached or doesn't exist
                logger.warning(f"Stripe detach failed for payment method {payment_method_id}: {str(e)}")
            
            # If this was the primary payment method, set another as primary
            if payment_method.is_primary_payment:
                other_payment_method = PaymentMethod.objects.filter(
                    user=request.user,
                    type__in=['CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT']
                ).exclude(payment_method_id=payment_method_id).first()
                
                if other_payment_method:
                    PaymentMethod.set_primary_payment_method(request.user, other_payment_method)
            
            # If this was the primary payout method, set another as primary
            if payment_method.is_primary_payout:
                other_payout_method = PaymentMethod.objects.filter(
                    user=request.user,
                    type='BANK_ACCOUNT'
                ).exclude(payment_method_id=payment_method_id).first()
                
                if other_payout_method:
                    PaymentMethod.set_primary_payout_method(request.user, other_payout_method)
            
            # Delete from database
            payment_method.delete()
            
            return Response({'success': True}, status=status.HTTP_200_OK)
            
        except Exception as e:
            logger.error(f"Error deleting payment method: {str(e)}")
            return Response(
                {'error': 'An error occurred while deleting the payment method'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )