import logging
from decimal import Decimal
from django.utils import timezone
from bookings.models import Booking

logger = logging.getLogger(__name__)

def determine_client_platform_fee_percentage(client_user):
    """
    Determine the platform fee percentage for the client based on their subscription plan.
    
    Client platform fee rules by subscription plan:
    - Plan 0 (Free tier): Fee = 0% if first booking this month, else 15%
    - Plan 1 (Waitlist tier): Fee = 0% (unlimited free bookings)
    - Plan 2 (Commission tier): Fee = 15%
    - Plan 3 (Pro subscription): Fee = 15% (follows commission tier rule)
    - Plan 4 (Client subscription): Fee = 0%
    - Plan 5 (Dual subscription): Fee = 0% (no platform fees ever)
    
    Args:
        client_user: The User object for the client
        
    Returns:
        Decimal value of platform fee percentage (0.15 or 0.0)
    """
    # Default platform fee percentage
    platform_fee = Decimal('0.15')  # 15%
    
    # If we're missing a client user, default to the standard fee
    if not client_user:
        logger.warning("MBA-DEBUG: No client user found, using default 15% platform fee")
        return platform_fee
    
    # Add detailed debugging
    logger.info(f"MBA-DEBUG: Client user ID: {client_user.id if hasattr(client_user, 'id') else 'No ID'}")
    
    # Check if subscription_plan attribute exists
    if not hasattr(client_user, 'subscription_plan'):
        logger.warning("MBA-DEBUG: Client user has no subscription_plan attribute")
        return platform_fee
    
    # Get subscription plan and ensure it's an integer
    try:
        client_plan = int(client_user.subscription_plan)
        logger.info(f"MBA-DEBUG: Client subscription plan: {client_plan}, type: {type(client_plan)}")
    except (TypeError, ValueError):
        logger.warning(f"MBA-DEBUG: Could not convert client_plan '{client_user.subscription_plan}' to integer")
        return platform_fee
    
    # Check subscription plan for client
    if client_plan == 5:  # Dual subscription - no platform fees ever
        logger.info("MBA-DEBUG: Client has Dual subscription, applying 0% platform fee")
        return Decimal('0.0')
        
    if client_plan == 4:  # Client subscription - no platform fees
        logger.info("MBA-DEBUG: Client has Client subscription, applying 0% platform fee")
        return Decimal('0.0')
        
    if client_plan == 1:  # Waitlist tier - unlimited free bookings
        logger.info("MBA-DEBUG: Client has Waitlist tier, applying 0% platform fee")
        return Decimal('0.0')
        
    if client_plan == 0:  # Free tier - check if first booking this month
        # Get current month start
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        # Count client's bookings this month
        client_bookings_this_month = Booking.objects.filter(
            client__user=client_user,
            created_at__date__gte=month_start
        ).count()
        
        logger.info(f"MBA-DEBUG: Client bookings this month: {client_bookings_this_month}")
        
        # If first booking this month, no platform fee
        if client_bookings_this_month == 0:
            logger.info("MBA-DEBUG: First booking this month for client, applying 0% platform fee")
            return Decimal('0.0')
            
    # All other cases (plan 2, 3, or non-first booking for plan 0) - 15% platform fee
    logger.info(f"MBA-DEBUG: Client pays standard 15% platform fee, plan: {client_plan}")
    return platform_fee


def determine_professional_platform_fee_percentage(professional_user):
    """
    Determine the platform fee percentage for the professional based on their subscription plan.
    
    Professional platform fee rules by subscription plan:
    - Plan 0 (Free tier): Fee = 0% if first booking this month, else 15%
    - Plan 1 (Waitlist tier): Fee = 0% (unlimited free bookings)
    - Plan 2 (Commission tier): Fee = 15%
    - Plan 3 (Pro subscription): Fee = 0%
    - Plan 4 (Client subscription): Fee = 15% (follows commission tier rule)
    - Plan 5 (Dual subscription): Fee = 0% (no platform fees ever)
    
    Args:
        professional_user: The User object for the professional
        
    Returns:
        Decimal value of platform fee percentage (0.15 or 0.0)
    """
    # Default platform fee percentage
    platform_fee = Decimal('0.15')  # 15%
    
    # If we're missing a professional user, default to the standard fee
    if not professional_user:
        logger.warning("MBA-DEBUG: No professional user found, using default 15% platform fee")
        return platform_fee
    
    # Add detailed debugging
    logger.info(f"MBA-DEBUG: Professional user ID: {professional_user.id if hasattr(professional_user, 'id') else 'No ID'}")
    
    # Check if subscription_plan attribute exists
    if not hasattr(professional_user, 'subscription_plan'):
        logger.warning("MBA-DEBUG: Professional user has no subscription_plan attribute")
        return platform_fee
    
    # Get subscription plan and ensure it's an integer
    try:
        pro_plan = int(professional_user.subscription_plan)
        logger.info(f"MBA-DEBUG: Professional subscription plan: {pro_plan}, type: {type(pro_plan)}")
    except (TypeError, ValueError):
        logger.warning(f"MBA-DEBUG: Could not convert pro_plan '{professional_user.subscription_plan}' to integer")
        return platform_fee
    
    # Check subscription plan for professional
    if pro_plan == 5:  # Dual subscription - no platform fees ever
        logger.info("MBA-DEBUG: Professional has Dual subscription, applying 0% platform fee")
        return Decimal('0.0')
        
    if pro_plan == 3:  # Pro subscription - no platform fees
        logger.info("MBA-DEBUG: Professional has Pro subscription, applying 0% platform fee")
        return Decimal('0.0')
        
    if pro_plan == 1:  # Waitlist tier - unlimited free bookings
        logger.info("MBA-DEBUG: Professional has Waitlist tier, applying 0% platform fee")
        return Decimal('0.0')
        
    if pro_plan == 0:  # Free tier - check if first booking this month
        # Get current month start
        today = timezone.now().date()
        month_start = today.replace(day=1)
        
        # Count professional's bookings this month
        pro_bookings_this_month = Booking.objects.filter(
            professional__user=professional_user,
            created_at__date__gte=month_start
        ).count()
        
        logger.info(f"MBA-DEBUG: Professional bookings this month: {pro_bookings_this_month}")
        
        # If first booking this month, no platform fee
        if pro_bookings_this_month == 0:
            logger.info("MBA-DEBUG: First booking this month for professional, applying 0% platform fee")
            return Decimal('0.0')
            
    # All other cases (plan 2, 4, or non-first booking for plan 0) - 15% platform fee
    logger.info(f"MBA-DEBUG: Professional pays standard 15% platform fee, plan: {pro_plan}")
    return platform_fee


def calculate_platform_fees(subtotal, client_user=None, professional_user=None):
    """
    Calculate platform fees for a booking based on client and professional users.
    
    Args:
        subtotal: The booking subtotal (Decimal)
        client_user: The client User object (optional)
        professional_user: The professional User object (optional)
        
    Returns:
        Dictionary containing:
        - client_platform_fee: The calculated client platform fee
        - pro_platform_fee: The calculated professional platform fee
        - total_platform_fee: The sum of client and professional platform fees
        - client_platform_fee_percentage: The client fee percentage (as decimal)
        - pro_platform_fee_percentage: The professional fee percentage (as decimal)
    """
    # Determine platform fee percentages
    client_platform_fee_percentage = determine_client_platform_fee_percentage(client_user)
    pro_platform_fee_percentage = determine_professional_platform_fee_percentage(professional_user)
    
    # Calculate platform fees
    client_platform_fee = (subtotal * client_platform_fee_percentage).quantize(Decimal('0.01'))
    pro_platform_fee = (subtotal * pro_platform_fee_percentage).quantize(Decimal('0.01'))
    total_platform_fee = client_platform_fee + pro_platform_fee
    
    return {
        'client_platform_fee': client_platform_fee,
        'pro_platform_fee': pro_platform_fee, 
        'total_platform_fee': total_platform_fee,
        'client_platform_fee_percentage': client_platform_fee_percentage,
        'pro_platform_fee_percentage': pro_platform_fee_percentage
    } 