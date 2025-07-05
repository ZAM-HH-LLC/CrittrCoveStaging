from django.contrib import admin
from .models import Client

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ('id', 'get_name', 'get_email', 'get_invited_by', 'last_booking', 'verified_payment_method', 'marked_noreply_as_not_spam', 'created_at')
    list_filter = ('last_booking', 'verified_payment_method', 'marked_noreply_as_not_spam', 'created_at')
    search_fields = ('user__email', 'user__name', 'id', 'invited_by__user__name')
    readonly_fields = ('id', 'created_at', 'updated_at')

    def get_name(self, obj):
        return obj.user.name
    get_name.short_description = 'Name'

    def get_email(self, obj):
        return obj.user.email
    get_email.short_description = 'Email'
    
    def get_invited_by(self, obj):
        if obj.invited_by:
            return obj.invited_by.user.name
        return None
    get_invited_by.short_description = 'Invited By'

    fieldsets = (
        ('User Information', {
            'fields': ('id', 'user')
        }),
        ('Invitation Information', {
            'fields': ('invited_by',)
        }),
        ('Client Details', {
            'fields': ('about_me', 'emergency_contact', 'authorized_household_members', 'marked_noreply_as_not_spam')
        }),
        ('Payment & Booking Information', {
            'fields': ('verified_payment_method', 'last_booking')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
