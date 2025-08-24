import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from payment_methods.models import PaymentMethod
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

User = get_user_model()

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY

def get_or_create_stripe_customer(user):
    """
    Get or create a Stripe Customer for the given user.
    Returns the Stripe Customer object.
    """
    if user.stripe_customer_id:
        try:
            customer = stripe.Customer.retrieve(user.stripe_customer_id)
            return customer
        except stripe.error.InvalidRequestError:
            # Customer doesn't exist, create a new one
            pass
    
    # Create new customer
    customer = stripe.Customer.create(
        email=user.email,
        name=user.name,
        metadata={'user_id': user.user_id}
    )
    
    # Save customer ID to user
    user.stripe_customer_id = customer.id
    user.save()
    
    return customer

def get_or_create_connect_express_account(user):
    """
    Get or create a Stripe Connect Express account for the given user.
    Returns the Stripe Account object.
    """
    if user.stripe_connect_account_id:
        try:
            account = stripe.Account.retrieve(user.stripe_connect_account_id)
            return account
        except stripe.error.InvalidRequestError:
            # Account doesn't exist, create a new one
            pass
    
    # Create new Express account
    account = stripe.Account.create(
        type='express',
        country='US',
        email=user.email,
        capabilities={
            'transfers': {'requested': True}
        },
        business_profile={
            'product_description': 'Pet care services',
        },
        metadata={'user_id': user.user_id}
    )
    
    # Save account ID to user
    user.stripe_connect_account_id = account.id
    user.save()
    
    return account

def create_account_link(account_id, refresh_url=None, return_url=None):
    """
    Create an Account Link for Connect Express onboarding.
    Returns the account link URL.
    """
    if not refresh_url:
        refresh_url = f"{settings.FRONTEND_URL}/payments/onboarding/refresh"
    if not return_url:
        return_url = f"{settings.FRONTEND_URL}/payments/onboarding/return"
    
    account_link = stripe.AccountLink.create(
        account=account_id,
        refresh_url=refresh_url,
        return_url=return_url,
        type='account_onboarding',
    )
    
    return account_link.url

def persist_card_payment_method_from_setup_intent(setup_intent):
    """
    Persist card payment method from successful SetupIntent to our database.
    """
    try:
        # Get the customer from the setup intent
        customer_id = setup_intent.customer
        customer = stripe.Customer.retrieve(customer_id)
        
        # Find the user by stripe customer ID
        user = User.objects.get(stripe_customer_id=customer_id)
        
        # Get the payment method
        payment_method_id = setup_intent.payment_method
        payment_method = stripe.PaymentMethod.retrieve(payment_method_id)
        
        # Determine card type
        card_brand = payment_method.card.brand
        card_type = 'CREDIT_CARD' if card_brand in ['visa', 'mastercard', 'amex', 'discover'] else 'DEBIT_CARD'
        
        # Create expiration date
        exp_month = payment_method.card.exp_month
        exp_year = payment_method.card.exp_year
        expiration_date = datetime(exp_year, exp_month, 1).date()
        
        # Check if this is the user's first payment method
        is_first_method = not PaymentMethod.objects.filter(user=user).exists()
        
        # Upsert payment method
        payment_method_obj, created = PaymentMethod.objects.update_or_create(
            user=user,
            stripe_payment_method_id=payment_method_id,
            defaults={
                'type': card_type,
                'last4': payment_method.card.last4,
                'brand': payment_method.card.brand.title(),
                'exp_month': payment_method.card.exp_month,
                'exp_year': payment_method.card.exp_year,
                'is_verified': True,
                'is_primary_payment': is_first_method,
                'is_primary_payout': False,
            }
        )
        
        logger.info(f"Persisted card payment method for user {user.user_id}: {payment_method_id}")
        return payment_method_obj
        
    except User.DoesNotExist:
        logger.error(f"User not found for Stripe customer {customer_id}")
        raise
    except Exception as e:
        logger.error(f"Error persisting card payment method: {e}")
        raise

def persist_bank_from_account_external(external_account, account):
    """
    Persist bank account from Connect external account to our database.
    """
    try:
        # Find the user by stripe connect account ID
        user = User.objects.get(stripe_connect_account_id=account.id)
        
        # Check if this is the user's first bank account
        is_first_method = not PaymentMethod.objects.filter(user=user, type='BANK_ACCOUNT').exists()
        
        # Upsert payment method
        payment_method_obj, created = PaymentMethod.objects.update_or_create(
            user=user,
            stripe_payment_method_id=external_account.id,
            defaults={
                'type': 'BANK_ACCOUNT',
                'bank_account_last4': external_account.last4,
                'bank_name': external_account.bank_name or 'Bank Account',
                'is_verified': account.payouts_enabled,
                'is_primary_payment': is_first_method,
                'is_primary_payout': is_first_method,
            }
        )
        
        logger.info(f"Persisted bank account for user {user.user_id}: {external_account.id}")
        return payment_method_obj
        
    except User.DoesNotExist:
        logger.error(f"User not found for Stripe account {account.id}")
        raise
    except Exception as e:
        logger.error(f"Error persisting bank account: {e}")
        raise

def get_connect_account_status(user):
    """
    Get the status of a user's Connect account including capabilities and external accounts.
    """
    if not user.stripe_connect_account_id:
        safe_json = {
            'has_account': False,
            'payouts_enabled': False,
            'external_accounts': [],
            'is_verified': False,
            'transfers_active': False,
            'requirements_due': [],
            'external_account': None
        }
        logger.info("MBA2i3j4fi4 connect-status summary", safe_json)
        return safe_json
    
    try:
        account = stripe.Account.retrieve(user.stripe_connect_account_id)
        
        # Get external accounts
        external_accounts = stripe.Account.list_external_accounts(
            user.stripe_connect_account_id,
            object='bank_account'
        )
        
        bank_accounts = []
        default_bank_account = None
        
        for bank_account in external_accounts.data:
            bank_info = {
                'id': bank_account.id,
                'bank_name': bank_account.bank_name,
                'last4': bank_account.last4,
                'status': bank_account.status
            }
            bank_accounts.append(bank_info)
            
            # Find default_for_currency bank account (USD for US accounts)
            if hasattr(bank_account, 'default_for_currency') and bank_account.default_for_currency:
                default_bank_account = {
                    'bank_name': bank_account.bank_name,
                    'last4': bank_account.last4,
                    'status': bank_account.status
                }
            elif not default_bank_account and bank_account.currency == 'usd':
                # Fallback to first USD account if no default_for_currency found
                default_bank_account = {
                    'bank_name': bank_account.bank_name,
                    'last4': bank_account.last4,
                    'status': bank_account.status
                }
        
        # Check transfers capability status
        transfers_active = False
        if hasattr(account, 'capabilities') and hasattr(account.capabilities, 'transfers'):
            transfers_active = account.capabilities.transfers == 'active'
        
        # Get requirements due
        requirements_due = []
        if hasattr(account, 'requirements') and hasattr(account.requirements, 'currently_due'):
            requirements_due = list(account.requirements.currently_due)
        
        safe_json = {
            'has_account': True,
            'payouts_enabled': account.payouts_enabled,
            'external_accounts': bank_accounts,
            'is_verified': account.payouts_enabled,
            'charges_enabled': account.charges_enabled,
            'details_submitted': account.details_submitted,
            'transfers_active': transfers_active,
            'requirements_due': requirements_due,
            'external_account': default_bank_account
        }
        
        logger.info("MBA2i3j4fi4 connect-status summary", safe_json)
        return safe_json
        
    except stripe.error.InvalidRequestError:
        logger.error(f"Connect account not found: {user.stripe_connect_account_id}")
        safe_json = {
            'has_account': False,
            'payouts_enabled': False,
            'external_accounts': [],
            'is_verified': False,
            'transfers_active': False,
            'requirements_due': [],
            'external_account': None
        }
        logger.info("MBA2i3j4fi4 connect-status summary", safe_json)
        return safe_json