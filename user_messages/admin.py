from django.contrib import admin
from .models import Message

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('message_id', 'participant1', 'participant2', 'status', 'is_booking_request', 'timestamp')
    list_filter = ('status', 'is_booking_request', 'timestamp')
    search_fields = ('content', 'participant1__email', 'participant2__email')
    readonly_fields = ('timestamp',)
    fieldsets = (
        ('Participants', {
            'fields': ('participant1', 'participant2', 'role_map')
        }),
        ('Message Content', {
            'fields': ('content', 'status', 'is_booking_request')
        }),
        ('Related Information', {
            'fields': ('booking', 'metadata')
        }),
        ('Timestamps', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )
