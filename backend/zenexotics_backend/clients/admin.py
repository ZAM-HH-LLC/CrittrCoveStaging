from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_name', 'get_email', 'last_booking', 'verified_payment_method', 'created_at')
    list_filter = ('last_booking', 'verified_payment_method', 'created_at')
    search_fields = ('user__email', 'user__name', 'id')
    readonly_fields = ('id', 'created_at', 'updated_at')

    def get_name(self, obj):
        return obj.user.name
    get_name.short_description = 'Name'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'

    fieldsets = (
        ('User Information', {
            'fields': ('id', 'user')
        }),
        ('Client Details', {
            'fields': ('about_me', 'emergency_contact', 'authorized_household_members')
        }),
        ('Payment & Booking Information', {
            'fields': ('verified_payment_method', 'last_booking')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
