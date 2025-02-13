from django.contrib import admin
from .models import EngagementLog

@admin.register(EngagementLog)
class EngagementLogAdmin(admin.ModelAdmin):
    list_display = ('engagement_id', 'user', 'timestamp', 'page_name', 'duration')
    list_filter = ('page_name', 'timestamp')
    search_fields = ('user__email', 'page_name')
    readonly_fields = ('engagement_id', 'timestamp')

    def has_add_permission(self, request):
        return False  # Logs should only be created through the application
