from django.db import models

class Payment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    ]

    payment_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.SET_NULL, null=True, blank=True)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')  # ISO 4217 currency code
    status = models.CharField(max_length=50, choices=STATUS_CHOICES)
    stripe_payment_id = models.CharField(max_length=255)
    stripe_invoice_id = models.CharField(max_length=255, null=True, blank=True)
    payment_method = models.ForeignKey('payment_methods.PaymentMethod', on_delete=models.SET_NULL, null=True)
    client_fee = models.DecimalField(max_digits=10, decimal_places=2)
    sitter_payout = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Payment {self.payment_id} - {self.amount} {self.currency} ({self.status})"

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']
