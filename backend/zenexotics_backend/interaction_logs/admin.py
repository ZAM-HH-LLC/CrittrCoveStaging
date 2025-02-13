from django.contrib import admin
from .models import InteractionLog

@admin.register(InteractionLog)
class InteractionLogAdmin(admin.ModelAdmin):
    list_display = ('interaction_id', 'user', 'timestamp', 'action', 'target_type', 'target_id')
    list_filter = ('action', 'target_type', 'timestamp')
    search_fields = ('user__email', 'target_id', 'action')
    readonly_fields = ('interaction_id', 'timestamp')

    def has_add_permission(self, request):
        return False  # Logs should only be created through the application
