from django.db import models

class PaymentMethod(models.Model):
    TYPE_CHOICES = [
        ('CREDIT_CARD', 'Credit Card'),
        ('DEBIT_CARD', 'Debit Card'),
        ('BANK_ACCOUNT', 'Bank Account'),
    ]

    # Removed PAYMENT_TYPE_CHOICES - replaced with separate boolean fields

    payment_method_id = models.AutoField(primary_key=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    # Separate fields for payment and payout capabilities
    is_primary_payment = models.BooleanField(
        default=False,
        help_text='Whether this is the primary method for making payments'
    )
    is_primary_payout = models.BooleanField(
        default=False,
        help_text='Whether this is the primary method for receiving payouts'
    )
    stripe_payment_method_id = models.CharField(max_length=255)
    last4 = models.CharField(max_length=4)
    brand = models.CharField(max_length=50, null=True, blank=True)  # For cards
    
    # Separate expiration fields for easier handling
    exp_month = models.IntegerField(null=True, blank=True)  # For cards
    exp_year = models.IntegerField(null=True, blank=True)   # For cards
    
    # Bank account fields
    bank_account_last4 = models.CharField(max_length=4, null=True, blank=True)  # For bank accounts
    bank_name = models.CharField(max_length=255, null=True, blank=True)  # For bank accounts
    
    # Billing information
    billing_postal_code = models.CharField(max_length=10, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    # Removed is_primary - replaced with is_primary_payment and is_primary_payout
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} ending in {self.last4} for {self.user}"
    
    @classmethod
    def set_primary_payment_method(cls, user, payment_method):
        """Set a payment method as the primary for payments, clearing others"""
        # Clear existing primary payment methods
        cls.objects.filter(user=user, is_primary_payment=True).update(is_primary_payment=False)
        # Set new primary
        payment_method.is_primary_payment = True
        payment_method.save()
    
    @classmethod
    def set_primary_payout_method(cls, user, payment_method):
        """Set a payment method as the primary for payouts, clearing others"""
        # Clear existing primary payout methods  
        cls.objects.filter(user=user, is_primary_payout=True).update(is_primary_payout=False)
        # Set new primary
        payment_method.is_primary_payout = True
        payment_method.save()
    
    def can_be_used_for_payments(self):
        """Check if this payment method can be used for making payments"""
        return self.type in ['CREDIT_CARD', 'DEBIT_CARD', 'BANK_ACCOUNT']
    
    def can_be_used_for_payouts(self):
        """Check if this payment method can be used for receiving payouts"""
        return self.type == 'BANK_ACCOUNT'
    
    @property
    def display_name(self):
        """Human-readable display name for the payment method"""
        if self.type in ['CREDIT_CARD', 'DEBIT_CARD']:
            return f"{self.brand} •••• {self.last4}"
        elif self.type == 'BANK_ACCOUNT':
            return f"{self.bank_name} •••• {self.bank_account_last4 or self.last4}"
        return f"{self.type} •••• {self.last4}"

    class Meta:
        db_table = 'payment_methods'
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'stripe_payment_method_id'],
                name='unique_user_stripe_payment_method'
            )
        ]
