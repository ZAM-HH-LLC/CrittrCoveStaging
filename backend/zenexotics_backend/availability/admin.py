from django.contrib import admin
from .models import Availability

@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ('availability_id', 'professional', 'service', 'date', 'start_time', 'end_time', 'type')
    list_filter = ('type', 'date', 'created_at')
    search_fields = ('professional__user__email', 'service__service_name', 'reason')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('professional', 'service', 'booking')
        }),
        ('Time Details', {
            'fields': ('date', 'start_time', 'end_time')
        }),
        ('Status', {
            'fields': ('type', 'reason')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
