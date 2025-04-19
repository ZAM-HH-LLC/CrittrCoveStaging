from decimal import Decimal
import logging
from .constants import STATE_TAX_RATES

logger = logging.getLogger(__name__)

def get_user_state(user):
    """
    Gets the state code from a user's address (professional or client).
    Returns None if no address state is found.
    
    Args:
        user: User object
    
    Returns:
        str or None: Two-letter state code or None
    """
    try:
        # Try to get the state from professional or client
        if hasattr(user, 'professional') and hasattr(user.professional, 'address_state'):
            return user.professional.address_state
        elif hasattr(user, 'client') and hasattr(user.client, 'address_state'):
            return user.client.address_state
        
        # Legacy support - check other possible attribute names
        if hasattr(user, 'professional') and hasattr(user.professional, 'state'):
            return user.professional.state
        elif hasattr(user, 'client') and hasattr(user.client, 'state'):
            return user.client.state
        
        # No state found
        return None
    except Exception as e:
        logger.error(f"Error retrieving user state: {str(e)}")
        return None

def calculate_taxes(subtotal, platform_fee, user=None, state=None):
    """
    Calculates taxes based on state tax rates and whether the service is taxable.
    
    Args:
        subtotal (Decimal): The booking subtotal
        platform_fee (Decimal): The platform fee amount
        user (User, optional): The user object (to determine state if not provided)
        state (str, optional): Two-letter state code (overrides user's state)
    
    Returns:
        Decimal: The calculated tax amount
    """
    # Get state from arguments or user
    if not state and user:
        state = get_user_state(user)
    
    if not state:
        logger.warning("No state information available for tax calculation. Defaulting to no tax.")
        return Decimal('0.00')
    
    # Get tax info for the state
    state_tax_info = STATE_TAX_RATES.get(state, {"taxable": False, "state_rate": Decimal('0.00')})
    logger.info(f"Using tax info for state {state}: {state_tax_info}")
    
    # Calculate taxes based on taxable status
    if state_tax_info["taxable"] is True:
        # Regular tax calculation (tax on everything)
        tax_rate = Decimal(str(state_tax_info["state_rate"]))
        taxes = ((subtotal + platform_fee) * tax_rate).quantize(Decimal('0.01'))
        logger.info(f"Calculated taxes for {state} (taxable=True): ${taxes} (rate={tax_rate})")
    elif state_tax_info["taxable"] == "service_fee_only":
        # For DC, only the platform fee is taxed
        tax_rate = Decimal(str(state_tax_info["state_rate"]))
        taxes = (platform_fee * tax_rate).quantize(Decimal('0.01'))
        logger.info(f"Calculated taxes for {state} (taxable=service_fee_only): ${taxes} (rate={tax_rate})")
    else:
        # No taxes
        taxes = Decimal('0.00')
        logger.info(f"No taxes for {state} (taxable=False)")
    
    return taxes 