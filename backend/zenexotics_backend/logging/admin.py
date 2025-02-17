from django.contrib import admin
from .models import ErrorLog, InteractionLog, EngagementLog

@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = ('error_id', 'user', 'error_type', 'endpoint', 'created_at')
    list_filter = ('error_type', 'endpoint', 'created_at')
    search_fields = ('error_message', 'user__email', 'endpoint')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'error_type', 'endpoint')
        }),
        ('Error Details', {
            'fields': ('error_message', 'stack_trace')
        }),
        ('Additional Information', {
            'fields': ('additional_data', 'created_at')
        }),
    )

@admin.register(InteractionLog)
class InteractionLogAdmin(admin.ModelAdmin):
    list_display = ('interaction_id', 'user', 'action_type', 'status', 'created_at')
    list_filter = ('action_type', 'status', 'created_at')
    search_fields = ('action_details', 'user__email')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'action_type', 'status')
        }),
        ('Interaction Details', {
            'fields': ('action_details', 'metadata')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    )

@admin.register(EngagementLog)
class EngagementLogAdmin(admin.ModelAdmin):
    list_display = ('engagement_id', 'user', 'feature', 'duration_seconds', 'success', 'created_at')
    list_filter = ('feature', 'success', 'created_at')
    search_fields = ('user__email', 'session_id', 'feature')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('user', 'feature', 'session_id')
        }),
        ('Engagement Details', {
            'fields': ('duration_seconds', 'success', 'metadata')
        }),
        ('Timestamps', {
            'fields': ('created_at',)
        }),
    ) 