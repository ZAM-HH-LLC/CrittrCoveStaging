from django.contrib import admin
from .models import PaymentMethod

@admin.register(PaymentMethod)
class PaymentMethodAdmin(admin.ModelAdmin):
    list_display = ('payment_method_id', 'user', 'type', 'type_of_payment', 'last4', 'is_verified', 'is_primary', 'created_at')
    list_filter = ('type', 'type_of_payment', 'is_verified', 'is_primary', 'created_at')
    search_fields = ('user__email', 'stripe_payment_method_id', 'bank_name')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('User Information', {
            'fields': ('user', 'type', 'type_of_payment', 'is_verified', 'is_primary')
        }),
        ('Payment Details', {
            'fields': ('stripe_payment_method_id', 'last4', 'brand', 'expiration_date')
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
