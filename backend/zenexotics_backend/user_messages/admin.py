from django.contrib import admin
from .models import UserMessage
import pytz
from django.utils import timezone
from django.utils.html import format_html

@admin.register(UserMessage)
class UserMessageAdmin(admin.ModelAdmin):
    def get_utc_timestamp(self, obj):
        """Display the timestamp in UTC without conversion"""
        if obj.timestamp.tzinfo is None:
            # If timestamp is naive, assume it's in UTC
            utc_time = pytz.UTC.localize(obj.timestamp)
        else:
            # If timestamp has timezone info, convert to UTC
            utc_time = obj.timestamp.astimezone(pytz.UTC)
        
        # Format the UTC time explicitly with UTC indicator
        formatted_time = utc_time.strftime('%Y-%m-%d %H:%M:%S UTC')
        return format_html('<span style="white-space: nowrap;">{}</span>', formatted_time)
    
    get_utc_timestamp.short_description = 'Timestamp (UTC)'
    get_utc_timestamp.admin_order_field = 'timestamp'

    list_display = ('message_id', 'sender', 'conversation', 'get_utc_timestamp', 'status', 'type_of_message', 'is_clickable')
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
