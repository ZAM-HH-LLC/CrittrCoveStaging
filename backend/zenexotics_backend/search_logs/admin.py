from django.contrib import admin
from .models import SearchLog

@admin.register(SearchLog)
class SearchLogAdmin(admin.ModelAdmin):
    list_display = ('search_id', 'user', 'timestamp', 'service_category', 'service_name', 'result_count')
    list_filter = ('service_category', 'timestamp')
    search_fields = ('user__email', 'service_category', 'service_name')
    readonly_fields = ('search_id', 'timestamp')
    
    def has_add_permission(self, request):
        return False  # Logs should only be created through the application
