from django.contrib import admin
from .models import PaymentMethod

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('payment_method_id', 'user', 'type', 'last4', 'is_verified', 'is_primary_payment', 'is_primary_payout', 'created_at')
    list_filter = ('type', 'is_verified', 'is_primary_payment', 'is_primary_payout', 'created_at')
    search_fields = ('user__email', 'stripe_payment_method_id', 'bank_name')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'type', 'is_verified', 'is_primary_payment', 'is_primary_payout')
        }),
        ('Payment Details', {
            'fields': ('stripe_payment_method_id', 'last4', 'brand', 'exp_month', 'exp_year', 'billing_postal_code')
        }),
        ('Bank Information', {
            'fields': ('bank_account_last4', 'bank_name'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
