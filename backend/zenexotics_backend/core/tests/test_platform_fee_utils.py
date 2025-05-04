import pytest
from decimal import Decimal
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import datetime, timedelta

from core.platform_fee_utils import (
    determine_client_platform_fee_percentage,
    determine_professional_platform_fee_percentage,
    calculate_platform_fees
)


@pytest.fixture
def mock_user():
    """Create a mock user with a subscription_plan attribute."""
    user = MagicMock()
    user.subscription_plan = 0  # Default to Free tier
    return user


class TestClientPlatformFees:
    """Tests for client platform fee calculation."""

    def test_client_platform_fee_no_user(self):
        """Test platform fee when no user is provided."""
        fee = determine_client_platform_fee_percentage(None)
        assert fee == Decimal('0.15')  # Default to 15% when no user

    def test_client_platform_fee_dual_subscription(self, mock_user):
        """Test platform fee for dual subscription (plan 5)."""
        mock_user.subscription_plan = 5
        fee = determine_client_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for dual subscription

    def test_client_platform_fee_client_subscription(self, mock_user):
        """Test platform fee for client subscription (plan 4)."""
        mock_user.subscription_plan = 4
        fee = determine_client_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for client subscription

    def test_client_platform_fee_waitlist(self, mock_user):
        """Test platform fee for waitlist tier (plan 1)."""
        mock_user.subscription_plan = 1
        fee = determine_client_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for waitlist tier

    def test_client_platform_fee_commission(self, mock_user):
        """Test platform fee for commission tier (plan 2)."""
        mock_user.subscription_plan = 2
        fee = determine_client_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.15')  # 15% for commission tier

    def test_client_platform_fee_pro(self, mock_user):
        """Test platform fee for professional tier (plan 3)."""
        mock_user.subscription_plan = 3
        fee = determine_client_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.15')  # 15% for pro tier (as a client)

    @patch('core.platform_fee_utils.Booking.objects.filter')
    def test_client_platform_fee_free_tier_first_booking(self, mock_filter, mock_user):
        """Test platform fee for free tier with first booking this month."""
        mock_user.subscription_plan = 0
        
        # Mock the query to return empty list (no bookings this month)
        mock_query = MagicMock()
        mock_query.count.return_value = 0
        mock_filter.return_value = mock_query
        
        fee = determine_client_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for first booking in month

    @patch('core.platform_fee_utils.Booking.objects.filter')
    def test_client_platform_fee_free_tier_not_first_booking(self, mock_filter, mock_user):
        """Test platform fee for free tier with previous bookings this month."""
        mock_user.subscription_plan = 0
        
        # Mock the query to return some bookings
        mock_query = MagicMock()
        mock_query.count.return_value = 2
        mock_filter.return_value = mock_query
        
        fee = determine_client_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.15')  # 15% for subsequent bookings in month


class TestProfessionalPlatformFees:
    """Tests for professional platform fee calculation."""

    def test_professional_platform_fee_no_user(self):
        """Test platform fee when no professional user is provided."""
        fee = determine_professional_platform_fee_percentage(None)
        assert fee == Decimal('0.15')  # Default to 15% when no user

    def test_professional_platform_fee_dual_subscription(self, mock_user):
        """Test platform fee for dual subscription (plan 5)."""
        mock_user.subscription_plan = 5
        fee = determine_professional_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for dual subscription

    def test_professional_platform_fee_pro_subscription(self, mock_user):
        """Test platform fee for pro subscription (plan 3)."""
        mock_user.subscription_plan = 3
        fee = determine_professional_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for pro subscription

    def test_professional_platform_fee_waitlist(self, mock_user):
        """Test platform fee for waitlist tier (plan 1)."""
        mock_user.subscription_plan = 1
        fee = determine_professional_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for waitlist tier

    def test_professional_platform_fee_commission(self, mock_user):
        """Test platform fee for commission tier (plan 2)."""
        mock_user.subscription_plan = 2
        fee = determine_professional_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.15')  # 15% for commission tier

    def test_professional_platform_fee_client(self, mock_user):
        """Test platform fee for client tier (plan 4)."""
        mock_user.subscription_plan = 4
        fee = determine_professional_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.15')  # 15% for client tier (as a professional)

    @patch('core.platform_fee_utils.Booking.objects.filter')
    def test_professional_platform_fee_free_tier_first_booking(self, mock_filter, mock_user):
        """Test platform fee for free tier with first booking this month."""
        mock_user.subscription_plan = 0
        
        # Mock the query to return empty list (no bookings this month)
        mock_query = MagicMock()
        mock_query.count.return_value = 0
        mock_filter.return_value = mock_query
        
        fee = determine_professional_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.0')  # 0% for first booking in month

    @patch('core.platform_fee_utils.Booking.objects.filter')
    def test_professional_platform_fee_free_tier_not_first_booking(self, mock_filter, mock_user):
        """Test platform fee for free tier with previous bookings this month."""
        mock_user.subscription_plan = 0
        
        # Mock the query to return some bookings
        mock_query = MagicMock()
        mock_query.count.return_value = 2
        mock_filter.return_value = mock_query
        
        fee = determine_professional_platform_fee_percentage(mock_user)
        assert fee == Decimal('0.15')  # 15% for subsequent bookings in month


class TestCalculatePlatformFees:
    """Tests for the calculate_platform_fees function."""

    def test_calculate_platform_fees_no_users(self):
        """Test platform fee calculation with no users provided."""
        subtotal = Decimal('100.00')
        
        fees = calculate_platform_fees(subtotal)
        
        assert fees['client_platform_fee'] == Decimal('15.00')
        assert fees['pro_platform_fee'] == Decimal('15.00')
        assert fees['total_platform_fee'] == Decimal('30.00')
        assert fees['client_platform_fee_percentage'] == Decimal('0.15')
        assert fees['pro_platform_fee_percentage'] == Decimal('0.15')

    def test_calculate_platform_fees_with_users(self, mock_user):
        """Test platform fee calculation with users provided."""
        subtotal = Decimal('100.00')
        
        # Configure client and pro users with different subscription plans
        client_user = MagicMock()
        client_user.subscription_plan = 4  # Client subscription (0% fee)
        
        pro_user = MagicMock()
        pro_user.subscription_plan = 3  # Pro subscription (0% fee)
        
        fees = calculate_platform_fees(subtotal, client_user, pro_user)
        
        assert fees['client_platform_fee'] == Decimal('0.00')
        assert fees['pro_platform_fee'] == Decimal('0.00')
        assert fees['total_platform_fee'] == Decimal('0.00')
        assert fees['client_platform_fee_percentage'] == Decimal('0.0')
        assert fees['pro_platform_fee_percentage'] == Decimal('0.0')

    def test_calculate_platform_fees_mixed_subscription(self, mock_user):
        """Test platform fee calculation with mixed subscription types."""
        subtotal = Decimal('100.00')
        
        # Configure client on commission tier (15% fee)
        client_user = MagicMock()
        client_user.subscription_plan = 2
        
        # Configure pro on free tier with previous bookings (15% fee)
        pro_user = MagicMock()
        pro_user.subscription_plan = 0
        
        # Mock booking filter for pro user
        with patch('core.platform_fee_utils.Booking.objects.filter') as mock_filter:
            mock_query = MagicMock()
            mock_query.count.return_value = 3
            mock_filter.return_value = mock_query
            
            fees = calculate_platform_fees(subtotal, client_user, pro_user)
            
            assert fees['client_platform_fee'] == Decimal('15.00')
            assert fees['pro_platform_fee'] == Decimal('15.00')
            assert fees['total_platform_fee'] == Decimal('30.00')
            assert fees['client_platform_fee_percentage'] == Decimal('0.15')
            assert fees['pro_platform_fee_percentage'] == Decimal('0.15') 