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

def get_state_from_address(address, default_state='CO'):
    """
    Extract state from Address object or return default state.
    
    Args:
        address: Address object
        default_state: Default state to use if address is None
        
    Returns:
        str: Two-letter state code
    """
    if address and hasattr(address, 'state'):
        return address.state
    return default_state

def calculate_taxes(subtotal, platform_fee=None, user=None, state=None, total_platform_fee=None):
    """
    Calculates taxes based on state tax rates and whether the service is taxable.
    
    Args:
        subtotal (Decimal): The booking subtotal
        platform_fee (Decimal, optional): The platform fee amount if not providing total_platform_fee
        user (User, optional): The user object (to determine state if not provided)
        state (str, optional): Two-letter state code (overrides user's state)
        total_platform_fee (Decimal, optional): The total platform fee (client + pro fees) if different from platform_fee
    
    Returns:
        Decimal: The calculated tax amount
    """
    # Get state from arguments or user
    if not state and user:
        state = get_user_state(user)
    
    if not state:
        logger.warning("No state information available for tax calculation. Defaulting to no tax.")
        return Decimal('0.00')
    
    # Use total_platform_fee if provided, otherwise use platform_fee
    fee_to_tax = total_platform_fee if total_platform_fee is not None else platform_fee
    if fee_to_tax is None:
        fee_to_tax = Decimal('0.00')
    
    # Get tax info for the state
    state_tax_info = STATE_TAX_RATES.get(state, {"taxable": False, "state_rate": Decimal('0.00')})
    logger.info(f"Using tax info for state {state}: {state_tax_info}")
    
    # Calculate taxes based on taxable status
    if state_tax_info["taxable"] is True:
        # Regular tax calculation (tax on everything)
        tax_rate = Decimal(str(state_tax_info["state_rate"]))
        taxes = ((subtotal + fee_to_tax) * tax_rate).quantize(Decimal('0.01'))
        logger.info(f"Calculated taxes for {state} (taxable=True): ${taxes} (rate={tax_rate})")
    elif state_tax_info["taxable"] == "service_fee_only":
        # For DC, only the platform fee is taxed
        tax_rate = Decimal(str(state_tax_info["state_rate"]))
        taxes = (fee_to_tax * tax_rate).quantize(Decimal('0.01'))
        logger.info(f"Calculated taxes for {state} (taxable=service_fee_only): ${taxes} (rate={tax_rate})")
    else:
        # No taxes
        taxes = Decimal('0.00')
        logger.info(f"No taxes for {state} (taxable=False)")
    
    return taxes

def calculate_booking_taxes(state, subtotal, client_platform_fee, pro_platform_fee):
    """
    Comprehensive function to calculate taxes for booking based on state tax rules.
    
    Args:
        state (str): Two-letter state code
        subtotal (Decimal): The booking subtotal
        client_platform_fee (Decimal): The client's platform fee
        pro_platform_fee (Decimal): The professional's platform fee
        
    Returns:
        Decimal: The calculated tax amount
    """
    # Convert to Decimal if string or float values are passed
    if not isinstance(subtotal, Decimal):
        subtotal = Decimal(str(subtotal))
    if not isinstance(client_platform_fee, Decimal):
        client_platform_fee = Decimal(str(client_platform_fee))
    if not isinstance(pro_platform_fee, Decimal):
        pro_platform_fee = Decimal(str(pro_platform_fee))
    
    # Calculate total platform fee
    total_platform_fee = client_platform_fee + pro_platform_fee
    
    # Get tax info for the state
    state_tax_info = STATE_TAX_RATES.get(state, {"taxable": False, "state_rate": Decimal('0.00')})
    logger.info(f"Using tax info for state {state}: {state_tax_info}")
    
    # Calculate taxes based on taxable status
    if state_tax_info["taxable"] is True:
        # Regular tax calculation (tax on everything)
        tax_rate = Decimal(str(state_tax_info["state_rate"]))
        taxes = ((subtotal + total_platform_fee) * tax_rate).quantize(Decimal('0.01'))
        logger.info(f"Calculated taxes for {state} (taxable=True): ${taxes} (rate={tax_rate})")
    elif state_tax_info["taxable"] == "service_fee_only":
        # For DC, only the platform fee is taxed
        tax_rate = Decimal(str(state_tax_info["state_rate"]))
        taxes = (total_platform_fee * tax_rate).quantize(Decimal('0.01'))
        logger.info(f"Calculated taxes for {state} (taxable=service_fee_only): ${taxes} (rate={tax_rate})")
    else:
        # No taxes
        taxes = Decimal('0.00')
        logger.info(f"No taxes for {state} (taxable=False)")
    
    return taxes 