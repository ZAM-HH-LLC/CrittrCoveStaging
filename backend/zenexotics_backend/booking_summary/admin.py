from django.contrib import admin
from .models import BookingSummary

@admin.register(BookingSummary)
class BookingSummaryAdmin(admin.ModelAdmin):
    list_display = (
        'summary_id', 
        'booking', 
        'fee_percentage',
        'tax_percentage',
        'get_subtotal',
        'get_platform_fee',
        'get_taxes',
        'get_total_client_cost',
        'get_total_sitter_payout'
    )
    search_fields = ('booking__client__user__email', 'booking__professional__user__email')
    readonly_fields = (
        'created_at', 
        'updated_at', 
        'get_subtotal',
        'get_platform_fee',
        'get_taxes',
        'get_total_client_cost',
        'get_total_sitter_payout'
    )
    fieldsets = (
        ('Basic Information', {
            'fields': ('booking',)
        }),
        ('Rate Settings', {
            'fields': ('fee_percentage', 'tax_percentage'),
            'description': 'Set the platform fee and tax percentages'
        }),
        ('Financial Details', {
            'fields': (
                'get_subtotal',
                'get_platform_fee',
                'get_taxes',
                'get_total_client_cost',
                'get_total_sitter_payout'
            ),
            'description': 'Calculated financial details based on rates and percentages'
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    def get_subtotal(self, obj):
        return f"${obj.subtotal:.2f}"
    get_subtotal.short_description = 'Subtotal'

    def get_platform_fee(self, obj):
        return f"${obj.platform_fee:.2f}"
    get_platform_fee.short_description = 'Platform Fee'

    def get_taxes(self, obj):
        return f"${obj.taxes:.2f}"
    get_taxes.short_description = 'Taxes'

    def get_total_client_cost(self, obj):
        return f"${obj.total_client_cost:.2f}"
    get_total_client_cost.short_description = 'Total Client Cost'

    def get_total_sitter_payout(self, obj):
        return f"${obj.total_sitter_payout:.2f}"
    get_total_sitter_payout.short_description = 'Total Sitter Payout'
