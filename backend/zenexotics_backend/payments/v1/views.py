import stripe
import json
import logging
from django.conf import settings
from django.http import HttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_http_methods
from django.contrib.auth.decorators import login_required
from django.utils.decorators import method_decorator
from django.views import View
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from ..stripe_services import (
    get_or_create_stripe_customer,
    get_or_create_connect_express_account,
    create_account_link,
    persist_card_payment_method_from_setup_intent,
    persist_bank_from_account_external,
    get_connect_account_status
)

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_setup_intent(request):
    """
    Create a SetupIntent for saving a card payment method (client role only).
    """
    try:
        user = request.user
        user_role = request.data.get('user_role', 'client')
        
        # Get or create Stripe customer
        customer = get_or_create_stripe_customer(user)
        
        # Only clients should use SetupIntent for card storage
        if user_role != 'client':
            logger.warning(f"MBA2i3j4fi4 SetupIntent requested by non-client role: {user_role} for user {user.user_id}")
            return Response({
                'error': 'SetupIntent is only for client card storage. Pros should use Connect onboarding for payouts.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Create SetupIntent restricted to cards only
        setup_intent = stripe.SetupIntent.create(
            customer=customer.id,
            usage='off_session',
            payment_method_types=['card'],
            metadata={'user_id': user.user_id, 'app_role': 'client'}
        )
        
        logger.info(f"MBA2i3j4fi4 Created card-only SetupIntent for client user {user.user_id}")
        return Response({
            'client_secret': setup_intent.client_secret,
            'setup_intent_id': setup_intent.id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"MBA2i3j4fi4 Error creating setup intent for user {request.user.user_id}: {e}")
        return Response({
            'error': 'Failed to create setup intent'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def onboard_professional(request):
    """
    Create or get Connect Express account and generate onboarding link.
    Legacy endpoint - calls same logic as new function.
    """
    try:
        user = request.user
        logger.warning(f"MBA2i3j4fi4 Legacy onboard_professional endpoint called by user {user.user_id}")
        logger.info(f"MBA2i3j4fi4 Starting Connect onboarding for professional user {user.user_id} ({user.email})")
        
        # Get or create Connect Express account
        logger.info(f"MBA2i3j4fi4 Creating/retrieving Stripe Connect Express account...")
        account = get_or_create_connect_express_account(user)
        logger.info(f"MBA2i3j4fi4 Connect account ready: {account.id}")
        
        # Create account link for onboarding
        refresh_url = request.data.get('refresh_url', f"{settings.FRONTEND_URL}/profile?tab=payments&refresh=true")
        return_url = request.data.get('return_url', f"{settings.FRONTEND_URL}/profile?tab=payments&success=true")
        
        logger.info(f"MBA2i3j4fi4 Creating onboarding link with URLs - refresh: {refresh_url}, return: {return_url}")
        onboarding_url = create_account_link(
            account.id, 
            refresh_url=refresh_url, 
            return_url=return_url
        )
        
        logger.info(f"MBA2i3j4fi4 Successfully created Connect onboarding link for user {user.user_id}")
        return Response({
            'onboarding_url': onboarding_url,
            'account_id': account.id
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"MBA2i3j4fi4 Error creating Connect onboarding for user {request.user.user_id}: {e}")
        
        # Provide more specific error message for Connect not enabled
        error_message = str(e)
        if 'signed up for Connect' in error_message:
            logger.error(f"MBA2i3j4fi4 Stripe Connect not enabled on account - user needs to enable Connect in Dashboard")
            return Response({
                'error': 'Stripe Connect must be enabled in your Stripe Dashboard to set up payouts. Please contact support.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        return Response({
            'error': 'Failed to create onboarding link'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def connect_status(request):
    """
    Get the current status of user's Connect account.
    """
    try:
        user = request.user
        account_status = get_connect_account_status(user)
        
        return Response(account_status, status=status.HTTP_200_OK)
        
    except Exception as e:
        logger.error(f"Error getting Connect status for user {request.user.user_id}: {e}")
        return Response({
            'error': 'Failed to get Connect status'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@csrf_exempt
@require_http_methods(["POST"])
def stripe_webhook(request):
    """
    Handle Stripe webhook events with signature verification.
    """
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE')
    endpoint_secret = settings.STRIPE_WEBHOOK_SECRET
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, endpoint_secret
        )
    except ValueError as e:
        logger.error(f"Invalid payload in webhook: {e}")
        return HttpResponse(status=400)
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"Invalid signature in webhook: {e}")
        return HttpResponse(status=400)
    
    # Handle the event
    try:
        if event['type'] == 'setup_intent.succeeded':
            setup_intent = event['data']['object']
            persist_card_payment_method_from_setup_intent(setup_intent)
            logger.info(f"Processed setup_intent.succeeded: {setup_intent['id']}")
            
        elif event['type'] == 'account.updated':
            account = event['data']['object']
            # Check if payouts are now enabled and external accounts exist
            if account.get('payouts_enabled'):
                external_accounts = stripe.Account.list_external_accounts(
                    account['id'],
                    object='bank_account'
                )
                for external_account in external_accounts.data:
                    persist_bank_from_account_external(external_account, account)
            logger.info(f"Processed account.updated: {account['id']}")
            
        elif event['type'] in ['account.external_account.created', 'account.external_account.updated']:
            external_account = event['data']['object']
            account_id = external_account['account']
            account = stripe.Account.retrieve(account_id)
            persist_bank_from_account_external(external_account, account)
            logger.info(f"Processed {event['type']}: {external_account['id']}")
            
        else:
            logger.info(f"Unhandled event type: {event['type']}")
            
    except Exception as e:
        logger.error(f"Error processing webhook event {event['type']}: {e}")
        return HttpResponse(status=500)
    
    return HttpResponse(status=200)