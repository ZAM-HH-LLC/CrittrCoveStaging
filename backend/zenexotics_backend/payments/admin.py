from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ('payment_id', 'booking', 'user', 'amount', 'currency', 'status', 'created_at')
    list_filter = ('status', 'currency', 'created_at')
    search_fields = ('user__email', 'stripe_payment_id', 'stripe_invoice_id')
    readonly_fields = ('created_at', 'updated_at')
    fieldsets = (
        ('Basic Information', {
            'fields': ('booking', 'user', 'payment_method')
        }),
        ('Payment Details', {
            'fields': ('amount', 'currency', 'status')
        }),
        ('Stripe Information', {
            'fields': ('stripe_payment_id', 'stripe_invoice_id')
        }),
        ('Financial Breakdown', {
            'fields': ('client_fee', 'sitter_payout')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
