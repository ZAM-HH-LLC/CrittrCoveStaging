from django.contrib import admin
from .models import ServiceModeration

@admin.register(ServiceModeration)
class ServiceModerationAdmin(admin.ModelAdmin):
    list_display = ('moderation_id', 'service', 'moderator', 'action', 'timestamp')
    list_filter = ('action', 'timestamp')
    search_fields = ('service__service_name', 'moderator__email', 'notes')
    readonly_fields = ('timestamp',)
    fieldsets = (
        ('Moderation Details', {
            'fields': ('service', 'moderator', 'action', 'notes')
        }),
        ('Timestamps', {
            'fields': ('timestamp',),
            'classes': ('collapse',)
        }),
    )
