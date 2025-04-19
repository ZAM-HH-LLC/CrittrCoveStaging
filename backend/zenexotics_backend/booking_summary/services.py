from decimal import Decimal
from django.conf import settings
import logging
from core.tax_utils import calculate_taxes

logger = logging.getLogger(__name__)

# Default percentages - could be moved to settings.py in the future
DEFAULT_CLIENT_PLATFORM_FEE_PERCENTAGE = Decimal('15.00')
DEFAULT_PRO_PLATFORM_FEE_PERCENTAGE = Decimal('15.00')
DEFAULT_TAX_PERCENTAGE = Decimal('8.00')

class BookingSummaryService:
    """
    Centralized service for BookingSummary calculations.
    This service provides methods to create, update and calculate booking summaries
    to ensure consistent behavior across the application.
    """
    
    @staticmethod
    def create_or_update_from_booking(booking, **kwargs):
        """
        Create or update a BookingSummary for a booking.
        
        Args:
            booking: The Booking instance
            **kwargs: Optional overrides for default values
                - client_platform_fee_percentage
                - pro_platform_fee_percentage
                - tax_percentage
                - client_platform_fee
                - pro_platform_fee
        
        Returns:
            BookingSummary instance
        """
        from .models import BookingSummary
        
        # Set default values
        defaults = {
            'client_platform_fee_percentage': kwargs.get('client_platform_fee_percentage', DEFAULT_CLIENT_PLATFORM_FEE_PERCENTAGE),
            'pro_platform_fee_percentage': kwargs.get('pro_platform_fee_percentage', DEFAULT_PRO_PLATFORM_FEE_PERCENTAGE),
            'tax_percentage': kwargs.get('tax_percentage', DEFAULT_TAX_PERCENTAGE),
        }
        
        # Add fee values if provided
        if 'client_platform_fee' in kwargs:
            defaults['client_platform_fee'] = Decimal(str(kwargs['client_platform_fee']))
        
        if 'pro_platform_fee' in kwargs:
            defaults['pro_platform_fee'] = Decimal(str(kwargs['pro_platform_fee']))
        
        # Create or update the summary
        summary, created = BookingSummary.objects.get_or_create(
            booking=booking,
            defaults=defaults
        )
        
        # If updating an existing summary, update the fields
        if not created:
            for key, value in defaults.items():
                setattr(summary, key, value)
            summary.save()
        
        # Update the subtotal based on occurrences
        summary.update_subtotal()
        
        # Update platform fees if not explicitly set
        if 'client_platform_fee' not in kwargs and summary.client_platform_fee == Decimal('0.00'):
            client_fee = (summary.subtotal * summary.client_platform_fee_percentage / Decimal('100.00')).quantize(Decimal('0.01'))
            summary.client_platform_fee = client_fee
            summary.save(update_fields=['client_platform_fee'])
        
        if 'pro_platform_fee' not in kwargs and summary.pro_platform_fee == Decimal('0.00'):
            pro_fee = (summary.subtotal * summary.pro_platform_fee_percentage / Decimal('100.00')).quantize(Decimal('0.01'))
            summary.pro_platform_fee = pro_fee
            summary.save(update_fields=['pro_platform_fee'])
        
        logger.info(f"{'Created' if created else 'Updated'} BookingSummary for booking {booking.booking_id}")
        
        return summary
    
    @staticmethod
    def create_or_update_from_draft(booking, draft_data):
        """
        Create or update a BookingSummary from draft data.
        
        Args:
            booking: The Booking instance
            draft_data: Dictionary containing draft data with cost_summary
        
        Returns:
            BookingSummary instance
        """
        cost_summary = draft_data.get('cost_summary', {})
        
        # Extract values from draft_data with fallbacks to defaults
        kwargs = {
            'client_platform_fee_percentage': Decimal(str(cost_summary.get('client_platform_fee_percentage', DEFAULT_CLIENT_PLATFORM_FEE_PERCENTAGE))),
            'pro_platform_fee_percentage': Decimal(str(cost_summary.get('pro_platform_fee_percentage', DEFAULT_PRO_PLATFORM_FEE_PERCENTAGE))),
            'tax_percentage': Decimal(str(cost_summary.get('tax_percentage', DEFAULT_TAX_PERCENTAGE))),
        }
        
        # Add fee values if they exist in draft data
        if 'client_platform_fee' in cost_summary:
            kwargs['client_platform_fee'] = Decimal(str(cost_summary.get('client_platform_fee', 0)))
        
        if 'pro_platform_fee' in cost_summary:
            kwargs['pro_platform_fee'] = Decimal(str(cost_summary.get('pro_platform_fee', 0)))
        
        # Create or update the BookingSummary
        summary = BookingSummaryService.create_or_update_from_booking(booking, **kwargs)
        
        # Calculate or validate taxes
        # This is already handled by the taxes property in BookingSummary model
        # which uses the core.tax_utils.calculate_taxes function
        
        return summary
    
    @staticmethod
    def recalculate_from_occurrence_change(booking):
        """
        Recalculate booking summary when an occurrence changes.
        This only updates the subtotal based on current occurrences.
        
        Args:
            booking: The Booking instance
        
        Returns:
            BookingSummary instance
        """
        from .models import BookingSummary
        
        # Get or create summary with default values
        summary, created = BookingSummary.objects.get_or_create(
            booking=booking,
            defaults={
                'client_platform_fee_percentage': DEFAULT_CLIENT_PLATFORM_FEE_PERCENTAGE,
                'pro_platform_fee_percentage': DEFAULT_PRO_PLATFORM_FEE_PERCENTAGE,
                'tax_percentage': DEFAULT_TAX_PERCENTAGE,
            }
        )
        
        # Update the subtotal
        summary.update_subtotal()
        
        # Update platform fees based on the new subtotal
        if created or summary.client_platform_fee == Decimal('0.00'):
            client_fee = (summary.subtotal * summary.client_platform_fee_percentage / Decimal('100.00')).quantize(Decimal('0.01'))
            summary.client_platform_fee = client_fee
        
        if created or summary.pro_platform_fee == Decimal('0.00'):
            pro_fee = (summary.subtotal * summary.pro_platform_fee_percentage / Decimal('100.00')).quantize(Decimal('0.01'))
            summary.pro_platform_fee = pro_fee
        
        summary.save()
        
        return summary 