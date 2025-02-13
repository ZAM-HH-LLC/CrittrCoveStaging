from django.contrib import admin
from .models import DefaultAvailability

@admin.register(DefaultAvailability)
class DefaultAvailabilityAdmin(admin.ModelAdmin):
    list_display = ('default_availability_id', 'professional', 'default_state', 'created_at')
    list_filter = ('default_state', 'created_at')
    search_fields = ('professional__user__email',)
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('professional', 'default_state')
        }),
        ('Timestamps', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )
