from django.test import TestCase
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import datetime, timedelta

from core.platform_fee_utils import (
    determine_client_platform_fee_percentage,
    determine_professional_platform_fee_percentage,
    calculate_platform_fees
)


class ClientPlatformFeesTests(TestCase):
    """Tests for client platform fee calculation."""

    def test_client_platform_fee_no_user(self):
        """Test platform fee when no user is provided."""
        fee = determine_client_platform_fee_percentage(None)
        self.assertEqual(fee, Decimal('0.15'))  # Default to 15% when no user

    def test_client_platform_fee_with_subscription_plans(self):
        """Test platform fees for different subscription plans."""
        # Create a mock user with a subscription_plan attribute
        mock_user = MagicMock()
        
        # Test dual subscription (plan 5)
        mock_user.subscription_plan = 5
        fee = determine_client_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for dual subscription
        
        # Test client subscription (plan 4)
        mock_user.subscription_plan = 4
        fee = determine_client_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for client subscription
        
        # Test waitlist tier (plan 1)
        mock_user.subscription_plan = 1
        fee = determine_client_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for waitlist tier
        
        # Test commission tier (plan 2)
        mock_user.subscription_plan = 2
        fee = determine_client_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.15'))  # 15% for commission tier
        
        # Test pro tier (plan 3)
        mock_user.subscription_plan = 3
        fee = determine_client_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.15'))  # 15% for pro tier (as a client)

    @patch('core.platform_fee_utils.Booking.objects.filter')
    def test_client_platform_fee_free_tier(self, mock_filter):
        """Test platform fee for free tier users."""
        mock_user = MagicMock()
        mock_user.subscription_plan = 0
        
        # Test first booking in month
        mock_query = MagicMock()
        mock_query.count.return_value = 0
        mock_filter.return_value = mock_query
        
        fee = determine_client_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for first booking in month
        
        # Test not first booking in month
        mock_query.count.return_value = 2
        fee = determine_client_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.15'))  # 15% for subsequent bookings


class ProfessionalPlatformFeesTests(TestCase):
    """Tests for professional platform fee calculation."""

    def test_professional_platform_fee_no_user(self):
        """Test platform fee when no professional user is provided."""
        fee = determine_professional_platform_fee_percentage(None)
        self.assertEqual(fee, Decimal('0.15'))  # Default to 15% when no user

    def test_professional_platform_fee_with_subscription_plans(self):
        """Test platform fees for different subscription plans."""
        # Create a mock user with a subscription_plan attribute
        mock_user = MagicMock()
        
        # Test dual subscription (plan 5)
        mock_user.subscription_plan = 5
        fee = determine_professional_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for dual subscription
        
        # Test pro subscription (plan 3)
        mock_user.subscription_plan = 3
        fee = determine_professional_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for pro subscription
        
        # Test waitlist tier (plan 1)
        mock_user.subscription_plan = 1
        fee = determine_professional_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for waitlist tier
        
        # Test commission tier (plan 2)
        mock_user.subscription_plan = 2
        fee = determine_professional_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.15'))  # 15% for commission tier
        
        # Test client tier (plan 4)
        mock_user.subscription_plan = 4
        fee = determine_professional_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.15'))  # 15% for client tier (as a professional)

    @patch('core.platform_fee_utils.Booking.objects.filter')
    def test_professional_platform_fee_free_tier(self, mock_filter):
        """Test platform fee for free tier professionals."""
        mock_user = MagicMock()
        mock_user.subscription_plan = 0
        
        # Test first booking in month
        mock_query = MagicMock()
        mock_query.count.return_value = 0
        mock_filter.return_value = mock_query
        
        fee = determine_professional_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.0'))  # 0% for first booking in month
        
        # Test not first booking in month
        mock_query.count.return_value = 2
        fee = determine_professional_platform_fee_percentage(mock_user)
        self.assertEqual(fee, Decimal('0.15'))  # 15% for subsequent bookings


class CalculatePlatformFeesTests(TestCase):
    """Tests for the calculate_platform_fees function."""

    def test_calculate_platform_fees_no_users(self):
        """Test platform fee calculation with no users provided."""
        subtotal = Decimal('100.00')
        
        fees = calculate_platform_fees(subtotal)
        
        self.assertEqual(fees['client_platform_fee'], Decimal('15.00'))
        self.assertEqual(fees['pro_platform_fee'], Decimal('15.00'))
        self.assertEqual(fees['total_platform_fee'], Decimal('30.00'))
        self.assertEqual(fees['client_platform_fee_percentage'], Decimal('0.15'))
        self.assertEqual(fees['pro_platform_fee_percentage'], Decimal('0.15'))

    def test_calculate_platform_fees_with_users(self):
        """Test platform fee calculation with users provided."""
        subtotal = Decimal('100.00')
        
        # Configure client and pro users with different subscription plans
        client_user = MagicMock()
        client_user.subscription_plan = 4  # Client subscription (0% fee)
        
        pro_user = MagicMock()
        pro_user.subscription_plan = 3  # Pro subscription (0% fee)
        
        fees = calculate_platform_fees(subtotal, client_user, pro_user)
        
        self.assertEqual(fees['client_platform_fee'], Decimal('0.00'))
        self.assertEqual(fees['pro_platform_fee'], Decimal('0.00'))
        self.assertEqual(fees['total_platform_fee'], Decimal('0.00'))
        self.assertEqual(fees['client_platform_fee_percentage'], Decimal('0.0'))
        self.assertEqual(fees['pro_platform_fee_percentage'], Decimal('0.0'))

    @patch('core.platform_fee_utils.determine_client_platform_fee_percentage')
    @patch('core.platform_fee_utils.determine_professional_platform_fee_percentage')
    def test_calculate_platform_fees_mixed_subscription(self, mock_pro_percentage, mock_client_percentage):
        """Test platform fee calculation with mixed subscription types."""
        subtotal = Decimal('100.00')
        
        # Set up mocks for percentage calculations
        mock_client_percentage.return_value = Decimal('0.15')  # Client pays 15%
        mock_pro_percentage.return_value = Decimal('0.15')  # Pro pays 15%
        
        # Configure client and pro users (won't be used due to mocks)
        client_user = MagicMock()
        pro_user = MagicMock()
        
        fees = calculate_platform_fees(subtotal, client_user, pro_user)
        
        # Verify calculations
        self.assertEqual(fees['client_platform_fee'], Decimal('15.00'))
        self.assertEqual(fees['pro_platform_fee'], Decimal('15.00'))
        self.assertEqual(fees['total_platform_fee'], Decimal('30.00'))
        self.assertEqual(fees['client_platform_fee_percentage'], Decimal('0.15'))
        self.assertEqual(fees['pro_platform_fee_percentage'], Decimal('0.15')) 