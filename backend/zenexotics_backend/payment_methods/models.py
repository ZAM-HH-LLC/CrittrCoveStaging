from django.db import models

class PaymentMethod(models.Model):
    TYPE_CHOICES = [
        ('CREDIT_CARD', 'Credit Card'),
        ('DEBIT_CARD', 'Debit Card'),
        ('BANK_ACCOUNT', 'Bank Account'),
    ]

    PAYMENT_TYPE_CHOICES = [
        ('Pay_for', 'Pay For'),
        ('Receive_payment', 'Receive Payment'),
        ('both', 'Both'),
    ]

    payment_method_id = models.AutoField(primary_key=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    type = models.CharField(max_length=50, choices=TYPE_CHOICES)
    type_of_payment = models.CharField(
        max_length=50,
        choices=PAYMENT_TYPE_CHOICES,
        default='Pay_for',
        help_text='Determines if this payment method can be used for paying, receiving payments, or both'
    )
    stripe_payment_method_id = models.CharField(max_length=255)
    last4 = models.CharField(max_length=4)
    brand = models.CharField(max_length=50, null=True, blank=True)  # For cards
    expiration_date = models.DateField(null=True, blank=True)  # For cards
    bank_account_last4 = models.CharField(max_length=4, null=True, blank=True)  # For bank accounts
    bank_name = models.CharField(max_length=255, null=True, blank=True)  # For bank accounts
    is_verified = models.BooleanField(default=False)
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} ending in {self.last4} for {self.user}"

    class Meta:
        db_table = 'payment_methods'
        ordering = ['-created_at']
