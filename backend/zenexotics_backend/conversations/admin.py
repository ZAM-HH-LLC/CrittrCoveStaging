from django.contrib import admin
from .models import Conversation

@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('conversation_id', 'participant1', 'participant2', 'last_message_time', 'unread_count')
    list_filter = ('last_message_time',)
    search_fields = ('participant1__email', 'participant2__email', 'last_message')
    
    fieldsets = (
        ('Participants', {
            'fields': (
                'participant1',
                'participant2',
                'role_map',
            ),
            'description': 'Information about conversation participants and their roles'
        }),
        ('Message Details', {
            'fields': (
                'last_message',
                'last_message_time',
                'unread_count',
            ),
            'description': 'Latest message information and status'
        }),
        ('Additional Information', {
            'fields': (
                'metadata',
            ),
            'description': 'Additional metadata about the conversation'
        }),
    )
