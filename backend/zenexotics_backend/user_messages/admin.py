from django.contrib import admin
from .models import UserMessage

@admin.register(UserMessage)
class UserMessageAdmin(admin.ModelAdmin):
    list_display = ('message_id', 'sender', 'conversation', 'timestamp', 'status', 'type_of_message', 'is_clickable')
    list_filter = ('status', 'type_of_message', 'is_clickable', 'timestamp')
    search_fields = ('content', 'sender__email', 'conversation__conversation_id')
    
    fieldsets = (
        ('Message Information', {
            'fields': (
                'sender',
                'conversation',
                'content',
            ),
            'description': 'Basic message information'
        }),
        ('Booking Details', {
            'fields': (
                'booking',
                'type_of_message',
                'is_clickable',
            ),
            'description': 'Information related to bookings and message behavior'
        }),
        ('Status & Metadata', {
            'fields': (
                'status',
                'metadata',
            ),
            'description': 'Message status and additional metadata'
        }),
    )

    def get_readonly_fields(self, request, obj=None):
        if obj:  # editing an existing object
            return ('timestamp',)
        return ()
