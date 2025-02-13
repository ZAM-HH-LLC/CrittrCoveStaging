from django.contrib import admin
from .models import ServiceRate

@admin.register(ServiceRate)
class ServiceRateAdmin(admin.ModelAdmin):
    list_display = ('rate_id', 'service', 'title', 'rate', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('title', 'description', 'service__service_name')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('service', 'title', 'description', 'rate')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
