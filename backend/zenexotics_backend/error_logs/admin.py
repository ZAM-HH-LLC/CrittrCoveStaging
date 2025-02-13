from django.contrib import admin
from .models import ErrorLog

@admin.register(ErrorLog)
class ErrorLogAdmin(admin.ModelAdmin):
    list_display = ('error_id', 'timestamp', 'user', 'endpoint', 'error_message')
    list_filter = ('endpoint', 'timestamp')
    search_fields = ('user__email', 'endpoint', 'error_message')
    readonly_fields = ('error_id', 'timestamp')

    def has_add_permission(self, request):
        return False  # Logs should only be created through the application
        
    def error_message_preview(self, obj):
        return obj.error_message[:100] + '...' if len(obj.error_message) > 100 else obj.error_message
